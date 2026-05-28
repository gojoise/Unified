import { ref, onMounted, watch, toRaw } from 'vue'
import { loadSettings, saveSettingValue, addSearchLocation } from '../services/settings.service'
import { useNotification } from '../services/notification.service'

export default {
  setup() {
    const { notifyWarning, notifyError } = useNotification()
    const tab = ref('option-1')
    const hoveredIndex = ref<number | null>(null)

    
    const settings = ref<any | null>(null)
    settings.value = {} // Initialisation pour éviter les erreurs d'accès aux propriétés

    const applyLoaded = (loaded: any[]) => {
      if (!settings.value) settings.value = {}
      const map = new Map(loaded.map((s: any) => [s.code, s.value]))
      if (map.has('enableNotifications')) settings.value.enableNotifications = map.get('enableNotifications')
      if (map.has('enableAutoUpdate')) settings.value.enableAutoUpdate = map.get('enableAutoUpdate')
      if (map.has('launchAtWindowsBoot')) settings.value.launchAtWindowsBoot = map.get('launchAtWindowsBoot')
      if (map.has('enableDarkTheme')) settings.value.enableDarkTheme = map.get('enableDarkTheme')
      const locs = map.get('searchLocations')
      settings.value.searchLocations = Array.isArray(locs) ? locs : (settings.value.searchLocations || [])
    }

    const load = async () => {
      try {
        const loaded = await loadSettings()
        applyLoaded(loaded || [])
      } catch (e) {
        notifyWarning('Impossible de charger les paramètres')
      }
    }

    onMounted(() => {
      load()
    })

    watch(
      () => settings.value.enableNotifications,
      (v) => saveSettingValue('enableNotifications', v)
    )
    watch(
      () => settings.value.enableAutoUpdate,
      (v) => saveSettingValue('enableAutoUpdate', v)
    )
    watch(
      () => settings.value.launchAtWindowsBoot,
      (v) => saveSettingValue('launchAtWindowsBoot', v)
    )
    watch(
      () => settings.value.enableDarkTheme,
      (v) => saveSettingValue('enableDarkTheme', v)
    )

    const onAddLocation = async () => {
      try {
        const chosen = await addSearchLocation()
        if (chosen) {
          if (!settings.value) settings.value = {}
          if (!Array.isArray(settings.value.searchLocations)) settings.value.searchLocations = []
          settings.value.searchLocations.push(chosen)
          await saveSettingValue('searchLocations', toRaw(settings.value.searchLocations))
        }
      } catch (e) {
        notifyError("Impossible d'ajouter l'emplacement de recherche")
      }
    }

    const onDeleteLocation = async (index: number) => {
      if (!settings.value || !Array.isArray(settings.value.searchLocations)) return
      settings.value.searchLocations.splice(index, 1)
      await saveSettingValue('searchLocations', toRaw(settings.value.searchLocations))
    }

    return {
      tab,
      settings,
      hoveredIndex,
      onAddLocation,
      onDeleteLocation,
    }
  },
}
