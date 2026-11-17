import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { RecipePickerModal } from '../recipe-picker-modal'
import { useRecipes } from '@/lib/queries/recipe-queries'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'

jest.mock('@/lib/queries/recipe-queries', () => ({
  useRecipes: jest.fn(),
}))

const useRecipesMock = useRecipes as jest.Mock

const recipes = [
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

function mockRecipes(overrides: Record<string, unknown> = {}) {
  useRecipesMock.mockReturnValue({
    data: {
      recipes,
      pagination: { page: 1, limit: 50, total: 2, pages: 1 },
    },
    isLoading: false,
    error: null,
    ...overrides,
  })
}

function makeMeal(
  overrides: Partial<PlannedMealWithRecipe> = {}
): PlannedMealWithRecipe {
  return {
    id: 'pm1',
    mealPlanId: 'p1',
    recipeId: 'r1',
    mealDate: '2026-10-21',
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

function renderModal(
  props: Partial<React.ComponentProps<typeof RecipePickerModal>> = {}
) {
  return render(
    <RecipePickerModal
      open
      onOpenChange={jest.fn()}
      mealDate="2026-10-21"
      mealType="DINNER"
      onSubmit={jest.fn()}
      {...props}
    />
  )
}

describe('RecipePickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecipes()
  })

  it('renders recipes and a search field', () => {
    renderModal()
    expect(
      screen.getByRole('heading', { name: /add to dinner/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/search recipes/i)).toBeInTheDocument()
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
    expect(screen.getByText('Soup')).toBeInTheDocument()
  })

  it('passes the search text and category to the recipe query', () => {
    renderModal()
    expect(useRecipesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: undefined, limit: 50 })
    )

    fireEvent.change(screen.getByLabelText(/search recipes/i), {
      target: { value: 'soup' },
    })
    expect(useRecipesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'soup', limit: 50 })
    )
  })

  it('passes the selected category to the recipe query', () => {
    renderModal()
    const trigger = screen.getByRole('combobox', {
      name: /filter by category/i,
    })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(screen.getByRole('option', { name: 'Dinner' }))

    expect(useRecipesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'DINNER' })
    )
  })

  it('selects multiple recipes and submits them with a note', () => {
    const onSubmit = jest.fn()
    renderModal({ onSubmit })

    fireEvent.click(screen.getByRole('checkbox', { name: /pancakes/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /soup/i }))
    fireEvent.change(screen.getByLabelText(/note/i), {
      target: { value: 'Double batch' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      recipeIds: ['r1', 'r2'],
      note: 'Double batch',
    })
  })

  it('disables submit until something changes', () => {
    renderModal()
    expect(
      screen.getByRole('button', { name: /add to meal/i })
    ).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /pancakes/i }))
    expect(
      screen.getByRole('button', { name: /add to meal/i })
    ).not.toBeDisabled()
  })

  it('starts with the existing slot note and marks assigned recipes as added', () => {
    renderModal({
      existingMeals: [
        makeMeal(),
        makeMeal({
          id: 'pm2',
          recipeId: null,
          recipe: null,
          servingsPlanned: 0,
          notes: 'Order takeout',
        }),
      ],
    })

    expect(screen.getByLabelText(/note/i)).toHaveValue('Order takeout')
    expect(screen.getByRole('checkbox', { name: /pancakes/i })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /pancakes/i })).toBeChecked()
  })

  it('closes when Cancel is clicked', () => {
    const onOpenChange = jest.fn()
    renderModal({ onOpenChange })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows an empty state when no recipes match', () => {
    mockRecipes({
      data: {
        recipes: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      },
    })
    renderModal()
    expect(screen.getByText(/no recipes found/i)).toBeInTheDocument()
  })
})
