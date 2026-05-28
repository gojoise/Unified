<template>
  <v-app>
    <v-main>
      <router-view></router-view>
    </v-main>

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
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useNotification } from '../services/notification.service';

export default defineComponent({
  name: 'Unified',
  setup() {
    const { snackbar, typeConfig, close } = useNotification();
    return { snackbar, typeConfig, close };
  },
});
</script>
