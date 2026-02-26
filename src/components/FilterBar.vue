<script setup lang="ts">
import { useFilterStore } from '@/stores/useFilterStore';

const filters = useFilterStore();
</script>

<template>
  <div class="sticky top-0 z-10 border-b bg-white p-3">
    <div class="flex flex-wrap gap-2">
      <input v-model="filters.search" class="rounded border px-3 py-2" placeholder="Search Verwendungszweck" />
      <select v-model="filters.typ" class="rounded border px-3 py-2">
        <option value="all">All Types</option>
        <option value="Einnahme">Einnahme</option>
        <option value="Ausgabe">Ausgabe</option>
        <option value="Neutral">Neutral</option>
      </select>
      <input v-model.number="filters.year" class="w-32 rounded border px-3 py-2" type="number" placeholder="Year" />
    </div>
  </div>
</template>
