var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, dialog, shell, BrowserWindow, globalShortcut, ipcMain, Tray, Menu } from "electron";
import { fileURLToPath } from "node:url";
import fs from "fs";
import path from "path";
import path$1 from "node:path";
const userDataPath$1 = app.getPath("userData");
const libraryPath = path.join(userDataPath$1, "user-library.json");
function loadLibrary() {
  if (fs.existsSync(libraryPath)) {
    return JSON.parse(fs.readFileSync(libraryPath, "utf-8"));
  } else {
    fs.writeFileSync(libraryPath, JSON.stringify([], null, 2), "utf-8");
  }
  return [];
}
function saveLibrary(library) {
  fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2), "utf-8");
}
function addGame() {
  return dialog.showOpenDialog({
    title: "Sélectionner le fichier exécutable du jeu",
    filters: [
      { name: "Fichiers exécutables", extensions: ["exe", "app", "sh"] }
    ],
    properties: ["openFile"]
  }).then((value) => {
    const lib = loadLibrary();
    if (!value.canceled) {
      const extractedGame = {
        title: extractGameTitle(value.filePaths[0]),
        path: value.filePaths[0]
      };
      addIfNotAlreadyExist(lib, extractedGame);
    }
    saveLibrary(lib);
  });
}
function addIfNotAlreadyExist(library, game) {
  if (!library.some((element) => element.path === game.path)) {
    library.push(game);
  }
}
function deleteGame(path2) {
  return new Promise((resolve, reject) => {
    try {
      const lib = loadLibrary();
      saveLibrary(lib.filter((game) => game.path !== path2));
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}
function launchGame(exePath) {
  shell.openPath(exePath);
}
function extractGameTitle(exePath) {
  const parts = path.normalize(exePath).split(path.sep).filter((part) => part !== "");
  if (parts.length < 2) {
    return null;
  }
  let parentIndex = parts.length - 2;
  if (parts[parentIndex].toLowerCase().includes("bin")) {
    parentIndex--;
  }
  if (parentIndex < 0) {
    return null;
  }
  return parts[parentIndex];
}
const userDataPath = app.getPath("userData");
const settingsPath = path.join(userDataPath, "settings.json");
function initializeSettingsDefaults() {
  const defaults = [
    new Setting("enableNotifications", "Activer les notifications", true),
    new Setting("enableAutoUpdate", "Activer les mises à jour automatiques", false),
    new Setting("launchAtWindowsBoot", "Lancer au démarrage de Windows", true),
    new Setting("enableDarkTheme", "Thème sombre", false),
    new Setting("searchLocations", "Emplacements de recherche", [])
  ];
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(defaults, null, 2), "utf-8");
    return defaults;
  } catch (e) {
    console.error("initializeSettingsDefaults error:", e);
    return [];
  }
}
function loadSettings() {
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify([], null, 2), "utf-8");
    return initializeSettingsDefaults();
  }
  const content = fs.readFileSync(settingsPath, "utf-8");
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (parseErr) {
    console.error("Failed to parse settings.json, returning empty settings:", parseErr);
    return initializeSettingsDefaults();
  }
}
function saveSettingValue(code, value) {
  let settings = loadSettings();
  const idx = settings.findIndex((s) => s.code === code);
  if (idx !== -1) {
    settings[idx].value = value;
  } else {
    settings.push(new Setting(code, code, value));
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}
async function addSearchLocation() {
  const result = await dialog.showOpenDialog({
    title: "Sélectionner un dossier",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}
class Setting {
  constructor(code, label, value) {
    __publicField(this, "code");
    __publicField(this, "label");
    __publicField(this, "value");
    this.code = code;
    this.label = label;
    this.value = value;
  }
}
const __dirname = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      preload: path$1.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
  const tray = new Tray("src/assets/logo.png");
  tray.setToolTip("Unified");
  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Ouvrir le wiki",
      click: () => {
        shell.openExternal("https://github.com/gojoise/Unified/wiki");
      }
    },
    {
      label: "Quitter",
      click: () => {
        win == null ? void 0 : win.close();
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(trayMenu);
  win.removeMenu();
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  globalShortcut.register("CommandOrControl+I", () => {
    win == null ? void 0 : win.webContents.openDevTools();
  });
  globalShortcut.register("F1", () => {
    shell.openExternal("https://github.com/gojoise/Unified/wiki");
  });
  globalShortcut.register("CommandOrControl+Q", () => {
    win == null ? void 0 : win.close();
    app.quit();
  });
}).then(createWindow);
ipcMain.handle("add-game", () => {
  return addGame();
});
ipcMain.handle("load-library", () => {
  return loadLibrary();
});
ipcMain.handle("launch-game", (_event, path2) => {
  return launchGame(path2);
});
ipcMain.handle("delete-game", (_event, path2) => {
  console.log(path2);
  return deleteGame(path2);
});
ipcMain.handle("load-settings", () => {
  return loadSettings();
});
ipcMain.handle("save-setting-value", (_event, code, value) => {
  return saveSettingValue(code, value);
});
ipcMain.handle("add-search-location", async () => {
  return await addSearchLocation();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
