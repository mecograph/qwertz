import { defineStore } from 'pinia';
import { authProviderMode, restoreSession, signInWithEmailLink, signOut as signOutClient } from '../services/authClient';

export interface AuthUser {
  uid: string;
  email: string;
  provider: 'mock-email-link' | 'firebase-email-link';
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: restoreSession() as AuthUser | null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    providerMode: () => authProviderMode as 'mock' | 'firebase',
  },
  actions: {
    async signInWithEmailLink(email: string) {
      this.loading = true;
      try {
        this.user = await signInWithEmailLink(email);
      } finally {
        this.loading = false;
      }
    },
    signOut() {
      this.user = null;
      signOutClient();
    },
  },
});
