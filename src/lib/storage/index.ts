import { DatabaseStorageAdapter } from './database-adapter';
import { StorageAdapter } from './storage-adapter';

// Current implementation uses database storage
// In the future, this can be easily switched to cloud storage
export const storageAdapter: StorageAdapter = new DatabaseStorageAdapter();

// Re-export types and constants for convenience
export type { StorageAdapter, StorageMetadata, StoredImage } from './storage-adapter';
export { IMAGE_CONFIG } from './storage-adapter';