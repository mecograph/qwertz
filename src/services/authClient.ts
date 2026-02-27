import * as mock from './authClientMock';
import * as firebase from './authClientFirebase';

const provider = (import.meta.env.VITE_AUTH_PROVIDER ?? 'mock').toLowerCase();
const selected = provider === 'firebase' ? firebase : mock;

if (provider === 'firebase') {
  console.info('[authClient] Firebase provider selected. Using REST-based email-link flow.');
}

export const authProviderMode = provider === 'firebase' ? 'firebase' : 'mock';

export const restoreSession = selected.restoreSession;
export const signInWithEmailLink = selected.signInWithEmailLink;
export const tryCompleteEmailLinkSignIn = selected.tryCompleteEmailLinkSignIn;
export const signOut = selected.signOut;
export const getAccessToken = selected.getAccessToken;
