<template>
  <div class="flex flex-col items-center text-center">
    <pre class="text-terminal-green-dim text-xs leading-tight hidden sm:block">
  _____ _  __   _   _  _   _   _ __   _______ ___
 |_   _| \/ /  /_\ | \| | /_\ | |\ \ / /_  / | __| _ \
   | | |  /  / _ \| .` |/ _ \| |_\ V / / /  | _||   /
   |_| |_/\_\/_/ \_\_|\_/_/ \_\____|_| /___| |___|_|_\
    </pre>
    <h1 class="mt-4 text-base font-bold">
      <span>{{ displayed }}</span><span v-if="!done" class="cursor-blink"></span>
    </h1>
    <p class="mt-2 text-terminal-muted">{{ t('splash_tagline') }}</p>
    <div class="mt-6 flex flex-col gap-3 w-full max-w-xs">
      <button class="term-btn" :disabled="ui.processing" @click="triggerUpload">
        {{ ui.processing ? t('splash_uploading') : t('splash_upload') }}
      </button>
      <button class="term-btn" :disabled="ui.processing" @click="$emit('import-json')">{{ t('splash_import_json') }}</button>
      <button class="term-btn" :disabled="ui.processing" @click="$emit('continue')">{{ t('splash_continue') }}</button>
    </div>

    <!-- Theme toggle + Language switcher -->
    <div class="mt-6 flex items-center justify-center gap-4 border-t border-terminal-border pt-4">
      <button
        class="relative flex shrink-0 items-center border border-terminal-border transition-all duration-200"
        :class="ui.theme === 'light' ? 'bg-terminal-green-dim' : 'bg-terminal-surface'"
        :style="{ width: '48px', height: '28px', padding: '4px', borderRadius: ui.theme === 'light' ? '9999px' : '0' }"
        @click="ui.setTheme(ui.theme === 'dark' ? 'light' : 'dark')"
      >
        <span
          class="flex items-center justify-center bg-terminal-green text-terminal-bg transition-all duration-200"
          :class="ui.theme === 'light' ? 'translate-x-5' : 'translate-x-0'"
          :style="{ width: '20px', height: '20px', borderRadius: ui.theme === 'light' ? '9999px' : '0' }"
        >
          <AppIcon :name="ui.theme === 'dark' ? 'moon' : 'sun'" :size="12" />
        </span>
      </button>

      <span class="text-terminal-border">|</span>

      <div class="flex gap-1">
        <button
          class="px-2 py-1 text-xs transition-colors"
          :class="lang === 'en' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="localeStore.setLang('en')"
        >
          EN
        </button>
        <button
          class="px-2 py-1 text-xs transition-colors"
          :class="lang === 'de' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="localeStore.setLang('de')"
        >
          DE
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTypewriter } from '../composables/useTypewriter';
import { useLocale } from '../composables/useLocale';
import { useUiStore } from '../stores/useUiStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{ upload: [file: File]; 'import-json': []; continue: [] }>();
const { displayed, done } = useTypewriter('$ Client-Side Transaction Analyzer');
const ui = useUiStore();
const localeStore = useLocaleStore();
const { t, lang } = useLocale();

function triggerUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.xlsx';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) emit('upload', file);
    document.body.removeChild(input);
  };
  input.click();
}
</script>
