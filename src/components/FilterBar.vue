<script setup lang="ts">
import { computed } from 'vue'
import { useFilterStore } from '@/stores/useFilterStore'
import type { Tx } from '@/types/transactions'

const props = defineProps<{ rows: Tx[] }>()
const filterStore = useFilterStore()

const years = computed(() => filterStore.yearsFromData(props.rows).value)
const categories = computed(() => [...new Set(props.rows.map((r) => r.kategorie))].sort())
</script>

<template>
  <section class="sticky top-0 z-10 border-b bg-white/95 px-3 py-2 backdrop-blur">
    <div class="flex flex-wrap gap-2">
      <select class="rounded border px-2 py-1" v-model.number="filterStore.selectedYear">
        <option :value="null">Alle Jahre</option>
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      <input class="rounded border px-2 py-1" placeholder="Monat MM" v-model="filterStore.selectedMonth" />
      <input class="rounded border px-2 py-1" placeholder="Suche Verwendungszweck" v-model="filterStore.search" />
      <select class="rounded border px-2 py-1" v-model="filterStore.category" multiple>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <button class="rounded border px-3 py-1" @click="filterStore.reset">Reset</button>
    </div>
  </section>
</template>
