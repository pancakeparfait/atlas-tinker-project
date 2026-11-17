'use client'

import React from 'react'
import { addDays, eachDayOfInterval, format, parse } from 'date-fns'
import type { MealType } from '@prisma/client'
import { MealSlot } from './meal-slot'
import { cn } from '@/lib/utils'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'

const VISIBLE_MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const VISIBLE_DAYS = 28

export interface CalendarGridProps {
  /** Monday of the first visible week (YYYY-MM-DD) */
  startDate: string
  /** Calendar date to highlight as today (YYYY-MM-DD) */
  today: string
  plannedMeals?: PlannedMealWithRecipe[]
  onAddMeal?: (mealDate: string, mealType: MealType) => void
  onRemoveMeal?: (meal: PlannedMealWithRecipe) => void
  onRemoveNote?: (meal: PlannedMealWithRecipe) => void
}

function groupMealsBySlot(
  plannedMeals: PlannedMealWithRecipe[]
): Map<string, PlannedMealWithRecipe[]> {
  const grouped = new Map<string, PlannedMealWithRecipe[]>()
  for (const meal of plannedMeals) {
    if (!VISIBLE_MEAL_TYPES.includes(meal.mealType)) continue
    const key = `${meal.mealDate}|${meal.mealType}`
    const existing = grouped.get(key)
    if (existing) {
      existing.push(meal)
    } else {
      grouped.set(key, [meal])
    }
  }
  return grouped
}

export function CalendarGrid({
  startDate,
  today,
  plannedMeals = [],
  onAddMeal,
  onRemoveMeal,
  onRemoveNote,
}: CalendarGridProps): React.JSX.Element {
  const start = parse(startDate, 'yyyy-MM-dd', new Date())
  const days = eachDayOfInterval({
    start,
    end: addDays(start, VISIBLE_DAYS - 1),
  })
  const mealsBySlot = groupMealsBySlot(plannedMeals)

  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_HEADERS.map((weekday) => (
        <div
          key={weekday}
          className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {weekday}
        </div>
      ))}
      {days.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const isToday = dayKey === today
        const isFirstOfMonth = format(day, 'd') === '1'
        return (
          <div
            key={dayKey}
            data-testid="calendar-day"
            data-date={dayKey}
            aria-current={isToday ? 'date' : undefined}
            className={cn(
              'space-y-1.5 rounded-lg border bg-card p-1.5',
              isToday && 'ring-2 ring-primary'
            )}
          >
            <div className="px-0.5 text-xs font-semibold">
              {format(day, 'd')}
              {isFirstOfMonth && (
                <span className="ml-1 font-normal text-muted-foreground">
                  {format(day, 'MMM')}
                </span>
              )}
            </div>
            {VISIBLE_MEAL_TYPES.map((mealType) => (
              <MealSlot
                key={mealType}
                mealType={mealType}
                plannedMeals={mealsBySlot.get(`${dayKey}|${mealType}`) ?? []}
                onAdd={onAddMeal ? () => onAddMeal(dayKey, mealType) : undefined}
                onRemoveMeal={onRemoveMeal}
                onRemoveNote={onRemoveNote}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
