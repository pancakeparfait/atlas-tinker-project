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

  // --- Multi-image (Phase 2) ---

  /**
   * Persist a new image for a recipe at the given order slot. Returns the generated imageId.
   */
  saveRecipeImage(
    recipeId: string,
    data: Buffer,
    metadata: StorageMetadata,
    order: number,
  ): Promise<string>;

  /**
   * Retrieve a single recipe image by its imageId (bytes + metadata).
   */
  getRecipeImage(imageId: string): Promise<StoredImage | null>;

  /**
   * Delete an image scoped to its owning recipe and renormalize remaining
   * orders to a contiguous 0..n-1 sequence in a single transaction.
   */
  deleteRecipeImage(imageId: string, recipeId: string): Promise<void>;

  /**
   * List metadata for all images attached to a recipe in ascending order.
   * Never returns the raw bytes (callers fetch bytes via getRecipeImage).
   */
  listRecipeImages(recipeId: string): Promise<Array<{
    id: string;
    order: number;
    fileName: string;
    mimeType: string;
  }>>;

  /**
   * Atomically rewrite the order field for the provided imageIds within a
   * single transaction, guarding against cross-recipe manipulation.
   */
  reorderRecipeImages(recipeId: string, orderedIds: string[]): Promise<void>;
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