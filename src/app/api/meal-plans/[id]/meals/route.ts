import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isValidDateOnly, toDateOnly } from '@/lib/date-only'
import {
  serializePlannedMeal,
  PLANNED_MEAL_RECIPE_SELECT,
} from '@/lib/serializers/meal-plan-serializers'

const MealsQuerySchema = z.object({
  start: z.string().refine((v) => isValidDateOnly(v), 'Invalid start, expected YYYY-MM-DD'),
  end: z.string().refine((v) => isValidDateOnly(v), 'Invalid end, expected YYYY-MM-DD'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const parsed = MealsQuerySchema.safeParse({
      start: searchParams.get('start'),
      end: searchParams.get('end'),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid date range', details: parsed.error.errors },
        { status: 400 },
      )
    }

    const { start, end } = parsed.data
    if (start > end) {
      return NextResponse.json(
        { error: 'start must be on or before end' },
        { status: 400 },
      )
    }

    const plan = await prisma.mealPlan.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const meals = await prisma.plannedMeal.findMany({
      where: {
        mealPlanId: id,
        mealDate: { gte: toDateOnly(start), lte: toDateOnly(end) },
      },
      include: {
        recipe: { select: PLANNED_MEAL_RECIPE_SELECT },
      },
      orderBy: [{ mealDate: 'asc' }, { mealType: 'asc' }],
    })

    return NextResponse.json(meals.map(serializePlannedMeal))
  } catch (error) {
    const { id } = await params
    console.error(`GET /api/meal-plans/${id}/meals error:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch planned meals' },
      { status: 500 },
    )
  }
}
