/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    mealPlan: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'

const findMany = prisma.mealPlan.findMany as unknown as jest.Mock
const create = prisma.mealPlan.create as unknown as jest.Mock

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

describe('GET /api/meal-plans', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns all plans ordered by startDate, serialized as YYYY-MM-DD', async () => {
    findMany.mockResolvedValue([
      basePlan({ id: 'p2', startDate: new Date('2026-08-01T00:00:00.000Z') }),
      basePlan({ id: 'p1', startDate: new Date('2026-09-01T00:00:00.000Z') }),
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('p2')
    expect(body[0].startDate).toBe('2026-08-01')
    expect(body[0].endDate).toBe('2026-09-07')
    expect(findMany).toHaveBeenCalledWith({ orderBy: { startDate: 'asc' } })
  })
})

describe('POST /api/meal-plans', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a plan and returns 201 with serialized dates', async () => {
    create.mockResolvedValue(basePlan({ id: 'p1' }))
    const req = new NextRequest('http://test/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Weekly',
        startDate: '2026-09-01',
        endDate: '2026-09-07',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('p1')
    expect(body.startDate).toBe('2026-09-01')
    expect(body.endDate).toBe('2026-09-07')
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Weekly',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-07T00:00:00.000Z'),
        notes: undefined,
        budgetLimit: undefined,
      },
    })
  })

  it('rejects an empty name with 400', async () => {
    const req = new NextRequest('http://test/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        startDate: '2026-09-01',
        endDate: '2026-09-07',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects an invalid calendar date (2026-02-31) with 400', async () => {
    const req = new NextRequest('http://test/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({
        name: 'X',
        startDate: '2026-02-31',
        endDate: '2026-09-07',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects endDate before startDate with 400', async () => {
    const req = new NextRequest('http://test/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({
        name: 'X',
        startDate: '2026-09-07',
        endDate: '2026-09-01',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('accepts inclusive equal start/end dates', async () => {
    create.mockResolvedValue(basePlan({ id: 'p1' }))
    const req = new NextRequest('http://test/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Single Day',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
