import * as mock from './backendClientMock';
import * as firebase from './backendClientFirebase';

const provider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
const selected = provider === 'firebase' ? firebase : mock;

if (provider === 'firebase') {
  console.warn('[backendClient] Firebase provider selected, but only scaffold is implemented. Falling through to scaffold handlers.');
}

export type { ImportMetaPayload, PersistedImport, RetentionCheckResult, AnalyticsOverview } from './backendClientMock';

export const encryptAndStoreOriginal = selected.encryptAndStoreOriginal;
export const downloadOriginalImport = selected.downloadOriginalImport;
export const createImportMeta = selected.createImportMeta;
export const extendImportRetentionOnce = selected.extendImportRetentionOnce;
export const runRetentionCheck = selected.runRetentionCheck;
export const listImportMeta = selected.listImportMeta;
export const clearImportMeta = selected.clearImportMeta;
export const materializeAnalyticsOverview = selected.materializeAnalyticsOverview;
export const getAnalyticsOverview = selected.getAnalyticsOverview;
