import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', () => {
  const tab = ref<'Dashboard' | 'Charts' | 'Data' | 'Settings'>('Dashboard');
  const processing = ref(false);

  return { tab, processing };
});
