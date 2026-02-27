import type { AuthUser } from '../stores/useAuthStore';

const STORAGE_KEY = 'tx-auth-session-v1';

export function restoreSession(): AuthUser | null {
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

export async function signInWithEmailLink(email: string): Promise<{ status: 'link_sent' | 'signed_in'; user?: AuthUser }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  const user: AuthUser = {
    uid: uidFromEmail(normalized),
    email: normalized,
    provider: 'mock-email-link',
  };

  persist(user);
  return { status: 'signed_in', user };
}

export async function tryCompleteEmailLinkSignIn(): Promise<AuthUser | null> {
  return null;
}

export function signOut() {
  persist(null);
}

export function getAccessToken() {
  return null;
}
