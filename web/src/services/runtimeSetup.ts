export function runRuntimeSetupChecks() {
  const backendProvider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
  const authProvider = (import.meta.env.VITE_AUTH_PROVIDER ?? 'mock').toLowerCase();

  if (backendProvider === 'firebase' && authProvider !== 'firebase') {
    console.warn('[runtime] VITE_BACKEND_PROVIDER=firebase but VITE_AUTH_PROVIDER!=firebase. Firebase backend calls require Firebase auth tokens.');
  }

  if (backendProvider === 'firebase' || authProvider === 'firebase') {
    const keys = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
    ] as const;
    const missing = keys.filter((k) => !import.meta.env[k]);
    if (missing.length > 0) {
      console.warn(`[runtime] Missing Firebase env configuration: ${missing.join(', ')}`);
    }
  }
}
