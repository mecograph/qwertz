import type { AuthUser } from '../stores/useAuthStore';
import type { Tx } from '../types';
import type { AnalyticsOverview, ImportMetaPayload, RetentionCheckResult } from './backendClientMock';

function unavailable(op: string): never {
  throw new Error(`Firebase backend provider is not available yet (${op}). Install the Firebase SDK and wire src/services/backendClientFirebase.ts.`);
}

export async function encryptAndStoreOriginal(_user: AuthUser, _file: File) {
  return unavailable('encryptAndStoreOriginal');
}

export async function downloadOriginalImport(_user: AuthUser, _importId: string) {
  return unavailable('downloadOriginalImport');
}

export async function createImportMeta(_user: AuthUser, _payload: ImportMetaPayload) {
  return unavailable('createImportMeta');
}

export async function extendImportRetentionOnce(_user: AuthUser, _importId: string) {
  return unavailable('extendImportRetentionOnce');
}

export async function runRetentionCheck(_user: AuthUser): Promise<RetentionCheckResult> {
  return unavailable('runRetentionCheck');
}

export async function listImportMeta(_user: AuthUser) {
  return unavailable('listImportMeta');
}

export async function clearImportMeta(_user: AuthUser) {
  return unavailable('clearImportMeta');
}

export async function materializeAnalyticsOverview(_user: AuthUser, _rows: Tx[]): Promise<AnalyticsOverview> {
  return unavailable('materializeAnalyticsOverview');
}

export async function getAnalyticsOverview(_user: AuthUser): Promise<AnalyticsOverview | null> {
  return unavailable('getAnalyticsOverview');
}
