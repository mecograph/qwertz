<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <div class="grid gap-3 md:grid-cols-4">
      <select class="rounded border p-2" v-model="filters.type" aria-label="Type filter">
        <option value="">All types</option>
        <option value="Income">Income</option>
        <option value="Expense">Expense</option>
        <option value="Neutral">Neutral</option>
      </select>
      <input class="rounded border p-2" v-model="filters.query" placeholder="Search purpose" aria-label="Search purpose" />
      <button class="rounded border px-3 py-2" @click="filters.reset">Reset filters</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFilterStore } from '../stores/useFilterStore';
const filters = useFilterStore();
</script>
