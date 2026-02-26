<template>
  <section class="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold">Data</h2>
      <input
        v-model="search"
        class="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Search category, bezeichnung, purpose..."
        aria-label="Search transactions"
      />
    </div>

    <p class="mt-2 text-xs text-slate-500">Showing {{ pagedRows.length }} of {{ filteredRows.length }} filtered rows ({{ tx.rows.length }} total)</p>

    <RecycleScroller class="mt-3 min-h-0 flex-1" :items="pagedRows" :item-size="44" key-field="id" v-slot="{ item }">
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

    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex gap-2">
        <button class="rounded border px-3 py-2" @click="tx.undo">Undo</button>
        <button class="rounded border px-3 py-2" @click="tx.redo">Redo</button>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <button class="rounded border px-3 py-1.5 disabled:opacity-50" :disabled="page === 1" @click="page--">Prev</button>
        <span>Page {{ page }} / {{ totalPages }}</span>
        <button class="rounded border px-3 py-1.5 disabled:opacity-50" :disabled="page === totalPages" @click="page++">Next</button>
        <select class="rounded border px-2 py-1.5" v-model.number="pageSize">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import type { Tx } from '../types';

const tx = useTransactionsStore();
const search = ref('');
const page = ref(1);
const pageSize = ref(50);

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return tx.rows;
  return tx.rows.filter((row) =>
    [row.category, row.label, row.purpose ?? '', row.type, row.date]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));

watch([filteredRows, pageSize], () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
  if (page.value < 1) page.value = 1;
});

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

function update(id: string, key: keyof Tx, value: Tx[keyof Tx]) {
  tx.editRow(id, { [key]: value } as Partial<Tx>);
}
</script>
