/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    plannedMeal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mealPlan: {
      findUnique: jest.fn(),
    },
    recipe: {
      findUnique: jest.fn(),
    },
  },
}))

import { DELETE, PUT } from '../route'
import { prisma } from '@/lib/prisma'
import { PLANNED_MEAL_RECIPE_SELECT } from '@/lib/serializers/meal-plan-serializers'

const findUnique = prisma.plannedMeal.findUnique as unknown as jest.Mock
const update = prisma.plannedMeal.update as unknown as jest.Mock
const del = prisma.plannedMeal.delete as unknown as jest.Mock
const planFindUnique = prisma.mealPlan.findUnique as unknown as jest.Mock
const recipeFindUnique = prisma.recipe.findUnique as unknown as jest.Mock

const params = Promise.resolve({ id: 'pm1' })

function makePlan() {
  return {
    id: 'p1',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-07T00:00:00.000Z'),
  }
}

function makeMeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm1',
    mealPlanId: 'p1',
    recipeId: null,
    mealDate: new Date('2026-09-01T00:00:00.000Z'),
    mealType: 'DINNER',
    servingsPlanned: 0,
    notes: 'old note',
    ...overrides,
  }
}

describe('DELETE /api/planned-meals/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns bodyless 204', async () => {
    findUnique.mockResolvedValue({ id: 'pm1' })
    del.mockResolvedValue({})
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect(del).toHaveBeenCalledWith({ where: { id: 'pm1' } })
  })

  it('returns 404 when planned meal missing', async () => {
    findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/planned-meals/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates the note on a notes-only meal', async () => {
    findUnique.mockResolvedValue(makeMeal())
    planFindUnique.mockResolvedValue(makePlan())
    update.mockResolvedValue(makeMeal({ notes: 'new note' }))

    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'new note' }),
    })
    const res = await PUT(req, { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notes).toBe('new note')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'pm1' },
      data: { notes: 'new note' },
      include: { recipe: { select: PLANNED_MEAL_RECIPE_SELECT } },
    })
  })

  it('updates a recipe-backed meal to a different recipe and servings', async () => {
    findUnique.mockResolvedValue(
      makeMeal({ recipeId: 'r1', servingsPlanned: 2, notes: null })
    )
    planFindUnique.mockResolvedValue(makePlan())
    recipeFindUnique.mockResolvedValue({ id: 'r2' })
    update.mockResolvedValue(
      makeMeal({
        recipeId: 'r2',
        servingsPlanned: 3,
        recipe: {
          id: 'r2',
          title: 'Soup',
          prepTimeMinutes: 5,
          cookTimeMinutes: 20,
          difficultyLevel: 'EASY',
        },
      })
    )

    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ recipeId: 'r2', servingsPlanned: 3 }),
    })
    const res = await PUT(req, { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recipeId).toBe('r2')
    expect(body.recipe.title).toBe('Soup')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'pm1' },
      data: { recipeId: 'r2', servingsPlanned: 3 },
      include: { recipe: { select: PLANNED_MEAL_RECIPE_SELECT } },
    })
  })

  it('returns 404 when the planned meal is missing', async () => {
    findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'x' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when a notes-only meal loses its note', async () => {
    findUnique.mockResolvedValue(makeMeal())
    planFindUnique.mockResolvedValue(makePlan())
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ notes: '   ' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('returns 400 when a notes-only meal has nonzero servings', async () => {
    findUnique.mockResolvedValue(makeMeal())
    planFindUnique.mockResolvedValue(makePlan())
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ servingsPlanned: 2 }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })

  it('rejects a note edit on an orphaned recipe row', async () => {
    findUnique.mockResolvedValue(
      makeMeal({ servingsPlanned: 2, notes: 'Stale orphan note' })
    )
    planFindUnique.mockResolvedValue(makePlan())
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ notes: 'New note' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('returns 400 for a recipe-backed meal with zero servings', async () => {
    findUnique.mockResolvedValue(
      makeMeal({ recipeId: 'r1', servingsPlanned: 2, notes: null })
    )
    planFindUnique.mockResolvedValue(makePlan())
    recipeFindUnique.mockResolvedValue({ id: 'r1' })
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ servingsPlanned: 0 }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the new recipe does not exist', async () => {
    findUnique.mockResolvedValue(
      makeMeal({ recipeId: 'r1', servingsPlanned: 2, notes: null })
    )
    planFindUnique.mockResolvedValue(makePlan())
    recipeFindUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ recipeId: 'missing' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the date is outside the plan range', async () => {
    findUnique.mockResolvedValue(makeMeal())
    planFindUnique.mockResolvedValue(makePlan())
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ mealDate: '2026-09-08' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 for a malformed date', async () => {
    findUnique.mockResolvedValue(makeMeal())
    const req = new NextRequest('http://test/api/planned-meals/pm1', {
      method: 'PUT',
      body: JSON.stringify({ mealDate: '2026-13-01' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })
})
