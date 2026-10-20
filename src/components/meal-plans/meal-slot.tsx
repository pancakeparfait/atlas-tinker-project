'use client'

import React from 'react'
import type { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
}

export interface MealSlotProps {
  mealType: MealType
  plannedMeals?: PlannedMealWithRecipe[]
}

export function MealSlot({
  mealType,
  plannedMeals = [],
}: MealSlotProps): React.JSX.Element {
  const label = MEAL_TYPE_LABELS[mealType]
  const isEmpty = plannedMeals.length === 0

  return (
    <div
      data-testid="meal-slot"
      className={cn(
        'min-h-[4.5rem] rounded-md border p-2 text-sm',
        isEmpty ? 'bg-muted/40 text-muted-foreground' : 'bg-background'
      )}
    >
      <span className="block text-xs font-medium uppercase tracking-wide">
        {label}
      </span>
      {isEmpty ? (
        <span className="sr-only">No meals planned</span>
      ) : (
        <ul className="mt-1 space-y-1">
          {plannedMeals.map((meal) => (
            <li key={meal.id} className="leading-snug">
              {meal.recipe && (
                <span className="block font-medium text-foreground">
                  {meal.recipe.title}
                </span>
              )}
              {meal.notes && (
                <span className="block text-xs text-muted-foreground">
                  {meal.notes}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
