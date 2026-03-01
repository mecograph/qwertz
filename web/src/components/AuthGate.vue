<template>
  <section class="mx-auto w-full max-w-md term-pane">
    <!-- Link sent state -->
    <template v-if="linkSent">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('auth_link_sent_title') }}</h2>
      <p class="mt-2 text-xs text-terminal-muted">
        {{ t('auth_link_sent') }}
      </p>
      <p class="mt-1 text-sm font-bold text-terminal-green break-all">{{ sentEmail }}</p>
      <p class="mt-2 text-xs text-terminal-muted">{{ t('auth_link_sent_check') }}</p>

      <div class="mt-4 space-y-2">
        <button class="term-btn w-full" :disabled="resending" @click="resend">
          {{ resending ? t('auth_resending') : t('auth_resend_link') }}
        </button>
        <button class="term-btn w-full" @click="backToLogin">
          {{ t('auth_link_sent_back') }}
        </button>
      </div>
    </template>

    <!-- Sign-in form -->
    <template v-else>
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

      <p v-if="inlineError" class="mt-3 text-xs text-terminal-red">{{ inlineError }}</p>
      <p class="mt-3 text-xs text-terminal-muted">{{ auth.providerMode === 'firebase' ? t('auth_firebase_scaffold_notice') : t('auth_mock_notice') }}</p>
    </template>

    <!-- Theme toggle + Language switcher -->
    <div class="mt-6 flex items-center justify-center gap-4 border-t border-terminal-border pt-4">
      <button
        class="relative flex shrink-0 items-center border border-terminal-border transition-all duration-200"
        :class="ui.theme === 'light' ? 'bg-terminal-green-dim' : 'bg-terminal-surface'"
        :style="{ width: '48px', height: '28px', padding: '4px', borderRadius: ui.theme === 'light' ? '9999px' : '0' }"
        @click="ui.setTheme(ui.theme === 'dark' ? 'light' : 'dark')"
      >
        <span
          class="flex items-center justify-center bg-terminal-green text-terminal-bg transition-all duration-200"
          :class="ui.theme === 'light' ? 'translate-x-5' : 'translate-x-0'"
          :style="{ width: '20px', height: '20px', borderRadius: ui.theme === 'light' ? '9999px' : '0' }"
        >
          <AppIcon :name="ui.theme === 'dark' ? 'moon' : 'sun'" :size="12" />
        </span>
      </button>

      <span class="text-terminal-border">|</span>

      <div class="flex gap-1">
        <button
          class="px-2 py-1 text-xs transition-colors"
          :class="lang === 'en' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="localeStore.setLang('en')"
        >
          EN
        </button>
        <button
          class="px-2 py-1 text-xs transition-colors"
          :class="lang === 'de' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
          @click="localeStore.setLang('de')"
        >
          DE
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useUiStore } from '../stores/useUiStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { useLocale } from '../composables/useLocale';
import { useToastStore } from '../stores/useToastStore';
import { toAppError } from '../utils/appError';
import AppIcon from './AppIcon.vue';

const auth = useAuthStore();
const ui = useUiStore();
const localeStore = useLocaleStore();
const toast = useToastStore();
const { t, lang } = useLocale();
const email = ref('');
const sentEmail = ref('');
const linkSent = ref(false);
const resending = ref(false);
const inlineError = ref('');

async function signIn() {
  inlineError.value = '';
  console.log('[AuthGate] signIn called, email:', email.value);
  try {
    const result = await auth.signInWithEmailLink(email.value);
    console.log('[AuthGate] signIn result:', result);
    if (result.status === 'signed_in') {
      toast.push('success', t('auth_signed_in'));
      return;
    }
    sentEmail.value = email.value;
    linkSent.value = true;
    console.log('[AuthGate] linkSent set to true');

  } catch (error) {
    console.error('[AuthGate] signIn failed:', error);
    const appError = toAppError(error, t('auth_failed'));
    inlineError.value = appError.message;
    toast.push('error', appError.message, 4200);
  }
}

async function resend() {
  resending.value = true;
  try {
    await auth.signInWithEmailLink(sentEmail.value);
    toast.push('success', t('auth_link_resent'));
  } catch (error) {
    const appError = toAppError(error, t('auth_failed'));
    toast.push('error', appError.message, 4200);
  } finally {
    resending.value = false;
  }
}

function backToLogin() {
  linkSent.value = false;
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
