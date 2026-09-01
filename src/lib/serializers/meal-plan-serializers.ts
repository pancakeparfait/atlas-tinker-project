import { Prisma } from '@prisma/client'
import { serializeDateOnly } from '@/lib/date-only'

export type MealPlanSerializerInput = Prisma.MealPlanGetPayload<object>

export const PLANNED_MEAL_RECIPE_SELECT = {
  id: true,
  title: true,
  prepTimeMinutes: true,
  cookTimeMinutes: true,
  difficultyLevel: true,
} satisfies Prisma.RecipeSelect

export type PlannedMealSerializerInput = Prisma.PlannedMealGetPayload<{
  include: {
    recipe: { select: typeof PLANNED_MEAL_RECIPE_SELECT }
  }
}>

export interface MealPlanJSON {
  id: string
  name: string
  startDate: string
  endDate: string
  budgetLimit: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PlannedMealJSON {
  id: string
  mealPlanId: string
  recipeId: string | null
  mealDate: string
  mealType: string
  servingsPlanned: number
  notes: string | null
  recipe: MealSummaryJSON | null
}

export interface MealSummaryJSON {
  id: string
  title: string
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  difficultyLevel: string
}

export function serializeMealPlan(
  plan: MealPlanSerializerInput,
): MealPlanJSON {
  return {
    id: plan.id,
    name: plan.name,
    startDate: serializeRequiredDate(plan.startDate),
    endDate: serializeRequiredDate(plan.endDate),
    budgetLimit: plan.budgetLimit,
    notes: plan.notes,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}

export function serializePlannedMeal(
  meal: PlannedMealSerializerInput,
): PlannedMealJSON {
  return {
    id: meal.id,
    mealPlanId: meal.mealPlanId,
    recipeId: meal.recipeId,
    mealDate: serializeRequiredDate(meal.mealDate),
    mealType: meal.mealType,
    servingsPlanned: meal.servingsPlanned,
    notes: meal.notes,
    recipe: meal.recipe ? serializeMealSummary(meal.recipe) : null,
  }
}

function serializeRequiredDate(value: Date): string {
  return serializeDateOnly(value) ?? ''
}

function serializeMealSummary(
  summary: NonNullable<PlannedMealSerializerInput['recipe']>,
): MealSummaryJSON {
  return {
    id: summary.id,
    title: summary.title,
    prepTimeMinutes: summary.prepTimeMinutes,
    cookTimeMinutes: summary.cookTimeMinutes,
    difficultyLevel: summary.difficultyLevel,
  }
}