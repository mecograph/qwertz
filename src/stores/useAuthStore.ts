import { defineStore } from 'pinia';

export interface AuthUser {
  uid: string;
  email: string;
  provider: 'mock-email-link';
}

const STORAGE_KEY = 'tx-auth-session-v1';

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function uidFromEmail(email: string) {
  return `uid_${btoa(email.toLowerCase()).replace(/=/g, '')}`;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: load() as AuthUser | null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async signInWithEmailLinkMock(email: string) {
      this.loading = true;
      try {
        const normalized = email.trim().toLowerCase();
        if (!normalized || !normalized.includes('@')) {
          throw new Error('Please provide a valid email address.');
        }
        const user: AuthUser = {
          uid: uidFromEmail(normalized),
          email: normalized,
          provider: 'mock-email-link',
        };
        this.user = user;
        persist(user);
      } finally {
        this.loading = false;
      }
    },
    signOut() {
      this.user = null;
      persist(null);
    },
  },
});
