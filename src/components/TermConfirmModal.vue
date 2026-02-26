<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/70" @click="$emit('cancel')"></div>
      <div class="relative z-10 w-96 max-w-[90vw] border border-terminal-border bg-terminal-surface p-6">
        <h3 class="text-sm font-bold text-terminal-amber">{{ title }}</h3>
        <p class="mt-2 text-sm text-terminal-green">{{ message }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button class="term-btn px-3 py-1 text-xs" @click="$emit('cancel')">Cancel</button>
          <button class="term-btn-danger px-3 py-1 text-xs" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>
