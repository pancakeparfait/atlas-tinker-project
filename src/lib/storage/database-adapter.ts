import { prisma } from '@/lib/prisma';
import { StorageAdapter, StorageMetadata, StoredImage, IMAGE_CONFIG } from './storage-adapter';

export class DatabaseStorageAdapter implements StorageAdapter {
  async saveImage(id: string, data: Buffer, metadata: StorageMetadata): Promise<void> {
    // Validate the image first
    const validation = await this.validateImage(data, metadata);
    if (!validation.isValid) {
      throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
    }

    // Update the recipe with image data
    await prisma.recipe.update({
      where: { id },
      data: {
        imageData: data,
        imageMimeType: metadata.mimeType,
        imageFileName: metadata.fileName,
      },
    });
  }

  async getImage(id: string): Promise<StoredImage | null> {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: {
        id: true,
        imageData: true,
        imageMimeType: true,
        imageFileName: true,
      },
    });

    if (!recipe?.imageData || !recipe.imageMimeType || !recipe.imageFileName) {
      return null;
    }

    return {
      id: recipe.id,
      data: recipe.imageData,
      metadata: {
        mimeType: recipe.imageMimeType,
        fileName: recipe.imageFileName,
        size: recipe.imageData.length,
      },
    };
  }

  async deleteImage(id: string): Promise<void> {
    await prisma.recipe.update({
      where: { id },
      data: {
        imageData: null,
        imageMimeType: null,
        imageFileName: null,
      },
    });
  }

  async imageExists(id: string): Promise<boolean> {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { imageData: true },
    });

    return !!recipe?.imageData;
  }

  async validateImage(data: Buffer, metadata: StorageMetadata): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check file size
    if (data.length > IMAGE_CONFIG.maxSizeBytes) {
      errors.push(`File size ${data.length} exceeds maximum ${IMAGE_CONFIG.maxSizeBytes} bytes`);
    }

    if (data.length < IMAGE_CONFIG.minSizeBytes) {
      errors.push(`File size ${data.length} is below minimum ${IMAGE_CONFIG.minSizeBytes} bytes`);
    }

    // Check MIME type
    if (!IMAGE_CONFIG.allowedMimeTypes.includes(metadata.mimeType as any)) {
      errors.push(`MIME type ${metadata.mimeType} is not allowed. Allowed types: ${IMAGE_CONFIG.allowedMimeTypes.join(', ')}`);
    }

    // Basic file corruption check - ensure file has valid image header
    if (!this.hasValidImageHeader(data, metadata.mimeType)) {
      errors.push(`Invalid image file format for ${metadata.mimeType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // --- Multi-image (Phase 2) ---

  async saveRecipeImage(
    recipeId: string,
    data: Buffer,
    metadata: StorageMetadata,
    order: number,
  ): Promise<string> {
    const validation = await this.validateImage(data, metadata);
    if (!validation.isValid) {
      throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
    }

    const created = await prisma.recipeImage.create({
      data: {
        recipeId,
        order,
        data,
        mimeType: metadata.mimeType,
        fileName: metadata.fileName,
      },
      select: { id: true },
    });

    return created.id;
  }

  async getRecipeImage(imageId: string): Promise<StoredImage | null> {
    const row = await prisma.recipeImage.findUnique({
      where: { id: imageId },
      select: {
        id: true,
        data: true,
        mimeType: true,
        fileName: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      data: row.data,
      metadata: {
        mimeType: row.mimeType,
        fileName: row.fileName,
        size: row.data.length,
      },
    };
  }

  async listRecipeImages(recipeId: string): Promise<Array<{
    id: string;
    order: number;
    fileName: string;
    mimeType: string;
  }>> {
    return prisma.recipeImage.findMany({
      where: { recipeId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, fileName: true, mimeType: true },
    });
  }

  async deleteRecipeImage(imageId: string, recipeId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Composite where guards against cross-recipe deletion (Pitfall: Elevation of Privilege).
      // Prisma will throw P2025 if no row matches; we let it propagate so callers map to 404.
      await tx.recipeImage.delete({ where: { id: imageId, recipeId } });

      const remaining = await tx.recipeImage.findMany({
        where: { recipeId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      // Renormalize remaining orders to a contiguous 0..n-1 sequence inside the same tx.
      await Promise.all(
        remaining.map((img, idx) =>
          tx.recipeImage.update({
            where: { id: img.id },
            data: { order: idx },
          }),
        ),
      );
    });
  }

  async reorderRecipeImages(recipeId: string, orderedIds: string[]): Promise<void> {
    // Composite where prevents reordering another recipe's images.
    // The route layer is responsible for validating orderedIds is the complete set.
    await prisma.$transaction(
      orderedIds.map((imageId, index) =>
        prisma.recipeImage.update({
          where: { id: imageId, recipeId },
          data: { order: index },
        }),
      ),
    );
  }

  private hasValidImageHeader(data: Buffer, mimeType: string): boolean {
    if (data.length < 4) return false;

    const header = data.subarray(0, 4);
    
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return header[0] === 0xFF && header[1] === 0xD8;
      case 'image/png':
        return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      case 'image/webp':
        return data.length >= 12 && data.subarray(8, 12).toString() === 'WEBP';
      case 'image/gif':
        const gif87 = header.toString().startsWith('GIF87');
        const gif89 = header.toString().startsWith('GIF89');
        return gif87 || gif89;
      default:
        return true; // Allow unknown types to pass basic validation
    }
  }
}