import React from 'react'
import { render, screen } from '@testing-library/react'
import { MealSlot } from '../meal-slot'
import type { PlannedMealWithRecipe } from '@/lib/queries/meal-plan-queries'

function makeMeal(
  overrides: Partial<PlannedMealWithRecipe> = {}
): PlannedMealWithRecipe {
  return {
    id: 'pm1',
    mealPlanId: 'p1',
    recipeId: 'r1',
    mealDate: '2026-10-21',
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
    ...overrides,
  }
}

describe('MealSlot', () => {
  it('shows the meal type label when the slot is empty', () => {
    render(<MealSlot mealType="BREAKFAST" plannedMeals={[]} />)
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.queryByTestId('meal-slot')?.textContent).toContain(
      'Breakfast'
    )
  })

  it('shows a label for each meal type', () => {
    const { rerender } = render(<MealSlot mealType="LUNCH" plannedMeals={[]} />)
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    rerender(<MealSlot mealType="DINNER" plannedMeals={[]} />)
    expect(screen.getByText('Dinner')).toBeInTheDocument()
  })

  it('renders the assigned recipe title when data exists', () => {
    render(<MealSlot mealType="BREAKFAST" plannedMeals={[makeMeal()]} />)
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
  })

  it('renders notes-only rows (recipe null)', () => {
    render(
      <MealSlot
        mealType="DINNER"
        plannedMeals={[
          makeMeal({
            id: 'pm2',
            recipeId: null,
            recipe: null,
            servingsPlanned: 0,
            notes: 'Order takeout',
          }),
        ]}
      />
    )
    expect(screen.getByText('Order takeout')).toBeInTheDocument()
  })

  it('renders both recipe title and notes on a recipe-backed row', () => {
    render(
      <MealSlot
        mealType="LUNCH"
        plannedMeals={[makeMeal({ notes: 'Double batch' })]}
      />
    )
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
    expect(screen.getByText('Double batch')).toBeInTheDocument()
  })

  it('renders every row when a slot has multiple recipes', () => {
    render(
      <MealSlot
        mealType="DINNER"
        plannedMeals={[
          makeMeal(),
          makeMeal({
            id: 'pm2',
            recipeId: 'r2',
            recipe: {
              id: 'r2',
              title: 'Soup',
              prepTimeMinutes: null,
              cookTimeMinutes: null,
              difficultyLevel: 'EASY',
            },
          }),
        ]}
      />
    )
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
    expect(screen.getByText('Soup')).toBeInTheDocument()
  })

  it('renders with no plannedMeals prop (undefined)', () => {
    render(<MealSlot mealType="LUNCH" />)
    expect(screen.getByText('Lunch')).toBeInTheDocument()
  })
})
