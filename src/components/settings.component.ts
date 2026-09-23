import { ref, watch } from 'vue';
import {
  useSettingsStore,
  saveSettingValue,
  addLocation,
  removeLocation,
  forgetPaths,
} from '../services/settings.service';
import { useScan } from '../services/scan.service';
import { useNotification } from '../services/notification.service';
import {
  type AppSettings,
  type GameStartBehavior,
  SETTINGS_LABELS,
} from '../types/settings.types';

export default {
  setup() {
    const { notifySuccess, notifyError } = useNotification();
    const tab = ref('option-1');
    const hoveredIndex = ref<number | null>(null);
    const settings = useSettingsStore();
    const { scan, runScan } = useScan();

    const watchKey = (key: keyof AppSettings) =>
      watch(
        () => settings[key],
        async (v) => {
          await saveSettingValue(key, v);
          notifySuccess(`Paramètre "${SETTINGS_LABELS[key]}" enregistré`);
        }
      );

    watchKey('enableNotifications');
    watchKey('enableAutoUpdate');
    watchKey('launchAtWindowsBoot');
    watchKey('enableDarkTheme');
    watchKey('confirmBeforeDelete');
    watchKey('autoScan');
    watchKey('minimizeToTray');
    watchKey('gameStartBehavior');

    /**
     * Ajout d'un emplacement, suivi d'un scan ciblé sur ce seul dossier :
     * l'action doit produire un résultat visible immédiatement.
     */
    const onAddLocation = async () => {
      try {
        const chosen = await addLocation();
        if (!chosen) return;
        notifySuccess('Emplacement ajouté');
        await runScan([chosen]);
      } catch {
        notifyError("Impossible d'ajouter l'emplacement de recherche");
      }
    };

    const onDeleteLocation = async (index: number) => {
      await removeLocation(index);
      notifySuccess('Emplacement supprimé');
    };

    /** Rescan complet de tous les emplacements configurés. */
    const onScanNow = () => runScan();

    /** Vide une mémoire de recherche : les jeux concernés redeviennent proposables. */
    const onForget = async (key: 'ignoredPaths' | 'dismissedPaths') => {
      await forgetPaths(key);
      notifySuccess('Les jeux concernés seront de nouveau proposés');
    };

    const gameStartBehaviorOptions: {
      title: string;
      value: GameStartBehavior;
    }[] = [
      { title: 'Ne rien faire', value: 'nothing' },
      { title: "Réduire l'application", value: 'minimize' },
      { title: 'Fermer dans le tray', value: 'close-to-tray' },
      { title: "Fermer l'application", value: 'close' },
    ];

    return {
      tab,
      settings,
      scan,
      hoveredIndex,
      gameStartBehaviorOptions,
      onAddLocation,
      onDeleteLocation,
      onScanNow,
      onForget,
    };
  },
};
