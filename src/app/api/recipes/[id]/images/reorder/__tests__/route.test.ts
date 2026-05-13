/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/storage', () => ({
  storageAdapter: {
    reorderRecipeImages: jest.fn(),
  },
}));

import { PATCH } from '../route';
import { storageAdapter } from '@/lib/storage';

const reorderRecipeImages = storageAdapter.reorderRecipeImages as jest.Mock;

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

  // Test A — happy path
  it('A: returns 200 ok and forwards orderedIds to adapter', async () => {
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
    reorderRecipeImages.mockRejectedValue(new Error('boom'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await PATCH(makeReq({ orderedIds: ['a', 'b'] }), ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to reorder images');
    errSpy.mockRestore();
  });
});
