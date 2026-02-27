<template>
  <svg
    class="shrink-0"
    :width="size"
    :height="size"
    viewBox="0 0 21 21"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- dashboard: 2x2 grid -->
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="12" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="12" width="6" height="6" rx="1" />
      <rect x="12" y="12" width="6" height="6" rx="1" />
    </template>

    <!-- chart: bar chart -->
    <template v-else-if="name === 'chart'">
      <line x1="5" y1="17" x2="5" y2="10" />
      <line x1="10.5" y1="17" x2="10.5" y2="5" />
      <line x1="16" y1="17" x2="16" y2="8" />
    </template>

    <!-- data: list rows -->
    <template v-else-if="name === 'data'">
      <line x1="8" y1="6" x2="17" y2="6" />
      <line x1="8" y1="10.5" x2="17" y2="10.5" />
      <line x1="8" y1="15" x2="17" y2="15" />
      <circle cx="4.5" cy="6" r="0.5" fill="currentColor" />
      <circle cx="4.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="4.5" cy="15" r="0.5" fill="currentColor" />
    </template>

    <!-- settings: cog gear -->
    <template v-else-if="name === 'settings'">
      <circle cx="10.5" cy="10.5" r="2.5" />
      <path d="M12 3h-3l-.5 2.1a5.5 5.5 0 0 0-1.8 1l-2-.8L3.2 7.8l1.5 1.4a5.5 5.5 0 0 0 0 2.6l-1.5 1.4 1.5 2.5 2-.8a5.5 5.5 0 0 0 1.8 1L9 18h3l.5-2.1a5.5 5.5 0 0 0 1.8-1l2 .8 1.5-2.5-1.5-1.4a5.5 5.5 0 0 0 0-2.6l1.5-1.4-1.5-2.5-2 .8a5.5 5.5 0 0 0-1.8-1z" />
    </template>

    <!-- bell -->
    <template v-else-if="name === 'bell'">
      <path d="M15.5 8.5a5 5 0 0 0-10 0c0 3-1.5 5-1.5 5h13s-1.5-2-1.5-5" />
      <path d="M9 16.5a2 2 0 0 0 3 0" />
    </template>

    <!-- chevron-left -->
    <template v-else-if="name === 'chevron-left'">
      <polyline points="13 5 7 10.5 13 16" />
    </template>

    <!-- chevron-right -->
    <template v-else-if="name === 'chevron-right'">
      <polyline points="8 5 14 10.5 8 16" />
    </template>

    <!-- sign-out: door with arrow -->
    <template v-else-if="name === 'sign-out'">
      <path d="M12.5 7V4h-8v13h8v-3" />
      <line x1="9" y1="10.5" x2="18" y2="10.5" />
      <polyline points="15 7.5 18 10.5 15 13.5" />
    </template>

    <!-- moon -->
    <template v-else-if="name === 'moon'">
      <path d="M15 13.5A6 6 0 0 1 7.5 6a6 6 0 1 0 7.5 7.5z" />
    </template>

    <!-- sun -->
    <template v-else-if="name === 'sun'">
      <circle cx="10.5" cy="10.5" r="3" />
      <line x1="10.5" y1="3" x2="10.5" y2="5" />
      <line x1="10.5" y1="16" x2="10.5" y2="18" />
      <line x1="4" y1="4" x2="5.5" y2="5.5" />
      <line x1="15.5" y1="15.5" x2="17" y2="17" />
      <line x1="3" y1="10.5" x2="5" y2="10.5" />
      <line x1="16" y1="10.5" x2="18" y2="10.5" />
      <line x1="4" y1="17" x2="5.5" y2="15.5" />
      <line x1="15.5" y1="5.5" x2="17" y2="4" />
    </template>

    <!-- filter: three horizontal lines -->
    <template v-else-if="name === 'filter'">
      <line x1="3" y1="5.5" x2="18" y2="5.5" />
      <line x1="5" y1="10.5" x2="16" y2="10.5" />
      <line x1="7.5" y1="15.5" x2="13.5" y2="15.5" />
    </template>

    <!-- user: person silhouette -->
    <template v-else-if="name === 'user'">
      <circle cx="10.5" cy="7.5" r="3" />
      <path d="M4 18c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
    </template>

    <!-- translate: speech bubble with A/文 -->
    <template v-else-if="name === 'translate'">
      <path d="M4 4h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4l-3 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M7 7h3M8.5 7v4M7 9.5h3" />
      <path d="M12.5 7l1.5 4 1.5-4M12.5 9.5h3" />
    </template>
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: 'dashboard' | 'chart' | 'data' | 'settings' | 'bell' | 'chevron-left' | 'chevron-right' | 'sign-out' | 'moon' | 'sun' | 'filter' | 'user' | 'translate';
    size?: number;
  }>(),
  { size: 20 },
);
</script>
