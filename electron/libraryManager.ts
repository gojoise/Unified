import fs from "fs";
import { dialog,app } from "electron";
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
 * Ouvre un dialogue de sélection de fichier exécutable et ajoute le jeu
 * à la bibliothèque s'il n'y est pas déjà (dédoublonnage par chemin).
 */
export function addGame(): Promise<void> {
    return dialog.showOpenDialog({
            title: 'Sélectionner le fichier exécutable du jeu',
            filters: [
                { name: 'Fichiers exécutables', extensions: ['exe', 'app', 'sh'] },
            ],
            properties: ['openFile'],
        }).then((value) => {
            const lib = loadLibrary();
            if (!value.canceled) {
                const filePath = value.filePaths[0];
                const extractedGame = {
                    title: extractGameTitle(filePath) ?? path.basename(filePath, path.extname(filePath)),
                    path: filePath,
                }
                addGameIfUnique(lib, extractedGame);
            }
            saveLibrary(lib);
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
export function deleteGame(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const lib = loadLibrary();
            saveLibrary(lib.filter((game) => game.path !== path));
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Lance l'exécutable du jeu via le shell du système d'exploitation.
 */
export function launchGame(exePath: string) {
    shell.openPath(exePath);
};

/**
 * Tente de déduire le titre du jeu à partir du chemin de l'exécutable
 * en remontant au dossier parent (ou grand-parent si le parent est "bin").
 * Retourne null si le chemin est trop court pour extraire un nom significatif.
 */
function extractGameTitle(exePath: string): string | null {
    const parts = path.normalize(exePath).split(path.sep).filter(part => part !== '');

    if (parts.length < 2) {
        return null;
    }

    let parentIndex = parts.length - 2;

    // Remonter d'un niveau si le dossier parent est un répertoire "bin"
    if (parts[parentIndex].toLowerCase().includes('bin')) {
        parentIndex--;
    }

    if (parentIndex < 0) {
        return null;
    }

    return parts[parentIndex];
}