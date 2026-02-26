<template>
  <div v-if="active" class="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
    Processing: Parse file → Build table → Apply mapping → Normalize rows → Persist
  </div>
</template>

<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>
