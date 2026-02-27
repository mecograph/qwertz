import { computed } from 'vue';
import { useLocaleStore } from '../stores/useLocaleStore';
import { useUiStore } from '../stores/useUiStore';
import { en } from '../i18n/en';
import { de } from '../i18n/de';
import type { TranslationKey } from '../i18n/en';

const messages = { en, de } as const;

function stripBrackets(text: string): string {
  return text.replace(/^\[\s*/, '').replace(/\s*\]$/, '');
}

export function useLocale() {
  const locale = useLocaleStore();
  const ui = useUiStore();

  const lang = computed(() => locale.lang);

  const currencyFormatter = computed(() =>
    new Intl.NumberFormat(locale.lang === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: 'EUR' }),
  );

  const dateLocale = computed(() => (locale.lang === 'de' ? 'de-DE' : 'en-GB'));

  function t(key: TranslationKey): string {
    const raw = messages[locale.lang][key];
    if (ui.theme === 'light') return stripBrackets(raw);
    return raw;
  }

  function formatCurrency(value: number): string {
    return currencyFormatter.value.format(value);
  }

  function formatDate(dateStr: string): string {
    const dt = new Date(dateStr + 'T00:00:00');
    return dt.toLocaleDateString(dateLocale.value, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatMonth(ym: string): string {
    const [year, month] = ym.split('-');
    const dt = new Date(Number(year), Number(month) - 1, 1);
    return dt.toLocaleDateString(dateLocale.value, { month: 'short', year: 'numeric' });
  }

  return { t, formatCurrency, formatDate, formatMonth, lang };
}
