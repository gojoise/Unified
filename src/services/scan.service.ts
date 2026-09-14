import { computed, reactive } from 'vue'
import { useNotification } from './notification.service'
import { useLibrary } from './library.service'
import { dismissPaths, ignorePath } from './settings.service'
import type { ScanCandidate, ScanEntry, ScanProgress } from '../types/scan.types'

/**
 * Détection semi-automatique côté renderer.
 *
 * Singleton au niveau du module, comme notification.service : les quatre points
 * d'entrée (bibliothèque, paramètres, ajout d'un emplacement, scan au démarrage)
 * partagent le même état et le même dialogue de validation, monté une seule fois
 * dans `unified.vue`.
 */

interface ScanState {
  /** Un scan est en cours — sert aussi de garde contre les déclenchements concurrents. */
  scanning: boolean
  progress: ScanProgress
  entries: ScanEntry[]
  dialogVisible: boolean
  /** Vrai quand le dernier scan s'est terminé sans rien trouver de nouveau. */
  finishedEmpty: boolean
}

const state = reactive<ScanState>({
  scanning: false,
  progress: { scanned: 0, total: 0, found: 0, current: '' },
  entries: [],
  dialogVisible: false,
  finishedEmpty: false,
})

let unsubscribe: (() => void)[] = []

/** Transforme les candidats bruts en entrées éditables, pré-cochées selon la confiance. */
function toEntries(candidates: ScanCandidate[]): ScanEntry[] {
  return candidates.map((candidate) => ({
    ...candidate,
    selected: candidate.confidence !== 'low',
    manualChoice: false,
  }))
}

/**
 * Abonne le renderer aux évènements du main process.
 * Appelé une seule fois depuis `unified.vue`.
 */
export function initScan(): void {
  if (unsubscribe.length > 0) return
  const { notify } = useNotification()

  unsubscribe.push(
    window.ipcRenderer.onScanProgress((progress: ScanProgress) => {
      state.progress = progress
    }),
  )

  // Scan silencieux au démarrage : pas de dialogue imposé, juste une notification
  // cliquable s'il y a effectivement des nouveautés.
  unsubscribe.push(
    window.ipcRenderer.onAutoScanResult((candidates: ScanCandidate[]) => {
      if (candidates.length === 0) return
      state.entries = toEntries(candidates)
      state.finishedEmpty = false
      notify(
        `${candidates.length} nouveau${candidates.length > 1 ? 'x' : ''} jeu${candidates.length > 1 ? 'x' : ''} détecté${candidates.length > 1 ? 's' : ''}`,
        'info',
        10000,
        { label: 'Voir', onClick: () => { state.dialogVisible = true } },
      )
    }),
  )
}

export function useScan() {
  const { notifySuccess, notifyError, notifyInfo } = useNotification()
  const { load } = useLibrary()

  const selectedCount = computed(() => state.entries.filter((entry) => entry.selected).length)
  const allSelected = computed(
    () => state.entries.length > 0 && selectedCount.value === state.entries.length,
  )

  /**
   * Lance un scan. `locations` non fourni = tous les emplacements configurés.
   * Le dialogue s'ouvre immédiatement pour afficher la progression.
   */
  const runScan = async (locations?: string[]) => {
    if (state.scanning) {
      notifyInfo('Une recherche est déjà en cours')
      state.dialogVisible = true
      return
    }

    state.scanning = true
    state.entries = []
    state.finishedEmpty = false
    state.progress = { scanned: 0, total: 0, found: 0, current: '' }
    state.dialogVisible = true

    try {
      const candidates = await window.ipcRenderer.scanLocations(locations)
      state.entries = toEntries(candidates)
      state.finishedEmpty = candidates.length === 0
    } catch (error) {
      state.dialogVisible = false
      notifyError('La recherche de jeux a échoué')
    } finally {
      state.scanning = false
    }
  }

  /** Interrompt le parcours en cours ; les candidats déjà trouvés sont perdus. */
  const cancelScan = async () => {
    if (!state.scanning) return
    await window.ipcRenderer.abortScan()
  }

  /**
   * Valide la recherche : les candidats cochés rejoignent la bibliothèque, les
   * décochés sont mémorisés pour ne plus être reproposés. C'est ce qui distingue
   * ce bouton de « Plus tard », qui ne retient rien.
   */
  const confirmSelection = async () => {
    const selected = state.entries.filter((entry) => entry.selected)
    const dismissed = state.entries.filter((entry) => !entry.selected)

    try {
      if (dismissed.length > 0) {
        await dismissPaths(dismissed.map((entry) => entry.installDir))
      }

      if (selected.length > 0) {
        // gameIcon est transmis : les jeux Xbox portent le logo de leur manifeste,
        // que le main process ne saurait pas retrouver depuis le seul .exe.
        const added = await window.ipcRenderer.addGames(
          selected.map((entry) => ({
            path: entry.exePath,
            title: entry.title,
            gameIcon: entry.gameIcon,
          })),
        )
        await load()
        notifySuccess(added > 1 ? `${added} jeux ajoutés à la bibliothèque` : 'Jeu ajouté à la bibliothèque')
      } else {
        notifyInfo(
          `${dismissed.length > 1 ? dismissed.length + ' jeux écartés' : 'Jeu écarté'} — réversible dans les paramètres`,
        )
      }

      state.dialogVisible = false
      state.entries = []
    } catch (error) {
      notifyError("Impossible d'enregistrer votre sélection")
    }
  }

  /**
   * Ouvre l'explorateur sur l'exécutable retenu — le moyen le plus direct de
   * vérifier si c'est le bon binaire avant de trancher.
   */
  const revealEntry = async (entry: ScanEntry) => {
    try {
      await window.ipcRenderer.revealInExplorer(entry.exePath)
    } catch (error) {
      notifyError("Impossible d'ouvrir l'emplacement du fichier")
    }
  }

  /** Exclut définitivement le dossier d'un candidat des prochains scans. */
  const ignoreEntry = async (entry: ScanEntry) => {
    try {
      await ignorePath(entry.installDir)
      state.entries = state.entries.filter((candidate) => candidate !== entry)
      notifyInfo(`« ${entry.title} » ne sera plus proposé`)
    } catch (error) {
      notifyError("Impossible d'ignorer ce dossier")
    }
  }

  /**
   * Remplace l'exécutable retenu par une des alternatives du même dossier.
   * L'icône suit : elle était extraite du binaire initialement élu. Celles qui
   * viennent d'un manifeste (logo Xbox) sont conservées — elles décrivent le jeu,
   * pas le binaire.
   */
  const chooseExecutable = async (entry: ScanEntry, exePath: string) => {
    if (exePath === entry.exePath) return

    entry.alternatives = [entry.exePath, ...entry.alternatives.filter((alt) => alt !== exePath)]
    entry.exePath = exePath
    entry.selected = true
    entry.manualChoice = true

    if (entry.iconFromManifest) return
    try {
      entry.gameIcon = await window.ipcRenderer.extractExeIcon(exePath)
    } catch (error) {
      entry.gameIcon = ''
    }
  }

  const toggleAll = () => {
    const next = !allSelected.value
    state.entries.forEach((entry) => { entry.selected = next })
  }

  /** « Plus tard » : ferme sans rien mémoriser, tout sera reproposé au prochain scan. */
  const closeDialog = () => {
    state.dialogVisible = false
  }

  return {
    scan: state,
    selectedCount,
    allSelected,
    runScan,
    cancelScan,
    revealEntry,
    confirmSelection,
    ignoreEntry,
    chooseExecutable,
    toggleAll,
    closeDialog,
  }
}
