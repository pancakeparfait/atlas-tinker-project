/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/storage', () => ({
  storageAdapter: {
    listRecipeImages: jest.fn(),
    validateImage: jest.fn(),
    saveRecipeImage: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findUnique: jest.fn(),
    },
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

import { GET, POST } from '../route';
import { storageAdapter } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const listRecipeImages = storageAdapter.listRecipeImages as jest.Mock;
const validateImage = storageAdapter.validateImage as jest.Mock;
const saveRecipeImage = storageAdapter.saveRecipeImage as jest.Mock;
const aggregate = prisma.recipeImage.aggregate as unknown as jest.Mock;
const findUnique = prisma.recipe.findUnique as unknown as jest.Mock;

function makeRequest(files: File[]): NextRequest {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  return new NextRequest('http://test/api/recipes/r1/images', {
    method: 'POST',
    body: formData,
  });
}

const ctx = { params: Promise.resolve({ id: 'r1' }) };

describe('POST /api/recipes/[id]/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // WR-08: default findUnique to a real recipe; tests that want the 404
    // path override this explicitly.
    findUnique.mockResolvedValue({ id: 'r1' });
  });

  // Test A — happy path multi-file
  it('A: returns 201 with imageIds for two valid files', async () => {
    aggregate.mockResolvedValue({ _max: { order: -1 } });
    validateImage.mockResolvedValue({ isValid: true, errors: [] });
    saveRecipeImage
      .mockResolvedValueOnce('img-1')
      .mockResolvedValueOnce('img-2');
    const f1 = new File(['aaaaa'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['bbbbb'], 'b.png', { type: 'image/png' });
    const res = await POST(makeRequest([f1, f2]), {
      params: Promise.resolve({ id: 'r1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.imageIds).toEqual(['img-1', 'img-2']);
    expect(body.failed).toEqual([]);
    expect(saveRecipeImage).toHaveBeenCalledTimes(2);
    expect(saveRecipeImage.mock.calls[0][3]).toBe(0);
    expect(saveRecipeImage.mock.calls[1][3]).toBe(1);
  });

  // Test B — empty body
  it('B: returns 400 when no images part is provided', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://test/api/recipes/r1/images', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No image files provided');
  });

  // Test C — partial failure
  it('C: returns 201 with failed entry for oversized file', async () => {
    aggregate.mockResolvedValue({ _max: { order: -1 } });
    validateImage
      .mockResolvedValueOnce({ isValid: true, errors: [] })
      .mockResolvedValueOnce({ isValid: false, errors: ['File size exceeds 10MB'] });
    saveRecipeImage.mockResolvedValueOnce('img-good');
    const fGood = new File(['ok'], 'good.jpg', { type: 'image/jpeg' });
    const fBig = new File(['bad'], 'big.jpg', { type: 'image/jpeg' });
    const res = await POST(makeRequest([fGood, fBig]), ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.imageIds).toEqual(['img-good']);
    expect(body.failed).toEqual([
      { fileName: 'big.jpg', error: 'File size exceeds 10MB' },
    ]);
    expect(saveRecipeImage).toHaveBeenCalledTimes(1);
  });

  // Test D — server error
  it('D: returns 500 when saveRecipeImage throws', async () => {
    aggregate.mockResolvedValue({ _max: { order: -1 } });
    validateImage.mockResolvedValue({ isValid: true, errors: [] });
    saveRecipeImage.mockRejectedValue(new Error('DB outage'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const f = new File(['oh'], 'a.jpg', { type: 'image/jpeg' });
    const res = await POST(makeRequest([f]), ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to upload images');
    expect(errSpy).toHaveBeenCalled();
    const firstCallArg = errSpy.mock.calls[0][0] as string;
    expect(firstCallArg).toContain('POST /api/recipes/r1/images error:');
    errSpy.mockRestore();
  });

  // Test E — GET list
  it('E: GET returns metadata sorted by order', async () => {
    listRecipeImages.mockResolvedValue([
      { id: 'a', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
      { id: 'b', order: 1, fileName: 'b.png', mimeType: 'image/png' },
    ]);
    const req = new NextRequest('http://test/api/recipes/r1/images');
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.images).toHaveLength(2);
    expect(body.images[0].id).toBe('a');
    expect(body.images[1].order).toBe(1);
  });

  // Test F — order starts at correct offset
  it('F: first saved image gets order=5 when max order is 4', async () => {
    aggregate.mockResolvedValue({ _max: { order: 4 } });
    validateImage.mockResolvedValue({ isValid: true, errors: [] });
    saveRecipeImage.mockResolvedValueOnce('img-new');
    const f = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await POST(makeRequest([f]), ctx);
    expect(saveRecipeImage.mock.calls[0][3]).toBe(5);
  });

  // Test G — T-02-12 concurrency (accepted race)
  it('T-02-12: concurrent uploads with same nextOrder both succeed (accepted race)', async () => {
    aggregate.mockResolvedValue({ _max: { order: -1 } });
    validateImage.mockResolvedValue({ isValid: true, errors: [] });
    saveRecipeImage
      .mockResolvedValueOnce('img-A')
      .mockResolvedValueOnce('img-B');
    const reqA = makeRequest([
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
    ]);
    const reqB = makeRequest([
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ]);
    const [resA, resB] = await Promise.all([
      POST(reqA, ctx),
      POST(reqB, ctx),
    ]);
    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    expect(saveRecipeImage).toHaveBeenCalledTimes(2);
    const firstOrder = saveRecipeImage.mock.calls[0][3];
    const secondOrder = saveRecipeImage.mock.calls[1][3];
    expect(firstOrder).toBe(0);
    expect(secondOrder).toBe(0); // accepted duplicate per T-02-12
  });

  // WR-08 Test H — bogus recipe id returns 404 (not 500)
  it('H: returns 404 when the parent recipe does not exist', async () => {
    findUnique.mockResolvedValue(null);
    const f = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    const res = await POST(makeRequest([f]), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Recipe not found');
    expect(saveRecipeImage).not.toHaveBeenCalled();
  });

  // WR-08 Test I — race: recipe deleted after existence check, surfaces as 404
  it('I: maps Prisma P2003 (foreign-key violation) to 404', async () => {
    aggregate.mockResolvedValue({ _max: { order: -1 } });
    validateImage.mockResolvedValue({ isValid: true, errors: [] });
    const p2003 = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed on the field: recipeId',
      { code: 'P2003', clientVersion: 'test' }
    );
    saveRecipeImage.mockRejectedValue(p2003);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const f = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    const res = await POST(makeRequest([f]), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Recipe not found');
    errSpy.mockRestore();
  });
});
