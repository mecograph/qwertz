<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h3 class="mb-3 text-lg font-medium">Data Grid</h3>
    <RecycleScroller class="h-[430px]" :items="rows" :item-size="48" key-field="id" v-slot="{ item }">
      <div class="grid grid-cols-6 gap-2 border-b p-2 text-sm">
        <input class="rounded border p-1" type="date" :value="iso(item.buchungsdatum)" @change="update(item.id, 'buchungsdatum', ($event.target as HTMLInputElement).value)" />
        <input class="rounded border p-1" :value="item.kategorie" @change="update(item.id, 'kategorie', ($event.target as HTMLInputElement).value)" />
        <input class="rounded border p-1" :value="item.bezeichnung" @change="update(item.id, 'bezeichnung', ($event.target as HTMLInputElement).value)" />
        <input class="rounded border p-1" :value="item.verwendungszweck" @change="update(item.id, 'verwendungszweck', ($event.target as HTMLInputElement).value)" />
        <input class="rounded border p-1" type="number" :value="item.betrag" @change="update(item.id, 'betrag', ($event.target as HTMLInputElement).value)" />
        <div class="flex gap-1">
          <button class="rounded border px-2" @click="duplicate(item.id)">Dup</button>
          <button class="rounded border px-2" @click="remove(item.id)">Del</button>
        </div>
      </div>
    </RecycleScroller>
  </div>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller'
import { useTransactionsStore } from '../stores/useTransactionsStore'
import { deriveTyp } from '../utils/validators'

const txStore = useTransactionsStore()
const rows = txStore.rows

const iso = (d: Date) => new Date(d).toISOString().slice(0, 10)

function update(id: string, field: string, value: string) {
  const next = txStore.rows.map((row) => {
    if (row.id !== id) return row
    const copy = { ...row }
    if (field === 'buchungsdatum') {
      copy.buchungsdatum = new Date(value)
      copy.monat = String(copy.buchungsdatum.getMonth() + 1).padStart(2, '0')
    } else if (field === 'betrag') {
      copy.betrag = Number(value)
      copy.betragAbs = Math.abs(copy.betrag)
      copy.typ = deriveTyp(copy.kategorie, copy.betrag)
    } else {
      ;(copy as Record<string, unknown>)[field] = value
      if (field === 'kategorie') copy.typ = deriveTyp(copy.kategorie, copy.betrag)
    }
    return copy
  })
  txStore.setRows(next)
}

function duplicate(id: string) {
  const row = txStore.rows.find((r) => r.id === id)
  if (!row) return
  txStore.setRows([...txStore.rows, { ...row, id: crypto.randomUUID() }])
}

function remove(id: string) {
  txStore.setRows(txStore.rows.filter((r) => r.id !== id))
}
</script>
