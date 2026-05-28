<template>
  <v-app>
    <v-container fluid>
      <!-- Grille des jeux -->
      <v-row dense no-gutters>
        <v-col
          v-for="game in library"
          :key="game.title"
          cols="auto"
          class="pa-3"
        >
          <v-card class="game-card">
            <!-- Image du jeu -->
            <v-img
              :src="game.icon || '/assets/default-cover.jpg'"
              class="game-cover"
              aspect-ratio="3/4"
              cover
            ></v-img>

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

                <v-list>
                  <v-list-item
                    v-for="(option, o) in options"
                    :key="o"
                    :value="o"
                    @click="option.action(game.path)"
                  >
                    <v-list-item-title>{{ option.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
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
        <v-tooltip activator="parent" location="top" text="Paramètres"></v-tooltip>
      </router-link>
    </div>
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
