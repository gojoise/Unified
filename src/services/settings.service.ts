import { ref } from 'vue';

// Wrappers renderer autour des méthodes IPC exposées par electron/preload.ts.
// La logique de persistence réside dans le main process (electron/settings.ts).

/** Retourne le tableau complet des paramètres depuis le fichier settings.json. */
export async function loadSettings(): Promise<any[]> {
  return window.ipcRenderer.loadSettings();
}

/** Persiste la nouvelle valeur d'un paramètre identifié par son code. */
export async function saveSettingValue(code: string, value: any): Promise<void> {
  return window.ipcRenderer.saveSettingValue(code, value);
}

/** Ouvre un dialogue de sélection de dossier ; retourne le chemin ou null si annulé. */
export async function addSearchLocation(): Promise<string | null> {
  return window.ipcRenderer.addSearchLocation();
}

/** Retourne la valeur d'un paramètre par son code, ou null s'il n'existe pas. */
export async function getSettingValue(code: string): Promise<any> {
  return window.ipcRenderer.getSettingValue(code);
}

/**
 * Composable pour charger et sauvegarder les paramètres.
 * Note : `settings.component.ts` appelle directement les fonctions ci-dessus
 * pour un contrôle fin ; ce composable est disponible pour les autres consommateurs.
 */
export function useSettings() {
  const settings = ref<any[]>([]);

  const load = async () => {
    settings.value = await loadSettings();
    return settings.value;
  };

  const save = async (code: string, value: any) => {
    await saveSettingValue(code, value);
    await load();
  };

  return { settings, load, save };
}
