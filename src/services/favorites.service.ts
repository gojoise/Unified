import { useNotification } from './notification.service';

/**
 * Gestion des jeux favoris.
 *
 * Le favori n'est pas un état séparé : c'est le champ `favorite` de l'entrée de
 * bibliothèque, persisté dans user-library.json par le main process. Ce service
 * n'a donc pas d'état propre — il persiste la valeur puis met à jour l'entrée
 * elle-même, ce qui suffit à faire retrier la grille (`sortedLibrary` dépend du
 * tableau réactif de `library.service`).
 */

/** Forme minimale attendue d'une entrée de bibliothèque côté favoris. */
export interface FavoritableGame {
  path: string;
  favorite?: boolean;
}

/** Vrai si le jeu est épinglé. */
export function isFavorite(game: FavoritableGame): boolean {
  return game.favorite === true;
}

/**
 * Comparateur « favoris d'abord », à utiliser comme critère prioritaire devant
 * le tri alphabétique. Retourne 0 entre deux jeux de même statut pour laisser
 * le critère suivant trancher.
 */
export function compareByFavorite(
  a: FavoritableGame,
  b: FavoritableGame
): number {
  return Number(isFavorite(b)) - Number(isFavorite(a));
}

/**
 * Composable exposant l'épinglage aux composants.
 *
 * Actions : `isFavorite`, `toggle`
 */
export function useFavorites() {
  const { notifyError } = useNotification();

  /**
   * Inverse le statut favori d'un jeu.
   *
   * L'écriture disque passe en premier : l'étoile ne change d'état que si la
   * bibliothèque a bien été mise à jour, sinon la grille mentirait jusqu'au
   * prochain chargement.
   */
  const toggle = async (game: FavoritableGame) => {
    const next = !isFavorite(game);
    try {
      await window.ipcRenderer.setGameFavorite(game.path, next);
      // Mutation de l'entrée réactive : la grille se retrie sans recharger le JSON.
      game.favorite = next;
    } catch (error) {
      notifyError(
        next
          ? "Impossible d'ajouter le jeu aux favoris"
          : 'Impossible de retirer le jeu des favoris'
      );
    }
  };

  return { isFavorite, toggle };
}
