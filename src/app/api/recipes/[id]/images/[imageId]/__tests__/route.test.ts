/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/storage', () => ({
  storageAdapter: {
    getRecipeImage: jest.fn(),
    deleteRecipeImage: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipeImage: {
      aggregate: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { GET, DELETE } from '../route';
import { storageAdapter } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

const getRecipeImage = storageAdapter.getRecipeImage as jest.Mock;
const deleteRecipeImage = storageAdapter.deleteRecipeImage as jest.Mock;
const findFirst = prisma.recipeImage.findFirst as unknown as jest.Mock;

const ctx = { params: Promise.resolve({ id: 'r1', imageId: 'img1' }) };

function makeReq(): NextRequest {
  return new NextRequest('http://test/api/recipes/r1/images/img1');
}

describe('GET /api/recipes/[id]/images/[imageId] (binary)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test A — binary GET happy path
  it('A: returns binary body with cache headers', async () => {
    findFirst.mockResolvedValue({ id: 'img1' });
    const bytes = Buffer.from([1, 2, 3]);
    getRecipeImage.mockResolvedValue({
      id: 'img1',
      data: bytes,
      metadata: { mimeType: 'image/jpeg', fileName: 'a.jpg', size: 3 },
    });
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Content-Length')).toBe('3');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBe(3);
  });

  // Test B — cross-recipe mismatch
  it('B: returns 404 when imageId is not owned by recipeId', async () => {
    findFirst.mockResolvedValue(null);
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Image not found');
    expect(getRecipeImage).not.toHaveBeenCalled();
  });

  // Test C — missing imageId
  it('C: returns 404 when getRecipeImage returns null', async () => {
    findFirst.mockResolvedValue({ id: 'img1' });
    getRecipeImage.mockResolvedValue(null);
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Image not found');
  });
});

describe('DELETE /api/recipes/[id]/images/[imageId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test D — DELETE happy path
  it('D: returns 200 ok and delegates to adapter', async () => {
    deleteRecipeImage.mockResolvedValue(undefined);
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(deleteRecipeImage).toHaveBeenCalledWith('img1', 'r1');
  });

  // Test E — cross-recipe mismatch maps P2025 -> 404
  it('E: returns 404 when adapter throws P2025', async () => {
    const p2025: any = new Error('Record to delete does not exist.');
    p2025.code = 'P2025';
    deleteRecipeImage.mockRejectedValue(p2025);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Image not found');
    errSpy.mockRestore();
  });

  // Test F — server error
  it('F: returns 500 on unrelated adapter error', async () => {
    deleteRecipeImage.mockRejectedValue(new Error('boom'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to delete image');
    errSpy.mockRestore();
  });
});
