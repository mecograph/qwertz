import { defineStore } from 'pinia';

export type Lang = 'en' | 'de';

function detectLang(): Lang {
  const saved = localStorage.getItem('tx-analyzer-locale');
  if (saved === 'en' || saved === 'de') return saved;
  const nav = navigator.language.slice(0, 2);
  return nav === 'de' ? 'de' : 'en';
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    lang: detectLang() as Lang,
  }),
  actions: {
    setLang(lang: Lang) {
      this.lang = lang;
      localStorage.setItem('tx-analyzer-locale', lang);
    },
  },
});
