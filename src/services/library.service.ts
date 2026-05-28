import { ref, computed } from 'vue'
import { useNotification } from './notification.service'

// Wrappers renderer autour des méthodes IPC exposées par electron/preload.ts.
// Ces fonctions sont de simples relais vers window.ipcRenderer ; la logique métier
// réside dans le main process (electron/libraryManager.ts).

export async function loadLibrary(): Promise<any[]> {
  return window.ipcRenderer.loadLibrary()
}
export async function addGame(): Promise<void> {
  return window.ipcRenderer.addGame()
}
export async function launchGame(path: string): Promise<void> {
  return window.ipcRenderer.launchGame(path)
}
export async function deleteGame(path: string): Promise<void> {
  return window.ipcRenderer.deleteGame(path)
}

/**
 * Composable gérant la bibliothèque de jeux côté renderer.
 *
 * État réactif :
 * - `library`  — liste des jeux chargés depuis le JSON persistant
 * - `loading`  — Map<chemin, booléen> indiquant les jeux en cours de lancement
 *               (délai minimum de 2 s pour laisser l'animation visible)
 *
 * Actions : `load`, `add`, `launch`, `remove`
 */
export function useLibrary() {
  const library = ref<any[]>([])
  const loading = ref(new Map<string, boolean>())
  const { notifySuccess, notifyError, notifyWarning } = useNotification()

  const load = async () => {
    try {
      const result = await loadLibrary()
      library.value = result || []
      return library.value
    } catch (error) {
      notifyWarning('Impossible de charger la bibliothèque')
      return []
    }
  }

  const add = async () => {
    try {
      await addGame()
      await load()
      notifySuccess('Jeu ajouté à la bibliothèque')
    } catch (error) {
      notifyError("Impossible d'ajouter le jeu")
    }
  }

  const launch = async (path: string) => {
    loading.value.set(path, true)
    // Délai minimum pour que l'animation de chargement reste visible
    const minDelay = new Promise((resolve) => setTimeout(resolve, 2000))
    try {
      await Promise.all([launchGame(path), minDelay])
    } catch (error) {
      notifyError('Impossible de lancer le jeu')
    } finally {
      loading.value.set(path, false)
    }
  }

  const remove = async (path: string) => {
    try {
      await deleteGame(path)
      await load()
    } catch (error) {
      notifyError('Impossible de supprimer le jeu')
    }
  }

  const sortedLibrary = computed(() =>
    [...library.value].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  )

  return { library, sortedLibrary, loading, load, add, launch, remove }
}
