import { app, BrowserWindow,globalShortcut, Tray, Menu,shell,ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { addGame,deleteGame,launchGame,loadLibrary } from './libraryManager'
import { loadSettings, saveSettingValue, addSearchLocation, getSettingValue } from './settings'
import path from 'node:path'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
       nodeIntegration: false,
       contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // VITE_PUBLIC pointe sur public/ en dev et sur dist/ en prod — le logo doit être dans public/logo.png
  const tray = new Tray(path.join(process.env.VITE_PUBLIC, 'logo.png'));
  tray.setToolTip("Unified");
  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Ouvrir le wiki",
      click: () => {
        shell.openExternal("https://github.com/gojoise/Unified/wiki"); // Ouvre l'url dans le navigateur par défaut
      },
    },
    {
      label: "Quitter",
      click: () => {
        // Quitter l'app via le tray
        win?.close();
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(trayMenu);
  win.removeMenu();
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Raccourcis globaux :
//   Ctrl+I  — DevTools
//   F1      — Wiki GitHub
//   Ctrl+Q  — Quitter
app.whenReady().then(() => {
  globalShortcut.register("CommandOrControl+I", () => {
    win?.webContents.openDevTools();
  });
  globalShortcut.register("F1", () => {
    shell.openExternal("https://github.com/gojoise/Unified/wiki");
  });
  globalShortcut.register("CommandOrControl+Q", () => {
    win?.close();
    app.quit();
  });
}).then(createWindow)

// --- Handlers IPC : Library ---
ipcMain.handle('add-game', () => {
  return addGame();
});
ipcMain.handle('load-library', () => {
  return loadLibrary();
});
ipcMain.handle('launch-game', (_event, path: string) => {
  return launchGame(path);
});
ipcMain.handle('delete-game', (_event, path: string) => {
  return deleteGame(path);
})

// --- Handlers IPC : Settings ---
ipcMain.handle('load-settings', () => {
  return loadSettings();
});
ipcMain.handle('save-setting-value', (_event, code: string, value: any) => {
  return saveSettingValue(code, value);
});
ipcMain.handle('add-search-location', async () => {
  return await addSearchLocation();
});
ipcMain.handle('get-setting-value', (_event, code: string) => {
  return getSettingValue(code);
});