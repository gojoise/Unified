import { reactive } from 'vue';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationState {
  visible: boolean;
  message: string;
  type: NotificationType;
  timeout: number;
}

// Singleton au niveau du module : tous les appels à useNotification() partagent le même état.
// Cela garantit qu'une seule snackbar est affichée à la fois dans toute l'application.
const state = reactive<NotificationState>({
  visible: false,
  message: '',
  type: 'info',
  timeout: 4000,
});

/** Couleur Vuetify et icône MDI associées à chaque type de notification. */
const typeConfig: Record<NotificationType, { color: string; icon: string }> = {
  info:    { color: 'info',    icon: 'mdi-information' },
  success: { color: 'success', icon: 'mdi-check-circle' },
  warning: { color: 'warning', icon: 'mdi-alert' },
  error:   { color: 'error',   icon: 'mdi-alert-circle' },
};

/**
 * Composable de notification globale.
 *
 * Utilisation typique :
 * ```ts
 * const { notifySuccess, notifyError } = useNotification()
 * notifySuccess('Jeu ajouté !')
 * ```
 *
 * `unified.vue` consomme `snackbar` et `typeConfig` pour afficher la snackbar.
 * Les autres composants/services utilisent uniquement les helpers `notify*`.
 */
export function useNotification() {
  const notify = (message: string, type: NotificationType = 'info', timeout = 4000) => {
    state.message = message;
    state.type = type;
    state.timeout = timeout;
    state.visible = true;
  };

  const close = () => {
    state.visible = false;
  };

  return {
    snackbar: state,
    typeConfig,
    notify,
    close,
    notifyInfo:    (msg: string, timeout?: number) => notify(msg, 'info',    timeout),
    notifySuccess: (msg: string, timeout?: number) => notify(msg, 'success', timeout),
    notifyWarning: (msg: string, timeout?: number) => notify(msg, 'warning', timeout),
    notifyError:   (msg: string, timeout?: number) => notify(msg, 'error',   timeout),
  };
}
