<template>
  <section class="term-pane">
    <h2 class="text-sm font-bold">$ validate</h2>
    <p class="mt-1 text-sm">
      <span class="text-terminal-green">[OK]</span> {{ t('validation_valid_rows') }}: {{ validCount }}
      <span class="mx-2 text-terminal-muted">|</span>
      <span :class="issues.length ? 'text-terminal-red' : 'text-terminal-green'">[{{ issues.length ? 'ERR' : 'OK' }}]</span> {{ t('validation_invalid_rows') }}: {{ issues.length }}
    </p>
    <ul class="mt-3 max-h-40 overflow-auto text-sm" v-if="issues.length">
      <li v-for="issue in issues.slice(0, 50)" :key="issue.row" class="border-b border-terminal-border py-1 text-terminal-red">
        Row {{ issue.row }}: {{ issue.reasons.join(', ') }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { ValidationIssue } from '../types';
import { useLocale } from '../composables/useLocale';

defineProps<{ issues: ValidationIssue[]; validCount: number }>();
const { t } = useLocale();
</script>
