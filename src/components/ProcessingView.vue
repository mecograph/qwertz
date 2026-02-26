<template>
  <div v-if="active" class="term-pane text-sm text-terminal-amber">
    $ pipeline: parse_file | build_table | apply_mapping | normalize_rows | persist<span class="cursor-blink"></span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>
