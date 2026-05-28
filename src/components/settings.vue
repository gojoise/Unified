<template>
  <div class="exit-fab">
  <router-link to="/">
    <v-icon size="36" color="primary">mdi-close-circle-outline</v-icon>
    <v-tooltip activator="parent" location="bottom" text="Sortir des paramètres"></v-tooltip>
  </router-link>
</div>
  <div class="d-flex flex-row tabs-container">
    <v-tabs v-model="tab" color="primary" direction="vertical">
      <v-tab prepend-icon="mdi-cog" text="General" value="option-1"></v-tab>
      <v-tab
        prepend-icon="mdi-palette"
        text="Apparence"
        value="option-2"
      ></v-tab>
      <v-tab
        prepend-icon="mdi-desktop-classic"
        text="Système"
        value="option-3"
      ></v-tab>
    </v-tabs>
    <v-divider vertical></v-divider>
    <v-tabs-window class="tabs-window-flex" v-model="tab">
      <!-- Paramètres généraux -->
      <v-tabs-window-item value="option-1">
        <v-card flat>
          <v-card-title class="text-h5">Général</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!--Liste de paramètres généraux-->
            <v-row class="d-flex ml-4">
              <!--Activer les notifications-->
              <v-col cols="12">
                <v-switch
                  v-model="settings.enableNotifications"
                  label="Activer les notifications"
                  color="blue"
                ></v-switch>
              </v-col>
              <v-divider></v-divider>
              <!--Configurer les emplacements de recherche-->
              <v-col cols="12">
                <v-title class="d-flex align-center text-h6 mt-4">
                  <span>Emplacements de recherche</span>
                  &nbsp; &nbsp; &nbsp;
                  <v-btn color="primary" @click="onAddLocation">Ajouter</v-btn>
                </v-title>
                <!--Liste des emplacements-->
                <v-row class="d-flex ml-4">
                  <v-col cols="auto" class="pa-3">
                    <v-list>
                      <v-list-item
                        v-for="(location, i) in settings.searchLocations"
                        :key="i"
                        @mouseenter="hoveredIndex = Number(i)"
                        @mouseleave="hoveredIndex = null"
                      >
                        <v-list-item-content>
                          <v-list-item-title
                            >{{ location }}
                            <template v-if="hoveredIndex === i">
                              <v-btn
                                color="error"
                                variant="text"
                                @click="onDeleteLocation(i)"
                                class="ml-auto"
                              >
                                SUPPRIMER
                              </v-btn>
                            </template></v-list-item-title
                          >
                        </v-list-item-content>
                      </v-list-item>
                    </v-list>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>
      <!-- Paramètres d'apparence -->
      <v-tabs-window-item value="option-2">
        <v-card flat>
          <v-card-title class="text-h5">Apparence</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row class="d-flex ml-4">
              <v-col cols="12">
                <!--Activer le thème sombre-->
                <v-switch
                  v-model="settings.enableDarkTheme"
                  label="Activer le thème sombre"
                  color="blue"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>
      <!-- Paramètres système -->
      <v-tabs-window-item value="option-3">
        <v-card flat>
          <v-card-title class="text-h5">Système</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row class="d-flex ml-4">
              <v-col cols="12">
                <!--Activer les mises à jour automatiques-->
                <v-switch
                  v-model="settings.enableAutoUpdate"
                  label="Activer les mises à jour automatiques"
                  color="blue"
                ></v-switch>
                <!--Lancer au démarrage de Windows-->
                <v-switch
                  v-model="settings.launchAtWindowsBoot"
                  label="Lancer au démarrage de Windows"
                  color="blue"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<script lang="ts">
import Settings from './settings.component.ts'

export default {
  setup: Settings.setup,
}
</script>

<style scoped>
  @import '../assets/settings.css';
</style>
