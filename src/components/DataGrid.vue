<template>
  <section class="flex h-full min-h-0 flex-col term-pane">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-bold">$ data</h2>
      <input
        v-model="search"
        class="term-input w-72"
        :placeholder="t('data_search_placeholder')"
        aria-label="Search transactions"
      />
    </div>

    <p class="mt-2 text-xs text-terminal-muted">{{ t('data_showing') }} {{ pagedRows.length }} {{ t('data_of') }} {{ sortedRows.length }} {{ t('data_filtered_rows') }} ({{ tx.rows.length }} {{ t('data_total') }})</p>

    <div class="mt-3 min-h-0 flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-terminal-bg">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="cursor-pointer select-none border-b border-terminal-border px-2 py-2 text-left text-xs text-terminal-amber hover:text-terminal-green"
              @click="toggleSort(col.key)"
            >
              {{ col.label }}
              <span v-if="sortField === col.key" class="ml-1">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="w-10 border-b border-terminal-border px-2 py-2 text-xs text-terminal-amber"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in pagedRows"
            :key="item.id"
            class="border-b border-terminal-border hover:bg-terminal-green-dim/30"
          >
            <!-- Date -->
            <td class="px-2 py-2" @click="startEdit(item.id, 'date')">
              <input
                v-if="isEditing(item.id, 'date')"
                type="date"
                class="term-input w-full px-1 py-0"
                :value="item.date.slice(0, 10)"
                @blur="commitEdit(item.id, 'date', ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                @keydown.escape="cancelEdit"
                ref="editInputs"
              />
              <span v-else>{{ item.date.slice(0, 10) }}</span>
            </td>

            <!-- Type -->
            <td class="px-2 py-2" @click="startEdit(item.id, 'type')">
              <select
                v-if="isEditing(item.id, 'type')"
                class="term-select w-full px-1 py-0"
                :value="item.type"
                @change="commitEdit(item.id, 'type', ($event.target as HTMLSelectElement).value)"
                @blur="cancelEdit"
                @keydown.escape="cancelEdit"
                ref="editInputs"
              >
                <option>Income</option><option>Expense</option><option>Neutral</option>
              </select>
              <span v-else>{{ item.type }}</span>
            </td>

            <!-- Category -->
            <td class="px-2 py-2" @click="startEdit(item.id, 'category')">
              <input
                v-if="isEditing(item.id, 'category')"
                class="term-input w-full px-1 py-0"
                :value="item.category"
                @blur="commitEdit(item.id, 'category', ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                @keydown.escape="cancelEdit"
                ref="editInputs"
              />
              <span v-else>{{ item.category }}</span>
            </td>

            <!-- Label -->
            <td class="px-2 py-2" @click="startEdit(item.id, 'label')">
              <input
                v-if="isEditing(item.id, 'label')"
                class="term-input w-full px-1 py-0"
                :value="item.label"
                @blur="commitEdit(item.id, 'label', ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                @keydown.escape="cancelEdit"
                ref="editInputs"
              />
              <span v-else>{{ item.label }}</span>
            </td>

            <!-- Purpose -->
            <td class="px-2 py-2" @click="startEdit(item.id, 'purpose')">
              <input
                v-if="isEditing(item.id, 'purpose')"
                class="term-input w-full px-1 py-0"
                :value="item.purpose ?? ''"
                @blur="commitEdit(item.id, 'purpose', ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                @keydown.escape="cancelEdit"
                ref="editInputs"
              />
              <span v-else class="truncate">{{ item.purpose }}</span>
            </td>

            <!-- Amount -->
            <td class="px-2 py-2 text-right" @click="startEdit(item.id, 'amount')">
              <input
                v-if="isEditing(item.id, 'amount')"
                type="number"
                class="term-input w-full px-1 py-0 text-right"
                :value="item.amount"
                @blur="commitEdit(item.id, 'amount', Number(($event.target as HTMLInputElement).value))"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                @keydown.escape="cancelEdit"
                ref="editInputs"
              />
              <span v-else>{{ formatCurrency(item.amount) }}</span>
            </td>

            <!-- Row overflow menu -->
            <td class="relative px-2 py-2 text-center">
              <button class="text-xs text-terminal-muted hover:text-terminal-green" @click.stop="toggleMenu(item.id)">...</button>
              <div
                v-if="openMenu === item.id"
                class="absolute right-0 top-8 z-30 border border-terminal-border bg-terminal-surface"
              >
                <button class="w-full px-3 py-1 text-left text-xs hover:bg-terminal-green-dim" @click="duplicate(item.id)">{{ t('data_duplicate') }}</button>
                <button class="w-full px-3 py-1 text-left text-xs text-terminal-red hover:bg-terminal-green-dim" @click="remove(item.id)">{{ t('data_delete') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex gap-2">
        <button class="term-btn" @click="undo">{{ t('data_undo') }}</button>
        <button class="term-btn" @click="redo">{{ t('data_redo') }}</button>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <button class="term-btn px-3 py-1.5 disabled:opacity-50" :disabled="page === 1" @click="page--">{{ t('data_prev') }}</button>
        <span class="text-terminal-muted">{{ t('data_page') }} {{ page }} / {{ totalPages }}</span>
        <button class="term-btn px-3 py-1.5 disabled:opacity-50" :disabled="page === totalPages" @click="page++">{{ t('data_next') }}</button>
        <select class="term-select px-2 py-1.5" v-model.number="pageSize">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useTransactionsStore } from '../stores/useTransactionsStore';
import { useLocale } from '../composables/useLocale';
import { useToastStore } from '../stores/useToastStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { Tx } from '../types';

const tx = useTransactionsStore();
const toast = useToastStore();
const notifications = useNotificationStore();
const { t, formatCurrency } = useLocale();
const search = ref('');
const page = ref(1);
const pageSize = ref(50);
const sortField = ref<keyof Tx>('date');
const sortDir = ref<'asc' | 'desc'>('desc');
const editingCell = ref<{ rowId: string; field: string } | null>(null);
const openMenu = ref<string | null>(null);

const columns = computed<{ key: keyof Tx; label: string }[]>(() => [
  { key: 'date', label: t('col_date') },
  { key: 'type', label: t('col_type') },
  { key: 'category', label: t('col_category') },
  { key: 'label', label: t('col_label') },
  { key: 'purpose', label: t('col_purpose') },
  { key: 'amount', label: t('col_amount') },
]);

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

const sortedRows = computed(() => {
  const rows = [...filteredRows.value];
  const field = sortField.value;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
  return rows;
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)));

watch([sortedRows, pageSize], () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
  if (page.value < 1) page.value = 1;
});

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return sortedRows.value.slice(start, start + pageSize.value);
});

function toggleSort(key: keyof Tx) {
  if (sortField.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = key;
    sortDir.value = 'asc';
  }
}

function isEditing(rowId: string, field: string) {
  return editingCell.value?.rowId === rowId && editingCell.value?.field === field;
}

function startEdit(rowId: string, field: string) {
  editingCell.value = { rowId, field };
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement | HTMLSelectElement>('td input:focus, td select');
    if (!el) {
      const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.term-input, .term-select');
      const last = inputs[inputs.length - 1];
      last?.focus();
    }
  });
}

function commitEdit(id: string, key: string, value: string | number) {
  tx.editRow(id, { [key]: value } as Partial<Tx>);
  editingCell.value = null;
}

function cancelEdit() {
  editingCell.value = null;
}

function toggleMenu(id: string) {
  openMenu.value = openMenu.value === id ? null : id;
}

function duplicate(id: string) {
  tx.duplicateRow(id);
  openMenu.value = null;
  toast.push('success', t('feedback_row_duplicated'));
  notifications.add(t('feedback_row_duplicated'), t('feedback_row_duplicated_desc'), 'info');
}

function remove(id: string) {
  tx.deleteRow(id);
  openMenu.value = null;
  toast.push('warning', t('feedback_row_deleted'));
  notifications.add(t('feedback_row_deleted'), t('feedback_row_deleted_desc'), 'warning');
}

function undo() {
  tx.undo();
  toast.push('info', t('feedback_undo_applied'));
}

function redo() {
  tx.redo();
  toast.push('info', t('feedback_redo_applied'));
}

function onDocClick() {
  openMenu.value = null;
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
});
</script>
