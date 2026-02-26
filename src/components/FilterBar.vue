<template>
  <div class="rounded-xl bg-white p-3 shadow">
    <div class="grid gap-2 md:grid-cols-6">
      <select v-model="filters.year" class="rounded border p-2">
        <option v-for="y in filters.years" :key="y" :value="y">{{ y }}</option>
      </select>
      <select v-model="filters.month" class="rounded border p-2">
        <option value="">All months</option>
        <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">{{ String(m).padStart(2, '0') }}</option>
      </select>
      <select v-model="filters.typ" class="rounded border p-2">
        <option>All</option>
        <option>Einnahme</option>
        <option>Ausgabe</option>
        <option>Neutral</option>
      </select>
      <input v-model="filters.query" placeholder="Search Verwendungszweck" class="rounded border p-2 md:col-span-2" />
      <button class="rounded border p-2" @click="filters.reset">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFilterStore } from '../stores/useFilterStore'
const filters = useFilterStore()
</script>
