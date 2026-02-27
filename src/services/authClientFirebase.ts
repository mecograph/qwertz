import type { AuthUser } from '../stores/useAuthStore';
import { firebaseJsonRequest } from './firebaseRest';
import { getFirebaseConfig } from './firebaseConfig';

const SESSION_KEY = 'tx-auth-firebase-session-v1';
const PENDING_EMAIL_KEY = 'tx-auth-firebase-pending-email-v1';
const MIN_TOKEN_VALIDITY_MS = 60_000;

interface FirebaseSession {
  user: AuthUser;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

function identityToolkitUrl(path: string, apiKey: string) {
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`;
}

function secureTokenUrl(apiKey: string) {
  return `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`;
}

function loadSession(): FirebaseSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession(session: FirebaseSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function assertConfig() {
  const cfg = getFirebaseConfig();
  if (!cfg.apiKey || !cfg.authDomain) {
    throw new Error('Firebase auth is not configured. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_AUTH_DOMAIN.');
  }
  return cfg;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function clearAuthQueryParams() {
  const url = new URL(window.location.href);
  ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'].forEach((name) => url.searchParams.delete(name));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

async function refreshSessionIfNeeded(session: FirebaseSession): Promise<FirebaseSession | null> {
  const { apiKey } = assertConfig();
  if (Date.now() + MIN_TOKEN_VALIDITY_MS < session.expiresAt) {
    return session;
  }

  const response = await fetch(secureTokenUrl(apiKey), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
  });

  if (!response.ok) {
    persistSession(null);
    return null;
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: string;
  };

  const next: FirebaseSession = {
    ...session,
    idToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  };
  persistSession(next);
  return next;
}

export function restoreSession(): AuthUser | null {
  const session = loadSession();
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    persistSession(null);
    return null;
  }
  return session.user;
}

export async function signInWithEmailLink(email: string): Promise<{ status: 'link_sent' | 'signed_in'; user?: AuthUser }> {
  const cfg = assertConfig();
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  const actionUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  await firebaseJsonRequest({
    url: identityToolkitUrl('accounts:sendOobCode', cfg.apiKey),
    method: 'POST',
    body: {
      requestType: 'EMAIL_SIGNIN',
      email: normalized,
      continueUrl: actionUrl,
      canHandleCodeInApp: true,
    },
  });

  localStorage.setItem(PENDING_EMAIL_KEY, normalized);
  return { status: 'link_sent' };
}

export async function tryCompleteEmailLinkSignIn(): Promise<AuthUser | null> {
  const cfg = assertConfig();
  const url = new URL(window.location.href);
  const mode = url.searchParams.get('mode');
  const oobCode = url.searchParams.get('oobCode');

  if (mode !== 'signIn' || !oobCode) return null;

  const pendingEmail = localStorage.getItem(PENDING_EMAIL_KEY);
  if (!pendingEmail) {
    throw new Error('Missing pending sign-in email. Please request a new sign-in link.');
  }

  const result = await firebaseJsonRequest<{
    email: string;
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  }>({
    url: identityToolkitUrl('accounts:signInWithEmailLink', cfg.apiKey),
    method: 'POST',
    body: {
      email: pendingEmail,
      oobCode,
    },
  });

  if (!result) throw new Error('Failed to complete email-link sign-in.');

  const user: AuthUser = {
    uid: result.localId,
    email: result.email,
    provider: 'firebase-email-link',
  };

  persistSession({
    user,
    idToken: result.idToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + Number(result.expiresIn) * 1000,
  });

  localStorage.removeItem(PENDING_EMAIL_KEY);
  clearAuthQueryParams();
  return user;
}

export function signOut() {
  persistSession(null);
  localStorage.removeItem(PENDING_EMAIL_KEY);
}

export async function getAccessToken() {
  const session = loadSession();
  if (!session) return null;
  const refreshed = await refreshSessionIfNeeded(session);
  return refreshed?.idToken ?? null;
}
