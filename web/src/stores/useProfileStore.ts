import { defineStore } from 'pinia';

const PROFILE_KEY = 'tx-profile';

interface ProfileState {
  displayName: string;
  avatarUrl: string;
}

function loadProfile(): ProfileState {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { displayName: parsed.displayName ?? '', avatarUrl: parsed.avatarUrl ?? '' };
    }
  } catch {
    // ignore
  }
  return { displayName: '', avatarUrl: '' };
}

export const useProfileStore = defineStore('profile', {
  state: (): ProfileState => loadProfile(),
  actions: {
    setDisplayName(name: string) {
      this.displayName = name;
      this.persist();
    },
    setAvatar(url: string) {
      this.avatarUrl = url;
      this.persist();
    },
    removeAvatar() {
      this.avatarUrl = '';
      this.persist();
    },
    persist() {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ displayName: this.displayName, avatarUrl: this.avatarUrl }));
    },
  },
});
