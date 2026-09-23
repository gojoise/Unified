<template>
  <!-- Dialogue de validation de la détection semi-automatique.
       Monté une seule fois dans unified.vue : il doit rester accessible depuis
       la bibliothèque comme depuis les paramètres. -->
  <v-dialog
    v-model="scan.dialogVisible"
    max-width="900"
    scrollable
    :persistent="scan.scanning"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-folder-search</v-icon>
        <span>Jeux détectés</span>
        <v-spacer></v-spacer>
        <v-chip v-if="!scan.scanning && scan.entries.length > 0" size="small" variant="tonal">
          {{ selectedCount }} / {{ scan.entries.length }} sélectionné{{ selectedCount > 1 ? 's' : '' }}
        </v-chip>
      </v-card-title>
      <v-divider></v-divider>

      <!-- Scan en cours -->
      <v-card-text v-if="scan.scanning" class="py-8 text-center">
        <v-progress-linear
          :model-value="progressPercent"
          :indeterminate="scan.progress.total === 0"
          color="primary"
          height="6"
          rounded
        ></v-progress-linear>

        <div class="text-body-2 mt-4">
          <template v-if="scan.progress.current">
            Analyse de <strong>{{ scan.progress.current }}</strong>
          </template>
          <template v-else>Recensement des dossiers…</template>
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ scan.progress.scanned }} / {{ scan.progress.total }} dossiers —
          {{ scan.progress.found }} jeu{{ scan.progress.found > 1 ? 'x' : '' }} trouvé{{ scan.progress.found > 1 ? 's' : '' }}
        </div>

        <v-btn class="mt-4" variant="text" @click="onCancelScan">Annuler la recherche</v-btn>
      </v-card-text>

      <!-- Aucun résultat -->
      <v-card-text v-else-if="scan.entries.length === 0" class="py-8 text-center">
        <v-icon size="48" color="medium-emphasis">mdi-check-circle-outline</v-icon>
        <div class="text-body-1 mt-3">Aucun nouveau jeu trouvé</div>
        <div class="text-caption text-medium-emphasis">
          Tous les jeux détectés sont déjà dans votre bibliothèque.
        </div>
      </v-card-text>

      <!-- Candidats -->
      <v-card-text v-else class="scan-results">
        <div class="text-caption text-medium-emphasis mb-2">
          Les jeux décochés ne seront plus proposés lors des prochaines recherches.
          Réversible depuis les paramètres.
        </div>
        <v-list lines="two">
          <!-- Clé sur le dossier d'installation, unique par candidat : changer
               d'exécutable met la ligne à jour au lieu de la recréer. -->
          <v-list-item
            v-for="entry in scan.entries"
            :key="entry.installDir"
            class="scan-entry"
          >
            <template #prepend>
              <v-checkbox-btn v-model="entry.selected" color="primary"></v-checkbox-btn>
              <v-img
                v-if="entry.gameIcon"
                :src="entry.gameIcon"
                width="40"
                height="40"
                class="mx-3"
                contain
              ></v-img>
              <v-icon v-else class="mx-3" size="40">mdi-application</v-icon>
            </template>

            <v-text-field
              v-model="entry.title"
              variant="plain"
              density="compact"
              hide-details
              single-line
              class="scan-title"
            ></v-text-field>

            <v-list-item-subtitle class="text-caption">
              {{ relativeExe(entry) }}
              <span class="text-medium-emphasis"> — {{ entry.installDir }}</span>
            </v-list-item-subtitle>

            <template #append>
              <v-chip
                size="x-small"
                variant="tonal"
                :prepend-icon="sourceOf(entry).icon"
                class="mr-2"
              >
                {{ sourceOf(entry).label }}
              </v-chip>

              <v-chip
                v-if="badgeOf(entry)"
                size="x-small"
                variant="tonal"
                :color="badgeOf(entry)?.color"
                :prepend-icon="badgeOf(entry)?.icon"
                class="mr-2"
              >
                {{ badgeOf(entry)?.label }}
              </v-chip>

              <v-menu location="start">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props"></v-btn>
                </template>
                <v-list class="menu-list" density="compact">
                  <!-- Action fixe, en tête : vérifier le binaire dans l'explorateur
                       est souvent ce qui permet de trancher entre les alternatives. -->
                  <v-list-item
                    title="Ouvrir l'emplacement du fichier"
                    prepend-icon="mdi-folder-open-outline"
                    @click="onReveal(entry)"
                  ></v-list-item>
                  <v-divider></v-divider>

                  <v-list-subheader v-if="entry.alternatives.length > 0">
                    Choisir un autre exécutable
                  </v-list-subheader>
                  <v-list-item
                    v-for="alternative in entry.alternatives"
                    :key="alternative"
                    :title="exeName(alternative)"
                    prepend-icon="mdi-file-cog-outline"
                    @click="onChooseExecutable(entry, alternative)"
                  ></v-list-item>
                  <v-divider v-if="entry.alternatives.length > 0"></v-divider>
                  <v-list-item
                    title="Ne plus proposer"
                    prepend-icon="mdi-eye-off-outline"
                    base-color="error"
                    @click="onIgnore(entry)"
                  ></v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions>
        <v-btn v-if="!scan.scanning && scan.entries.length > 0" variant="text" @click="onToggleAll">
          {{ allSelected ? 'Tout décocher' : 'Tout cocher' }}
        </v-btn>
        <v-spacer></v-spacer>
        <!-- « Plus tard » ne mémorise rien : tout sera reproposé au prochain scan. -->
        <v-btn v-if="!scan.scanning" variant="text" @click="onClose">
          {{ scan.entries.length > 0 ? 'Plus tard' : 'Fermer' }}
        </v-btn>
        <v-btn
          v-if="!scan.scanning && scan.entries.length > 0"
          color="primary"
          variant="tonal"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import ScanDialog from './scan-dialog.component.ts';

  export default {
    setup: ScanDialog.setup, // Utilisation de la logique setup
  };
</script>

<style scoped>
  .scan-results {
    max-height: 60vh;
  }

  /* Le titre est éditable : on neutralise les marges du v-text-field en mode plain */
  .scan-title :deep(.v-field__input) {
    padding: 0;
    min-height: 0;
    font-size: 1rem;
    font-weight: 500;
  }

  .scan-entry + .scan-entry {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
</style>
