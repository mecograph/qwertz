import { onMounted, onUnmounted, type Ref } from 'vue';

export function useClickOutside(
  target: Ref<HTMLElement | null | undefined>,
  handler: () => void,
) {
  function onClick(event: MouseEvent) {
    const el = target.value;
    if (!el) return;
    if (event.composedPath().includes(el)) return;
    handler();
  }

  onMounted(() => document.addEventListener('click', onClick));
  onUnmounted(() => document.removeEventListener('click', onClick));
}
