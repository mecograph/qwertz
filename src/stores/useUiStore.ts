import { defineStore } from 'pinia';

const THEME_KEY = 'tx-analyzer-theme';

function loadTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    tab: 'Dashboard' as 'Dashboard' | 'Charts' | 'Data' | 'Settings',
    wizardStep: 0,
    processing: false,
    theme: loadTheme() as 'dark' | 'light',
  }),
  getters: {
    chartTheme: (state) => (state.theme === 'light' ? 'flat' : 'terminal'),
  },
  actions: {
    setTheme(theme: 'dark' | 'light') {
      this.theme = theme;
      localStorage.setItem(THEME_KEY, theme);
    },
  },
});
