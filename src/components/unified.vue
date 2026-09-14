<template>
  <v-app>
    <v-main>
      <router-view></router-view>
    </v-main>

    <!-- Dialogue de détection semi-automatique : monté ici pour rester
         accessible depuis la bibliothèque comme depuis les paramètres. -->
    <scan-dialog />

    <v-snackbar
      v-model="snackbar.visible"
      :color="typeConfig[snackbar.type].color"
      :timeout="snackbar.timeout"
      location="bottom right"
      rounded="pill"
      elevation="4"
    >
      <div class="d-flex align-center ga-2">
        <v-icon :icon="typeConfig[snackbar.type].icon" />
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn v-if="snackbar.action" variant="text" @click="runAction">
          {{ snackbar.action.label }}
        </v-btn>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useNotification } from '../services/notification.service';
import { initScan } from '../services/scan.service';
import ScanDialog from './scan-dialog.vue';

export default defineComponent({
  name: 'Unified',
  components: { ScanDialog },
  setup() {
    const { snackbar, typeConfig, close, runAction } = useNotification();

    // Abonnement unique aux évènements de scan du main process (progression
    // et résultat du scan automatique au démarrage).
    onMounted(() => { initScan() });

    return { snackbar, typeConfig, close, runAction };
  },
});
</script>
