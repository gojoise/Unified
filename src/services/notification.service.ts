import { reactive } from 'vue';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/** Bouton optionnel affiché dans la snackbar (ex. « Voir » après un scan au démarrage). */
export interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface NotificationState {
  visible: boolean;
  message: string;
  type: NotificationType;
  timeout: number;
  action: NotificationAction | null;
}

// Singleton au niveau du module : tous les appels à useNotification() partagent le même état.
// Cela garantit qu'une seule snackbar est affichée à la fois dans toute l'application.
let notificationsEnabled = true

/** Appelé par settings.component au chargement et à chaque changement du toggle. */
export function setNotificationsEnabled(value: boolean) {
  notificationsEnabled = value
}

const state = reactive<NotificationState>({
  visible: false,
  message: '',
  type: 'info',
  timeout: 4000,
  action: null,
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
  const notify = (
    message: string,
    type: NotificationType = 'info',
    timeout = 4000,
    action: NotificationAction | null = null,
  ) => {
    if (!notificationsEnabled) return
    state.message = message;
    state.type = type;
    state.timeout = timeout;
    state.action = action;
    state.visible = true;
  };

  /** Déclenche l'action de la snackbar puis la referme. */
  const runAction = () => {
    state.action?.onClick();
    state.visible = false;
  };

  const close = () => {
    state.visible = false;
  };

  return {
    snackbar: state,
    typeConfig,
    notify,
    close,
    runAction,
    notifyInfo:    (msg: string, timeout?: number) => notify(msg, 'info',    timeout),
    notifySuccess: (msg: string, timeout?: number) => notify(msg, 'success', timeout),
    notifyWarning: (msg: string, timeout?: number) => notify(msg, 'warning', timeout),
    notifyError:   (msg: string, timeout?: number) => notify(msg, 'error',   timeout),
  };
}
