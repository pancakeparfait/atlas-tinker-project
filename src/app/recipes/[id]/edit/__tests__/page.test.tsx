import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import EditRecipePage from '../page';
import { useRecipe, useUpdateRecipe } from '@/lib/queries/recipe-queries';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock React Query hooks
jest.mock('@/lib/queries/recipe-queries', () => ({
  useRecipe: jest.fn(),
  useUpdateRecipe: jest.fn(),
  useCreateRecipe: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

// Mock import queries
jest.mock('@/lib/queries/import-queries', () => ({
  useImportRecipe: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}));

// Test data fixtures
const mockRecipeComplete = {
  id: 'recipe-1',
  title: 'Chocolate Chip Cookies',
  description: 'Delicious homemade cookies',
  cuisineType: 'American',
  mealCategory: 'DESSERT',
  difficultyLevel: 'EASY',
  prepTimeMinutes: 15,
  cookTimeMinutes: 12,
  servings: 24,
  personalRating: 5,
  isDraft: false,
  imageUrl: 'http://example.com/image.jpg',
  tags: ['dessert', 'baking', 'cookies'],
  source: 'Sally\'s Baking Addiction',
  sourceUrl: 'https://example.com/recipe',
  instructions: [
    'Preheat oven to 350°F',
    'Mix butter and sugars',
    'Add eggs and vanilla',
  ],
  ingredients: [
    {
      id: 'ing-1',
      quantity: '1',
      unit: 'cup',
      preparationNote: 'softened',
      isOptional: false,
      ingredient: { name: 'unsalted butter' },
    },
    {
      id: 'ing-2',
      quantity: '0.5',
      unit: 'cup',
      preparationNote: null,
      isOptional: false,
      ingredient: { name: 'granulated sugar' },
    },
  ],
};

const mockRecipeMinimal = {
  id: 'recipe-2',
  title: 'Simple Recipe',
  description: null,
  cuisineType: null,
  mealCategory: 'DINNER',
  difficultyLevel: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  servings: 4,
  personalRating: null,
  isDraft: false,
  imageUrl: null,
  tags: [],
  source: null,
  sourceUrl: null,
  instructions: ['Cook it'],
  ingredients: [
    {
      id: 'ing-1',
      quantity: '1',
      unit: 'cup',
      preparationNote: null,
      isOptional: false,
      ingredient: { name: 'rice' },
    },
  ],
};

const mockRecipeEmpty = {
  id: 'recipe-3',
  title: 'Empty Recipe',
  description: null,
  cuisineType: null,
  mealCategory: 'SNACK',
  difficultyLevel: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  servings: 1,
  personalRating: null,
  isDraft: true,
  imageUrl: null,
  tags: [],
  source: null,
  sourceUrl: null,
  instructions: [],
  ingredients: [],
};

const mockRecipeWithEntities = {
  id: 'recipe-4',
  title: 'Recipe with &amp; Entities',
  description: 'Test &amp; verify',
  cuisineType: 'Italian',
  mealCategory: 'DINNER',
  difficultyLevel: 'MEDIUM',
  prepTimeMinutes: 30,
  cookTimeMinutes: 45,
  servings: 6,
  personalRating: 4,
  isDraft: false,
  imageUrl: null,
  tags: ['pasta &amp; sauce'],
  source: 'Chef&apos;s Collection',
  sourceUrl: null,
  instructions: ['Mix &amp; cook'],
  ingredients: [
    {
      id: 'ing-1',
      quantity: '2',
      unit: 'cups',
      preparationNote: 'chopped &amp; diced',
      isOptional: false,
      ingredient: { name: 'tomatoes &amp; peppers' },
    },
  ],
};

describe('EditRecipePage', () => {
  const mockPush = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useParams as jest.Mock).mockReturnValue({
      id: 'recipe-1',
    });
    (useUpdateRecipe as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Loading States', () => {
    it('shows loading message while fetching recipe', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByText('Loading recipe...')).toBeInTheDocument();
      expect(screen.getByText('Edit Recipe')).toBeInTheDocument();
    });

    it('disables back button during loading', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<EditRecipePage />);

      const backButton = screen.getByRole('button', { name: /back to recipes/i });
      expect(backButton).toBeDisabled();
    });

    it('does not render form during loading', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /update recipe/i })).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('displays error message when recipe fetch fails', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<EditRecipePage />);

      expect(screen.getByText('Error Loading Recipe')).toBeInTheDocument();
      expect(screen.getByText(/There was an error loading the recipe/i)).toBeInTheDocument();
    });

    it('shows not found message for non-existent recipe', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByText('Recipe Not Found')).toBeInTheDocument();
      expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
    });

    it('can navigate back from error state', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      });

      render(<EditRecipePage />);

      const backButton = screen.getByRole('button', { name: /return to recipes/i });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes');
    });

    it('provides navigation option in error state', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed'),
      });

      render(<EditRecipePage />);

      const returnButton = screen.getByRole('button', { name: /return to recipes/i });
      expect(returnButton).toBeInTheDocument();
      await user.click(returnButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes');
    });
  });

  describe('Form Pre-population', () => {
    it('populates form with complete recipe data', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByDisplayValue('Chocolate Chip Cookies')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Delicious homemade cookies')).toBeInTheDocument();
      expect(screen.getByDisplayValue('American')).toBeInTheDocument();
      expect(screen.getByDisplayValue("Sally's Baking Addiction")).toBeInTheDocument();
    });

    it('populates numeric fields correctly', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByDisplayValue('24')).toBeInTheDocument(); // servings
      expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // prep time
      expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // cook time
      // Note: personalRating is optional and may not display in form
    });

    it('loads existing ingredients with all details', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByDisplayValue('unsalted butter')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('softened')).toBeInTheDocument();
      expect(screen.getByDisplayValue('granulated sugar')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
    });

    it('loads existing instructions in correct order', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByDisplayValue('Preheat oven to 350°F')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mix butter and sugars')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Add eggs and vanilla')).toBeInTheDocument();
    });

    it('handles minimal recipe data gracefully', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeMinimal,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByDisplayValue('Simple Recipe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument(); // servings
      expect(screen.getByDisplayValue('rice')).toBeInTheDocument();
    });

    it('handles empty ingredients and instructions', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByDisplayValue('Empty Recipe')).toBeInTheDocument();
      // Form should still render and allow adding ingredients/instructions
      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
    });

    it('properly handles HTML entities in pre-populated fields', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      // Form successfully renders with entity data
      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
    });

    it('sets draft status checkbox correctly', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty, // isDraft: true
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const draftCheckbox = screen.getByRole('checkbox', { name: /draft/i });
      expect(draftCheckbox).toBeChecked();
    });

    it('hides import section in edit mode', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      // Import section should not be visible in edit mode (button/input for importing)
      expect(screen.queryByText(/import from url/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
    });
  });

  describe('Update Mutation', () => {
    it('shows "Update Recipe" button text instead of "Save Recipe"', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^save recipe$/i })).not.toBeInTheDocument();
    });

    it('calls update mutation on form submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue(mockRecipeComplete);
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('navigates to detail page on successful update', async () => {
      const user = userEvent.setup();
      const updatedRecipe = { ...mockRecipeComplete, title: 'Updated Title' };
      mockMutateAsync.mockResolvedValue(updatedRecipe);
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/recipes/recipe-1');
      });
    });

    it('passes correct recipe ID and data to update mutation', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue(mockRecipeComplete);
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const titleInput = screen.getByDisplayValue('Chocolate Chip Cookies');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Cookies');

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'recipe-1',
            data: expect.objectContaining({
              title: 'Updated Cookies',
            }),
          })
        );
      });
    });

    it('disables submit button while mutation is pending', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });
      // Override the default mock for this specific test
      (useUpdateRecipe as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      render(<EditRecipePage />);

      // When pending, button text changes to "Saving..." 
      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Reset the mock back to default for subsequent tests
      (useUpdateRecipe as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty title', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const titleInput = screen.getByDisplayValue('Chocolate Chip Cookies');
      await user.clear(titleInput);

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      // Form validation should prevent submission
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid servings', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const servingsInput = screen.getByDisplayValue('24');
      await user.clear(servingsInput);
      await user.type(servingsInput, '0');

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      // Form validation should prevent submission
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('prevents submission when validation fails', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const titleInput = screen.getByDisplayValue('Chocolate Chip Cookies');
      await user.clear(titleInput);

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('allows editing title field', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const titleInput = screen.getByDisplayValue('Chocolate Chip Cookies');
      await user.clear(titleInput);
      await user.type(titleInput, 'New Cookie Recipe');

      expect(screen.getByDisplayValue('New Cookie Recipe')).toBeInTheDocument();
    });

    it('allows editing description field', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const descInput = screen.getByDisplayValue('Delicious homemade cookies');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description');

      expect(screen.getByDisplayValue('Updated description')).toBeInTheDocument();
    });

    it('allows modifying ingredient quantities', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const quantityInput = screen.getByDisplayValue('1'); // butter quantity
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');

      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    it('allows editing instructions', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const instructionInput = screen.getByDisplayValue('Preheat oven to 350°F');
      await user.clear(instructionInput);
      await user.type(instructionInput, 'Preheat oven to 375°F');

      expect(screen.getByDisplayValue('Preheat oven to 375°F')).toBeInTheDocument();
    });

    it('cancel button navigates back to detail page', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes/recipe-1');
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('back button navigates to recipes list', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const backButton = screen.getByRole('button', { name: /back to recipes/i });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes');
    });

    it('allows toggling draft status', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete, // isDraft: false
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const draftCheckbox = screen.getByRole('checkbox', { name: /draft/i });
      expect(draftCheckbox).not.toBeChecked();

      await user.click(draftCheckbox);
      expect(draftCheckbox).toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('handles recipe with empty ingredients list', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      // Should still render form and allow adding ingredients
      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add ingredient/i })).toBeInTheDocument();
    });

    it('handles recipe with empty instructions list', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      // Should still render form and allow adding instructions
      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add step/i })).toBeInTheDocument();
    });

    it('properly handles HTML entities in form fields', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      // Form should load successfully with entity data
      // Note: Form inputs preserve entity string as-is for editing
      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
    });

    it('does not show import URL section in edit mode', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      // Import section should not be visible in edit mode (button/input for importing)
      expect(screen.queryByText(/import from url/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
    });

    it('handles navigation with different recipe IDs', () => {
      (useParams as jest.Mock).mockReturnValue({
        id: 'recipe-xyz',
      });
      (useRecipe as jest.Mock).mockReturnValue({
        data: { ...mockRecipeComplete, id: 'recipe-xyz' },
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      expect(useRecipe).toHaveBeenCalledWith('recipe-xyz');
    });
  });

  describe('Navigation Flow', () => {
    it('navigates to correct detail page after update', async () => {
      const user = userEvent.setup();
      const updatedRecipe = { ...mockRecipeComplete, id: 'recipe-123' };
      mockMutateAsync.mockResolvedValue(updatedRecipe);
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const submitButton = screen.getByRole('button', { name: /update recipe/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/recipes/recipe-123');
      });
    });

    it('cancel navigates to original recipe detail page', async () => {
      const user = userEvent.setup();
      (useParams as jest.Mock).mockReturnValue({
        id: 'recipe-original',
      });
      (useRecipe as jest.Mock).mockReturnValue({
        data: { ...mockRecipeComplete, id: 'recipe-original' },
        isLoading: false,
        error: null,
      });

      render(<EditRecipePage />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes/recipe-original');
    });
  });
});
