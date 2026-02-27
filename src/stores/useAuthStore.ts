import { defineStore } from 'pinia';
import {
  authProviderMode,
  restoreSession,
  signInWithEmailLink,
  signOut as signOutClient,
  tryCompleteEmailLinkSignIn,
} from '../services/authClient';

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
        const result = await signInWithEmailLink(email);
        if (result.status === 'signed_in' && result.user) {
          this.user = result.user;
        }
        return result;
      } finally {
        this.loading = false;
      }
    },
    async completeSignInFromUrl() {
      this.loading = true;
      try {
        const user = await tryCompleteEmailLinkSignIn();
        if (user) {
          this.user = user;
          return true;
        }
        return false;
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
