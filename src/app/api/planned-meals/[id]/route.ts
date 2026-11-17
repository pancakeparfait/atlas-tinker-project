import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MealType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  isValidDateOnly,
  toDateOnly,
  serializeDateOnly,
  isInRange,
} from '@/lib/date-only'
import {
  serializePlannedMeal,
  PLANNED_MEAL_RECIPE_SELECT,
} from '@/lib/serializers/meal-plan-serializers'

const UpdatePlannedMealSchema = z.object({
  recipeId: z
    .string()
    .min(1, 'recipeId must be a non-empty id')
    .nullable()
    .optional(),
  mealDate: z
    .string()
    .refine((v) => isValidDateOnly(v), 'Invalid mealDate, expected YYYY-MM-DD')
    .optional(),
  mealType: z.nativeEnum(MealType).optional(),
  servingsPlanned: z.number().int().optional(),
  notes: z.string().nullable().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const body = await request.json()
    const data = UpdatePlannedMealSchema.parse(body)

    const existing = await prisma.plannedMeal.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Planned meal not found' },
        { status: 404 },
      )
    }

    const recipeId =
      data.recipeId !== undefined ? data.recipeId : existing.recipeId
    const notes = data.notes !== undefined ? data.notes : existing.notes
    const servingsPlanned =
      data.servingsPlanned !== undefined
        ? data.servingsPlanned
        : existing.servingsPlanned
    const mealDate = data.mealDate ?? serializeDateOnly(existing.mealDate)!
    const mealType = data.mealType ?? existing.mealType

    if (recipeId) {
      if (servingsPlanned <= 0) {
        return NextResponse.json(
          {
            error:
              'servingsPlanned must be greater than 0 for a recipe-backed meal',
          },
          { status: 400 },
        )
      }
    } else {
      if (servingsPlanned !== 0) {
        return NextResponse.json(
          { error: 'servingsPlanned must be 0 for a notes-only meal' },
          { status: 400 },
        )
      }
      if (!notes || notes.trim().length === 0) {
        return NextResponse.json(
          { error: 'notes is required for a notes-only meal' },
          { status: 400 },
        )
      }
    }

    const plan = await prisma.mealPlan.findUnique({
      where: { id: existing.mealPlanId },
      select: { id: true, startDate: true, endDate: true },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const startStr = serializeDateOnly(plan.startDate)!
    const endStr = serializeDateOnly(plan.endDate)!

    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true },
      })
      if (!recipe) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }
    }

    const mealData = {
      ...(data.recipeId !== undefined ? { recipeId: data.recipeId } : {}),
      ...(data.mealDate !== undefined
        ? { mealDate: toDateOnly(data.mealDate) }
        : {}),
      ...(data.mealType !== undefined ? { mealType: data.mealType } : {}),
      ...(data.servingsPlanned !== undefined
        ? { servingsPlanned: data.servingsPlanned }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    }

    const meal = await prisma.$transaction(async (tx) => {
      if (!isInRange(mealDate, startStr, endStr)) {
        await tx.mealPlan.update({
          where: { id: existing.mealPlanId },
          data: {
            ...(mealDate < startStr
              ? { startDate: toDateOnly(mealDate) }
              : {}),
            ...(mealDate > endStr ? { endDate: toDateOnly(mealDate) } : {}),
          },
        })
      }

      return tx.plannedMeal.update({
        where: { id },
        data: mealData,
        include: {
          recipe: { select: PLANNED_MEAL_RECIPE_SELECT },
        },
      })
    })

    return NextResponse.json(serializePlannedMeal(meal))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid planned meal data', details: error.errors },
        { status: 400 },
      )
    }
    console.error(`PUT /api/planned-meals/${id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to update planned meal' },
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
