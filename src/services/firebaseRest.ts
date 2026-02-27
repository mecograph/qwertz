export function firestoreDocUrl(projectId: string, path: string) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`;
}

export function storageObjectUrl(bucket: string, objectPath: string) {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodedPath}`;
}

export function storageUploadUrl(bucket: string, objectPath: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?name=${encodeURIComponent(objectPath)}`;
}

export async function firebaseJsonRequest<T>(params: {
  url: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  bearerToken?: string;
  allow404?: boolean;
}): Promise<T | null> {
  const { url, method = 'GET', body, headers, bearerToken, allow404 = false } = params;

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
      ...(headers ?? {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (allow404 && response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase request failed (${response.status}): ${text || 'unknown error'}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}
