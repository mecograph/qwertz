import { defineStore } from 'pinia';

const THEME_KEY = 'tx-analyzer-theme';

export type AppTab = 'Dashboard' | 'Charts' | 'Data' | 'Settings';

const TAB_TO_ROUTE: Record<AppTab, string> = {
  Dashboard: '/app/dashboard',
  Charts: '/app/charts',
  Data: '/app/data',
  Settings: '/app/settings',
};

function routeToTab(path: string): AppTab | null {
  const normalized = path.toLowerCase();
  if (normalized.startsWith('/app/charts')) return 'Charts';
  if (normalized.startsWith('/app/data')) return 'Data';
  if (normalized.startsWith('/app/settings')) return 'Settings';
  if (normalized.startsWith('/app/dashboard')) return 'Dashboard';
  return null;
}

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

function loadTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function initialTab(): AppTab {
  return routeToTab(currentPath()) ?? 'Dashboard';
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    tab: initialTab() as AppTab,
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
    setTab(tab: AppTab) {
      this.tab = tab;
      const target = TAB_TO_ROUTE[tab];
      if (currentPath() !== target) {
        window.history.pushState({}, '', `#${target}`);
      }
    },
    syncTabFromLocation() {
      const tab = routeToTab(currentPath());
      if (tab) this.tab = tab;
    },
  },
});
