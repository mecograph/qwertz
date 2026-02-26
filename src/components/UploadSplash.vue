<template>
  <div class="term-pane">
    <pre class="text-terminal-green-dim text-xs leading-tight">
  _____ _  __   _   _  _   _   _ __   _______ ___
 |_   _| \/ /  /_\ | \| | /_\ | |\ \ / /_  / | __| _ \
   | | |  /  / _ \| .` |/ _ \| |_\ V / / /  | _||   /
   |_| |_/\_\/_/ \_\_|\_/_/ \_\____|_| /___| |___|_|_\
    </pre>
    <h1 class="mt-4 text-xl font-bold">
      <span>{{ displayed }}</span><span v-if="!done" class="cursor-blink"></span>
    </h1>
    <p class="mt-2 text-terminal-muted">Import XLSX/CSV. Your data stays local in your browser.</p>
    <div class="mt-6 flex flex-wrap gap-3">
      <label class="term-btn cursor-pointer">
        [ Upload file ]
        <input class="hidden" type="file" accept=".csv,.xlsx" @change="onChange" />
      </label>
      <button class="term-btn" @click="$emit('import-json')">[ Import JSON ]</button>
      <button class="term-btn" @click="$emit('continue')">[ Continue saved ]</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTypewriter } from '../composables/useTypewriter';

const emit = defineEmits<{ upload: [file: File]; 'import-json': []; continue: [] }>();
const { displayed, done } = useTypewriter('$ Client-Side Transaction Analyzer');

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files?.[0]) return;
  emit('upload', target.files[0]);
}
</script>
