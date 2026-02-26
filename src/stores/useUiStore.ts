import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeTab: 'Dashboard' as 'Dashboard' | 'Charts' | 'Data' | 'Settings'
  })
})
