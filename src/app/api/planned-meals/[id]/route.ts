import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const existing = await prisma.plannedMeal.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Planned meal not found' }, { status: 404 })
    }

    await prisma.plannedMeal.delete({ where: { id } })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const { id } = await params
    console.error(`DELETE /api/planned-meals/${id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete planned meal' },
      { status: 500 },
    )
  }
}
