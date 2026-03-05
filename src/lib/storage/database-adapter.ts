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