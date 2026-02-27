import { getFirebaseConfig } from './firebaseConfig';

function requiredFirebaseKeys() {
  const cfg = getFirebaseConfig();
  return [
    ['VITE_FIREBASE_API_KEY', cfg.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', cfg.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', cfg.projectId],
    ['VITE_FIREBASE_STORAGE_BUCKET', cfg.storageBucket],
  ] as const;
}

export function runRuntimeSetupChecks() {
  const backendProvider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
  const authProvider = (import.meta.env.VITE_AUTH_PROVIDER ?? 'mock').toLowerCase();

  if (backendProvider === 'firebase' && authProvider !== 'firebase') {
    console.warn('[runtime] VITE_BACKEND_PROVIDER=firebase but VITE_AUTH_PROVIDER!=firebase. Firebase backend calls require Firebase auth tokens.');
  }

  if (backendProvider === 'firebase' || authProvider === 'firebase') {
    const missing = requiredFirebaseKeys().filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
      console.warn(`[runtime] Missing Firebase env configuration: ${missing.join(', ')}`);
    }
  }
}
