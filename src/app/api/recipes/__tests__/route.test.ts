/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      count: jest.fn(),
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

import { GET } from '../route';
import { prisma } from '@/lib/prisma';

const findMany = prisma.recipe.findMany as unknown as jest.Mock;
const count = prisma.recipe.count as unknown as jest.Mock;

function baseRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    title: 'A',
    description: null,
    cuisineType: null,
    mealCategory: 'DINNER',
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    servings: 4,
    difficultyLevel: 'EASY',
    instructions: ['step 1'],
    source: null,
    sourceUrl: null,
    personalRating: null,
    tags: [],
    nutritionalInfo: null,
    isDraft: false,
    imageData: null,
    imageMimeType: null,
    imageFileName: null,
    imageUrl: null,
    createdAt: new Date('2026-05-13T00:00:00Z'),
    updatedAt: new Date('2026-05-13T00:00:00Z'),
    ingredients: [],
    images: [],
    ...overrides,
  };
}

describe('GET /api/recipes (list) — primaryImageId projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test D1 — primaryImageId set
  it('D1: surfaces primaryImageId from order=0 image and drops images array', async () => {
    findMany.mockResolvedValue([
      baseRecipe({ id: 'r1', images: [{ id: 'img-primary' }] }),
    ]);
    count.mockResolvedValue(1);
    const req = new NextRequest('http://test/api/recipes');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recipes[0].primaryImageId).toBe('img-primary');
    expect('images' in body.recipes[0]).toBe(false);
  });

  // Test D2 — primaryImageId null
  it('D2: primaryImageId is null when no images and no images key on response', async () => {
    findMany.mockResolvedValue([baseRecipe({ id: 'r2', images: [] })]);
    count.mockResolvedValue(1);
    const req = new NextRequest('http://test/api/recipes');
    const res = await GET(req);
    const body = await res.json();
    expect(body.recipes[0].primaryImageId).toBeNull();
    expect('images' in body.recipes[0]).toBe(false);
  });

  // Test D3 — no bytes in include
  it('D3: include.images selects only { id: true } and never data: true', async () => {
    findMany.mockResolvedValue([baseRecipe({ images: [{ id: 'x' }] })]);
    count.mockResolvedValue(1);
    const req = new NextRequest('http://test/api/recipes');
    await GET(req);
    expect(findMany).toHaveBeenCalled();
    const arg = findMany.mock.calls[0][0];
    expect(arg.include.images).toEqual({
      where: { order: 0 },
      take: 1,
      select: { id: true },
    });
    expect(JSON.stringify(arg.include)).not.toMatch(/"data":/);
  });
});
