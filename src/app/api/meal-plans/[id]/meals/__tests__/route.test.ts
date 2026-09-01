/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    mealPlan: {
      findUnique: jest.fn(),
    },
    plannedMeal: {
      findMany: jest.fn(),
    },
  },
}))

import { GET } from '../route'
import { prisma } from '@/lib/prisma'

const mealFindUnique = prisma.mealPlan.findUnique as unknown as jest.Mock
const findMany = prisma.plannedMeal.findMany as unknown as jest.Mock

const params = Promise.resolve({ id: 'p1' })

function baseMeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm1',
    mealPlanId: 'p1',
    recipeId: 'r1',
    mealDate: new Date('2026-09-01T00:00:00.000Z'),
    mealType: 'DINNER',
    servingsPlanned: 4,
    notes: null,
    recipe: {
      id: 'r1',
      title: 'Pasta',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      difficultyLevel: 'EASY',
    },
    ...overrides,
  }
}

describe('GET /api/meal-plans/[id]/meals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requires both start and end params, else 400', async () => {
    const req = new NextRequest('http://test/api/meal-plans/p1/meals?start=2026-09-01')
    const res = await GET(req, { params })
    expect(res.status).toBe(400)
  })

  it('rejects invalid dates in range', async () => {
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-02-31&end=2026-09-07',
    )
    const res = await GET(req, { params })
    expect(res.status).toBe(400)
  })

  it('rejects start after end', async () => {
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-07&end=2026-09-01',
    )
    const res = await GET(req, { params })
    expect(res.status).toBe(400)
  })

  it('returns 404 when plan missing', async () => {
    mealFindUnique.mockResolvedValue(null)
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
    )
    const res = await GET(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns planned meals with RecipeSummary in the inclusive range', async () => {
    mealFindUnique.mockResolvedValue({ id: 'p1' })
    findMany.mockResolvedValue([
      baseMeal({ id: 'pm1', mealDate: new Date('2026-09-01T00:00:00.000Z'), mealType: 'DINNER' }),
      baseMeal({ id: 'pm2', recipeId: null, mealDate: new Date('2026-09-07T00:00:00.000Z'), mealType: 'BREAKFAST', servingsPlanned: 0, notes: 'standup', recipe: null }),
    ])
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
    )
    const res = await GET(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    // inclusive endpoints included
    expect(body[0].mealDate).toBe('2026-09-01')
    expect(body[1].mealDate).toBe('2026-09-07')
    // RecipeSummary embedded
    expect(body[0].recipe).toEqual({
      id: 'r1',
      title: 'Pasta',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      difficultyLevel: 'EASY',
    })
    // Notes-only row → recipe: null
    expect(body[1].recipe).toBeNull()
    expect(body[1].recipeId).toBeNull()
  })

  it('queries mealDate within inclusive [start, end] using UTC-midnight', async () => {
    mealFindUnique.mockResolvedValue({ id: 'p1' })
    findMany.mockResolvedValue([])
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
    )
    await GET(req, { params })
    const arg = findMany.mock.calls[0][0]
    expect(arg.where).toEqual({
      mealPlanId: 'p1',
      mealDate: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-07T00:00:00.000Z'),
      },
    })
    expect(arg.orderBy).toEqual([{ mealDate: 'asc' }, { mealType: 'asc' }])
  })

  it('includes the compact recipe select (never bytes)', async () => {
    mealFindUnique.mockResolvedValue({ id: 'p1' })
    findMany.mockResolvedValue([baseMeal()])
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
    )
    await GET(req, { params })
    const arg = findMany.mock.calls[0][0]
    expect(JSON.stringify(arg.include.recipe.select)).not.toMatch(/"image"/)
    expect(arg.include.recipe.select).toEqual({
      id: true,
      title: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      difficultyLevel: true,
    })
  })

  it('allows duplicate rows in the same slot (no dedup)', async () => {
    mealFindUnique.mockResolvedValue({ id: 'p1' })
    findMany.mockResolvedValue([
      baseMeal({ id: 'a', mealDate: new Date('2026-09-01T00:00:00.000Z'), mealType: 'DINNER' }),
      baseMeal({ id: 'b', mealDate: new Date('2026-09-01T00:00:00.000Z'), mealType: 'DINNER' }),
    ])
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
    )
    const res = await GET(req, { params })
    const body = await res.json()
    expect(body).toHaveLength(2)
  })

  it('returns recipe:null for a planned meal whose recipe was deleted (SET NULL)', async () => {
    mealFindUnique.mockResolvedValue({ id: 'p1' })
    // A formerly recipe-backed row: recipeId has been nulled by ON DELETE SET
    // NULL when its recipe was deleted. The row survives with recipe: null.
    findMany.mockResolvedValue([
      baseMeal({
        id: 'pm-orphan',
        recipeId: null,
        servingsPlanned: 4,
        notes: null,
        recipe: null,
      }),
    ])
    const req = new NextRequest(
      'http://test/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
    )
    const res = await GET(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].id).toBe('pm-orphan')
    expect(body[0].recipeId).toBeNull()
    expect(body[0].recipe).toBeNull()
    expect(body[0].servingsPlanned).toBe(4)
  })
})
