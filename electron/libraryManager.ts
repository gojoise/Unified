import fs from "fs";
import { dialog, app } from "electron";
import { shell } from "electron";
import path from "path";

const userDataPath = app.getPath('userData');
const libraryPath = path.join(userDataPath, "user-library.json");

/**
 * Charge la bibliothèque depuis le JSON ou crée le fichier s'il n'existe pas encore.
 */
export function loadLibrary(): any[] {
    if (fs.existsSync(libraryPath)) {
        return JSON.parse(fs.readFileSync(libraryPath, "utf-8"));
    } else {
        fs.writeFileSync(libraryPath, JSON.stringify([], null, 2), "utf-8");
    }
    return [];
};

function saveLibrary(library: any[]): void {
    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2), "utf-8");
}

/**
 * Ouvre un dialogue de sélection de fichier exécutable, extrait l'icône du .exe
 * sous forme de data URL, et ajoute le jeu à la bibliothèque s'il n'y est pas déjà.
 */
export function addGame(): Promise<void> {
    return dialog.showOpenDialog({
        title: 'Sélectionner le fichier exécutable du jeu',
        filters: [
            { name: 'Fichiers exécutables', extensions: ['exe', 'app', 'sh'] },
        ],
        properties: ['openFile'],
    }).then((value) => {
        if (value.canceled) return;

        const filePath = value.filePaths[0];

        return app.getFileIcon(filePath, { size: 'large' }).then((nativeIcon) => {
            const extractedGame = {
                title: extractGameTitle(filePath),
                path: filePath,
                gameIcon: nativeIcon.toDataURL(),
                lastLaunched: null as string | null,
            };

            const lib = loadLibrary();
            addGameIfUnique(lib, extractedGame);
            saveLibrary(lib);
        });
    });
}

function addGameIfUnique(library: any[], game: any) {
    if (!library.some((element) => element.path === game.path)) {
        library.push(game);
    };
}

/**
 * Supprime le jeu correspondant au chemin donné de la bibliothèque.
 */
export function deleteGame(gamePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const lib = loadLibrary();
            saveLibrary(lib.filter((game) => game.path !== gamePath));
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Lance l'exécutable du jeu et met à jour lastLaunched dans la bibliothèque.
 */
export function launchGame(exePath: string): Promise<void> {
    return shell.openPath(exePath).then(() => {
        const lib = loadLibrary();
        const game = lib.find(g => g.path === exePath);
        if (game) {
            game.lastLaunched = new Date().toISOString();
            saveLibrary(lib);
        }
    });
}

// ---------------------------------------------------------------------------
// Détection du titre — 4 couches, de la plus à la moins fiable
// ---------------------------------------------------------------------------

/**
 * Détermine le titre d'un jeu depuis son chemin d'exécutable.
 * Essaie successivement 4 stratégies et retourne la première qui aboutit.
 */
function extractGameTitle(exePath: string): string {
    return getGogTitle(exePath)
        ?? getSteamTitle(exePath)
        ?? getFolderTitle(exePath)
        ?? normalizeTitle(path.basename(exePath, path.extname(exePath)));
}


/**
 * Couche 2a — cherche un fichier goggame-*.info dans le dossier du .exe
 * et lit le champ "name" (JSON natif, très fiable).
 */
function getGogTitle(exePath: string): string | null {
    try {
        const dir = path.dirname(exePath);
        const gogFile = fs.readdirSync(dir).find(f => /^goggame-\d+\.info$/.test(f));
        if (!gogFile) return null;
        const data = JSON.parse(fs.readFileSync(path.join(dir, gogFile), 'utf-8'));
        return data.name || null;
    } catch {
        return null;
    }
}

/**
 * Couche 2b — remonte jusqu'au dossier steamapps/ dans l'arborescence,
 * trouve l'appmanifest_*.acf correspondant et lit le champ "name".
 */
function getSteamTitle(exePath: string): string | null {
    try {
        const parts = path.normalize(exePath).split(path.sep);
        const steamappsIdx = parts.findIndex(p => p.toLowerCase() === 'steamapps');
        if (steamappsIdx === -1) return null;

        const steamappsDir = parts.slice(0, steamappsIdx + 1).join(path.sep);
        const commonIdx = parts.findIndex((p, i) => i > steamappsIdx && p.toLowerCase() === 'common');
        if (commonIdx === -1) return null;

        const gameDir = parts[commonIdx + 1];
        const acfFiles = fs.readdirSync(steamappsDir).filter(f => /^appmanifest_\d+\.acf$/.test(f));

        for (const acfFile of acfFiles) {
            const content = fs.readFileSync(path.join(steamappsDir, acfFile), 'utf-8');
            const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
            if (installDirMatch?.[1].toLowerCase() === gameDir.toLowerCase()) {
                const nameMatch = content.match(/"name"\s+"([^"]+)"/);
                return nameMatch?.[1] ?? null;
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Couche 3 — remonte au dossier parent du .exe (ou grand-parent si "dosser technique") et prend son nom,
 * et normalise le nom obtenu.
 */
function getFolderTitle(exePath: string): string | null {
    const parts = path.normalize(exePath).split(path.sep).filter(p => p !== '');
    if (parts.length < 2) return null;

    const TECHNICAL_DIRS = ['bin', 'win', 'win32', 'win64', 'x64', 'x86', 'binaries'];
    let parentIndex = parts.length - 2;
    if (TECHNICAL_DIRS.some(d => parts[parentIndex].toLowerCase() === d)) parentIndex--;
    if (parentIndex < 0) return null;

    return normalizeTitle(parts[parentIndex]) || null;
}

/**
 * Normalise un nom brut en titre lisible :
 * remplace les séparateurs (. _) par des espaces et retire les numéros de version.
 */
function normalizeTitle(raw: string): string {
    return raw
        .replace(/[._]/g, ' ')
        .replace(/\bv?\d+(\.\d+)+\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}
