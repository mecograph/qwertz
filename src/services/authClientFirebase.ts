import type { AuthUser } from '../stores/useAuthStore';

function unavailable(op: string): never {
  throw new Error(`Firebase auth provider is not available yet (${op}). Install Firebase SDK and wire src/services/authClientFirebase.ts.`);
}

export function restoreSession(): AuthUser | null {
  return null;
}

export async function signInWithEmailLink(_email: string): Promise<AuthUser> {
  return unavailable('signInWithEmailLink');
}

export function signOut() {
  unavailable('signOut');
}
