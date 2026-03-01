<template>
  <div v-if="active" class="term-pane text-sm text-terminal-amber">
    {{ t('processing_pipeline') }}<span class="cursor-blink"></span>
  </div>
</template>

<script setup lang="ts">
import { useLocale } from '../composables/useLocale';

defineProps<{ active: boolean }>();
const { t } = useLocale();
</script>
