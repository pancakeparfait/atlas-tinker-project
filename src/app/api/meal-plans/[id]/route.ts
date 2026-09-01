import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { serializeMealPlan } from '@/lib/serializers/meal-plan-serializers'

const UpdateMealPlanSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  notes: z.string().nullable().optional(),
  budgetLimit: z.number().nonnegative().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const plan = await prisma.mealPlan.findUnique({ where: { id } })

    if (!plan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    return NextResponse.json(serializeMealPlan(plan))
  } catch (error) {
    const { id } = await params
    console.error(`GET /api/meal-plans/${id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = UpdateMealPlanSchema.parse(body)

    const existing = await prisma.mealPlan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const plan = await prisma.mealPlan.update({
      where: { id },
      data: {
        name: data.name,
        notes: data.notes,
        budgetLimit: data.budgetLimit,
      },
    })

    return NextResponse.json(serializeMealPlan(plan))
  } catch (error) {
    const { id } = await params
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid meal plan data', details: error.errors },
        { status: 400 },
      )
    }
    console.error(`PUT /api/meal-plans/${id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to update meal plan' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const existing = await prisma.mealPlan.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // Schema cascade removes the plan's planned meals automatically.
    await prisma.mealPlan.delete({ where: { id } })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const { id } = await params
    console.error(`DELETE /api/meal-plans/${id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete meal plan' },
      { status: 500 },
    )
  }
}
