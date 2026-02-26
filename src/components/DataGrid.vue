<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller';
import { useFilterStore } from '@/stores/useFilterStore';
import { useTransactionsStore } from '@/stores/useTransactionsStore';

const filters = useFilterStore();
const txStore = useTransactionsStore();
</script>

<template>
  <div class="rounded bg-white p-4 shadow">
    <h2 class="mb-3 text-lg font-semibold">Data</h2>
    <RecycleScroller :items="filters.filteredRows" :item-size="44" key-field="id" class="h-[500px]">
      <template #default="{ item }">
        <div class="grid grid-cols-12 gap-2 border-b py-2 text-sm">
          <input
            class="col-span-2 rounded border px-1"
            type="date"
            :value="item.buchungsdatum.toISOString().slice(0, 10)"
            @change="txStore.updateRow(item.id, { buchungsdatum: new Date(($event.target as HTMLInputElement).value) })"
          />
          <input class="col-span-2 rounded border px-1" :value="item.kategorie" @change="txStore.updateRow(item.id, { kategorie: ($event.target as HTMLInputElement).value })" />
          <input class="col-span-2 rounded border px-1" :value="item.bezeichnung" @change="txStore.updateRow(item.id, { bezeichnung: ($event.target as HTMLInputElement).value })" />
          <input class="col-span-4 rounded border px-1" :value="item.verwendungszweck" @change="txStore.updateRow(item.id, { verwendungszweck: ($event.target as HTMLInputElement).value })" />
          <input class="col-span-2 rounded border px-1" type="number" :value="item.betrag" @change="txStore.updateRow(item.id, { betrag: Number(($event.target as HTMLInputElement).value) })" />
        </div>
      </template>
    </RecycleScroller>
  </div>
</template>
