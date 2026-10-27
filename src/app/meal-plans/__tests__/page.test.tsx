import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import MealPlansPage from '../page'
import { useMealPlans, usePlannedMeals } from '@/lib/queries/meal-plan-queries'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'

jest.mock('@/lib/queries/meal-plan-queries', () => ({
  useMealPlans: jest.fn(),
  usePlannedMeals: jest.fn(),
}))

// Fixed local time: Wednesday, 2026-10-21 (inside the week of Mon 2026-10-19)
const FIXED_NOW = new Date(2026, 9, 21, 12, 0, 0)
const CURRENT_WEEK_MONDAY = '2026-10-19'
const CURRENT_WEEK_SUNDAY = '2026-11-15'

const plansMock = useMealPlans as jest.Mock
const mealsMock = usePlannedMeals as jest.Mock

const plans = [
  {
    id: 'p1',
    name: 'Week of Brunch',
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    budgetLimit: null,
    notes: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
]

function mockQueries({
  plansData = plans,
  mealsData = [],
}: { plansData?: unknown; mealsData?: PlannedMealWithRecipe[] } = {}) {
  plansMock.mockReturnValue({
    data: plansData,
    isLoading: false,
    error: null,
  })
  mealsMock.mockReturnValue({
    data: mealsData,
    isLoading: false,
    error: null,
  })
}

function firstVisibleDate(container: HTMLElement): string | null {
  const cell = container.querySelector('[data-testid="calendar-day"]')
  return cell?.getAttribute('data-date') ?? null
}

function queryTodayCell(): Element | null {
  return document.querySelector('[aria-current="date"]')
}

describe('MealPlansPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(FIXED_NOW)
    mockQueries()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the page heading and a meal plan selector placeholder', () => {
    render(<MealPlansPage />)
    expect(
      screen.getByRole('heading', { name: /meal plans/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('meal-plan-selector')).toBeInTheDocument()
    expect(screen.getByText('Week of Brunch')).toBeInTheDocument()
  })

  it('loads planned meals for the current 4-week window', () => {
    render(<MealPlansPage />)
    expect(mealsMock).toHaveBeenCalledWith(
      'p1',
      CURRENT_WEEK_MONDAY,
      CURRENT_WEEK_SUNDAY
    )
  })

  it('shows 4 weeks of days starting on the current Monday with empty slot labels', () => {
    const { container } = render(<MealPlansPage />)
    expect(screen.getAllByTestId('calendar-day')).toHaveLength(28)
    expect(firstVisibleDate(container)).toBe(CURRENT_WEEK_MONDAY)
    expect(screen.getAllByText('Breakfast')).toHaveLength(28)
    expect(screen.getAllByText('Lunch')).toHaveLength(28)
    expect(screen.getAllByText('Dinner')).toHaveLength(28)
  })

  it('highlights the current day', () => {
    render(<MealPlansPage />)
    const todayCell = queryTodayCell()
    expect(todayCell).not.toBeNull()
    expect(todayCell?.getAttribute('data-date')).toBe('2026-10-21')
  })

  it('shows a loading state while meal plans load', () => {
    plansMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    render(<MealPlansPage />)
    expect(screen.getByText(/loading meal plans/i)).toBeInTheDocument()
  })

  it('shows an error state when meal plans fail to load', () => {
    plansMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    })
    render(<MealPlansPage />)
    expect(screen.getByText(/error loading meal plans/i)).toBeInTheDocument()
  })

  it('Next moves the visible window forward one week and refetches', () => {
    const { container } = render(<MealPlansPage />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(firstVisibleDate(container)).toBe('2026-10-26')
    expect(mealsMock).toHaveBeenLastCalledWith('p1', '2026-10-26', '2026-11-22')
  })

  it('Prev moves the visible window backward one week', () => {
    const { container } = render(<MealPlansPage />)
    fireEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(firstVisibleDate(container)).toBe('2026-10-12')
    expect(mealsMock).toHaveBeenLastCalledWith('p1', '2026-10-12', '2026-11-08')
  })

  it('Today returns to the current week after navigating away', () => {
    const { container } = render(<MealPlansPage />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(firstVisibleDate(container)).toBe('2026-11-02')
    fireEvent.click(screen.getByRole('button', { name: /today/i }))
    expect(firstVisibleDate(container)).toBe(CURRENT_WEEK_MONDAY)
    expect(mealsMock).toHaveBeenLastCalledWith(
      'p1',
      CURRENT_WEEK_MONDAY,
      CURRENT_WEEK_SUNDAY
    )
  })

  it('renders assigned recipes from the meals query', () => {
    mockQueries({
      mealsData: [
        {
          id: 'pm1',
          mealPlanId: 'p1',
          recipeId: 'r1',
          mealDate: '2026-10-21',
          mealType: 'DINNER',
          servingsPlanned: 2,
          notes: 'Leftovers night',
          recipe: {
            id: 'r1',
            title: 'Chili',
            prepTimeMinutes: 10,
            cookTimeMinutes: 40,
            difficultyLevel: 'EASY',
          },
        },
      ],
    })
    render(<MealPlansPage />)
    expect(screen.getByText('Chili')).toBeInTheDocument()
    expect(screen.getByText('Leftovers night')).toBeInTheDocument()
  })

  it('shows a selector placeholder when there are no meal plans', () => {
    mockQueries({ plansData: [] })
    render(<MealPlansPage />)
    expect(screen.getByTestId('meal-plan-selector')).toHaveTextContent(
      /no meal plans yet/i
    )
    expect(mealsMock).toHaveBeenCalledWith(
      '',
      CURRENT_WEEK_MONDAY,
      CURRENT_WEEK_SUNDAY
    )
  })
})
