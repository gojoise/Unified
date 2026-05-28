import fs from "fs";
import { app, dialog } from "electron";
import path from "path";
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, "settings.json");

/**
 * Initialiser le fichier de paramètres avec des valeurs par défaut
 */
export function initializeSettingsDefaults(): Setting[] {
  const defaults: Setting[] = [
    new Setting('enableNotifications', 'Activer les notifications', true),
    new Setting('enableAutoUpdate', 'Activer les mises à jour automatiques', false),
    new Setting('launchAtWindowsBoot', 'Lancer au démarrage de Windows', true),
    new Setting('enableDarkTheme', 'Thème sombre', false),
    new Setting('searchLocations', 'Emplacements de recherche', []),
  ];

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(defaults, null, 2), "utf-8");
    return defaults;
  } catch (e) {
    // log mais ne throw pas pour rester résilient
    console.error('initializeSettingsDefaults error:', e);
    return [];
  }
}


/**
 * Charger le fichier des paramètres ou créer un nouveau fichier
 */ 
export function loadSettings(): Setting[] {
  
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, JSON.stringify([], null, 2), "utf-8");
      return initializeSettingsDefaults();
    }

    const content = fs.readFileSync(settingsPath, "utf-8");
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as Setting[]) : [];
    } catch (parseErr) {
      console.error('Failed to parse settings.json, returning empty settings:', parseErr);
      return initializeSettingsDefaults();
    }
}

/**
 * Récupérer une valeur de paramètre par son code
 */
export function getSettingValue(code: string): any {
  const settings: Setting[] = loadSettings();
  const setting = settings.find(s => s.code === code);
  return setting ? setting.value : null;
}

/**
 * Persiste la nouvelle valeur d'un paramètre identifié par son code.
 * Si le code n'existe pas encore, un nouveau paramètre est créé.
 */
export function saveSettingValue(code: string, value: any) {
  let settings: Setting[] = loadSettings();
  const idx = settings.findIndex(s => s.code === code);
  if (idx !== -1) {
    settings[idx].value = value;
  } else {
    // Si le paramètre n'existe pas, on peut l'ajouter
    settings.push(new Setting(code, code, value));
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Ouvrir un dialogue pour sélectionner un dossier (explorateur Windows)
 */
export async function addSearchLocation(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Sélectionner un dossier',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}


class Setting {
  code: string;
  label: string;
  value: any;

  constructor(code: string, label: string, value: any) {
    this.code = code;
    this.label = label;
    this.value = value;
  }
}
