'use client'

import React, { useState } from 'react'
import type { MealType } from '@prisma/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'
import { Plus, X } from 'lucide-react'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
}

export function findSlotNoteMeal(
  meals: PlannedMealWithRecipe[]
): PlannedMealWithRecipe | undefined {
  return meals.find(
    (meal) => meal.recipeId === null && meal.servingsPlanned === 0
  )
}

export interface MealSlotProps {
  mealType: MealType
  plannedMeals?: PlannedMealWithRecipe[]
  onAdd?: () => void
  onRemoveMeal?: (meal: PlannedMealWithRecipe) => void
}

export function MealSlot({
  mealType,
  plannedMeals = [],
  onAdd,
  onRemoveMeal,
}: MealSlotProps): React.JSX.Element {
  const label = MEAL_TYPE_LABELS[mealType]
  const isEmpty = plannedMeals.length === 0
  const [pendingRemoval, setPendingRemoval] =
    useState<PlannedMealWithRecipe | null>(null)

  const handleAdd = () => {
    if (onAdd) onAdd()
  }

  const confirmRemoval = () => {
    const meal = pendingRemoval
    setPendingRemoval(null)
    if (meal && onRemoveMeal) onRemoveMeal(meal)
  }

  return (
    <div
      data-testid="meal-slot"
      onClick={handleAdd}
      className={cn(
        'min-h-[4.5rem] rounded-md border p-2 text-sm',
        isEmpty ? 'bg-muted/40 text-muted-foreground' : 'bg-background',
        onAdd && 'cursor-pointer transition-colors hover:border-primary/60'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="block text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        {onAdd && (
          <button
            type="button"
            aria-label={`Add to ${label}`}
            onClick={(event) => {
              event.stopPropagation()
              handleAdd()
            }}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      {isEmpty ? (
        <span className="sr-only">No meals planned</span>
      ) : (
        <ul className="mt-1 space-y-1">
          {plannedMeals.map((meal) => (
            <li key={meal.id} className="leading-snug">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
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
                </div>
                {onRemoveMeal && (
                  <button
                    type="button"
                    aria-label={
                      meal.recipe ? `Remove ${meal.recipe.title}` : 'Remove note'
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      setPendingRemoval(meal)
                    }}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
      >
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove{' '}
              {pendingRemoval?.recipe ? pendingRemoval.recipe.title : 'note'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove it from this {label.toLowerCase()} slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
