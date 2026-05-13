import { DatabaseStorageAdapter } from '../database-adapter';
import { StorageMetadata } from '../storage-adapter';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipeImage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

// Build a minimal valid PNG buffer (>= IMAGE_CONFIG.minSizeBytes = 100)
function makePngBuffer(size = 256): Buffer {
  const buf = Buffer.alloc(size);
  // PNG magic header
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  return buf;
}

const metadata: StorageMetadata = {
  mimeType: 'image/png',
  fileName: 'photo.png',
  size: 256,
};

describe('DatabaseStorageAdapter — multi-image methods', () => {
  let adapter: DatabaseStorageAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new DatabaseStorageAdapter();
  });

  describe('Test A: saveRecipeImage + getRecipeImage roundtrip', () => {
    it('saves an image with order, returns generated id, then retrieves matching bytes', async () => {
      const recipeId = 'recipe-1';
      const buffer = makePngBuffer();

      (prisma.recipeImage.create as jest.Mock).mockResolvedValue({ id: 'img-1' });
      const savedId = await adapter.saveRecipeImage(recipeId, buffer, metadata, 0);

      expect(savedId).toBe('img-1');
      expect(prisma.recipeImage.create).toHaveBeenCalledWith({
        data: {
          recipeId,
          order: 0,
          data: buffer,
          mimeType: metadata.mimeType,
          fileName: metadata.fileName,
        },
        select: { id: true },
      });

      (prisma.recipeImage.findUnique as jest.Mock).mockResolvedValue({
        id: 'img-1',
        data: buffer,
        mimeType: 'image/png',
        fileName: 'photo.png',
      });
      const got = await adapter.getRecipeImage('img-1');

      expect(got).not.toBeNull();
      expect(got!.id).toBe('img-1');
      expect(Buffer.compare(got!.data, buffer)).toBe(0);
      expect(got!.metadata).toEqual({
        mimeType: 'image/png',
        fileName: 'photo.png',
        size: buffer.length,
      });
    });

    it('returns null when imageId does not exist', async () => {
      (prisma.recipeImage.findUnique as jest.Mock).mockResolvedValue(null);
      const got = await adapter.getRecipeImage('missing');
      expect(got).toBeNull();
    });
  });

  describe('Test B: listRecipeImages ordering and metadata-only shape', () => {
    it('returns rows ordered by ascending order with metadata-only fields (no data bytes)', async () => {
      const rows = [
        { id: 'a', order: 0, fileName: 'a.png', mimeType: 'image/png' },
        { id: 'b', order: 1, fileName: 'b.png', mimeType: 'image/png' },
        { id: 'c', order: 2, fileName: 'c.png', mimeType: 'image/png' },
      ];
      (prisma.recipeImage.findMany as jest.Mock).mockResolvedValue(rows);

      const result = await adapter.listRecipeImages('recipe-1');

      expect(prisma.recipeImage.findMany).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' },
        orderBy: { order: 'asc' },
        select: { id: true, order: true, fileName: true, mimeType: true },
      });
      expect(result).toEqual(rows);
      // Ensure no `data` key smuggled in
      result.forEach((r) => expect(r).not.toHaveProperty('data'));
    });
  });

  describe('Test C: deleteRecipeImage renormalizes remaining orders to 0..n-1', () => {
    it('deletes the image and updates remaining images to contiguous orders inside a single transaction', async () => {
      const recipeId = 'recipe-1';
      const imageId = 'B';

      // Fake interactive transaction: invoke callback with a tx mirror of prisma
      const tx = {
        recipeImage: {
          delete: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: 'A' },
            { id: 'C' },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(tx));

      await adapter.deleteRecipeImage(imageId, recipeId);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.recipeImage.delete).toHaveBeenCalledTimes(1);
      expect(tx.recipeImage.findMany).toHaveBeenCalledWith({
        where: { recipeId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      // Two remaining rows -> two updates, contiguous orders 0 then 1
      expect(tx.recipeImage.update).toHaveBeenCalledTimes(2);
      expect(tx.recipeImage.update).toHaveBeenCalledWith({
        where: { id: 'A' },
        data: { order: 0 },
      });
      expect(tx.recipeImage.update).toHaveBeenCalledWith({
        where: { id: 'C' },
        data: { order: 1 },
      });
    });
  });

  describe('Test D: reorderRecipeImages writes new order values atomically', () => {
    it('issues one update per id with the new index in a single $transaction', async () => {
      const recipeId = 'recipe-1';

      (prisma.recipeImage.update as jest.Mock).mockImplementation((args) => args);
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      await adapter.reorderRecipeImages(recipeId, ['C', 'A']);

      // The adapter should call prisma.recipeImage.update twice (lazy promises),
      // and pass the resulting array to prisma.$transaction.
      expect(prisma.recipeImage.update).toHaveBeenCalledTimes(2);
      expect(prisma.recipeImage.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'C', recipeId },
        data: { order: 0 },
      });
      expect(prisma.recipeImage.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'A', recipeId },
        data: { order: 1 },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const passed = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      expect(Array.isArray(passed)).toBe(true);
      expect(passed).toHaveLength(2);
    });
  });

  describe('Test E: cross-recipe guard on deleteRecipeImage', () => {
    it('passes composite where { id, recipeId } and rethrows when row does not match', async () => {
      const recipeId = 'right-recipe';
      const imageId = 'belongs-to-other';

      const tx = {
        recipeImage: {
          delete: jest.fn().mockImplementation(() => {
            const err: any = new Error('No record');
            err.code = 'P2025';
            return Promise.reject(err);
          }),
          findMany: jest.fn(),
          update: jest.fn(),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(tx));

      await expect(
        adapter.deleteRecipeImage(imageId, recipeId)
      ).rejects.toMatchObject({ code: 'P2025' });

      // Composite-where contract: BOTH id and recipeId in the delete predicate
      expect(tx.recipeImage.delete.mock.calls[0][0]).toEqual({
        where: { id: imageId, recipeId },
      });
      // No partial mutation when delete fails
      expect(tx.recipeImage.findMany).not.toHaveBeenCalled();
      expect(tx.recipeImage.update).not.toHaveBeenCalled();
    });
  });

  describe('Test F: saveRecipeImage rejects oversized buffer (validation reuse)', () => {
    it('throws Invalid image when the buffer exceeds IMAGE_CONFIG.maxSizeBytes', async () => {
      const oversized = Buffer.alloc(11 * 1024 * 1024); // > 10MB
      // Add PNG magic so only size check fails
      oversized[0] = 0x89;
      oversized[1] = 0x50;
      oversized[2] = 0x4e;
      oversized[3] = 0x47;

      await expect(
        adapter.saveRecipeImage('r1', oversized, { ...metadata, size: oversized.length }, 0)
      ).rejects.toThrow(/Invalid image/);

      expect(prisma.recipeImage.create).not.toHaveBeenCalled();
    });
  });
});
