/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: IpcRendererWithCustomMethods;
}

interface IpcRendererWithCustomMethods extends import('electron').IpcRenderer {
  addGame: () => Promise<any>;
  deleteGame: (path: string) => Promise<any>;
  loadLibrary: () => Promise<any[]>;
  launchGame: (path: string) => Promise<void>;
  applyGameStartBehavior: () => Promise<void>;
  addGames: (selections: { path: string; title?: string; gameIcon?: string }[]) => Promise<number>;
  scanLocations: (locations?: string[]) => Promise<import('./gameScanner').ScanCandidate[]>;
  abortScan: () => Promise<void>;
  extractExeIcon: (exePath: string) => Promise<string>;
  revealInExplorer: (target: string) => Promise<void>;
  onScanProgress: (callback: (progress: import('./gameScanner').ScanProgress) => void) => () => void;
  onAutoScanResult: (callback: (candidates: import('./gameScanner').ScanCandidate[]) => void) => () => void;
  loadSettings: () => Promise<any[]>;
  saveSettingValue: (code: string, value: any) => Promise<void>;
  addSearchLocation: () => Promise<string | null>;
  getSettingValue: (code: string) => Promise<any>;
}
