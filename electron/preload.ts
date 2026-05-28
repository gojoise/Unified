import { ipcRenderer, contextBridge } from 'electron'

/**
 * Pont sécurisé entre le renderer et le main process.
 * Chaque méthode correspond à un canal IPC déclaré dans `electron/main.ts`.
 * Le contrat de types complet est défini dans `electron/electron-env.d.ts`.
 */
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // --- Library API ---
  /** Ouvre le dialogue de sélection d'exécutable et ajoute le jeu à la bibliothèque. */
  addGame: () => ipcRenderer.invoke('add-game'),
  /** Supprime le jeu identifié par son chemin d'accès. */
  deleteGame: (path: string) => ipcRenderer.invoke('delete-game', path),
  /** Retourne la liste complète des jeux enregistrés. */
  loadLibrary: () => ipcRenderer.invoke('load-library'),
  /** Lance l'exécutable du jeu via shell.openPath. */
  launchGame: (path: string) => ipcRenderer.invoke('launch-game', path),

  // --- Settings API ---
  /** Retourne le tableau complet des paramètres. */
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  /** Persiste la valeur d'un paramètre identifié par son code. */
  saveSettingValue: (code: string, value: any) => ipcRenderer.invoke('save-setting-value', code, value),
  /** Ouvre le dialogue de sélection de dossier ; retourne le chemin choisi ou null si annulé. */
  addSearchLocation: () => ipcRenderer.invoke('add-search-location'),
  /** Retourne la valeur d'un paramètre par son code. */
  getSettingValue: (code: string) => ipcRenderer.invoke('get-setting-value', code),
})
