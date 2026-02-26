<script setup lang="ts">
defineProps<{ message: string }>();
</script>

<template>
  <section class="mx-auto mt-20 max-w-xl rounded-xl bg-white p-8 text-center shadow">
    <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    <p class="mt-4">{{ message }}</p>
  </section>
</template>
