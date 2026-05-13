/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/storage', () => ({
  storageAdapter: {
    reorderRecipeImages: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipeImage: {
      findMany: jest.fn(),
    },
  },
}));

import { PATCH } from '../route';
import { storageAdapter } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const reorderRecipeImages = storageAdapter.reorderRecipeImages as jest.Mock;
const findMany = prisma.recipeImage.findMany as unknown as jest.Mock;

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://test/api/recipes/r1/images/reorder', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const ctx = { params: Promise.resolve({ id: 'r1' }) };

describe('PATCH /api/recipes/[id]/images/reorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test A — happy path: orderedIds matches the recipe's image set exactly
  it('A: returns 200 ok and forwards orderedIds to adapter', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    reorderRecipeImages.mockResolvedValue(undefined);
    const res = await PATCH(makeReq({ orderedIds: ['c', 'a', 'b'] }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(reorderRecipeImages).toHaveBeenCalledWith('r1', ['c', 'a', 'b']);
  });

  // Test B — zod failure (empty array)
  it('B: returns 400 with details on empty orderedIds', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await PATCH(makeReq({ orderedIds: [] }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request data');
    expect(Array.isArray(body.details)).toBe(true);
    expect(reorderRecipeImages).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  // Test C — server error
  it('C: returns 500 when adapter throws', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    reorderRecipeImages.mockRejectedValue(new Error('boom'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await PATCH(makeReq({ orderedIds: ['a', 'b'] }), ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to reorder images');
    errSpy.mockRestore();
  });

  // CR-04 Test D — subset rejected with 400 (preventing duplicate order corruption)
  it('D: returns 400 when orderedIds is a subset of the recipe images', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const res = await PATCH(makeReq({ orderedIds: ['a', 'b'] }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("orderedIds must be exactly the recipe's image set");
    expect(reorderRecipeImages).not.toHaveBeenCalled();
  });

  // CR-04 Test E — unknown id rejected with 400 (cross-recipe / typo)
  it('E: returns 400 when orderedIds contains an id the recipe does not own', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await PATCH(makeReq({ orderedIds: ['a', 'z'] }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("orderedIds must be exactly the recipe's image set");
    expect(reorderRecipeImages).not.toHaveBeenCalled();
  });

  // CR-04 Test F — superset rejected with 400
  it('F: returns 400 when orderedIds is a superset of the recipe images', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await PATCH(makeReq({ orderedIds: ['a', 'b', 'c'] }), ctx);
    expect(res.status).toBe(400);
    expect(reorderRecipeImages).not.toHaveBeenCalled();
  });

  // CR-04 Test G — P2025 from adapter (race: image deleted between check and update) maps to 404
  it('G: returns 404 when adapter raises P2025 (image deleted between check and update)', async () => {
    findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const p2025 = new Prisma.PrismaClientKnownRequestError(
      'Record to update not found.',
      { code: 'P2025', clientVersion: 'test' }
    );
    reorderRecipeImages.mockRejectedValue(p2025);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await PATCH(makeReq({ orderedIds: ['a', 'b'] }), ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Image not found');
    errSpy.mockRestore();
  });
});
