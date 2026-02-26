import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { loadSettings, saveSettings } from '../utils/storage'

interface UiSettings {
  tab: 'Dashboard' | 'Charts' | 'Data' | 'Settings'
  topCategories: number
  topLabels: number
  defaultGranularity: 'year' | 'month' | 'week' | 'day' | 'custom'
}

const defaults: UiSettings = {
  tab: 'Dashboard',
  topCategories: 12,
  topLabels: 20,
  defaultGranularity: 'year',
}

export const useUiStore = defineStore('ui', () => {
  const settings = ref<UiSettings>(loadSettings(defaults))

  watch(
    settings,
    (next) => {
      saveSettings(next)
    },
    { deep: true },
  )

  return { settings }
})
