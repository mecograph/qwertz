const MASTER_KEY_STORAGE = 'tx-master-key-v1';

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

async function importAesKey(raw: ArrayBuffer) {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

async function exportAesKey(key: CryptoKey) {
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

async function getOrCreateMasterKey() {
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
