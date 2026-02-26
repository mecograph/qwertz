<script setup lang="ts">
defineProps<{ step: string; errors: number }>()
</script>

<template>
  <section class="mx-auto mt-12 max-w-2xl rounded-xl bg-white p-6 shadow">
    <h2 class="text-lg font-semibold">Datei wird verarbeitet ...</h2>
    <p class="mt-2 text-sm text-slate-600">{{ step }}</p>
    <p class="mt-4 text-sm" v-if="errors">Bisher erkannte ungültige Zeilen: {{ errors }}</p>
  </section>
</template>
