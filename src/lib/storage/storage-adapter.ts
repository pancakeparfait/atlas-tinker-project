export interface StorageMetadata {
  mimeType: string;
  fileName: string;
  size: number;
}

export interface StoredImage {
  id: string;
  data: Buffer;
  metadata: StorageMetadata;
}

export interface StorageAdapter {
  /**
   * Save an image with metadata
   */
  saveImage(id: string, data: Buffer, metadata: StorageMetadata): Promise<void>;

  /**
   * Retrieve an image by ID
   */
  getImage(id: string): Promise<StoredImage | null>;

  /**
   * Delete an image by ID
   */
  deleteImage(id: string): Promise<void>;

  /**
   * Check if an image exists
   */
  imageExists(id: string): Promise<boolean>;

  /**
   * Validate image data and metadata
   */
  validateImage(data: Buffer, metadata: StorageMetadata): Promise<{
    isValid: boolean;
    errors: string[];
  }>;
}

// Configuration for image validation
export const IMAGE_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ] as const,
  minSizeBytes: 100, // 100 bytes minimum
};