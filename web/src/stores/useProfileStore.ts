import { defineStore } from 'pinia';

const PROFILE_KEY = 'tx-profile';

interface ProfileState {
  displayName: string;
  avatarDataUrl: string;
}

function loadProfile(): ProfileState {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { displayName: '', avatarDataUrl: '' };
}

export const useProfileStore = defineStore('profile', {
  state: (): ProfileState => loadProfile(),
  actions: {
    setDisplayName(name: string) {
      this.displayName = name;
      this.persist();
    },
    setAvatar(dataUrl: string) {
      this.avatarDataUrl = dataUrl;
      this.persist();
    },
    removeAvatar() {
      this.avatarDataUrl = '';
      this.persist();
    },
    persist() {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ displayName: this.displayName, avatarDataUrl: this.avatarDataUrl }),
      );
    },
  },
});
