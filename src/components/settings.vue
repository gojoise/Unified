<template>
  <div class="exit-fab">
    <router-link to="/">
      <v-icon size="36" color="primary">mdi-close-circle-outline</v-icon>
      <v-tooltip activator="parent" location="bottom" text="Sortir des paramètres"></v-tooltip>
    </router-link>
  </div>
  <div class="d-flex flex-row tabs-container">
    <v-tabs v-model="tab" color="primary" direction="vertical">
      <v-tab prepend-icon="mdi-cog"            text="Général"    value="option-1"></v-tab>
      <v-tab prepend-icon="mdi-palette"        text="Apparence"  value="option-2"></v-tab>
      <v-tab prepend-icon="mdi-desktop-classic" text="Système"   value="option-3"></v-tab>
    </v-tabs>
    <v-divider vertical></v-divider>
    <v-tabs-window class="tabs-window-flex" v-model="tab">

      <!-- ── Général ── -->
      <v-tabs-window-item value="option-1">
        <v-card flat>
          <v-card-title class="text-h5">Général</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row class="d-flex ml-4">

              <v-col cols="12">
                <v-switch v-model="settings.enableNotifications"
                  label="Activer les notifications" color="primary" hide-details></v-switch>
              </v-col>

              <v-col cols="12">
                <v-switch v-model="settings.confirmBeforeDelete"
                  label="Confirmer avant suppression d'un jeu" color="primary" hide-details></v-switch>
              </v-col>

              <v-divider class="my-4"></v-divider>

              <!-- Scan automatique des jeux -->
              <v-col cols="12">
                <v-switch v-model="settings.autoScan"
                  label="Scan automatique des jeux" color="primary" hide-details></v-switch>
              </v-col>

              <v-expand-transition>
                <v-col v-if="settings.autoScan" cols="12">
                  <div class="d-flex align-center text-h6 mt-2 mb-1">
                    <span>Emplacements de recherche</span>
                    <v-btn color="primary" class="ml-4" @click="onAddLocation">Ajouter</v-btn>
                  </div>
                  <v-list class="ml-4">
                    <v-list-item
                      v-for="(location, i) in settings.searchLocations"
                      :key="i"
                      @mouseenter="hoveredIndex = Number(i)"
                      @mouseleave="hoveredIndex = null"
                    >
                      <v-list-item-title>
                        {{ location }}
                        <v-btn v-if="hoveredIndex === i"
                          color="error" variant="text" class="ml-2"
                          @click="onDeleteLocation(i)">
                          Supprimer
                        </v-btn>
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="settings.searchLocations.length === 0">
                      <v-list-item-title class="text-medium-emphasis text-body-2">
                        Aucun emplacement configuré
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
              </v-expand-transition>

            </v-row>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ── Apparence ── -->
      <v-tabs-window-item value="option-2">
        <v-card flat>
          <v-card-title class="text-h5">Apparence</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row class="d-flex ml-4">
              <v-col cols="12">
                <v-switch v-model="settings.enableDarkTheme"
                  label="Activer le thème sombre" color="primary" hide-details></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ── Système ── -->
      <v-tabs-window-item value="option-3">
        <v-card flat>
          <v-card-title class="text-h5">Système</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row class="d-flex ml-4">

              <v-col cols="12">
                <v-switch v-model="settings.enableAutoUpdate"
                  label="Activer les mises à jour automatiques" color="primary" hide-details></v-switch>
              </v-col>

              <v-col cols="12">
                <v-switch v-model="settings.launchAtWindowsBoot"
                  label="Lancer au démarrage de Windows" color="primary" hide-details></v-switch>
              </v-col>

              <v-col cols="12">
                <v-switch v-model="settings.minimizeToTray"
                  label="Minimiser dans le tray au lieu de fermer" color="primary" hide-details></v-switch>
              </v-col>

              <v-divider class="my-4"></v-divider>

              <v-col cols="12" md="6">
                <v-select
                  v-model="settings.gameStartBehavior"
                  :items="gameStartBehaviorOptions"
                  label="Comportement au lancement d'un jeu"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                ></v-select>
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
