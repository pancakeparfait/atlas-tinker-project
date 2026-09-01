import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isValidDateOnly, toDateOnly } from '@/lib/date-only'
import { serializeMealPlan } from '@/lib/serializers/meal-plan-serializers'

export const CreateMealPlanSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startDate: z.string().refine((v) => isValidDateOnly(v), 'Invalid startDate, expected YYYY-MM-DD'),
    endDate: z.string().refine((v) => isValidDateOnly(v), 'Invalid endDate, expected YYYY-MM-DD'),
    notes: z.string().optional(),
    budgetLimit: z.number().nonnegative().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  })

export async function GET() {
  try {
    const plans = await prisma.mealPlan.findMany({
      orderBy: { startDate: 'asc' },
    })
    return NextResponse.json(plans.map(serializeMealPlan))
  } catch (error) {
    console.error('GET /api/meal-plans error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plans' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreateMealPlanSchema.parse(body)

    const plan = await prisma.mealPlan.create({
      data: {
        name: data.name,
        startDate: toDateOnly(data.startDate),
        endDate: toDateOnly(data.endDate),
        notes: data.notes,
        budgetLimit: data.budgetLimit,
      },
    })

    return NextResponse.json(serializeMealPlan(plan), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid meal plan data', details: error.errors },
        { status: 400 },
      )
    }
    console.error('POST /api/meal-plans error:', error)
    return NextResponse.json(
      { error: 'Failed to create meal plan' },
      { status: 500 },
    )
  }
}
