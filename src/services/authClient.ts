import * as mock from './authClientMock';
import * as firebase from './authClientFirebase';

const provider = (import.meta.env.VITE_AUTH_PROVIDER ?? 'mock').toLowerCase();
const selected = provider === 'firebase' ? firebase : mock;

if (provider === 'firebase') {
  console.warn('[authClient] Firebase provider selected, but only scaffold is implemented. Falling through to scaffold handlers.');
}

export const authProviderMode = provider === 'firebase' ? 'firebase' : 'mock';

export const restoreSession = selected.restoreSession;
export const signInWithEmailLink = selected.signInWithEmailLink;
export const signOut = selected.signOut;
