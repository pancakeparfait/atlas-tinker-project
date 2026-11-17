import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CalendarGrid } from '../calendar-grid'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'

// Monday of the first visible week
const START = '2026-10-19'
// A Wednesday inside the window
const TODAY = '2026-10-21'
// Monday + 27 days (last visible day)
const END = '2026-11-15'

function makeMeal(
  overrides: Partial<PlannedMealWithRecipe> = {}
): PlannedMealWithRecipe {
  return {
    id: 'pm1',
    mealPlanId: 'p1',
    recipeId: 'r1',
    mealDate: TODAY,
    mealType: 'DINNER',
    servingsPlanned: 2,
    notes: null,
    recipe: {
      id: 'r1',
      title: 'Pancakes',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      difficultyLevel: 'EASY',
    },
    ...overrides,
  }
}

describe('CalendarGrid', () => {
  it('renders Mon-Sun column headers in order', () => {
    render(<CalendarGrid startDate={START} today={TODAY} />)
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    weekdays.forEach((day) => {
      expect(screen.getAllByText(day)).toHaveLength(1)
    })
  })

  it('renders exactly 4 weeks (28 day cells)', () => {
    render(<CalendarGrid startDate={START} today={TODAY} />)
    expect(screen.getAllByTestId('calendar-day')).toHaveLength(28)
  })

  it('renders day cells in consecutive order starting on the given Monday', () => {
    const { container } = render(
      <CalendarGrid startDate={START} today={TODAY} />
    )
    const cells = Array.from(
      container.querySelectorAll('[data-testid="calendar-day"]')
    )
    const dates = cells.map((cell) => cell.getAttribute('data-date'))
    expect(dates[0]).toBe(START)
    expect(dates[dates.length - 1]).toBe(END)

    const weekdays = dates.map((date) => new Date(`${date}T00:00:00`).getDay())
    // getDay(): 1 = Monday ... 0 = Sunday; grid columns must run Mon -> Sun
    expect(weekdays[0]).toBe(1)
    weekdays.forEach((weekday, index) => {
      const expected = (1 + index) % 7
      expect(weekday).toBe(expected)
    })
  })

  it('highlights exactly one day cell as today', () => {
    render(<CalendarGrid startDate={START} today={TODAY} />)
    const cells = screen.getAllByTestId('calendar-day')
    const todayCells = cells.filter(
      (cell) => cell.getAttribute('aria-current') === 'date'
    )
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0].getAttribute('data-date')).toBe(TODAY)
    expect(todayCells[0].className).toContain('ring-primary')
  })

  it('renders three meal slots per day (84 total)', () => {
    render(<CalendarGrid startDate={START} today={TODAY} />)
    expect(screen.getAllByTestId('meal-slot')).toHaveLength(84)
  })

  it('shows breakfast/lunch/dinner labels for every empty day', () => {
    render(<CalendarGrid startDate={START} today={TODAY} />)
    expect(screen.getAllByText('Breakfast')).toHaveLength(28)
    expect(screen.getAllByText('Lunch')).toHaveLength(28)
    expect(screen.getAllByText('Dinner')).toHaveLength(28)
  })

  it('places a planned meal in its matching day and slot', () => {
    render(
      <CalendarGrid
        startDate={START}
        today={TODAY}
        plannedMeals={[makeMeal({ mealDate: '2026-10-22', mealType: 'LUNCH' })]}
      />
    )
    const cells = screen.getAllByTestId('calendar-day')
    const target = cells.find(
      (cell) => cell.getAttribute('data-date') === '2026-10-22'
    )
    expect(target).toBeDefined()
    const targetSlots = within(target as HTMLElement).getAllByTestId(
      'meal-slot'
    )
    expect(targetSlots).toHaveLength(3)
    expect(targetSlots[1].textContent).toContain('Pancakes')
    expect(targetSlots[0].textContent).not.toContain('Pancakes')
    expect(targetSlots[2].textContent).not.toContain('Pancakes')
  })

  it('keeps every visible day clickable (no disabled slots)', () => {
    const onAddMeal = jest.fn()
    render(
      <CalendarGrid startDate={START} today={TODAY} onAddMeal={onAddMeal} />
    )
    const slots = screen.getAllByTestId('meal-slot')
    expect(slots).toHaveLength(84)
    slots.forEach((slot) => {
      expect(slot).not.toHaveAttribute('data-out-of-range')
      expect(slot).not.toHaveAttribute('aria-disabled')
      expect(slot.className).not.toContain('cursor-not-allowed')
      expect(
        within(slot).getByRole('button', { name: /add to/i })
      ).toBeInTheDocument()
      fireEvent.click(slot)
    })
    expect(onAddMeal).toHaveBeenCalledTimes(84)
    expect(onAddMeal).toHaveBeenCalledWith(START, 'BREAKFAST')
    expect(onAddMeal).toHaveBeenCalledWith(END, 'DINNER')
  })

  it('ignores planned meals outside the visible window', () => {
    render(
      <CalendarGrid
        startDate={START}
        today={TODAY}
        plannedMeals={[makeMeal({ mealDate: '2026-12-25' })]}
      />
    )
    expect(screen.queryByText('Pancakes')).toBeNull()
  })
})
