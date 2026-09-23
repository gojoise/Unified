import { useNotification } from './notification.service'

/**
 * Interactions avec le système d'exploitation, exposées au renderer via le pont
 * preload. Partagé par la bibliothèque et le dialogue de détection : les deux
 * proposent la même action « voir le dossier », l'erreur se traite au même endroit.
 */

/**
 * Applique le paramètre « Comportement au lancement d'un jeu » : réduire la
 * fenêtre, la masquer dans le tray, quitter, ou ne rien faire. L'arbitrage se
 * fait côté main, seul propriétaire de la fenêtre.
 *
 * Un échec reste silencieux : le jeu est déjà lancé, l'utilisateur n'a rien à corriger.
 */
export async function applyGameStartBehavior(): Promise<void> {
  try {
    await window.ipcRenderer.applyGameStartBehavior()
  } catch {
    // sans effet : la fenêtre reste simplement en place
  }
}

/** Ouvre l'explorateur sur le dossier du fichier, fichier sélectionné. */
export async function revealInExplorer(target: string): Promise<void> {
  const { notifyError } = useNotification()
  try {
    await window.ipcRenderer.revealInExplorer(target)
  } catch (error) {
    notifyError("Impossible d'ouvrir l'emplacement du fichier")
  }
}
