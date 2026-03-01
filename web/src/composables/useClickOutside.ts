import { onMounted, onUnmounted, type Ref } from 'vue';

export function useClickOutside(
  target: Ref<HTMLElement | null | undefined>,
  handler: () => void,
) {
  function onClick(event: MouseEvent) {
    const el = target.value;
    if (!el || el === event.target || el.contains(event.target as Node)) return;
    handler();
  }

  onMounted(() => document.addEventListener('pointerdown', onClick, true));
  onUnmounted(() => document.removeEventListener('pointerdown', onClick, true));
}
