import { ref, onMounted } from 'vue';
import { useLibrary } from '../services/library.service'
import { useScan } from '../services/scan.service'
import { revealInExplorer } from '../services/shell.service'
import { addLocation, useSettingsStore } from '../services/settings.service'

/** Entrée du menu contextuel d'une carte de jeu. */
interface GameOption {
  title: string
  icon: string
  /** Couleur Vuetify — réservée aux actions destructrices. */
  color?: string
  action: (path: string) => void
}

export default {
  setup() {
    const { sortedLibrary, loading, load, add, launch, remove } = useLibrary()
    const { runScan } = useScan()
    const settings = useSettingsStore()

    onMounted(() => { load() })

    /**
     * Recherche semi-automatique. Sans emplacement configuré, on en fait choisir
     * un tout de suite plutôt que de renvoyer l'utilisateur vers les paramètres :
     * la vignette ne doit jamais être une impasse.
     */
    const onScanGames = async () => {
      if (settings.searchLocations.length === 0) {
        const chosen = await addLocation()
        if (!chosen) return
        return runScan([chosen])
      }
      return runScan()
    }

    const deleteDialog = ref({ visible: false, pendingPath: null as string | null })

    const onDeleteRequest = (path: string) => {
      if (settings.confirmBeforeDelete) {
        deleteDialog.value = { visible: true, pendingPath: path }
      } else {
        remove(path)
      }
    }

    const onDeleteConfirm = () => {
      if (deleteDialog.value.pendingPath) remove(deleteDialog.value.pendingPath)
      deleteDialog.value = { visible: false, pendingPath: null }
    }

    const onDeleteCancel = () => {
      deleteDialog.value = { visible: false, pendingPath: null }
    }

    // Même action que le menu du dialogue de détection : l'ordre est identique,
    // action neutre en tête et action destructrice en dernier.
    const options = ref<GameOption[]>([
      {
        title: 'Voir le dossier',
        icon: 'mdi-folder-open-outline',
        action: (path: string) => revealInExplorer(path),
      },
      {
        title: 'Supprimer',
        icon: 'mdi-delete-outline',
        color: 'error',
        action: (path: string) => onDeleteRequest(path),
      },
    ])

    return {
      library: sortedLibrary,
      loadingGames: loading,
      options,
      deleteDialog,
      onAddGame: add,
      onScanGames,
      onLaunchGame: launch,
      onDeleteConfirm,
      onDeleteCancel,
    }
  },
}
