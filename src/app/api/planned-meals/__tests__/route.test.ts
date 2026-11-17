/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    mealPlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    recipe: {
      findUnique: jest.fn(),
    },
    plannedMeal: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { PLANNED_MEAL_RECIPE_SELECT } from '@/lib/serializers/meal-plan-serializers'

const mealPlanFindUnique = prisma.mealPlan.findUnique as unknown as jest.Mock
const planUpdate = prisma.mealPlan.update as unknown as jest.Mock
const recipeFindUnique = prisma.recipe.findUnique as unknown as jest.Mock
const create = prisma.plannedMeal.create as unknown as jest.Mock
const transaction = prisma.$transaction as unknown as jest.Mock

function basePlan() {
  return {
    id: 'p1',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-07T00:00:00.000Z'),
  }
}

function baseCreated(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm1',
    mealPlanId: 'p1',
    recipeId: 'r1',
    mealDate: new Date('2026-09-01T00:00:00.000Z'),
    mealType: 'DINNER',
    servingsPlanned: 4,
    notes: null,
    ...overrides,
  }
}

describe('POST /api/planned-meals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma)
    )
  })

  it('creates a recipe-backed meal, returns 201 with recipe summary', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    recipeFindUnique.mockResolvedValue({ id: 'r1' })
    create.mockResolvedValue(
      baseCreated({
        recipe: {
          id: 'r1',
          title: 'Pasta',
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          difficultyLevel: 'EASY',
        },
      }),
    )
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: 'r1',
        mealDate: '2026-09-01',
        mealType: 'DINNER',
        servingsPlanned: 4,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('pm1')
    expect(body.mealDate).toBe('2026-09-01')
    expect(body.recipe).toEqual({
      id: 'r1',
      title: 'Pasta',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      difficultyLevel: 'EASY',
    })
    expect(create).toHaveBeenCalledWith({
      data: {
        mealPlanId: 'p1',
        recipeId: 'r1',
        mealDate: new Date('2026-09-01T00:00:00.000Z'),
        mealType: 'DINNER',
        servingsPlanned: 4,
        notes: undefined,
      },
      include: {
        recipe: { select: PLANNED_MEAL_RECIPE_SELECT },
      },
    })
  })

  it('creates a notes-only meal (recipeId null, servings 0, non-empty notes)', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    create.mockResolvedValue(
      baseCreated({ recipeId: null, servingsPlanned: 0, notes: 'standup' }),
    )
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: null,
        mealDate: '2026-09-01',
        mealType: 'BREAKFAST',
        servingsPlanned: 0,
        notes: 'standup',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.recipeId).toBeNull()
    expect(body.notes).toBe('standup')
    // recipe lookup not called for notes-only
    expect(recipeFindUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when meal plan missing', async () => {
    mealPlanFindUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'missing',
        recipeId: 'r1',
        mealDate: '2026-09-01',
        mealType: 'DINNER',
        servingsPlanned: 4,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when recipe missing', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    recipeFindUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: 'missing',
        mealDate: '2026-09-01',
        mealType: 'DINNER',
        servingsPlanned: 4,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('extends the plan end date and creates a meal after the original range', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    recipeFindUnique.mockResolvedValue({ id: 'r1' })
    create.mockResolvedValue(
      baseCreated({ mealDate: new Date('2026-09-08T00:00:00.000Z') })
    )
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: 'r1',
        mealDate: '2026-09-08',
        mealType: 'DINNER',
        servingsPlanned: 4,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).mealDate).toBe('2026-09-08')
    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { endDate: new Date('2026-09-08T00:00:00.000Z') },
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mealDate: new Date('2026-09-08T00:00:00.000Z'),
        }),
      })
    )
  })

  it('extends the plan start date and creates a meal before the original range', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    recipeFindUnique.mockResolvedValue({ id: 'r1' })
    create.mockResolvedValue(
      baseCreated({ mealDate: new Date('2026-08-31T00:00:00.000Z') })
    )
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: 'r1',
        mealDate: '2026-08-31',
        mealType: 'DINNER',
        servingsPlanned: 4,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect((await res.json()).mealDate).toBe('2026-08-31')
    expect(planUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { startDate: new Date('2026-08-31T00:00:00.000Z') },
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mealDate: new Date('2026-08-31T00:00:00.000Z'),
        }),
      })
    )
  })

  it('returns 400 for a recipe-backed meal with servings 0', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    recipeFindUnique.mockResolvedValue({ id: 'r1' })
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: 'r1',
        mealDate: '2026-09-01',
        mealType: 'DINNER',
        servingsPlanned: 0,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for an empty-string recipeId (recipeId must be explicit)', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: '',
        mealDate: '2026-09-01',
        mealType: 'DINNER',
        servingsPlanned: 4,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for a notes-only meal with missing notes', async () => {
    mealPlanFindUnique.mockResolvedValue(basePlan())
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: null,
        mealDate: '2026-09-01',
        mealType: 'BREAKFAST',
        servingsPlanned: 0,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for a notes-only meal with non-zero servings', async () => {
    const req = new NextRequest('http://test/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: 'p1',
        recipeId: null,
        mealDate: '2026-09-01',
        mealType: 'BREAKFAST',
        servingsPlanned: 3,
        notes: 'x',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
