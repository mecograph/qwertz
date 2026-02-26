<script setup lang="ts">
import { ref } from 'vue'
import { clearLocal, exportJson } from '@/utils/storage'
import type { Tx } from '@/types/transactions'

const props = defineProps<{ rows: Tx[]; updatedAt: string }>()
const emit = defineEmits<{ (e: 'import', rows: Tx[]): void }>()
const status = ref('')

const purge = () => {
  clearLocal()
  status.value = 'localStorage geleert.'
  emit('import', [])
}

const importJson = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  const parsed = JSON.parse(text) as { transactions: Tx[] }
  emit('import', parsed.transactions)
  status.value = 'JSON importiert.'
}
</script>

<template>
  <section class="rounded bg-white p-4 shadow">
    <h3 class="font-semibold">Storage & Optionen</h3>
    <p class="mt-2 text-sm text-slate-600">Letztes Update: {{ updatedAt || '-' }}</p>
    <div class="mt-4 flex flex-wrap gap-2">
      <button class="rounded border px-3 py-1" @click="exportJson(rows)">Export JSON</button>
      <label class="rounded border px-3 py-1 cursor-pointer">
        Import JSON
        <input class="hidden" type="file" accept="application/json" @change="importJson" />
      </label>
      <button class="rounded border border-rose-400 px-3 py-1 text-rose-600" @click="purge">Purge all data</button>
    </div>
    <p class="mt-3 text-sm">{{ status }}</p>
  </section>
</template>
