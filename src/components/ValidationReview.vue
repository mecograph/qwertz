<template>
  <section class="rounded-xl bg-white p-4 shadow">
    <h2 class="text-lg font-semibold">Validation</h2>
    <p class="mt-1 text-sm">Valid rows: {{ validCount }} | Invalid rows: {{ issues.length }}</p>
    <ul class="mt-3 max-h-40 overflow-auto text-sm" v-if="issues.length">
      <li v-for="issue in issues.slice(0, 50)" :key="issue.row" class="border-b py-1">
        Row {{ issue.row }}: {{ issue.reasons.join(', ') }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { ValidationIssue } from '../types';
defineProps<{ issues: ValidationIssue[]; validCount: number }>();
</script>
