import { reactive, toRaw, watch } from 'vue';
import {
  type AppSettings,
  type SettingRecord,
  DEFAULT_APP_SETTINGS,
} from '../types/settings.types';
import { setNotificationsEnabled } from './notification.service';

const store = reactive<AppSettings>({ ...DEFAULT_APP_SETTINGS });

// Side effects centralisés — chaque paramètre avec un effet de bord est géré ici
watch(
  () => store.enableNotifications,
  (v) => setNotificationsEnabled(v)
);

function applyRecords(records: SettingRecord[]) {
  const map = new Map(records.map((s) => [s.code, s.value]));
  const get = <K extends keyof AppSettings>(key: K): AppSettings[K] =>
    map.has(key) ? (map.get(key) as AppSettings[K]) : DEFAULT_APP_SETTINGS[key];

  store.enableNotifications = get('enableNotifications');
  store.enableAutoUpdate = get('enableAutoUpdate');
  store.launchAtWindowsBoot = get('launchAtWindowsBoot');
  store.enableDarkTheme = get('enableDarkTheme');
  store.searchLocations = Array.isArray(map.get('searchLocations'))
    ? (map.get('searchLocations') as string[])
    : [...DEFAULT_APP_SETTINGS.searchLocations];
  store.ignoredPaths = Array.isArray(map.get('ignoredPaths'))
    ? (map.get('ignoredPaths') as string[])
    : [...DEFAULT_APP_SETTINGS.ignoredPaths];
  store.dismissedPaths = Array.isArray(map.get('dismissedPaths'))
    ? (map.get('dismissedPaths') as string[])
    : [...DEFAULT_APP_SETTINGS.dismissedPaths];
  store.confirmBeforeDelete = get('confirmBeforeDelete');
  store.autoScan = get('autoScan');
  store.minimizeToTray = get('minimizeToTray');
  store.gameStartBehavior = get('gameStartBehavior');
}

/** Charge les paramètres depuis le disque et peuple le store. À appeler une seule fois au démarrage. */
export async function initSettings(): Promise<void> {
  const records = await window.ipcRenderer.loadSettings();
  applyRecords(records ?? []);
}

/** Retourne le store réactif partagé. Seul settings.component écrit dedans via les watches. */
export function useSettingsStore(): AppSettings {
  return store;
}

/** Persiste la nouvelle valeur d'un paramètre identifié par son code. */
export async function saveSettingValue(
  code: string,
  value: unknown
): Promise<void> {
  return window.ipcRenderer.saveSettingValue(code, value);
}

/** Ouvre un dialogue de sélection de dossier ; retourne le chemin choisi ou null si annulé. */
export async function addSearchLocation(): Promise<string | null> {
  return window.ipcRenderer.addSearchLocation();
}

/**
 * Ajoute un emplacement de recherche et le persiste.
 * Point d'entrée unique : utilisé par les paramètres comme par la bibliothèque
 * quand aucun emplacement n'est encore configuré.
 */
export async function addLocation(): Promise<string | null> {
  const chosen = await addSearchLocation();
  if (!chosen) return null;
  if (!store.searchLocations.includes(chosen)) {
    store.searchLocations.push(chosen);
    await saveSettingValue('searchLocations', toRaw(store.searchLocations));
  }
  return chosen;
}

/** Retire l'emplacement de recherche à l'index donné et persiste la liste. */
export async function removeLocation(index: number): Promise<void> {
  store.searchLocations.splice(index, 1);
  await saveSettingValue('searchLocations', toRaw(store.searchLocations));
}

// --- Mémoires de la recherche de jeux ---------------------------------------
// Deux listes volontairement distinctes, réinitialisables séparément :
//   ignoredPaths   — « Ne plus proposer », choix explicite sur un dossier
//   dismissedPaths — candidats laissés décochés à la validation d'une recherche
// Elles sont écrites depuis le renderer pour que les compteurs affichés dans les
// paramètres restent à jour sans recharger les paramètres depuis le disque.

/** Ajoute des dossiers à une mémoire de recherche, sans doublon. */
async function rememberPaths(
  key: 'ignoredPaths' | 'dismissedPaths',
  paths: string[]
): Promise<void> {
  const known = new Set(store[key].map((entry) => entry.toLowerCase()));
  const added = paths.filter((entry) => !known.has(entry.toLowerCase()));
  if (added.length === 0) return;

  store[key].push(...added);
  await saveSettingValue(key, toRaw(store[key]));
}

/** « Ne plus proposer » : exclut définitivement un dossier des recherches. */
export async function ignorePath(target: string): Promise<void> {
  return rememberPaths('ignoredPaths', [target]);
}

/** Mémorise les candidats laissés décochés pour ne plus les reproposer. */
export async function dismissPaths(paths: string[]): Promise<void> {
  return rememberPaths('dismissedPaths', paths);
}

/** Vide une mémoire de recherche : les jeux concernés seront de nouveau proposés. */
export async function forgetPaths(
  key: 'ignoredPaths' | 'dismissedPaths'
): Promise<void> {
  store[key] = [];
  await saveSettingValue(key, []);
}
