import { ref, watch, toRaw } from 'vue'
import { useSettingsStore, saveSettingValue, addSearchLocation } from '../services/settings.service'
import { useNotification } from '../services/notification.service'
import { type AppSettings, type GameStartBehavior, SETTINGS_LABELS } from '../types/settings.types'

export default {
  setup() {
    const { notifySuccess, notifyError } = useNotification()
    const tab = ref('option-1')
    const hoveredIndex = ref<number | null>(null)
    const settings = useSettingsStore()

    const watchKey = (key: keyof AppSettings) =>
      watch(() => settings[key], async v => {
        await saveSettingValue(key, v)
        notifySuccess(`Paramètre "${SETTINGS_LABELS[key]}" enregistré`)
      })

    watchKey('enableNotifications')
    watchKey('enableAutoUpdate')
    watchKey('launchAtWindowsBoot')
    watchKey('enableDarkTheme')
    watchKey('confirmBeforeDelete')
    watchKey('autoScan')
    watchKey('minimizeToTray')
    watchKey('gameStartBehavior')

    const onAddLocation = async () => {
      try {
        const chosen = await addSearchLocation()
        if (chosen) {
          settings.searchLocations.push(chosen)
          await saveSettingValue('searchLocations', toRaw(settings.searchLocations))
          notifySuccess('Emplacement ajouté')
        }
      } catch {
        notifyError("Impossible d'ajouter l'emplacement de recherche")
      }
    }

    const onDeleteLocation = async (index: number) => {
      settings.searchLocations.splice(index, 1)
      await saveSettingValue('searchLocations', toRaw(settings.searchLocations))
      notifySuccess('Emplacement supprimé')
    }

const gameStartBehaviorOptions: { title: string; value: GameStartBehavior }[] = [
      { title: 'Ne rien faire',           value: 'nothing'      },
      { title: "Réduire l'application",   value: 'minimize'     },
      { title: 'Fermer dans le tray',     value: 'close-to-tray'},
      { title: "Fermer l'application",    value: 'close'        },
    ]

    return {
      tab,
      settings,
      hoveredIndex,
      gameStartBehaviorOptions,
      onAddLocation,
      onDeleteLocation,
    }
  },
}
