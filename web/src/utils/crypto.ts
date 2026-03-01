const MASTER_KEY_STORAGE = 'tx-master-key-v1';
const SALT_STORAGE = 'tx-crypto-salt-v1';
const SCHEMA_STORAGE = 'tx-crypto-schema-v1';
const VERIFY_TOKEN_STORAGE = 'tx-crypto-verify-token-v1';
const VERIFY_CONSTANT = 'TX_ANALYZER_PASSPHRASE_VERIFY';

export interface EncryptedPayload {
  cipherTextB64: string;
  ivB64: string;
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function importAesKey(raw: ArrayBuffer) {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export async function exportAesKey(key: CryptoKey) {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}

export async function generateDataKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function encryptWithKey(key: CryptoKey, data: Uint8Array): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data.buffer as ArrayBuffer);
  return {
    cipherTextB64: bytesToBase64(new Uint8Array(cipher)),
    ivB64: bytesToBase64(iv),
  };
}

export async function decryptWithKey(key: CryptoKey, payload: EncryptedPayload) {
  const cipher = base64ToBytes(payload.cipherTextB64);
  const iv = base64ToBytes(payload.ivB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher.buffer as ArrayBuffer);
  return new Uint8Array(plain);
}

// --- Schema version management ---

export function getCryptoSchemaVersion(): number {
  const v = localStorage.getItem(SCHEMA_STORAGE);
  return v ? Number(v) : 1;
}

export function setCryptoSchemaVersion(version: number) {
  localStorage.setItem(SCHEMA_STORAGE, String(version));
}

// --- Salt management ---

export function getOrCreateSalt(): Uint8Array {
  const existing = localStorage.getItem(SALT_STORAGE);
  if (existing) return base64ToBytes(existing);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_STORAGE, bytesToBase64(salt));
  return salt;
}

// --- PBKDF2 key derivation ---

export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 600_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

// --- Session master key (PBKDF2 mode) ---

let sessionMasterKey: CryptoKey | null = null;

export function setSessionMasterKey(key: CryptoKey) {
  sessionMasterKey = key;
}

export function clearSessionMasterKey() {
  sessionMasterKey = null;
}

export function hasSessionMasterKey(): boolean {
  return sessionMasterKey !== null;
}

// --- Passphrase verification ---

export async function createVerificationToken(key: CryptoKey): Promise<void> {
  const encoder = new TextEncoder();
  const payload = await encryptWithKey(key, encoder.encode(VERIFY_CONSTANT));
  localStorage.setItem(VERIFY_TOKEN_STORAGE, JSON.stringify(payload));
}

export async function verifyPassphrase(key: CryptoKey): Promise<boolean> {
  const raw = localStorage.getItem(VERIFY_TOKEN_STORAGE);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw) as EncryptedPayload;
    const decrypted = await decryptWithKey(key, payload);
    const decoded = new TextDecoder().decode(decrypted);
    return decoded === VERIFY_CONSTANT;
  } catch {
    return false;
  }
}

// --- Master key resolution ---

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  const schema = getCryptoSchemaVersion();

  if (schema >= 2) {
    if (!sessionMasterKey) {
      throw new Error('Session master key not set. Please unlock with your passphrase.');
    }
    return sessionMasterKey;
  }

  // v1: legacy random key
  const existing = localStorage.getItem(MASTER_KEY_STORAGE);
  if (existing) {
    return importAesKey(base64ToBytes(existing).buffer as ArrayBuffer);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(MASTER_KEY_STORAGE, bytesToBase64(raw));
  return importAesKey(raw.buffer as ArrayBuffer);
}

export async function wrapDataKey(dataKey: CryptoKey) {
  const master = await getOrCreateMasterKey();
  const rawDataKey = await exportAesKey(dataKey);
  return encryptWithKey(master, rawDataKey);
}

export async function unwrapDataKey(wrapped: EncryptedPayload) {
  const master = await getOrCreateMasterKey();
  const raw = await decryptWithKey(master, wrapped);
  return importAesKey(raw.buffer as ArrayBuffer);
}

// --- Migration from v1 (random) to v2 (PBKDF2) ---

export async function migrateToPassphrase(
  passphrase: string,
  wrappedDeks: Array<{ importId: string; wrappedDek: EncryptedPayload }>,
): Promise<Array<{ importId: string; wrappedDek: EncryptedPayload }>> {
  // Get old master key (v1)
  const oldMasterRaw = localStorage.getItem(MASTER_KEY_STORAGE);
  if (!oldMasterRaw) {
    throw new Error('No existing master key to migrate from.');
  }
  const oldMaster = await importAesKey(base64ToBytes(oldMasterRaw).buffer as ArrayBuffer);

  // Derive new PBKDF2 key
  const salt = getOrCreateSalt();
  const newMaster = await deriveKeyFromPassphrase(passphrase, salt);

  // Re-wrap all DEKs
  const reWrapped: Array<{ importId: string; wrappedDek: EncryptedPayload }> = [];
  for (const { importId, wrappedDek } of wrappedDeks) {
    const rawDek = await decryptWithKey(oldMaster, wrappedDek);
    const dataKey = await importAesKey(rawDek.buffer as ArrayBuffer);
    const rawDataKey = await exportAesKey(dataKey);
    const newWrapped = await encryptWithKey(newMaster, rawDataKey);
    reWrapped.push({ importId, wrappedDek: newWrapped });
  }

  // Store verification token, set session key, flip schema, remove old key
  await createVerificationToken(newMaster);
  setSessionMasterKey(newMaster);
  setCryptoSchemaVersion(2);
  localStorage.removeItem(MASTER_KEY_STORAGE);

  return reWrapped;
}
