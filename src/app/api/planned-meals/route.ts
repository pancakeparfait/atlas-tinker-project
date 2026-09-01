import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MealType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isValidDateOnly, toDateOnly, serializeDateOnly, isInRange } from '@/lib/date-only'
import {
  serializePlannedMeal,
  PLANNED_MEAL_RECIPE_SELECT,
} from '@/lib/serializers/meal-plan-serializers'

const CreatePlannedMealSchema = z
  .object({
    mealPlanId: z.string().min(1, 'mealPlanId is required'),
    recipeId: z.string().min(1, 'recipeId must be a non-empty id').nullable(),
    mealDate: z.string().refine((v) => isValidDateOnly(v), 'Invalid mealDate, expected YYYY-MM-DD'),
    mealType: z.nativeEnum(MealType),
    servingsPlanned: z.number().int(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recipeId) {
      if (data.servingsPlanned <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'servingsPlanned must be greater than 0 for a recipe-backed meal',
          path: ['servingsPlanned'],
        })
      }
    } else {
      // Notes-only meal
      if (data.servingsPlanned !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'servingsPlanned must be 0 for a notes-only meal',
          path: ['servingsPlanned'],
        })
      }
      if (!data.notes || data.notes.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'notes is required for a notes-only meal',
          path: ['notes'],
        })
      }
    }
  })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreatePlannedMealSchema.parse(body)

    // Meal plan must exist
    const plan = await prisma.mealPlan.findUnique({
      where: { id: data.mealPlanId },
      select: { id: true, startDate: true, endDate: true },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // mealDate must be within the plan's inclusive date range
    const mealDateStr = data.mealDate
    const startStr = serializeDateOnly(plan.startDate)!
    const endStr = serializeDateOnly(plan.endDate)!
    if (!isInRange(mealDateStr, startStr, endStr)) {
      return NextResponse.json(
        { error: 'mealDate is outside the meal plan date range' },
        { status: 400 },
      )
    }

    // Recipe must exist if provided
    if (data.recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
        select: { id: true },
      })
      if (!recipe) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }
    }

    const meal = await prisma.plannedMeal.create({
      data: {
        mealPlanId: data.mealPlanId,
        recipeId: data.recipeId,
        mealDate: toDateOnly(data.mealDate),
        mealType: data.mealType,
        servingsPlanned: data.servingsPlanned,
        notes: data.notes,
      },
      include: {
        recipe: { select: PLANNED_MEAL_RECIPE_SELECT },
      },
    })

    return NextResponse.json(serializePlannedMeal(meal), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid planned meal data', details: error.errors },
        { status: 400 },
      )
    }
    console.error('POST /api/planned-meals error:', error)
    return NextResponse.json(
      { error: 'Failed to create planned meal' },
      { status: 500 },
    )
  }
}
