import { ref, onMounted } from 'vue';
import { useLibrary } from '../services/library.service'
import { useSettingsStore } from '../services/settings.service'

export default {
  setup() {
    const { sortedLibrary, loading, load, add, launch, remove } = useLibrary()
    const settings = useSettingsStore()

    onMounted(() => { load() })

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

    const options = ref([
      { title: 'Supprimer', action: (path: string) => onDeleteRequest(path) },
      { title: 'Autre option' },
    ])

    return {
      library: sortedLibrary,
      loadingGames: loading,
      options,
      deleteDialog,
      onAddGame: add,
      onLaunchGame: launch,
      onDeleteConfirm,
      onDeleteCancel,
    }
  },
}
