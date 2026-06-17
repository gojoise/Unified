export type GameStartBehavior = 'nothing' | 'minimize' | 'close-to-tray' | 'close'

export interface AppSettings {
  enableNotifications: boolean
  enableAutoUpdate: boolean
  launchAtWindowsBoot: boolean
  enableDarkTheme: boolean
  searchLocations: string[]
  confirmBeforeDelete: boolean
  autoScan: boolean
  minimizeToTray: boolean
  gameStartBehavior: GameStartBehavior
}

/** Format de persistance d'un paramètre dans settings.json */
export interface SettingRecord {
  code: string
  label: string
  value: unknown
}

export const SETTINGS_LABELS: Record<keyof AppSettings, string> = {
  enableNotifications:  'Notifications',
  enableAutoUpdate:     'Mises à jour automatiques',
  launchAtWindowsBoot:  'Lancement au démarrage de Windows',
  enableDarkTheme:      'Thème sombre',
  searchLocations:      'Emplacements de recherche',
  confirmBeforeDelete:  'Confirmation avant suppression',
  autoScan:             'Scan automatique',
  minimizeToTray:       'Minimiser dans le tray',
  gameStartBehavior:    'Comportement au lancement d\'un jeu',
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  enableNotifications: true,
  enableAutoUpdate: false,
  launchAtWindowsBoot: true,
  enableDarkTheme: false,
  searchLocations: [],
  confirmBeforeDelete: false,
  autoScan: false,
  minimizeToTray: false,
  gameStartBehavior: 'nothing',
}
