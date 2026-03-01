import * as mock from './authClientMock';
import * as firebase from './authClientFirebase';
import type { AuthUser } from '../stores/useAuthStore';

const provider = (import.meta.env.VITE_AUTH_PROVIDER ?? 'mock').toLowerCase();
const selected = provider === 'firebase' ? firebase : mock;

export const authProviderMode = provider === 'firebase' ? 'firebase' : 'mock';

export const restoreSession = selected.restoreSession;
export const signInWithEmailLink = selected.signInWithEmailLink;
export const tryCompleteEmailLinkSignIn = selected.tryCompleteEmailLinkSignIn;
export const signOut = selected.signOut;
export const getAccessToken = selected.getAccessToken;

export const onAuthChanged: ((callback: (user: AuthUser | null) => void) => () => void) | null =
  provider === 'firebase' ? firebase.onAuthChanged : null;

export const signInWithGoogle: (() => Promise<AuthUser>) | null =
  provider === 'firebase' ? firebase.signInWithGoogle : null;
