import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    tab: 'Dashboard' as 'Dashboard' | 'Charts' | 'Data' | 'Settings',
    wizardStep: 0,
    processing: false,
  }),
});
