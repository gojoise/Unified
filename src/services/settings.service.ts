import { reactive, watch } from 'vue'
import { type AppSettings, type SettingRecord, DEFAULT_APP_SETTINGS } from '../types/settings.types'
import { setNotificationsEnabled } from './notification.service'

const store = reactive<AppSettings>({ ...DEFAULT_APP_SETTINGS })

// Side effects centralisés — chaque paramètre avec un effet de bord est géré ici
watch(() => store.enableNotifications, v => setNotificationsEnabled(v))

function applyRecords(records: SettingRecord[]) {
  const map = new Map(records.map(s => [s.code, s.value]))
  const get = <K extends keyof AppSettings>(key: K): AppSettings[K] =>
    map.has(key) ? (map.get(key) as AppSettings[K]) : DEFAULT_APP_SETTINGS[key]

  store.enableNotifications = get('enableNotifications')
  store.enableAutoUpdate    = get('enableAutoUpdate')
  store.launchAtWindowsBoot = get('launchAtWindowsBoot')
  store.enableDarkTheme     = get('enableDarkTheme')
  store.searchLocations     = Array.isArray(map.get('searchLocations'))
    ? (map.get('searchLocations') as string[])
    : [...DEFAULT_APP_SETTINGS.searchLocations]
  store.confirmBeforeDelete = get('confirmBeforeDelete')
  store.autoScan            = get('autoScan')
  store.minimizeToTray      = get('minimizeToTray')
  store.gameStartBehavior   = get('gameStartBehavior')
}

/** Charge les paramètres depuis le disque et peuple le store. À appeler une seule fois au démarrage. */
export async function initSettings(): Promise<void> {
  const records = await window.ipcRenderer.loadSettings()
  applyRecords(records ?? [])
}

/** Retourne le store réactif partagé. Seul settings.component écrit dedans via les watches. */
export function useSettingsStore(): AppSettings {
  return store
}

/** Persiste la nouvelle valeur d'un paramètre identifié par son code. */
export async function saveSettingValue(code: string, value: unknown): Promise<void> {
  return window.ipcRenderer.saveSettingValue(code, value)
}

/** Ouvre un dialogue de sélection de dossier ; retourne le chemin choisi ou null si annulé. */
export async function addSearchLocation(): Promise<string | null> {
  return window.ipcRenderer.addSearchLocation()
}
