<script setup lang="ts">
const tabs = ['Dashboard', 'Charts', 'Data', 'Settings'] as const
const props = defineProps<{ activeTab: string }>()
const emit = defineEmits<{ (e: 'tab', tab: (typeof tabs)[number]): void }>()
</script>

<template>
  <div class="border-b bg-white">
    <nav class="mx-auto flex max-w-7xl gap-2 p-2">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="rounded px-3 py-2 text-sm"
        :class="props.activeTab === tab ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'"
        @click="emit('tab', tab)"
      >
        {{ tab }}
      </button>
    </nav>
  </div>
</template>
