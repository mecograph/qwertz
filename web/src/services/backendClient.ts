import * as mock from './backendClientMock';
import * as firebase from './backendClientFirebase';

const provider = (import.meta.env.VITE_BACKEND_PROVIDER ?? 'mock').toLowerCase();
const selected = provider === 'firebase' ? firebase : mock;

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
export const updateImportWrappedDek = selected.updateImportWrappedDek;
export const revertImport = selected.revertImport;
export const writeImportEvent = selected.writeImportEvent;
export const listImportEvents = selected.listImportEvents;
