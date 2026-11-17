import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import MealPlansPage from '../page'
import {
  useMealPlans,
  usePlannedMeals,
  useCreatePlannedMeal,
  useUpdatePlannedMeal,
  useDeletePlannedMeal,
} from '@/lib/queries/meal-plan-queries'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'
import { useRecipes } from '@/lib/queries/recipe-queries'
import { isInRange } from '@/lib/date-only'

jest.mock('@/lib/queries/meal-plan-queries', () => ({
  useMealPlans: jest.fn(),
  usePlannedMeals: jest.fn(),
  useCreatePlannedMeal: jest.fn(),
  useUpdatePlannedMeal: jest.fn(),
  useDeletePlannedMeal: jest.fn(),
}))

jest.mock('@/lib/queries/recipe-queries', () => ({
  useRecipes: jest.fn(),
}))

// Fixed local time: Wednesday, 2026-10-21 (inside the week of Mon 2026-10-19)
const FIXED_NOW = new Date(2026, 9, 21, 12, 0, 0)
const CURRENT_WEEK_MONDAY = '2026-10-19'
const CURRENT_WEEK_SUNDAY = '2026-11-15'

const plansMock = useMealPlans as jest.Mock
const mealsMock = usePlannedMeals as jest.Mock
const createMealMock = useCreatePlannedMeal as jest.Mock
const updateMealMock = useUpdatePlannedMeal as jest.Mock
const deleteMealMock = useDeletePlannedMeal as jest.Mock
const recipesMock = useRecipes as jest.Mock

const createMutate = jest.fn()
const updateMutate = jest.fn()
const deleteMutate = jest.fn()

const pickerRecipes = [
  {
    id: 'r1',
    title: 'Pancakes',
    mealCategory: 'BREAKFAST',
    servings: 4,
    difficultyLevel: 'EASY',
    instructions: [],
    tags: [],
    isDraft: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ingredients: [],
    primaryImageId: null,
  },
  {
    id: 'r2',
    title: 'Soup',
    mealCategory: 'DINNER',
    servings: 2,
    difficultyLevel: 'EASY',
    instructions: [],
    tags: [],
    isDraft: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ingredients: [],
    primaryImageId: null,
  },
]

function noteMeal(overrides: Partial<PlannedMealWithRecipe> = {}) {
  return {
    id: 'pm-note',
    mealPlanId: 'p1',
    recipeId: null,
    mealDate: '2026-10-19',
    mealType: 'BREAKFAST' as const,
    servingsPlanned: 0,
    notes: 'Old note',
    recipe: null,
    ...overrides,
  }
}

function orphanMeal(overrides: Partial<PlannedMealWithRecipe> = {}) {
  return noteMeal({
    id: 'pm-orphan',
    servingsPlanned: 2,
    notes: 'Stale orphan note',
    ...overrides,
  })
}

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
  createMealMock.mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  })
  updateMealMock.mockReturnValue({
    mutateAsync: updateMutate,
    isPending: false,
  })
  deleteMealMock.mockReturnValue({
    mutateAsync: deleteMutate,
    isPending: false,
  })
  recipesMock.mockReturnValue({
    data: {
      recipes: pickerRecipes,
      pagination: { page: 1, limit: 50, total: 2, pages: 1 },
    },
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

  it('loads planned meals for the active plan 4-week window', () => {
    render(<MealPlansPage />)
    expect(mealsMock).toHaveBeenCalledWith(
      'p1',
      CURRENT_WEEK_MONDAY,
      CURRENT_WEEK_SUNDAY
    )
  })

  it('anchors a past-dated plan so a slot click sends an in-range mealDate', () => {
    const pastPlan = {
      ...plans[0],
      id: 'p-past',
      name: 'Old Week',
      startDate: '2026-10-05',
      endDate: '2026-10-11',
    }
    mockQueries({ plansData: [pastPlan] })
    const { container } = render(<MealPlansPage />)

    expect(mealsMock).toHaveBeenCalledWith('p-past', '2026-10-05', '2026-11-01')
    expect(firstVisibleDate(container)).toBe('2026-10-05')

    fireEvent.click(screen.getAllByTestId('meal-slot')[0])
    fireEvent.click(screen.getByRole('checkbox', { name: /pancakes/i }))
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    const assignment = createMutate.mock.calls[0][0]
    expect(assignment.mealDate).toBe('2026-10-05')
    expect(
      isInRange(assignment.mealDate, pastPlan.startDate, pastPlan.endDate)
    ).toBe(true)
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

  it('opens the recipe picker when a meal slot is clicked', () => {
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])
    expect(
      screen.getByRole('heading', { name: /add to breakfast/i })
    ).toBeInTheDocument()
  })

  it('does not open the recipe picker when there is no active plan', () => {
    mockQueries({ plansData: [] })
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('assigns multiple recipes and a note to a slot', () => {
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])
    fireEvent.click(screen.getByRole('checkbox', { name: /pancakes/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /soup/i }))
    fireEvent.change(screen.getByLabelText(/^note$/i), {
      target: { value: 'Brunch spread' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(createMutate).toHaveBeenCalledTimes(3)
    expect(createMutate).toHaveBeenCalledWith({
      mealPlanId: 'p1',
      recipeId: 'r1',
      mealDate: CURRENT_WEEK_MONDAY,
      mealType: 'BREAKFAST',
      servingsPlanned: 1,
    })
    expect(createMutate).toHaveBeenCalledWith({
      mealPlanId: 'p1',
      recipeId: 'r2',
      mealDate: CURRENT_WEEK_MONDAY,
      mealType: 'BREAKFAST',
      servingsPlanned: 1,
    })
    expect(createMutate).toHaveBeenCalledWith({
      mealPlanId: 'p1',
      recipeId: null,
      mealDate: CURRENT_WEEK_MONDAY,
      mealType: 'BREAKFAST',
      servingsPlanned: 0,
      notes: 'Brunch spread',
    })
  })

  it('does not re-create recipes already assigned to the slot', () => {
    mockQueries({
      mealsData: [
        noteMeal({
          id: 'pm-r1',
          recipeId: 'r1',
          servingsPlanned: 2,
          notes: null,
          recipe: {
            id: 'r1',
            title: 'Pancakes',
            prepTimeMinutes: 10,
            cookTimeMinutes: 15,
            difficultyLevel: 'EASY',
          },
        }),
      ],
    })
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])

    const assigned = screen.getByRole('checkbox', { name: /pancakes/i })
    expect(assigned).toBeChecked()
    expect(assigned).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /soup/i }))
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate).toHaveBeenCalledWith({
      mealPlanId: 'p1',
      recipeId: 'r2',
      mealDate: CURRENT_WEEK_MONDAY,
      mealType: 'BREAKFAST',
      servingsPlanned: 1,
    })
  })

  it('updates an existing slot note via PUT', () => {
    mockQueries({ mealsData: [orphanMeal(), noteMeal()] })
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])

    const note = screen.getByLabelText(/^note$/i)
    expect(note).toHaveValue('Old note')
    fireEvent.change(note, { target: { value: 'New note' } })
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(updateMutate).toHaveBeenCalledWith({
      id: 'pm-note',
      mealPlanId: 'p1',
      data: { notes: 'New note' },
    })
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('removes an existing slot note when it is cleared', () => {
    mockQueries({ mealsData: [noteMeal()] })
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])
    fireEvent.change(screen.getByLabelText(/^note$/i), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(deleteMutate).toHaveBeenCalledWith({
      id: 'pm-note',
      mealPlanId: 'p1',
    })
  })

  it('does not treat an orphaned recipe row as the slot note row', () => {
    mockQueries({ mealsData: [orphanMeal()] })
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])

    expect(screen.getByLabelText(/^note$/i)).toHaveValue('')
    fireEvent.change(screen.getByLabelText(/^note$/i), {
      target: { value: 'Order takeout' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(createMutate).toHaveBeenCalledWith({
      mealPlanId: 'p1',
      recipeId: null,
      mealDate: CURRENT_WEEK_MONDAY,
      mealType: 'BREAKFAST',
      servingsPlanned: 0,
      notes: 'Order takeout',
    })
    expect(updateMutate).not.toHaveBeenCalled()
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('never deletes an orphaned recipe row when the note is cleared', () => {
    mockQueries({ mealsData: [orphanMeal()] })
    render(<MealPlansPage />)
    fireEvent.click(screen.getAllByTestId('meal-slot')[0])

    const note = screen.getByLabelText(/^note$/i)
    fireEvent.change(note, { target: { value: 'temp' } })
    fireEvent.change(note, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(createMutate).not.toHaveBeenCalled()
    expect(updateMutate).not.toHaveBeenCalled()
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('removes a planned meal after confirmation', () => {
    mockQueries({
      mealsData: [
        {
          id: 'pm1',
          mealPlanId: 'p1',
          recipeId: 'r1',
          mealDate: '2026-10-19',
          mealType: 'BREAKFAST',
          servingsPlanned: 2,
          notes: null,
          recipe: {
            id: 'r1',
            title: 'Pancakes',
            prepTimeMinutes: 10,
            cookTimeMinutes: 15,
            difficultyLevel: 'EASY',
          },
        },
      ],
    })
    render(<MealPlansPage />)
    fireEvent.click(screen.getByRole('button', { name: /remove pancakes/i }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }))

    expect(deleteMutate).toHaveBeenCalledWith({
      id: 'pm1',
      mealPlanId: 'p1',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
