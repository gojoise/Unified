import fs from "node:fs";
import path from "node:path";
import { app, screen, type BrowserWindow, type Rectangle } from "electron";

const stateFilePath = path.join(app.getPath("userData"), "window-state.json");

/** Taille au tout premier lancement — ratio 16/9. */
export const DEFAULT_WINDOW_SIZE = { width: 1280, height: 720 };

/** Taille minimale imposée à la fenêtre — ratio 16/9 également. */
export const MIN_WINDOW_SIZE = { width: 960, height: 540 };

/** Délai d'inactivité avant d'écrire l'état sur disque pendant un redimensionnement. */
const SAVE_DEBOUNCE_MS = 400;

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Vrai si le rectangle est suffisamment visible sur au moins un écran branché.
 * Évite de restaurer une fenêtre hors champ après le débranchement d'un moniteur.
 */
function isVisibleOnSomeDisplay(bounds: Rectangle): boolean {
  const MIN_VISIBLE = 100;
  return screen.getAllDisplays().some(({ workArea }) => {
    const overlapX = Math.min(bounds.x + bounds.width, workArea.x + workArea.width) - Math.max(bounds.x, workArea.x);
    const overlapY = Math.min(bounds.y + bounds.height, workArea.y + workArea.height) - Math.max(bounds.y, workArea.y);
    return overlapX >= MIN_VISIBLE && overlapY >= MIN_VISIBLE;
  });
}

/**
 * Relit la géométrie de la dernière session, ou retourne la taille 16/9 par défaut
 * au premier lancement (comme après un fichier corrompu ou un écran disparu).
 */
export function loadWindowState(): WindowState {
  const fallback: WindowState = { ...DEFAULT_WINDOW_SIZE, maximized: false };

  try {
    if (!fs.existsSync(stateFilePath)) return fallback;
    const stored = JSON.parse(fs.readFileSync(stateFilePath, "utf-8"));
    if (!stored || typeof stored !== "object") return fallback;
    if (!isPositiveNumber(stored.width) || !isPositiveNumber(stored.height)) return fallback;

    const state: WindowState = {
      width: Math.max(Math.round(stored.width), MIN_WINDOW_SIZE.width),
      height: Math.max(Math.round(stored.height), MIN_WINDOW_SIZE.height),
      maximized: stored.maximized === true,
    };

    // La position n'est reprise que si la fenêtre retombe bien sur un écran existant.
    if (Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
      const bounds = { x: Math.round(stored.x), y: Math.round(stored.y), width: state.width, height: state.height };
      if (isVisibleOnSomeDisplay(bounds)) {
        state.x = bounds.x;
        state.y = bounds.y;
      }
    }

    return state;
  } catch (error) {
    console.error("loadWindowState error:", error);
    return fallback;
  }
}

/**
 * Sauvegarde la géométrie de la fenêtre : pendant les redimensionnements/déplacements
 * (écriture différée) et systématiquement à la fermeture.
 */
export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null;

  const persist = () => {
    if (win.isDestroyed()) return;
    try {
      // getNormalBounds() donne la taille "restaurée" même si la fenêtre est maximisée.
      const { width, height, x, y } = win.getNormalBounds();
      const state: WindowState = { width, height, x, y, maximized: win.isMaximized() };
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), "utf-8");
    } catch (error) {
      console.error("saveWindowState error:", error);
    }
  };

  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(persist, SAVE_DEBOUNCE_MS);
  };

  win.on("resize", scheduleSave);
  win.on("move", scheduleSave);
  win.on("maximize", scheduleSave);
  win.on("unmaximize", scheduleSave);
  win.on("close", () => {
    if (timer) clearTimeout(timer);
    persist();
  });
}
