<template>
  <div class="flex flex-col items-center text-center">
    <pre class="text-terminal-green-dim text-xs leading-tight hidden sm:block">
  _____ _  __   _   _  _   _   _ __   _______ ___
 |_   _| \/ /  /_\ | \| | /_\ | |\ \ / /_  / | __| _ \
   | | |  /  / _ \| .` |/ _ \| |_\ V / / /  | _||   /
   |_| |_/\_\/_/ \_\_|\_/_/ \_\____|_| /___| |___|_|_\
    </pre>
    <h1 class="mt-4 text-xl font-bold">
      <span>{{ displayed }}</span><span v-if="!done" class="cursor-blink"></span>
    </h1>
    <p class="mt-2 text-terminal-muted">{{ t('splash_tagline') }}</p>
    <div class="mt-6 flex flex-col gap-3 w-full max-w-xs">
      <label class="term-btn cursor-pointer text-center">
        {{ t('splash_upload') }}
        <input class="hidden" type="file" accept=".csv,.xlsx" @change="onChange" />
      </label>
      <button class="term-btn" @click="$emit('import-json')">{{ t('splash_import_json') }}</button>
      <button class="term-btn" @click="$emit('continue')">{{ t('splash_continue') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTypewriter } from '../composables/useTypewriter';
import { useLocale } from '../composables/useLocale';

const emit = defineEmits<{ upload: [file: File]; 'import-json': []; continue: [] }>();
const { displayed, done } = useTypewriter('$ Client-Side Transaction Analyzer');
const { t } = useLocale();

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files?.[0]) return;
  emit('upload', target.files[0]);
}
</script>
