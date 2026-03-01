import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink as sdkSignInWithEmailLink,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as sdkSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebaseApp';
import type { AuthUser } from '../stores/useAuthStore';

const PENDING_EMAIL_KEY = 'tx-auth-firebase-pending-email-v1';

function mapUser(user: User): AuthUser {
  const isGoogle = user.providerData.some((p) => p.providerId === 'google.com');
  return {
    uid: user.uid,
    email: user.email ?? '',
    provider: isGoogle ? 'firebase-google' : 'firebase-email-link',
  };
}

export function restoreSession(): AuthUser | null {
  // SDK handles session persistence via IndexedDB automatically.
  // Reactive state comes from onAuthStateChanged via initAuthListener.
  return null;
}

export async function signInWithEmailLink(email: string): Promise<{ status: 'link_sent' | 'signed_in'; user?: AuthUser }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  const auth = getFirebaseAuth();
  const actionUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  await sendSignInLinkToEmail(auth, normalized, {
    url: actionUrl,
    handleCodeInApp: true,
  });

  localStorage.setItem(PENDING_EMAIL_KEY, normalized);
  return { status: 'link_sent' };
}

export async function tryCompleteEmailLinkSignIn(): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();
  const href = window.location.href;

  if (!isSignInWithEmailLink(auth, href)) return null;

  const pendingEmail = localStorage.getItem(PENDING_EMAIL_KEY);
  if (!pendingEmail) {
    throw new Error('Missing pending sign-in email. Please request a new sign-in link.');
  }

  const result = await sdkSignInWithEmailLink(auth, pendingEmail, href);
  localStorage.removeItem(PENDING_EMAIL_KEY);

  // Clean up query params
  const url = new URL(window.location.href);
  ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'].forEach((name) => url.searchParams.delete(name));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

  return mapUser(result.user);
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return mapUser(result.user);
}

export function signOut() {
  const auth = getFirebaseAuth();
  sdkSignOut(auth);
  localStorage.removeItem(PENDING_EMAIL_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function onAuthChanged(callback: (user: AuthUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (fbUser) => {
    callback(fbUser ? mapUser(fbUser) : null);
  });
}
