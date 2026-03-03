import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { retentionSweep } from './retention';
export { checkUploadQuota } from './rateLimits';
export { suggestMapping } from './suggestMapping';
