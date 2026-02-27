<template>
  <section class="mx-auto w-full max-w-md term-pane">
    <h2 class="text-sm font-bold text-terminal-amber">{{ t('auth_title') }}</h2>
    <p class="mt-2 text-xs text-terminal-muted">{{ t('auth_desc') }}</p>

    <div class="mt-4 space-y-2">
      <input
        v-model="email"
        type="email"
        class="term-input w-full"
        :placeholder="t('auth_email_placeholder')"
      />
      <button class="term-btn w-full" :disabled="auth.loading" @click="signIn">
        {{ auth.loading ? t('auth_signing_in') : t('auth_sign_in') }}
      </button>
    </div>

    <div v-if="auth.providerMode === 'firebase'" class="mt-3 space-y-2">
      <div class="flex items-center gap-2 text-xs text-terminal-muted">
        <span class="flex-1 border-t border-terminal-border"></span>
        <span>or</span>
        <span class="flex-1 border-t border-terminal-border"></span>
      </div>
      <button class="term-btn w-full" :disabled="auth.loading" @click="googleSignIn">
        {{ t('auth_google_sign_in') }}
      </button>
    </div>

    <p class="mt-3 text-[11px] text-terminal-muted">{{ auth.providerMode === 'firebase' ? t('auth_firebase_scaffold_notice') : t('auth_mock_notice') }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocale } from '../composables/useLocale';
import { useToastStore } from '../stores/useToastStore';
import { toAppError } from '../utils/appError';

const auth = useAuthStore();
const toast = useToastStore();
const { t } = useLocale();
const email = ref('');

async function signIn() {
  try {
    const result = await auth.signInWithEmailLink(email.value);
    if (result.status === 'signed_in') {
      toast.push('success', t('auth_signed_in'));
      return;
    }
    toast.push('success', t('auth_link_sent'));

  } catch (error) {
    const appError = toAppError(error, t('auth_failed'));
    toast.push('error', appError.message, 4200);
  }
}

async function googleSignIn() {
  try {
    await auth.signInWithGoogle();
    toast.push('success', t('auth_signed_in'));
  } catch (error) {
    const appError = toAppError(error, t('auth_failed'));
    toast.push('error', appError.message, 4200);
  }
}
</script>
