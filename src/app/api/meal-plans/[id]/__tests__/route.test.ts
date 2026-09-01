/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    mealPlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { GET, PUT, DELETE } from '../route'
import { prisma } from '@/lib/prisma'

const findUnique = prisma.mealPlan.findUnique as unknown as jest.Mock
const update = prisma.mealPlan.update as unknown as jest.Mock
const del = prisma.mealPlan.delete as unknown as jest.Mock

function basePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Weekly Plan',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-07T00:00:00.000Z'),
    budgetLimit: null,
    notes: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

const params = Promise.resolve({ id: 'p1' })

describe('GET /api/meal-plans/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns one plan with serialized dates', async () => {
    findUnique.mockResolvedValue(basePlan())
    const req = new NextRequest('http://test/api/meal-plans/p1')
    const res = await GET(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('p1')
    expect(body.startDate).toBe('2026-09-01')
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('returns 404 when plan missing', async () => {
    findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/meal-plans/p1')
    const res = await GET(req, { params })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/meal-plans/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates metadata only (name/notes/budgetLimit), returns 200', async () => {
    findUnique.mockResolvedValue(basePlan())
    update.mockResolvedValue(
      basePlan({ name: 'Renamed', notes: 'hi', budgetLimit: 50 }),
    )
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed', notes: 'hi', budgetLimit: 50 }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Renamed')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { name: 'Renamed', notes: 'hi', budgetLimit: 50 },
    })
  })

  it('returns 404 when plan missing', async () => {
    findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'X' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an empty name', async () => {
    findUnique.mockResolvedValue(basePlan())
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'PUT',
      body: JSON.stringify({ name: '' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })

  it('does not update the date range', async () => {
    findUnique.mockResolvedValue(basePlan())
    update.mockResolvedValue(basePlan())
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'X' }),
    })
    await PUT(req, { params })
    const updateArg = update.mock.calls[0][0]
    expect(updateArg.data).not.toHaveProperty('startDate')
    expect(updateArg.data).not.toHaveProperty('endDate')
  })
})

describe('DELETE /api/meal-plans/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns bodyless 204 and deletes via schema cascade', async () => {
    findUnique.mockResolvedValue(basePlan())
    del.mockResolvedValue({})
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect(del).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('returns 404 when plan missing', async () => {
    findUnique.mockResolvedValue(null)
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
  })

  it('relies on the DB cascade — deletes the plan only, never planned meals directly', async () => {
    findUnique.mockResolvedValue(basePlan())
    del.mockResolvedValue({})
    const req = new NextRequest('http://test/api/meal-plans/p1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params })
    // The route must return 204 without ever touching plannedMeal. In this
    // test file prisma.plannedMeal is NOT mocked, so any manual deletion of
    // planned meals would throw (undefined) → 500, failing this assertion.
    // Cascade is instead handled by the schema's ON DELETE CASCADE on
    // planned_meals.meal_plan_id.
    expect(res.status).toBe(204)
    expect(del).toHaveBeenCalledTimes(1)
    expect(del).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })
})
