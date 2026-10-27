'use client'

import React, { useState } from 'react'
import { addDays, addWeeks, format, parse, startOfWeek } from 'date-fns'
import { CalendarGrid } from '@/components/meal-plans/calendar-grid'
import { WeekNavigation } from '@/components/meal-plans/week-navigation'
import { useMealPlans, usePlannedMeals } from '@/lib/queries/meal-plan-queries'

const VISIBLE_WEEKS = 4
const DATE_FORMAT = 'yyyy-MM-dd'

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

export default function MealPlansPage(): React.JSX.Element {
  const [anchorWeekStart, setAnchorWeekStart] = useState(currentWeekStart)

  const plansQuery = useMealPlans()
  const plans = plansQuery.data ?? []
  // Placeholder selection: show the first plan until the full selector
  // dropdown lands in issue #4.
  const activePlan = plans[0]
  const activePlanId = activePlan?.id ?? ''

  const today = format(new Date(), DATE_FORMAT)
  const windowStart = anchorWeekStart
  const windowEnd = addDaysToDateOnly(anchorWeekStart, VISIBLE_WEEKS * 7 - 1)
  const mealsQuery = usePlannedMeals(activePlanId, windowStart, windowEnd)

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
          onPrevious={() => setAnchorWeekStart((prev) => shiftWeeks(prev, -1))}
          onNext={() => setAnchorWeekStart((prev) => shiftWeeks(prev, 1))}
          onToday={() => setAnchorWeekStart(currentWeekStart())}
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

      <CalendarGrid
        startDate={windowStart}
        today={today}
        plannedMeals={mealsQuery.data ?? []}
      />
    </div>
  )
}
