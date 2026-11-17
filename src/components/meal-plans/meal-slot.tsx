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
import { MEAL_TYPE_LABELS } from '@/components/meal-plans/meal-constants'
import { cn } from '@/lib/utils'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'
import { Plus, X } from 'lucide-react'

export function findSlotNoteMeal(
  meals: PlannedMealWithRecipe[]
): PlannedMealWithRecipe | undefined {
  return meals.find((meal) => {
    if (!meal.notes?.trim()) return false
    return meal.recipeId === null
      ? meal.servingsPlanned === 0
      : meal.servingsPlanned > 0
  })
}

type PendingAction = {
  meal: PlannedMealWithRecipe
  kind: 'remove-meal' | 'clear-note'
}

export interface MealSlotProps {
  mealType: MealType
  plannedMeals?: PlannedMealWithRecipe[]
  onAdd?: () => void
  onRemoveMeal?: (meal: PlannedMealWithRecipe) => void
  onRemoveNote?: (meal: PlannedMealWithRecipe) => void
  isOutOfRange?: boolean
}

export function MealSlot({
  mealType,
  plannedMeals = [],
  onAdd,
  onRemoveMeal,
  onRemoveNote,
  isOutOfRange = false,
}: MealSlotProps): React.JSX.Element {
  const label = MEAL_TYPE_LABELS[mealType]
  const isEmpty = plannedMeals.length === 0
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const handleAdd = () => {
    if (isOutOfRange) return
    if (onAdd) onAdd()
  }

  const confirmAction = () => {
    const action = pendingAction
    setPendingAction(null)
    if (!action) return
    if (action.kind === 'clear-note') {
      if (onRemoveNote) onRemoveNote(action.meal)
    } else if (onRemoveMeal) {
      onRemoveMeal(action.meal)
    }
  }

  return (
    <div
      data-testid="meal-slot"
      data-out-of-range={isOutOfRange ? 'true' : undefined}
      aria-disabled={isOutOfRange ? true : undefined}
      title={isOutOfRange ? 'Outside the meal plan date range' : undefined}
      onClick={handleAdd}
      className={cn(
        'min-h-[4.5rem] rounded-md border p-2 text-sm',
        isEmpty ? 'bg-muted/40 text-muted-foreground' : 'bg-background',
        isOutOfRange && 'cursor-not-allowed opacity-50',
        !isOutOfRange &&
          onAdd &&
          'cursor-pointer transition-colors hover:border-primary/60'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="block text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        {onAdd && !isOutOfRange && (
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
          {plannedMeals.map((meal) => {
            const canClearNote = !!meal.recipe && !!meal.notes && !!onRemoveNote
            return (
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
                  {(onRemoveMeal || canClearNote) && (
                    <div className="flex shrink-0 items-start gap-0.5">
                      {onRemoveMeal && (
                        <button
                          type="button"
                          aria-label={
                            meal.recipe
                              ? `Remove ${meal.recipe.title}`
                              : 'Remove note'
                          }
                          onClick={(event) => {
                            event.stopPropagation()
                            setPendingAction({ meal, kind: 'remove-meal' })
                          }}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      )}
                      {canClearNote && (
                        <button
                          type="button"
                          aria-label="Remove note"
                          onClick={(event) => {
                            event.stopPropagation()
                            setPendingAction({ meal, kind: 'clear-note' })
                          }}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
      >
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === 'clear-note'
                ? 'Remove note?'
                : `Remove ${pendingAction?.meal.recipe?.title ?? 'note'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === 'clear-note'
                ? 'This removes the note and keeps the recipe planned.'
                : `This will remove it from this ${label.toLowerCase()} slot.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
