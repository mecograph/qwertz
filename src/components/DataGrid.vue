<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Tx } from '@/types/transactions'
import { extractMonth } from '@/utils/date'

const props = defineProps<{ rows: Tx[] }>()
const emit = defineEmits<{ (e: 'update', rows: Tx[]): void }>()

const rowHeight = 38
const containerHeight = 520
const scrollTop = ref(0)
const viewport = ref<HTMLDivElement | null>(null)
const undoStack = ref<Tx[][]>([])

const start = computed(() => Math.floor(scrollTop.value / rowHeight))
const visibleCount = Math.ceil(containerHeight / rowHeight) + 5
const sliced = computed(() => props.rows.slice(start.value, start.value + visibleCount))

const onScroll = () => {
  scrollTop.value = viewport.value?.scrollTop ?? 0
}

const patch = (id: string, key: keyof Tx, value: string) => {
  undoStack.value.push(JSON.parse(JSON.stringify(props.rows)))
  if (undoStack.value.length > 20) undoStack.value.shift()

  const next = props.rows.map((r) => {
    if (r.id !== id) return r
    const cloned: Tx = { ...r, [key]: key === 'betrag' ? Number(value) : value }
    if (key === 'buchungsdatum') cloned.monat = extractMonth(cloned.buchungsdatum)
    if (key === 'betrag') cloned.betragAbs = Math.abs(cloned.betrag)
    if (cloned.kategorie === 'Umbuchung') cloned.typ = 'Neutral'
    else cloned.typ = cloned.betrag > 0 ? 'Einnahme' : 'Ausgabe'
    return cloned
  })
  emit('update', next)
}

const undo = () => {
  const prev = undoStack.value.pop()
  if (prev) emit('update', prev)
}
</script>

<template>
  <section class="rounded bg-white p-3 shadow">
    <div class="mb-2 flex justify-between">
      <h3 class="font-semibold">Data Grid (virtualized)</h3>
      <button class="rounded border px-2 py-1 text-sm" @click="undo">Undo</button>
    </div>
    <div class="grid grid-cols-8 gap-1 border-b bg-slate-50 p-1 text-xs font-semibold sticky top-0">
      <div>Datum</div><div>Monat</div><div>Kategorie</div><div>Bezeichnung</div><div>Verwendungszweck</div><div>Typ</div><div>Betrag</div><div>Betrag ABS</div>
    </div>
    <div ref="viewport" class="overflow-auto" :style="{ height: containerHeight + 'px' }" @scroll="onScroll">
      <div :style="{ height: props.rows.length * rowHeight + 'px', position: 'relative' }">
        <div
          v-for="(row, idx) in sliced"
          :key="row.id"
          class="grid grid-cols-8 gap-1 border-b p-1 text-sm"
          :style="{ position: 'absolute', left: 0, right: 0, top: (start + idx) * rowHeight + 'px' }"
        >
          <input class="border" type="date" :value="row.buchungsdatum" @change="patch(row.id, 'buchungsdatum', ($event.target as HTMLInputElement).value)" />
          <input class="border" :value="row.monat" @change="patch(row.id, 'monat', ($event.target as HTMLInputElement).value)" />
          <input class="border" :value="row.kategorie" @change="patch(row.id, 'kategorie', ($event.target as HTMLInputElement).value)" />
          <input class="border" :value="row.bezeichnung" @change="patch(row.id, 'bezeichnung', ($event.target as HTMLInputElement).value)" />
          <input class="border" :value="row.verwendungszweck" @change="patch(row.id, 'verwendungszweck', ($event.target as HTMLInputElement).value)" />
          <input class="border" :value="row.typ" @change="patch(row.id, 'typ', ($event.target as HTMLInputElement).value)" />
          <input class="border" type="number" :value="row.betrag" @change="patch(row.id, 'betrag', ($event.target as HTMLInputElement).value)" />
          <div class="px-1">{{ row.betragAbs.toFixed(2) }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
