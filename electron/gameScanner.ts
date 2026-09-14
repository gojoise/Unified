import fsp from 'node:fs/promises'
import path from 'node:path'
import {
  canonicalizeDirName,
  extractExeIcon,
  extractGameTitle,
  findXboxManifestDir,
  isTechnicalDir,
  loadLibrary,
  normalizeTitle,
  readXboxDisplayName,
} from './libraryManager'
import { getSettingValue } from './settings'

// ---------------------------------------------------------------------------
// Détection semi-automatique — parcourt les emplacements de recherche et
// propose des candidats que l'utilisateur valide dans un dialogue.
//
// Deux niveaux de fiabilité :
//   A — racines de plateforme (Steam, GOG, Xbox) : la liste des jeux est lue dans
//       les manifestes, aucune heuristique n'est nécessaire pour savoir « est-ce un jeu ».
//   B — dossier générique : chaque sous-dossier direct est un jeu candidat, et
//       son exécutable principal est choisi par score (voir scoreExecutable).
// ---------------------------------------------------------------------------

export type ScanSource = 'steam' | 'gog' | 'xbox' | 'folder'
export type ScanConfidence = 'high' | 'medium' | 'low'

export interface ScanCandidate {
  /** Titre détecté, éditable par l'utilisateur avant l'ajout. */
  title: string
  /** Exécutable retenu par le score. */
  exePath: string
  /** Dossier d'installation du jeu — sert à la déduplication et aux chemins ignorés. */
  installDir: string
  gameIcon: string
  /**
   * Vrai quand l'icône provient d'un manifeste (logo Xbox) et non du .exe :
   * changer d'exécutable ne doit alors pas la remplacer par l'icône du binaire.
   */
  iconFromManifest: boolean
  source: ScanSource
  confidence: ScanConfidence
  /** Autres exécutables du même dossier, du plus au moins probable. */
  alternatives: string[]
}

export interface ScanProgress {
  scanned: number
  total: number
  found: number
  current: string
}

/** Profondeur maximale de recherche de l'exécutable À L'INTÉRIEUR d'un dossier de jeu. */
const MAX_EXE_DEPTH = 4
/** Garde-fou : un dossier de jeu ne devrait jamais contenir autant d'exécutables. */
const MAX_EXE_PER_GAME = 60

/** Dossiers jamais explorés : ils ne contiennent pas l'exécutable du jeu. */
const SKIP_DIRS = new Set([
  '_commonredist', 'commonredist', 'redist', 'redists', 'redistributable',
  'redistributables', 'directx', 'dotnet', 'dotnetfx', 'vcredist', 'support',
  'tools', 'toolkit', 'editor', 'sdk', 'docs', 'doc', 'manual', 'save', 'saves',
  'savegames', 'screenshots', 'mods', 'logs', 'cache', 'temp', 'installers',
  'node_modules', '$recycle.bin', 'system volume information', 'windowsapps',
])

/** Exécutables qui ne sont jamais le jeu lui-même. */
const EXE_BLACKLIST = [
  /^unins/i, /setup/i, /^install/i, /uninstall/i, /crash(report|handler|pad)/i,
  /^vc_?redist/i, /dxsetup/i, /dotnetfx/i, /^oalinst/i, /^touchup/i,
  /easyanticheat/i, /battleye/i, /_be$/i, /_eac$/i, /cefsubprocess/i,
  /^config/i, /benchmark/i, /^helper/i, /^7z/i, /^dxwebsetup/i, /report/i,
  /^activation/i, /^register/i, /^patch/i, /^update/i, /^launchpad/i, /cpl$/i,
  /configurator/i, /editor/i,
]

/** Entrées Steam qui ne sont pas des jeux. */
const STEAM_NON_GAMES = /redistributable|steamworks|proton|steam linux runtime|steamvr/i

/** Mots qui trahissent un lanceur plutôt que le binaire du jeu. */
const LAUNCHER_HINT = /launch|start|play|boot/i

/** Positionné par abortScan() pour interrompre le parcours en cours. */
let aborted = false

/** Demande l'arrêt du scan en cours ; le parcours s'arrête à la prochaine itération. */
export function abortScan(): void {
  aborted = true
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

/**
 * Parcourt les emplacements donnés (ou tous les `searchLocations` configurés)
 * et retourne les jeux candidats absents de la bibliothèque.
 */
export async function scanLocations(
  locations?: string[],
  onProgress?: (progress: ScanProgress) => void,
): Promise<ScanCandidate[]> {
  aborted = false

  const configured: string[] = locations?.length
    ? locations
    : ((getSettingValue('searchLocations') as string[]) ?? [])
  const roots = dedupeRoots(configured)

  // 1. Recensement des dossiers de jeu — rapide, et donne le total pour la progression.
  const gameDirs: GameDir[] = []
  for (const root of roots) {
    if (aborted) break
    gameDirs.push(...(await collectGameDirs(root)))
  }

  // 2. Filtres de déduplication, avant le travail coûteux (parcours + icônes).
  // Deux mémoires distinctes, réinitialisables séparément depuis les paramètres :
  //   ignoredPaths   — « Ne plus proposer », choix explicite sur un dossier
  //   dismissedPaths — candidats laissés décochés lors d'une recherche précédente
  const skipped = new Set([
    ...((getSettingValue('ignoredPaths') as string[]) ?? []),
    ...((getSettingValue('dismissedPaths') as string[]) ?? []),
  ].map(normalizeKey))
  const library = loadLibrary()
  const libraryExes = new Set(library.map((game) => normalizeKey(game.path)))
  const seenDirs = new Set<string>()

  const pending = gameDirs.filter((gameDir) => {
    const key = normalizeKey(gameDir.dir)
    if (seenDirs.has(key) || skipped.has(key)) return false
    // Un jeu déjà en bibliothèque couvre tout son dossier d'installation :
    // inutile de reproposer un autre exécutable du même jeu.
    if (library.some((game) => isInside(game.path, gameDir.dir))) return false
    seenDirs.add(key)
    return true
  })

  // 3. Choix de l'exécutable et construction des candidats.
  const candidates: ScanCandidate[] = []
  let scanned = 0

  for (const gameDir of pending) {
    if (aborted) break
    onProgress?.({
      scanned,
      total: pending.length,
      found: candidates.length,
      current: path.basename(gameDir.dir),
    })

    try {
      const candidate = await buildCandidate(gameDir)
      if (candidate && !libraryExes.has(normalizeKey(candidate.exePath))) {
        candidates.push(candidate)
      }
    } catch (error) {
      console.error('scanLocations : dossier ignoré', gameDir.dir, error)
    }
    scanned++
  }

  onProgress?.({ scanned, total: pending.length, found: candidates.length, current: '' })

  return candidates.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  )
}

// ---------------------------------------------------------------------------
// Niveau A — racines de plateforme
// ---------------------------------------------------------------------------

interface GameDir {
  dir: string
  source: ScanSource
  /** Nom issu d'un manifeste (Steam / GOG / Xbox), plus fiable que l'heuristique de dossier. */
  knownName: string | null
  /** Exécutable déclaré par le manifeste : court-circuite le scoring. */
  forcedExe?: string
  /** Icône déclarée par le manifeste : court-circuite l'extraction depuis le .exe. */
  iconFile?: string
}

/** Recense les dossiers de jeu d'un emplacement de recherche. */
async function collectGameDirs(root: string): Promise<GameDir[]> {
  if (!(await isDirectory(root))) return []

  const steamappsDir = await findSteamappsDir(root)
  if (steamappsDir) return collectSteamGameDirs(steamappsDir)

  const subDirs = await listDirectories(root)
  if (subDirs.length === 0) {
    // L'emplacement pointe directement sur un dossier de jeu unique.
    return [{ dir: root, source: 'folder', knownName: null }]
  }

  const gameDirs: GameDir[] = []
  for (const subDir of subDirs) {
    if (aborted) break
    if (SKIP_DIRS.has(path.basename(subDir).toLowerCase())) continue

    // Dossier d'éditeur : les jeux sont un cran plus bas.
    if (await isPublisherDir(subDir)) {
      for (const childDir of await listDirectories(subDir)) {
        if (aborted) break
        const childName = path.basename(childDir)
        if (SKIP_DIRS.has(childName.toLowerCase()) || isTechnicalDir(childName)) continue
        gameDirs.push(...(await classifyGameDir(childDir)))
      }
      continue
    }

    gameDirs.push(...(await classifyGameDir(subDir)))
  }
  return gameDirs
}

/** Reconnaît la plateforme d'un dossier candidat et en fait un ou plusieurs GameDir. */
async function classifyGameDir(dir: string): Promise<GameDir[]> {
  // Une bibliothèque Steam peut être imbriquée dans un dossier générique.
  const nestedSteamapps = await findSteamappsDir(dir)
  if (nestedSteamapps) return collectSteamGameDirs(nestedSteamapps)

  const xboxPackage = await readXboxPackage(dir)
  // 'addon' : package Xbox valide mais sans exécutable — un DLC. On l'écarte
  // sans le laisser retomber sur l'heuristique de dossier, qui en ferait un jeu.
  if (xboxPackage === 'addon') return []
  if (xboxPackage) return [xboxPackage]

  const gogName = await readGogName(dir)
  return [{ dir, source: gogName ? 'gog' : 'folder', knownName: gogName }]
}

/**
 * Dossier d'éditeur — « id Software », « Infogrames », « Ubisoft »… Il ne contient
 * pas de jeu lui-même mais un ou plusieurs dossiers de jeu. Le prendre pour un jeu
 * donne un titre d'éditeur et un exécutable jugé « enfoui », donc mal noté.
 *
 * Condition volontairement stricte : aucun exécutable à sa racine ET au moins un
 * sous-dossier non technique qui, lui, en contient. « Tactical Ops » n'a pas non
 * plus d'exe à sa racine, mais son unique enfant « System » est technique : c'est
 * un jeu, pas un éditeur.
 */
async function isPublisherDir(dir: string): Promise<boolean> {
  let entries
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return false
  }

  if (entries.some((entry) => entry.isFile() && isExecutable(entry.name))) return false

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (SKIP_DIRS.has(entry.name.toLowerCase()) || isTechnicalDir(entry.name)) continue
    if (await hasExecutable(path.join(dir, entry.name), 0)) return true
  }
  return false
}

/** Vrai dès qu'un exécutable est trouvé dans l'arborescence, sans tout parcourir. */
async function hasExecutable(dir: string, depth: number): Promise<boolean> {
  if (depth > MAX_EXE_DEPTH) return false

  let entries
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return false
  }

  if (entries.some((entry) => entry.isFile() && isExecutable(entry.name))) return true

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name.toLowerCase())) continue
    if (await hasExecutable(path.join(dir, entry.name), depth + 1)) return true
  }
  return false
}

function isExecutable(fileName: string): boolean {
  return path.extname(fileName).toLowerCase() === '.exe'
}

/** Retourne le dossier steamapps associé à `dir`, qu'il le soit, le contienne ou en soit issu. */
async function findSteamappsDir(dir: string): Promise<string | null> {
  const base = path.basename(dir).toLowerCase()
  if (base === 'steamapps') return dir
  // Un emplacement pointant sur .../steamapps/common reste exploitable.
  if (base === 'common' && path.basename(path.dirname(dir)).toLowerCase() === 'steamapps') {
    return path.dirname(dir)
  }
  const nested = path.join(dir, 'steamapps')
  return (await isDirectory(nested)) ? nested : null
}

/** Lit les appmanifest_*.acf pour obtenir la liste exacte des jeux installés. */
async function collectSteamGameDirs(steamappsDir: string): Promise<GameDir[]> {
  const gameDirs: GameDir[] = []
  const files = await listFiles(steamappsDir)

  for (const file of files) {
    if (aborted) break
    if (!/^appmanifest_\d+\.acf$/i.test(path.basename(file))) continue

    try {
      const content = await fsp.readFile(file, 'utf-8')
      const installDir = content.match(/"installdir"\s+"([^"]+)"/)?.[1]
      const name = content.match(/"name"\s+"([^"]+)"/)?.[1] ?? null
      if (!installDir || (name && STEAM_NON_GAMES.test(name))) continue

      const dir = path.join(steamappsDir, 'common', installDir)
      if (await isDirectory(dir)) gameDirs.push({ dir, source: 'steam', knownName: name })
    } catch (error) {
      console.error('collectSteamGameDirs : manifeste illisible', file, error)
    }
  }
  return gameDirs
}

/** Retourne le nom déclaré dans un goggame-*.info, ou null si le dossier n'est pas un jeu GOG. */
async function readGogName(dir: string): Promise<string | null> {
  try {
    const entries = await fsp.readdir(dir)
    const infoFile = entries.find((entry) => /^goggame-\d+\.info$/i.test(entry))
    if (!infoFile) return null
    const data = JSON.parse(await fsp.readFile(path.join(dir, infoFile), 'utf-8'))
    return typeof data.name === 'string' ? data.name : null
  } catch {
    return null
  }
}

/**
 * Package Xbox / Microsoft Store : <Jeu>/Content/MicrosoftGame.Config déclare le
 * nom d'affichage, le logo et l'exécutable — rien n'est laissé à l'heuristique.
 *
 * Retourne 'addon' pour un package sans exécutable (DLC), et null si le dossier
 * n'est pas un package Xbox du tout.
 */
async function readXboxPackage(dir: string): Promise<GameDir | 'addon' | null> {
  const manifestDir = findXboxManifestDir(path.join(dir, 'Content')) ?? findXboxManifestDir(dir)
  if (!manifestDir) return null

  const config = await readTextFile(path.join(manifestDir, 'MicrosoftGame.Config'))
  if (!config) return null

  // Un package sans <ExecutableList> est un DLC, pas un jeu : c'est le cas des
  // packs de contenu, qui ne contiennent qu'un gamelaunchhelper.exe.
  const declaredExe = config.match(/<Executable\s[^>]*Name="([^"]+)"/i)?.[1]
  if (!declaredExe) return 'addon'

  return {
    dir,
    source: 'xbox',
    knownName: readXboxDisplayName(manifestDir),
    forcedExe: await resolveXboxExecutable(manifestDir, declaredExe),
    iconFile: await resolveXboxLogo(config, manifestDir),
  }
}

/**
 * gamelaunchhelper.exe est le point d'entrée déclaré par appxmanifest.xml : c'est
 * lui que visent les raccourcis de l'application Xbox, et il gère la vérification
 * de licence avant de démarrer le jeu. On le préfère quand il existe, le binaire
 * déclaré par MicrosoftGame.Config restant proposé en alternative.
 */
async function resolveXboxExecutable(manifestDir: string, declaredExe: string): Promise<string> {
  const helper = path.join(manifestDir, 'gamelaunchhelper.exe')
  return (await isFile(helper)) ? helper : path.join(manifestDir, declaredExe)
}

/** Logos déclarés par <ShellVisuals>, du plus au moins adapté à une vignette. */
const XBOX_LOGO_ATTRIBUTES = ['Square150x150Logo', 'StoreLogo', 'Square44x44Logo']

/** Résout le premier logo déclaré qui existe réellement sur le disque. */
async function resolveXboxLogo(config: string, manifestDir: string): Promise<string | undefined> {
  for (const attribute of XBOX_LOGO_ATTRIBUTES) {
    const declared = config.match(new RegExp(attribute + '="([^"]+)"', 'i'))?.[1]
    if (!declared) continue

    const logoPath = path.join(manifestDir, declared.replace(/\\/g, path.sep))
    if (await isFile(logoPath)) return logoPath
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Niveau B — choix de l'exécutable par score
// ---------------------------------------------------------------------------

/** Construit le candidat d'un dossier de jeu, ou null si aucun exécutable crédible. */
async function buildCandidate(gameDir: GameDir): Promise<ScanCandidate | null> {
  const picked = await pickExecutable(gameDir)
  if (!picked) return null

  const manifestIcon = await readLogoFile(gameDir.iconFile)

  const title =
    gameDir.knownName?.trim() ||
    extractGameTitle(picked.exePath) ||
    normalizeTitle(path.basename(gameDir.dir))

  return {
    title,
    exePath: picked.exePath,
    installDir: gameDir.dir,
    gameIcon: manifestIcon ?? (await extractExeIcon(picked.exePath)),
    iconFromManifest: manifestIcon !== null,
    source: gameDir.source,
    confidence: confidenceOf(gameDir.source, picked),
    alternatives: picked.alternatives,
  }
}

/**
 * Classe les exécutables d'un dossier de jeu et retourne le meilleur.
 * Les suivants sont conservés : en semi-auto, l'utilisateur doit pouvoir corriger.
 */
interface PickedExecutable {
  exePath: string
  alternatives: string[]
  /** L'exécutable porte le nom de son dossier ou celui déclaré par un manifeste. */
  nameMatched: boolean
  /** Il est à la racine du jeu ou dans un dossier technique — une place attendue. */
  wellPlaced: boolean
}

async function pickExecutable(gameDir: GameDir): Promise<PickedExecutable | null> {
  const executables = await collectExecutables(gameDir.dir, 0)
  if (executables.length === 0) return null

  // Manifeste faisant foi : aucun scoring, les autres binaires restent proposés.
  if (gameDir.forcedExe) {
    const forcedExe = gameDir.forcedExe
    return {
      exePath: forcedExe,
      alternatives: executables
        .map((executable) => executable.path)
        .filter((exePath) => normalizeKey(exePath) !== normalizeKey(forcedExe)),
      nameMatched: true,
      wellPlaced: true,
    }
  }

  const dirKey = canonicalizeDirName(path.basename(gameDir.dir))
  const nameKey = gameDir.knownName ? canonicalizeDirName(gameDir.knownName) : null
  const acronyms = [path.basename(gameDir.dir), gameDir.knownName]
    .filter((value): value is string => Boolean(value))
    .map(initialsOf)

  const scored = []
  for (const executable of executables) {
    const baseName = path.basename(executable.path, path.extname(executable.path))
    if (EXE_BLACKLIST.some((pattern) => pattern.test(baseName))) continue
    scored.push({
      exePath: executable.path,
      ...(await scoreExecutable(executable.path, baseName, gameDir.dir, dirKey, nameKey, acronyms)),
    })
  }
  if (scored.length === 0) return null

  scored.sort((a, b) => b.score - a.score)
  return {
    exePath: scored[0].exePath,
    alternatives: scored.slice(1).map((entry) => entry.exePath),
    nameMatched: scored[0].nameMatched,
    wellPlaced: scored[0].wellPlaced,
  }
}

/** Pénalité par dossier traversé qui n'a rien de technique. */
const BURIED_PENALTY = 5

/** Bonus d'une correspondance par sigle — un cran sous la correspondance directe. */
const ACRONYM_BONUS = 40

/** En deçà, un sigle est trop court pour distinguer quoi que ce soit. */
const MIN_ACRONYM_LENGTH = 3

/**
 * Initiales des mots d'un nom : « Enemy Territory - QUAKE Wars » → « etqw »,
 * « Medal of Honor - Allied Assault War Chest » → « mohaawc ».
 */
function initialsOf(name: string): string {
  return name
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toLowerCase()
}

/**
 * Les vieux jeux nomment volontiers leur binaire d'après le sigle du titre :
 * etqw.exe, MOHAA.exe, TESV.exe, nfsu2.exe. Un préfixe suffit — « MOHAA » ne
 * couvre pas le « War Chest » de son dossier.
 */
function acronymMatches(exeKey: string, initials: string): boolean {
  if (exeKey.length < MIN_ACRONYM_LENGTH || initials.length < MIN_ACRONYM_LENGTH) return false
  return initials === exeKey || initials.startsWith(exeKey) || exeKey.startsWith(initials)
}

/**
 * Score d'un exécutable : correspondance du nom (littérale ou par sigle) d'abord,
 * position ensuite, taille en départage.
 *
 * Deux choix de calibration protègent les jeux installés depuis un CD/DVD, qui
 * ne portent ni manifeste, ni nom de binaire calqué sur le dossier, ni plusieurs
 * centaines de Mo :
 *
 *  - la profondeur n'est pénalisée que pour les dossiers NON techniques. Un
 *    binaire dans « system\ » ou « Binaries\Win64\ » est à sa place : le
 *    traverser ne doit pas annuler le bonus qu'on vient de lui accorder ;
 *  - la taille compte de façon logarithmique. En linéaire, un jeu moderne
 *    ramassait les 30 points du plafond quand un jeu de 2003 en obtenait 0,3 —
 *    un écart qui n'a rien à voir avec la probabilité d'être le bon binaire.
 */
async function scoreExecutable(
  exePath: string,
  baseName: string,
  gameDirPath: string,
  dirKey: string,
  nameKey: string | null,
  acronyms: string[],
): Promise<{ score: number; nameMatched: boolean; wellPlaced: boolean }> {
  const exeKey = canonicalizeDirName(baseName)
  const segments = pathSegments(gameDirPath, exePath)

  const directMatch =
    nameMatches(exeKey, dirKey) || (nameKey !== null && nameMatches(exeKey, nameKey))
  const acronymMatch =
    !directMatch && acronyms.some((initials) => acronymMatches(exeKey, initials))
  const wellPlaced =
    segments.length === 0 || isTechnicalDir(segments[segments.length - 1])

  let score = 0
  if (nameMatches(exeKey, dirKey)) score += 50
  if (nameKey && nameMatches(exeKey, nameKey)) score += 50
  if (acronymMatch) score += ACRONYM_BONUS
  if (segments.length === 0) score += 20
  else if (wellPlaced) score += 15

  score += await sizeBonus(exePath)
  if (LAUNCHER_HINT.test(baseName)) score -= 15
  score -= segments.filter((segment) => !isTechnicalDir(segment)).length * BURIED_PENALTY

  return { score, nameMatched: directMatch || acronymMatch, wellPlaced }
}

/**
 * Bonus de taille, compressé : il ne sert qu'à départager des candidats déjà
 * équivalents, pas à faire gagner un jeu parce qu'il est récent.
 * 1 Mo → 3, 20 Mo → 13, 300 Mo → 25, plafonné à 30.
 */
async function sizeBonus(exePath: string): Promise<number> {
  try {
    const megabytes = (await fsp.stat(exePath)).size / (1024 * 1024)
    return Math.min(Math.log10(1 + megabytes) * 10, 30)
  } catch {
    // Fichier illisible : pas de bonus, mais le candidat reste dans la liste.
    return 0
  }
}

/** Dossiers traversés entre la racine du jeu et l'exécutable. */
function pathSegments(gameDirPath: string, exePath: string): string[] {
  const relative = path.relative(gameDirPath, path.dirname(exePath))
  return relative === '' ? [] : relative.split(path.sep)
}

/** Liste les exécutables d'un dossier de jeu, en profondeur limitée. */
async function collectExecutables(
  dir: string,
  depth: number,
): Promise<{ path: string; depth: number }[]> {
  if (aborted || depth > MAX_EXE_DEPTH) return []

  const found: { path: string; depth: number }[] = []
  let entries
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of entries) {
    if (aborted || found.length >= MAX_EXE_PER_GAME) break
    const fullPath = path.join(dir, entry.name)

    if (entry.isFile()) {
      if (path.extname(entry.name).toLowerCase() === '.exe') {
        found.push({ path: fullPath, depth })
      }
    } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name.toLowerCase())) {
      found.push(...(await collectExecutables(fullPath, depth + 1)))
    }
  }
  return found
}

/**
 * Comparaison souple de deux noms canonisés : « witcher3 » reconnaît
 * « thewitcher3 ». Les noms très courts sont exclus pour éviter le bruit.
 */
function nameMatches(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false
  return a === b || a.includes(b) || b.includes(a)
}

/**
 * Confiance accordée au binaire élu — elle pilote la pré-sélection des cases et
 * la puce d'avertissement du dialogue.
 *
 * Elle ne se déduit PAS d'un seuil sur le score : celui-ci classe les candidats
 * d'un même dossier, ses valeurs absolues n'ont pas de sens d'un jeu à l'autre.
 * Un jeu de 2003 rangé dans « system\ » plafonnait ainsi à une quinzaine de
 * points et tombait en « peu sûr » alors qu'il n'y avait aucune ambiguïté.
 *
 * On raisonne donc sur ce qu'on sait vraiment :
 *   high   — un manifeste tranche, le nom correspond, ou il n'y a qu'un binaire
 *   medium — le binaire est à une place attendue, mais rien ne le confirme
 *   low    — il est enfoui dans un dossier quelconque, à côté d'autres candidats
 */
function confidenceOf(source: ScanSource, picked: PickedExecutable): ScanConfidence {
  if (source !== 'folder') return 'high'
  if (picked.nameMatched) return 'high'
  if (picked.alternatives.length === 0) return 'high'
  return picked.wellPlaced ? 'medium' : 'low'
}

// ---------------------------------------------------------------------------
// Utilitaires système de fichiers
// ---------------------------------------------------------------------------

/** Encode en data URL un logo fourni par un manifeste (PNG hors du .exe). */
async function readLogoFile(logoPath?: string): Promise<string | null> {
  if (!logoPath) return null
  try {
    const data = await fsp.readFile(logoPath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return null
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await fsp.stat(target)).isFile()
  } catch {
    return false
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fsp.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fsp.stat(target)).isDirectory()
  } catch {
    return false
  }
}

async function listDirectories(dir: string): Promise<string[]> {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(dir, entry.name))
  } catch {
    return []
  }
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).map((entry) => path.join(dir, entry.name))
  } catch {
    return []
  }
}

/** Clé de comparaison de chemins, insensible à la casse et au séparateur final. */
function normalizeKey(target: string): string {
  return path.resolve(target).toLowerCase().replace(/[\\/]+$/, '')
}

/** Vrai si `target` se trouve dans `dir` (ou est `dir` lui-même). */
function isInside(target: string, dir: string): boolean {
  const relative = path.relative(normalizeKey(dir), normalizeKey(target))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

/**
 * Retire les doublons et les emplacements imbriqués dans un autre.
 * La casse d'origine est conservée : normalizeKey ne sert qu'à comparer, les
 * chemins retournés finissent affichés et stockés dans la bibliothèque.
 */
function dedupeRoots(roots: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const root of roots.filter(Boolean)) {
    const key = normalizeKey(root)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(path.resolve(root))
  }

  return unique.filter((root) => !unique.some((other) => other !== root && isInside(root, other)))
}
