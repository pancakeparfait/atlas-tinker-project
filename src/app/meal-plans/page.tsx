'use client'

import React, { useState } from 'react'
import { addDays, addWeeks, format, parse, startOfWeek } from 'date-fns'
import type { MealType } from '@prisma/client'
import { CalendarGrid } from '@/components/meal-plans/calendar-grid'
import { findSlotNoteMeal } from '@/components/meal-plans/meal-slot'
import { WeekNavigation } from '@/components/meal-plans/week-navigation'
import {
  RecipePickerModal,
  type RecipePickerSelection,
} from '@/components/meal-plans/recipe-picker-modal'
import {
  useCreatePlannedMeal,
  useDeletePlannedMeal,
  useMealPlans,
  usePlannedMeals,
  useUpdatePlannedMeal,
  type PlannedMealWithRecipe,
} from '@/lib/queries/meal-plan-queries'

const VISIBLE_WEEKS = 4
const DATE_FORMAT = 'yyyy-MM-dd'

function mondayOf(dateOnly: string): string {
  return format(
    startOfWeek(parse(dateOnly, DATE_FORMAT, new Date()), {
      weekStartsOn: 1,
    }),
    DATE_FORMAT
  )
}

function currentWeekStart(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), DATE_FORMAT)
}

function addDaysToDateOnly(dateOnly: string, days: number): string {
  return format(
    addDays(parse(dateOnly, DATE_FORMAT, new Date()), days),
    DATE_FORMAT
  )
}

function shiftWeeks(dateOnly: string, weeks: number): string {
  return format(
    addWeeks(parse(dateOnly, DATE_FORMAT, new Date()), weeks),
    DATE_FORMAT
  )
}

function formatRange(start: string, end: string): string {
  const startDate = parse(start, DATE_FORMAT, new Date())
  const endDate = parse(end, DATE_FORMAT, new Date())
  return `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`
}

interface PickerTarget {
  mealDate: string
  mealType: MealType
}

interface AnchorOverride {
  planId: string
  week: string
}

export default function MealPlansPage(): React.JSX.Element {
  const [anchorOverride, setAnchorOverride] =
    useState<AnchorOverride | null>(null)
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const plansQuery = useMealPlans()
  const plans = plansQuery.data ?? []
  // Placeholder selection: show the first plan until the full selector
  // dropdown lands in issue #4.
  const activePlan = plans[0]
  const activePlanId = activePlan?.id ?? ''

  const planWeekStart = activePlan ? mondayOf(activePlan.startDate) : null
  const anchorWeekStart =
    anchorOverride && anchorOverride.planId === activePlanId
      ? anchorOverride.week
      : (planWeekStart ?? currentWeekStart())

  const today = format(new Date(), DATE_FORMAT)
  const windowStart = anchorWeekStart
  const windowEnd = addDaysToDateOnly(anchorWeekStart, VISIBLE_WEEKS * 7 - 1)
  const mealsQuery = usePlannedMeals(activePlanId, windowStart, windowEnd)

  const createPlannedMeal = useCreatePlannedMeal()
  const updatePlannedMeal = useUpdatePlannedMeal()
  const deletePlannedMeal = useDeletePlannedMeal()
  const isSaving =
    createPlannedMeal.isPending ||
    updatePlannedMeal.isPending ||
    deletePlannedMeal.isPending

  const plannedMeals = mealsQuery.data ?? []
  const pickerMeals = pickerTarget
    ? plannedMeals.filter(
        (meal) =>
          meal.mealDate === pickerTarget.mealDate &&
          meal.mealType === pickerTarget.mealType
      )
    : []
  const pickerNoteMeal = findSlotNoteMeal(pickerMeals)
  const pickerAssignedRecipeIds = pickerMeals
    .map((meal) => meal.recipeId)
    .filter((id): id is string => id !== null)

  const openPicker = (mealDate: string, mealType: MealType) => {
    setActionError(null)
    setPickerTarget({ mealDate, mealType })
  }

  const setWindow = (week: string) => {
    setAnchorOverride({ planId: activePlanId, week })
  }

  const handleAssign = async ({
    recipeIds,
    note,
  }: RecipePickerSelection): Promise<void> => {
    if (!activePlanId || !pickerTarget) return
    setActionError(null)

    const existingRecipeIds = new Set(pickerAssignedRecipeIds)
    const noteRow = pickerNoteMeal
    const trimmedNote = note.trim()

    const operations: Promise<unknown>[] = []

    for (const recipeId of recipeIds) {
      if (existingRecipeIds.has(recipeId)) continue
      operations.push(
        createPlannedMeal.mutateAsync({
          mealPlanId: activePlanId,
          recipeId,
          mealDate: pickerTarget.mealDate,
          mealType: pickerTarget.mealType,
          servingsPlanned: 1,
        })
      )
    }

    if (noteRow) {
      if (trimmedNote === '') {
        operations.push(
          deletePlannedMeal.mutateAsync({
            id: noteRow.id,
            mealPlanId: activePlanId,
          })
        )
      } else if (trimmedNote !== (noteRow.notes ?? '').trim()) {
        operations.push(
          updatePlannedMeal.mutateAsync({
            id: noteRow.id,
            mealPlanId: activePlanId,
            data: { notes: trimmedNote },
          })
        )
      }
    } else if (trimmedNote !== '') {
      operations.push(
        createPlannedMeal.mutateAsync({
          mealPlanId: activePlanId,
          recipeId: null,
          mealDate: pickerTarget.mealDate,
          mealType: pickerTarget.mealType,
          servingsPlanned: 0,
          notes: trimmedNote,
        })
      )
    }

    try {
      await Promise.all(operations)
      setPickerTarget(null)
    } catch {
      setActionError('Could not update this meal slot. Please try again.')
    }
  }

  const handleRemoveMeal = async (
    meal: PlannedMealWithRecipe
  ): Promise<void> => {
    setActionError(null)
    try {
      await deletePlannedMeal.mutateAsync({
        id: meal.id,
        mealPlanId: meal.mealPlanId,
      })
    } catch {
      setActionError('Could not remove that item. Please try again.')
    }
  }

  if (plansQuery.isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg">Loading meal plans...</div>
        </div>
      </div>
    )
  }

  if (plansQuery.error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-red-500">Error loading meal plans</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Meal Plans</h1>
        <WeekNavigation
          onPrevious={() => setWindow(shiftWeeks(anchorWeekStart, -1))}
          onNext={() => setWindow(shiftWeeks(anchorWeekStart, 1))}
          onToday={() => setWindow(currentWeekStart())}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div
          data-testid="meal-plan-selector"
          aria-label="Meal plan selector"
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground">Meal plan</span>
          <span className="font-semibold">
            {activePlan ? activePlan.name : 'No meal plans yet'}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatRange(windowStart, windowEnd)}
        </span>
      </div>

      {mealsQuery.error && (
        <p role="alert" className="mb-4 text-sm text-red-500">
          Could not load planned meals.
        </p>
      )}

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-500">
          {actionError}
        </p>
      )}

      <CalendarGrid
        startDate={windowStart}
        today={today}
        plannedMeals={plannedMeals}
        onAddMeal={activePlanId ? openPicker : undefined}
        onRemoveMeal={handleRemoveMeal}
      />

      {pickerTarget && (
        <RecipePickerModal
          open
          onOpenChange={(next) => {
            if (!next) setPickerTarget(null)
          }}
          mealDate={pickerTarget.mealDate}
          mealType={pickerTarget.mealType}
          existingNote={pickerNoteMeal?.notes ?? ''}
          assignedRecipeIds={pickerAssignedRecipeIds}
          onSubmit={handleAssign}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
