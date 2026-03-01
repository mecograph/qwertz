import { defineStore } from 'pinia';
import {
  authProviderMode,
  restoreSession,
  signInWithEmailLink,
  signOut as signOutClient,
  tryCompleteEmailLinkSignIn,
  onAuthChanged,
  signInWithGoogle as signInWithGoogleClient,
} from '../services/authClient';
import { clearSessionMasterKey } from '../utils/crypto';

export interface AuthUser {
  uid: string;
  email: string;
  provider: 'mock-email-link' | 'firebase-email-link' | 'firebase-google';
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: restoreSession() as AuthUser | null,
    loading: false,
    initializing: true,
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
    async signInWithGoogle() {
      if (!signInWithGoogleClient) return;
      this.loading = true;
      try {
        this.user = await signInWithGoogleClient();
      } finally {
        this.loading = false;
      }
    },
    initAuthListener() {
      if (!onAuthChanged) {
        this.initializing = false;
        return;
      }
      onAuthChanged((user) => {
        this.user = user;
        this.initializing = false;
      });
    },
    signOut() {
      this.user = null;
      clearSessionMasterKey();
      signOutClient();
    },
  },
});
