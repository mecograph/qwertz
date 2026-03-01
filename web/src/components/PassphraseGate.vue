<template>
  <section class="mx-auto w-full max-w-md term-pane">
    <h2 class="text-sm font-bold text-terminal-amber">
      {{ isSetup ? t('passphrase_setup_title') : t('passphrase_unlock_title') }}
    </h2>
    <p class="mt-2 text-xs text-terminal-muted">
      {{ isSetup ? t('passphrase_setup_desc') : t('passphrase_unlock_desc') }}
    </p>

    <div v-if="isSetup" class="mt-2 border border-terminal-amber/30 bg-terminal-amber/5 p-2 text-xs text-terminal-amber">
      {{ t('passphrase_warning_irrecoverable') }}
    </div>

    <div class="mt-4 space-y-2">
      <input
        v-model="passphrase"
        type="password"
        class="term-input w-full"
        :placeholder="t('passphrase_placeholder')"
        @keyup.enter="submit"
      />
      <input
        v-if="isSetup"
        v-model="confirm"
        type="password"
        class="term-input w-full"
        :placeholder="t('passphrase_confirm_placeholder')"
        @keyup.enter="submit"
      />
      <p v-if="error" class="text-xs text-terminal-red">{{ error }}</p>
      <button class="term-btn w-full" :disabled="loading" @click="submit">
        {{ loading ? t('passphrase_processing') : (isSetup ? t('passphrase_setup_btn') : t('passphrase_unlock_btn')) }}
      </button>
    </div>

    <div class="mt-3 text-xs text-terminal-muted">
      <button class="underline hover:text-terminal-green" @click="$emit('purge')">
        {{ t('passphrase_forgot_link') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLocale } from '../composables/useLocale';
import { useCryptoGate } from '../composables/useCryptoGate';

defineProps<{ isSetup: boolean }>();
defineEmits<{ purge: [] }>();

const { t } = useLocale();
const cryptoGate = useCryptoGate();
const passphrase = ref('');
const confirm = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';

  if (passphrase.value.length < 12) {
    error.value = t('passphrase_too_short');
    return;
  }

  if (cryptoGate.needsSetup.value) {
    if (passphrase.value !== confirm.value) {
      error.value = t('passphrase_mismatch');
      return;
    }

    loading.value = true;
    try {
      await cryptoGate.setupPassphrase(passphrase.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('passphrase_setup_failed');
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = true;
    try {
      const ok = await cryptoGate.unlock(passphrase.value);
      if (!ok) {
        error.value = t('passphrase_wrong');
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : t('passphrase_unlock_failed');
    } finally {
      loading.value = false;
    }
  }
}
</script>
