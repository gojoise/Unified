import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'; // Ensure you are using css-loader

// Components
import Library from './components/library.vue';
import Settings from './components/settings.vue';
import Unified from './components/unified.vue';

// Configure Vue Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Library',
      component: Library,
    },
    {
      path: '/settings',
      name: 'Settings',
      component: Settings,
    },
  ],
});

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
});

const app = createApp(Unified);

app.use(vuetify);
app.use(router);

app.mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event: any, message: any) => {
    console.log(message);
  });
});
