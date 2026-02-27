import type { AuthUser } from '../stores/useAuthStore';
import { getFirebaseConfig } from './firebaseConfig';

const SESSION_KEY = 'tx-auth-firebase-session-v1';
const PENDING_EMAIL_KEY = 'tx-auth-firebase-pending-email-v1';

interface FirebaseSession {
  user: AuthUser;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

function identityToolkitUrl(path: string, apiKey: string) {
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`;
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

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message || `HTTP_${res.status}`;
    throw new Error(`Firebase auth error: ${code}`);
  }
  return data as T;
}

function clearAuthQueryParams() {
  const url = new URL(window.location.href);
  ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'].forEach((name) => url.searchParams.delete(name));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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
  await postJson(identityToolkitUrl('accounts:sendOobCode', cfg.apiKey), {
    requestType: 'EMAIL_SIGNIN',
    email: normalized,
    continueUrl: actionUrl,
    canHandleCodeInApp: true,
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

  const result = await postJson<{
    email: string;
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  }>(identityToolkitUrl('accounts:signInWithEmailLink', cfg.apiKey), {
    email: pendingEmail,
    oobCode,
  });

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

export function getAccessToken() {
  const session = loadSession();
  if (!session) return null;
  if (Date.now() >= session.expiresAt) return null;
  return session.idToken;
}
