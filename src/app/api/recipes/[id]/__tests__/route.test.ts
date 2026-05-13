/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

const findUnique = prisma.recipe.findUnique as unknown as jest.Mock;

function baseRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    title: 'X',
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

describe('GET /api/recipes/[id] — images array projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test E1 — images array present, ordered, metadata-only
  it('E1: returns images array sorted by order with metadata only', async () => {
    findUnique.mockResolvedValue(
      baseRecipe({
        id: 'r1',
        images: [
          { id: 'a', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
          { id: 'b', order: 1, fileName: 'b.png', mimeType: 'image/png' },
        ],
      })
    );
    const req = new NextRequest('http://test/api/recipes/r1');
    const res = await GET(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.images).toHaveLength(2);
    expect(body.images[0].id).toBe('a');
    expect(body.images[1].order).toBe(1);
  });

  // Test E2 — include shape and no data bytes
  it('E2: include shape matches contract and response has no data field', async () => {
    findUnique.mockResolvedValue(
      baseRecipe({
        images: [
          { id: 'a', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
        ],
      })
    );
    const req = new NextRequest('http://test/api/recipes/r1');
    const res = await GET(req, { params: Promise.resolve({ id: 'r1' }) });
    const body = await res.json();
    expect(findUnique.mock.calls[0][0].include.images).toEqual({
      orderBy: { order: 'asc' },
      select: { id: true, order: true, fileName: true, mimeType: true },
    });
    expect(JSON.stringify(body)).not.toMatch(/"data":/);
  });
});
