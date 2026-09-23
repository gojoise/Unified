import { app, BrowserWindow,globalShortcut, Tray, Menu,shell,ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { addGame,addGames,deleteGame,extractExeIcon,launchGame,loadLibrary,revealInExplorer } from './libraryManager'
import { loadSettings, saveSettingValue, addSearchLocation, getSettingValue } from './settings'
import { scanLocations, abortScan } from './gameScanner'
import { loadWindowState, trackWindowState, MIN_WINDOW_SIZE } from './windowState'
import path from 'node:path'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
// Référence conservée au niveau module : un Tray collecté par le GC disparaît de
// la zone de notification, or « Fermer dans le tray » en dépend pour rouvrir la fenêtre.
let tray: Tray | null = null

// Distingue une vraie sortie d'une fermeture de fenêtre : sans ce drapeau,
// « Minimiser dans le tray » masquerait aussi la fenêtre quand on veut quitter.
let isQuitting = false

/** Sortie franche de l'application, quel que soit le paramètre de tray. */
function quitApp() {
  isQuitting = true
  app.quit()
}

/** Ramène la fenêtre au premier plan, qu'elle soit réduite ou masquée dans le tray. */
function showWindow() {
  if (!win) return
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

/**
 * Applique le paramètre « Comportement au lancement d'un jeu », une fois le jeu
 * démarré : l'utilisateur choisit si le launcher reste affiché ou s'efface.
 */
function applyGameStartBehavior() {
  switch (getSettingValue('gameStartBehavior')) {
    case 'minimize':
      win?.minimize()
      break
    case 'close-to-tray':
      // Simple masquage : l'icône du tray reste le moyen de revenir à la fenêtre.
      win?.hide()
      break
    case 'close':
      quitApp()
      break
    // 'nothing' et valeur absente : la fenêtre ne bouge pas.
  }
}

// Instance unique : l'application masquée dans le tray n'a plus de fenêtre à
// l'écran, relancer le raccourci doit donc ramener celle qui existe déjà plutôt
// que d'ouvrir un second Unified avec sa propre icône de notification.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
}

function createWindow() {
  // Géométrie de la session précédente, ou 1280x720 (16/9) au premier lancement.
  const windowState = loadWindowState()

  win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    // La fenêtre n'est affichée qu'une fois le rendu prêt : évite le flash blanc
    // et le saut visuel quand on restaure l'état maximisé.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
       nodeIntegration: false,
       contextIsolation: true,
    },
  })

  if (windowState.maximized) win.maximize()
  win.once('ready-to-show', () => {
    win?.show()
    scheduleAutoScan()
  })
  trackWindowState(win)

  // « Minimiser dans le tray au lieu de fermer » : le bouton X masque la fenêtre
  // au lieu de terminer l'application. Les sorties explicites (menu du tray,
  // Ctrl+Q, comportement « Fermer l'application ») passent par quitApp et ne
  // sont donc pas interceptées.
  win.on('close', (event) => {
    if (isQuitting || !getSettingValue('minimizeToTray')) return
    event.preventDefault()
    win?.hide()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // VITE_PUBLIC pointe sur public/ en dev et sur dist/ en prod — le logo doit être dans public/logo.png
  tray = new Tray(path.join(process.env.VITE_PUBLIC, 'logo.png'));
  tray.setToolTip("Unified");
  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Ouvrir Unified",
      click: showWindow,
    },
    {
      label: "Ouvrir le wiki",
      click: () => {
        shell.openExternal("https://github.com/gojoise/Unified/wiki"); // Ouvre l'url dans le navigateur par défaut
      },
    },
    {
      label: "Quitter",
      click: quitApp,
    },
  ]);
  tray.setContextMenu(trayMenu);
  // Clic simple sur l'icône : raccourci attendu pour ressortir du tray.
  tray.on('click', showWindow);
  win.removeMenu();
}

// Sortie déclenchée ailleurs (fermeture de session Windows, app.quit() d'Electron) :
// la fenêtre doit se fermer pour de bon, pas retomber dans le tray.
app.on('before-quit', () => {
  isQuitting = true
})

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
  globalShortcut.register("CommandOrControl+Q", quitApp);
}).then(createWindow)

/** Délai avant le scan de démarrage : la bibliothèque doit s'afficher en premier. */
const AUTO_SCAN_DELAY = 2000

/**
 * Scan silencieux au démarrage, si le paramètre autoScan est actif.
 * Aucun dialogue n'est ouvert d'office : le renderer reçoit les candidats et
 * se contente d'une notification cliquable s'il y a des nouveautés.
 */
function scheduleAutoScan() {
  if (!getSettingValue('autoScan')) return
  const locations = (getSettingValue('searchLocations') as string[]) ?? []
  if (locations.length === 0) return

  setTimeout(async () => {
    try {
      const candidates = await scanLocations(undefined, (progress) => {
        win?.webContents.send('scan-progress', progress)
      })
      if (candidates.length > 0) win?.webContents.send('auto-scan-result', candidates)
    } catch (error) {
      console.error('scheduleAutoScan error:', error)
    }
  }, AUTO_SCAN_DELAY)
}

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
/** Applique le comportement configuré après qu'un jeu a été lancé. */
ipcMain.handle('apply-game-start-behavior', () => {
  applyGameStartBehavior();
})

// --- Handlers IPC : Scan ---
ipcMain.handle('scan-locations', (event, locations?: string[]) => {
  return scanLocations(locations, (progress) => event.sender.send('scan-progress', progress));
});
ipcMain.handle('abort-scan', () => {
  abortScan();
});
ipcMain.handle('add-games', (_event, selections: { path: string; title?: string; gameIcon?: string }[]) => {
  return addGames(selections);
});
ipcMain.handle('extract-exe-icon', (_event, exePath: string) => {
  return extractExeIcon(exePath);
});
ipcMain.handle('reveal-in-explorer', (_event, target: string) => {
  revealInExplorer(target);
});
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