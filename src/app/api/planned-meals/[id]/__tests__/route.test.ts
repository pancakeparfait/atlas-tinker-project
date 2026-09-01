/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    plannedMeal: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { DELETE } from '../route'
import { prisma } from '@/lib/prisma'

const findUnique = prisma.plannedMeal.findUnique as unknown as jest.Mock
const del = prisma.plannedMeal.delete as unknown as jest.Mock

const params = Promise.resolve({ id: 'pm1' })

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
