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
  /** Épingle ou désépingle le jeu identifié par son chemin d'accès. */
  setGameFavorite: (path: string, favorite: boolean) => ipcRenderer.invoke('set-game-favorite', path, favorite),
  /** Applique le paramètre « Comportement au lancement d'un jeu » (rien / réduire / tray / quitter). */
  applyGameStartBehavior: () => ipcRenderer.invoke('apply-game-start-behavior'),

  // --- Scan API ---
  /** Lance un scan des emplacements donnés (ou de tous ceux configurés) et retourne les candidats. */
  scanLocations: (locations?: string[]) => ipcRenderer.invoke('scan-locations', locations),
  /** Interrompt le scan en cours. */
  abortScan: () => ipcRenderer.invoke('abort-scan'),
  /** Ouvre l'explorateur sur le dossier du fichier, fichier sélectionné. */
  revealInExplorer: (target: string) => ipcRenderer.invoke('reveal-in-explorer', target),
  /** Retourne l'icône d'un exécutable en data URL (vide si le .exe n'en porte pas). */
  extractExeIcon: (exePath: string) => ipcRenderer.invoke('extract-exe-icon', exePath),
  /** Ajoute en une fois les candidats validés ; retourne le nombre de jeux ajoutés. */
  addGames: (selections: { path: string; title?: string }[]) => ipcRenderer.invoke('add-games', selections),
  /** S'abonne à la progression du scan ; retourne la fonction de désabonnement. */
  onScanProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('scan-progress', listener)
    return () => ipcRenderer.off('scan-progress', listener)
  },
  /** S'abonne aux résultats d'un scan automatique déclenché au démarrage. */
  onAutoScanResult: (callback: (candidates: any[]) => void) => {
    const listener = (_event: any, candidates: any[]) => callback(candidates)
    ipcRenderer.on('auto-scan-result', listener)
    return () => ipcRenderer.off('auto-scan-result', listener)
  },

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
