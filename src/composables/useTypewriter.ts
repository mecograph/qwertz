import { ref, onMounted, onUnmounted } from 'vue';

export function useTypewriter(text: string, speed = 40) {
  const displayed = ref('');
  const done = ref(false);
  let index = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    timer = setInterval(() => {
      if (index < text.length) {
        displayed.value = text.slice(0, ++index);
      } else {
        done.value = true;
        clearInterval(timer);
      }
    }, speed);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { displayed, done };
}
