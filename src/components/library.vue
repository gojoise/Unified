<template>
  <v-app>
    <v-container fluid>
      <!-- Grille des jeux -->
      <v-row dense no-gutters>
        <v-col
          v-for="game in library"
          :key="game.path"
          cols="auto"
          class="pa-3"
        >
          <v-card class="game-card">
            <!-- Étoile de favori : grisée et révélée au survol, jaune et
                 toujours visible une fois le jeu épinglé -->
            <v-btn
              class="favorite-star"
              :class="{ 'is-favorite': isFavorite(game) }"
              :color="isFavorite(game) ? 'amber' : 'grey'"
              :aria-label="
                isFavorite(game) ? 'Retirer des favoris' : 'Ajouter aux favoris'
              "
              icon
              variant="text"
              density="comfortable"
              size="small"
              @click="onToggleFavorite(game)"
            >
              <v-icon>{{
                isFavorite(game) ? 'mdi-star' : 'mdi-star-outline'
              }}</v-icon>
              <v-tooltip
                activator="parent"
                location="top"
                :text="
                  isFavorite(game)
                    ? 'Retirer des favoris'
                    : 'Ajouter aux favoris'
                "
              ></v-tooltip>
            </v-btn>

            <!-- Icône du jeu -->
            <div class="game-icon-wrapper">
              <v-img
                :src="game.gameIcon || '/assets/default-cover.jpg'"
                width="64"
                height="64"
                contain
              ></v-img>
            </div>

            <!-- Titre du jeu -->
            <v-card-title class="game-title">
              {{ game.title }}
            </v-card-title>

            <!-- Bouton Lancer -->
            <v-card-actions class="d-flex justify-end">
              <v-btn
                :loading="loadingGames.get(game.path) || false"
                @click="onLaunchGame(game.path)"
                color="blue"
              >
                <v-icon size="24" left>mdi-play</v-icon> Lancer
              </v-btn>
              <!--Autres actions-->
              <v-menu location="end">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    variant="text"
                    v-bind="props"
                  ></v-btn>
                </template>

                <v-list class="menu-list" density="compact">
                  <v-list-item
                    v-for="(option, o) in options"
                    :key="o"
                    :value="o"
                    :title="option.title"
                    :prepend-icon="option.icon"
                    :base-color="option.color"
                    @click="option.action(game.path)"
                  ></v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-col>
        <!--Vignette de recherche semi-automatique-->
        <!-- Mise en avant quand la bibliothèque est vide : c'est le moyen le
             plus rapide de la remplir. -->
        <v-col
          cols="auto"
          class="pa-3"
          :class="{ 'order-first': library.length === 0 }"
        >
          <v-card
            class="game-card add-game-card d-flex justify-center align-center flex-column"
            @click="onScanGames"
          >
            <v-card-title class="game-title text-center">
              <v-icon size="48" color="primary">mdi-folder-search</v-icon>
              <div>Rechercher des jeux</div>
            </v-card-title>
          </v-card>
        </v-col>

        <!--Vignette ajout manuel d'un jeu-->
        <v-col cols="auto" class="pa-3">
          <v-card
            class="game-card add-game-card d-flex justify-center align-center flex-column"
            @click="onAddGame"
          >
            <v-card-title class="game-title text-center">
              <v-icon size="48" color="primary">mdi-plus-circle</v-icon>
              <div>Ajouter un Jeu</div>
            </v-card-title>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <div class="settings-fab">
      <router-link to="/settings">
        <v-icon size="42" color="primary">mdi-cog</v-icon>
        <v-tooltip
          activator="parent"
          location="top"
          text="Paramètres"
        ></v-tooltip>
      </router-link>
    </div>

    <!-- Dialog de confirmation de suppression -->
    <v-dialog v-model="deleteDialog.visible" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6">
          <v-icon color="error" class="mr-2">mdi-delete-alert</v-icon>
          Supprimer le jeu
        </v-card-title>
        <v-card-text
          >Cette action est irréversible. Confirmer la suppression
          ?</v-card-text
        >
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="onDeleteCancel">Annuler</v-btn>
          <v-btn color="error" variant="tonal" @click="onDeleteConfirm"
            >Supprimer</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
  import Library from './library.component.ts';

  export default {
    setup: Library.setup, // Utilisation de la logique setup
  };
</script>

<style scoped>
  @import '../assets/library.css';
</style>
