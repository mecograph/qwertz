<template>
  <section class="mx-auto max-w-lg space-y-6">
    <!-- Profile Picture & Name -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('profile_avatar') }}</h2>

      <div class="mt-4 flex items-center gap-5">
        <div class="h-20 w-20 shrink-0" style="border-radius: 50%; overflow: hidden">
          <img
            v-if="profile.avatarDataUrl"
            :src="profile.avatarDataUrl"
            alt="Avatar"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full w-full items-center justify-center bg-terminal-green-dim text-2xl font-bold text-terminal-green">
            {{ initial }}
          </div>
        </div>
        <div class="space-y-2">
          <label class="term-btn inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs">
            {{ t('profile_upload_avatar') }}
            <input class="hidden" type="file" accept="image/*" @change="onAvatarUpload" />
          </label>
          <button
            v-if="profile.avatarDataUrl"
            class="block text-xs text-terminal-muted hover:text-terminal-red"
            @click="removeAvatar"
          >
            {{ t('profile_remove_avatar') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Display Name & Email -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('profile_display_name') }}</h2>
      <input
        v-model="localName"
        class="term-input mt-3 w-full"
        :placeholder="t('profile_display_name_placeholder')"
        @keydown.enter="save"
      />

      <h2 class="mt-6 text-sm font-bold text-terminal-amber">{{ t('profile_email') }}</h2>
      <p class="mt-2 text-sm text-terminal-muted">{{ auth.user?.email ?? '—' }}</p>

      <div class="mt-6">
        <button class="term-btn px-4 py-2 text-xs" @click="save">{{ t('profile_save') }}</button>
      </div>
    </div>

    <!-- Preferences -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('profile_preferences') }}</h2>

      <!-- Theme -->
      <div class="mt-4">
        <p class="text-xs text-terminal-muted">{{ t('profile_theme') }}</p>
        <div class="mt-2 flex items-center gap-4">
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
          <span class="text-sm text-terminal-muted">{{ ui.theme === 'dark' ? t('settings_dark') : t('settings_light') }}</span>
        </div>
      </div>

      <!-- Language -->
      <div class="mt-5">
        <p class="text-xs text-terminal-muted">{{ t('profile_language') }}</p>
        <div class="mt-2 flex gap-2">
          <button
            class="px-3 py-1.5 text-xs transition-colors"
            :class="lang === 'en' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
            @click="localeStore.setLang('en')"
          >
            English
          </button>
          <button
            class="px-3 py-1.5 text-xs transition-colors"
            :class="lang === 'de' ? 'bg-terminal-green-dim text-terminal-green' : 'text-terminal-muted hover:text-terminal-green'"
            @click="localeStore.setLang('de')"
          >
            Deutsch
          </button>
        </div>
      </div>
    </div>

    <!-- Account Info -->
    <div class="term-pane">
      <h2 class="text-sm font-bold text-terminal-amber">{{ t('profile_account') }}</h2>

      <div class="mt-4 space-y-3">
        <div>
          <p class="text-xs text-terminal-muted">{{ t('profile_sign_in_method') }}</p>
          <p class="mt-1 text-sm">{{ providerLabel }}</p>
        </div>
        <div>
          <p class="text-xs text-terminal-muted">{{ t('profile_user_id') }}</p>
          <p class="mt-1 font-mono text-xs text-terminal-muted">{{ auth.user?.uid ?? '—' }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useUiStore } from '../stores/useUiStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { useLocale } from '../composables/useLocale';
import { useToastStore } from '../stores/useToastStore';
import AppIcon from './AppIcon.vue';

const auth = useAuthStore();
const profile = useProfileStore();
const ui = useUiStore();
const localeStore = useLocaleStore();
const toast = useToastStore();
const { t, lang } = useLocale();

const localName = ref(profile.displayName);

const initial = computed(() => {
  if (profile.displayName) return profile.displayName.charAt(0).toUpperCase();
  return auth.user?.email?.charAt(0).toUpperCase() ?? '?';
});

const providerLabel = computed(() => {
  const provider = auth.user?.provider;
  if (provider === 'firebase-google') return t('profile_provider_google');
  if (provider === 'firebase-email-link') return t('profile_provider_email');
  return t('profile_provider_mock');
});

function onAvatarUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      profile.setAvatar(canvas.toDataURL('image/jpeg', 0.8));
      toast.push('success', t('profile_saved'));
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  profile.removeAvatar();
  toast.push('info', t('profile_remove_avatar'));
}

function save() {
  profile.setDisplayName(localName.value);
  toast.push('success', t('profile_saved'));
}
</script>
