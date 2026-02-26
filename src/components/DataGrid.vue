<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Data</h2>
    <RecycleScroller class="mt-4 h-[26rem]" :items="rows" :item-size="44" key-field="id" v-slot="{ item }">
      <div class="grid grid-cols-8 gap-2 border-b px-2 py-2 text-sm">
        <input class="border rounded px-1" type="date" :value="item.date.slice(0, 10)" @change="update(item.id, 'date', ($event.target as HTMLInputElement).value)" />
        <span>{{ item.month }}</span>
        <select class="border rounded px-1" :value="item.type" @change="update(item.id, 'type', ($event.target as HTMLSelectElement).value)">
          <option>Income</option><option>Expense</option><option>Neutral</option>
        </select>
        <input class="border rounded px-1" :value="item.category" @change="update(item.id, 'category', ($event.target as HTMLInputElement).value)" />
        <input class="border rounded px-1" :value="item.label" @change="update(item.id, 'label', ($event.target as HTMLInputElement).value)" />
        <input class="border rounded px-1" :value="item.purpose" @change="update(item.id, 'purpose', ($event.target as HTMLInputElement).value)" />
        <input class="border rounded px-1" type="number" :value="item.amount" @change="update(item.id, 'amount', Number(($event.target as HTMLInputElement).value))" />
        <div class="flex gap-1">
          <button class="rounded border px-2" @click="tx.duplicateRow(item.id)">Dup</button>
          <button class="rounded border px-2" @click="tx.deleteRow(item.id)">Del</button>
        </div>
      </div>
    </RecycleScroller>
    <div class="mt-3 flex gap-2">
      <button class="rounded border px-3 py-2" @click="tx.undo">Undo</button>
      <button class="rounded border px-3 py-2" @click="tx.redo">Redo</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import type { Tx } from '../types';

const tx = useTransactionsStore();
const rows = computed(() => tx.rows);

function update(id: string, key: keyof Tx, value: Tx[keyof Tx]) {
  tx.editRow(id, { [key]: value } as Partial<Tx>);
}
</script>
