import fs from "fs";
import { dialog, app } from "electron";
import { shell } from "electron";
import path from "path";

/** Entrée persistée dans user-library.json. */
export interface GameEntry {
    title: string;
    path: string;
    gameIcon: string;
    lastLaunched: string | null;
}

const userDataPath = app.getPath('userData');
const libraryPath = path.join(userDataPath, "user-library.json");

/**
 * Charge la bibliothèque depuis le JSON ou crée le fichier s'il n'existe pas encore.
 */
export function loadLibrary(): GameEntry[] {
    if (fs.existsSync(libraryPath)) {
        return JSON.parse(fs.readFileSync(libraryPath, "utf-8"));
    } else {
        fs.writeFileSync(libraryPath, JSON.stringify([], null, 2), "utf-8");
    }
    return [];
};

function saveLibrary(library: GameEntry[]): void {
    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2), "utf-8");
}

/**
 * Icône d'un exécutable, en data URL. Retourne une chaîne vide si le .exe n'en
 * embarque pas ou n'est pas lisible — l'appelant retombe alors sur la vignette
 * par défaut plutôt que d'échouer.
 */
export function extractExeIcon(exePath: string): Promise<string> {
    return app.getFileIcon(exePath, { size: 'large' })
        .then(nativeIcon => nativeIcon.toDataURL())
        .catch(() => '');
}

/**
 * Construit une entrée de bibliothèque à partir d'un chemin d'exécutable.
 * Commun à l'ajout manuel et au scan semi-automatique : extraction de l'icône
 * depuis le .exe et détection du titre.
 */
export async function createGameEntry(
    exePath: string,
    forcedTitle?: string,
    forcedIcon?: string,
): Promise<GameEntry> {
    // Les jeux Xbox n'embarquent pas leur icône dans le .exe : le scan la fournit.
    const gameIcon = forcedIcon || (await extractExeIcon(exePath));

    return {
        title: forcedTitle?.trim() || extractGameTitle(exePath),
        path: exePath,
        gameIcon,
        lastLaunched: null as string | null,
    };
}

/**
 * Ouvre un dialogue de sélection de fichier exécutable, extrait l'icône du .exe
 * sous forme de data URL, et ajoute le jeu à la bibliothèque s'il n'y est pas déjà.
 */
export function addGame(): Promise<void> {
    return dialog.showOpenDialog({
        title: 'Sélectionner le fichier exécutable du jeu',
        filters: [
            { name: 'Fichiers exécutables', extensions: ['exe', 'app', 'sh'] },
        ],
        properties: ['openFile'],
    }).then((value) => {
        if (value.canceled) return;

        return createGameEntry(value.filePaths[0]).then((extractedGame) => {
            const lib = loadLibrary();
            addGameIfUnique(lib, extractedGame);
            saveLibrary(lib);
        });
    });
}

/**
 * Ajout groupé utilisé par la détection semi-automatique.
 * Retourne le nombre d'entrées réellement ajoutées (les doublons sont ignorés).
 */
export async function addGames(
    selections: { path: string; title?: string; gameIcon?: string }[],
): Promise<number> {
    const lib = loadLibrary();
    const before = lib.length;

    for (const selection of selections) {
        try {
            addGameIfUnique(lib, await createGameEntry(selection.path, selection.title, selection.gameIcon));
        } catch (error) {
            console.error('addGames : entrée ignorée', selection.path, error);
        }
    }

    saveLibrary(lib);
    return lib.length - before;
}

function addGameIfUnique(library: GameEntry[], game: GameEntry) {
    if (!library.some((element) => element.path === game.path)) {
        library.push(game);
    };
}

/**
 * Supprime le jeu correspondant au chemin donné de la bibliothèque.
 */
export function deleteGame(gamePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const lib = loadLibrary();
            saveLibrary(lib.filter((game) => game.path !== gamePath));
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Lance l'exécutable du jeu et met à jour lastLaunched dans la bibliothèque.
 */
export function launchGame(exePath: string): Promise<void> {
    return shell.openPath(exePath).then(() => {
        const lib = loadLibrary();
        const game = lib.find(g => g.path === exePath);
        if (game) {
            game.lastLaunched = new Date().toISOString();
            saveLibrary(lib);
        }
    });
}

/**
 * Ouvre l'explorateur sur le dossier du fichier, fichier sélectionné.
 * Sans effet si le chemin n'existe plus.
 */
export function revealInExplorer(target: string): void {
    shell.showItemInFolder(target);
}

// ---------------------------------------------------------------------------
// Détection du titre — 5 couches, de la plus à la moins fiable
// ---------------------------------------------------------------------------

/**
 * Détermine le titre d'un jeu depuis son chemin d'exécutable.
 * Essaie successivement 5 stratégies et retourne la première qui aboutit.
 */
export function extractGameTitle(exePath: string): string {
    return getXboxTitle(exePath)
        ?? getGogTitle(exePath)
        ?? getSteamTitle(exePath)
        ?? getFolderTitle(exePath)
        ?? normalizeTitle(path.basename(exePath, path.extname(exePath)));
}

/** Manifestes d'un package Xbox / Microsoft Store, du plus au moins fiable. */
export const XBOX_MANIFESTS = ['MicrosoftGame.Config', 'appxmanifest.xml'];

/**
 * Nombre de niveaux remontés depuis le dossier du .exe pour trouver le manifeste.
 * Le cas courant est <Jeu>/Content/jeu.exe, mais certains titres rangent leur
 * binaire un cran plus bas.
 */
const XBOX_LOOKUP_DEPTH = 3;

/**
 * Couche 1 — jeu Xbox / Microsoft Store. Le manifeste GDK vit dans le dossier
 * Content du jeu et déclare le nom d'affichage en clair — y compris la
 * ponctuation qu'un nom de dossier ne peut pas porter (« Age of Mythology: Retold »).
 */
function getXboxTitle(exePath: string): string | null {
    const manifestDir = findXboxManifestDir(path.dirname(exePath));
    return manifestDir ? readXboxDisplayName(manifestDir) : null;
}

/** Remonte depuis le dossier du .exe jusqu'au dossier portant un manifeste Xbox. */
export function findXboxManifestDir(startDir: string): string | null {
    let dir = startDir;

    for (let depth = 0; depth < XBOX_LOOKUP_DEPTH; depth++) {
        if (XBOX_MANIFESTS.some(name => fs.existsSync(path.join(dir, name)))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
    return null;
}

/** Lit le nom d'affichage déclaré par MicrosoftGame.Config, sinon par appxmanifest.xml. */
export function readXboxDisplayName(manifestDir: string): string | null {
    const config = readTextFile(path.join(manifestDir, 'MicrosoftGame.Config'));
    const fromConfig = config?.match(/DefaultDisplayName="([^"]+)"/i)?.[1];
    if (fromConfig) return fromConfig;

    const appx = readTextFile(path.join(manifestDir, 'appxmanifest.xml'));
    const fromAppx = appx?.match(/<DisplayName>([^<]+)/i)?.[1];
    // « ms-resource:... » n'est résoluble qu'avec le resources.pri : on laisse
    // alors la main aux couches suivantes plutôt que d'afficher la référence.
    return fromAppx && !fromAppx.startsWith('ms-resource:') ? fromAppx : null;
}

/** Lecture tolérante : retourne null si le fichier est absent ou illisible. */
function readTextFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}


/**
 * Couche 2a — cherche un fichier goggame-*.info dans le dossier du .exe
 * et lit le champ "name" (JSON natif, très fiable).
 */
function getGogTitle(exePath: string): string | null {
    try {
        const dir = path.dirname(exePath);
        const gogFile = fs.readdirSync(dir).find(f => /^goggame-\d+\.info$/.test(f));
        if (!gogFile) return null;
        const data = JSON.parse(fs.readFileSync(path.join(dir, gogFile), 'utf-8'));
        return data.name || null;
    } catch {
        return null;
    }
}

/**
 * Couche 2b — remonte jusqu'au dossier steamapps/ dans l'arborescence,
 * trouve l'appmanifest_*.acf correspondant et lit le champ "name".
 */
function getSteamTitle(exePath: string): string | null {
    try {
        const parts = path.normalize(exePath).split(path.sep);
        const steamappsIdx = parts.findIndex(p => p.toLowerCase() === 'steamapps');
        if (steamappsIdx === -1) return null;

        const steamappsDir = parts.slice(0, steamappsIdx + 1).join(path.sep);
        const commonIdx = parts.findIndex((p, i) => i > steamappsIdx && p.toLowerCase() === 'common');
        if (commonIdx === -1) return null;

        const gameDir = parts[commonIdx + 1];
        const acfFiles = fs.readdirSync(steamappsDir).filter(f => /^appmanifest_\d+\.acf$/.test(f));

        for (const acfFile of acfFiles) {
            const content = fs.readFileSync(path.join(steamappsDir, acfFile), 'utf-8');
            const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
            if (installDirMatch?.[1].toLowerCase() === gameDir.toLowerCase()) {
                const nameMatch = content.match(/"name"\s+"([^"]+)"/);
                return nameMatch?.[1] ?? null;
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Dossiers « techniques » : ils contiennent le .exe mais ne portent jamais le nom
 * du jeu. Comparés en minuscules, séparateurs retirés, et avec un éventuel suffixe
 * d'architecture ignoré — ce qui couvre bin, Bin32, Win64, Binaries64, x86_64...
 */
const TECHNICAL_DIRS = new Set([
    'bin', 'binary', 'binaries', 'exe', 'exes', 'executable', 'executables',
    'win', 'windows', 'x86', 'x64', 'x8664', 'amd64', 'ia32', 'arm', 'arm64',
    'release', 'debug', 'retail', 'shipping', 'build', 'builds', 'dist', 'native',
    'app', 'application', 'client', 'launcher', 'game', 'games', 'program', 'programs',
    'data', 'system', 'engine', 'redist', 'redistributable', 'runtime', 'support',
    'content', 'contents',
]);

/**
 * Dossiers « conteneurs » : racines d'installation ou de plateforme. Si on remonte
 * jusqu'à l'un d'eux, c'est qu'il n'y a plus de nom de jeu exploitable dans le
 * chemin — le nom du .exe reste alors le meilleur candidat.
 */
const CONTAINER_DIRS = new Set([
    'programfiles', 'programfilesx86', 'programdata', 'users', 'desktop', 'downloads',
    'documents', 'steam', 'steamapps', 'common', 'steamlibrary', 'gog', 'goggalaxy',
    'epicgames', 'epicgameslauncher', 'origin', 'eagames', 'ea', 'ubisoft',
    'ubisoftgamelauncher', 'battlenet', 'xboxgames', 'itchio', 'emulation', 'roms',
]);

/** Normalise un nom de dossier pour la comparaison (casse et séparateurs ignorés). */
export function canonicalizeDirName(name: string): string {
    return name.toLowerCase().replace(/[\s._\-()[\]]/g, '');
}

/** Vrai si le dossier est un dossier technique, suffixe d'architecture inclus. */
export function isTechnicalDir(name: string): boolean {
    const canonical = canonicalizeDirName(name);
    if (canonical === '') return true;
    if (TECHNICAL_DIRS.has(canonical)) return true;

    const withoutArch = canonical.replace(/(?:x?(?:32|64)|32bit|64bit|bit)$/, '');
    return withoutArch !== canonical && withoutArch !== '' && TECHNICAL_DIRS.has(withoutArch);
}

/** Vrai si le segment est une racine de volume ("C:", partage UNC) et non un dossier. */
function isPathRoot(segment: string): boolean {
    return segment === '' || /^[a-z]:$/i.test(segment);
}

/**
 * Couche 3 — remonte au premier dossier parent du .exe qui ne soit pas un dossier
 * technique (bin, Bin32, Binaries/Win64, Release...) et prend son nom normalisé.
 * Retourne null si on atteint la racine du volume ou un dossier conteneur.
 */
function getFolderTitle(exePath: string): string | null {
    const parts = path.normalize(exePath).split(path.sep);
    // Le dernier segment est le .exe lui-même : on part de son dossier parent.
    let parentIndex = parts.length - 2;

    while (parentIndex >= 0 && !isPathRoot(parts[parentIndex]) && isTechnicalDir(parts[parentIndex])) {
        parentIndex--;
    }
    if (parentIndex < 0 || isPathRoot(parts[parentIndex])) return null;
    if (CONTAINER_DIRS.has(canonicalizeDirName(parts[parentIndex]))) return null;

    return normalizeTitle(parts[parentIndex]) || null;
}

/**
 * Motifs de numéro de version, appliqués AVANT que les séparateurs ne deviennent
 * des espaces : « v1.2.3 » n'est plus reconnaissable une fois les points effacés.
 *
 * Aucun de ces motifs ne touche un nombre isolé : « Fallout 4 », « Portal 2 » ou
 * « Cyberpunk 2077 » portent un numéro qui fait partie du titre.
 */
// \b ne convient pas ici : l'underscore est un caractère de mot, donc « Jeu_v1.05 »
// n'offre aucune frontière avant le « v ». On délimite explicitement sur
// « ni lettre ni chiffre ».
const VERSION_PATTERNS = [
    /(?<![a-z0-9])v\d+(?:[._]\d+)*(?![a-z0-9])/gi,              // v1, v1.2, v1_05
    /(?<![a-z0-9])\d+(?:[._]\d+)+(?![a-z0-9])/gi,               // 1.2, 1.0.5 — deux groupes minimum
    /(?<![a-z0-9])build[\s._-]*\d+(?:[._]\d+)*(?![a-z0-9])/gi,  // build 12345, build.2.7
];

/**
 * Normalise un nom brut en titre lisible : retire le numéro de version, remplace
 * les séparateurs (. _) par des espaces et nettoie ce que le retrait a laissé
 * derrière lui (parenthèses vides, tiret ou espace en fin de chaîne).
 */
export function normalizeTitle(raw: string): string {
    const withoutVersion = VERSION_PATTERNS.reduce(
        (value, pattern) => value.replace(pattern, ' '),
        raw,
    );

    return withoutVersion
        .replace(/[._]/g, ' ')
        .replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, '')   // délimiteurs vidés par le retrait
        .replace(/\s+/g, ' ')
        .replace(/[\s\-–—]+$/, '')                   // séparateur resté en fin de titre
        .trim();
}
