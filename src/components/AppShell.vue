<template>
  <div class="min-h-screen">
    <header class="border-b bg-white">
      <nav class="mx-auto flex max-w-7xl gap-2 p-4">
        <button v-for="item in tabs" :key="item" class="rounded px-3 py-2" :class="ui.tab === item ? 'bg-blue-600 text-white' : 'border'" @click="ui.tab = item">{{ item }}</button>
      </nav>
    </header>
    <main class="mx-auto grid max-w-7xl gap-4 p-4">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../stores/useUiStore';

const ui = useUiStore();
const tabs = ['Dashboard', 'Charts', 'Data', 'Settings'] as const;
</script>
