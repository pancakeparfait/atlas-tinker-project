import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import RecipeDetailPage from '../page';
import { useRecipe, useDeleteRecipe } from '@/lib/queries/recipe-queries';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock React Query hooks
jest.mock('@/lib/queries/recipe-queries', () => ({
  useRecipe: jest.fn(),
  useDeleteRecipe: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock window.confirm
const mockConfirm = jest.fn();
global.confirm = mockConfirm;

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
    'Combine dry ingredients',
    'Fold in chocolate chips',
    'Bake for 12 minutes',
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
    {
      id: 'ing-3',
      quantity: '1',
      unit: 'cup',
      preparationNote: 'packed',
      isOptional: false,
      ingredient: { name: 'brown sugar' },
    },
    {
      id: 'ing-4',
      quantity: '1',
      unit: 'cup',
      preparationNote: null,
      isOptional: true,
      ingredient: { name: 'chocolate chips' },
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
  tags: ['pasta &amp; sauce', 'Italian&apos;s best'],
  source: 'Chef&apos;s Collection',
  sourceUrl: null,
  instructions: ['Mix &amp; cook', 'Serve&apos;s hot'],
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

describe('RecipeDetailPage', () => {
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
    (useDeleteRecipe as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton while fetching recipe', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('Loading recipe...')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders toolbar skeleton during loading', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(<RecipeDetailPage />);

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error States', () => {
    it('displays error message when recipe fetch fails', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('Error loading recipe')).toBeInTheDocument();
      expect(screen.getByText('Return to Recipes')).toBeInTheDocument();
    });

    it('shows 404 message for non-existent recipe', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    });

    it('can navigate back from error state', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      });

      render(<RecipeDetailPage />);

      const backButton = screen.getAllByRole('button', { name: /back to recipes/i })[0];
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes');
    });
  });

  describe('Data Display', () => {
    it('renders complete recipe with all fields', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      // Title and description
      expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument();
      expect(screen.getByText('Delicious homemade cookies')).toBeInTheDocument();

      // Rating stars (5 stars)
      const stars = screen.getAllByTestId(/star/i);
      expect(stars.length).toBeGreaterThanOrEqual(5);

      // Metadata
      expect(screen.getByText('24')).toBeInTheDocument(); // servings
      expect(screen.getByText(/^15 min$/i)).toBeInTheDocument(); // prep (exact match)
      const cookTimes = screen.getAllByText(/12 min/i);
      expect(cookTimes.length).toBeGreaterThan(0); // cook time appears in metadata
      expect(screen.getByText(/27 min/i)).toBeInTheDocument(); // total (15+12)
      expect(screen.getByText('Easy')).toBeInTheDocument(); // difficulty
      expect(screen.getByText('American')).toBeInTheDocument(); // cuisine
    });

    it('displays all ingredients with correct details', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      // Check ingredient list
      expect(screen.getByText(/1 cup unsalted butter/i)).toBeInTheDocument();
      expect(screen.getByText(/softened/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/2 cup granulated sugar/i)).toBeInTheDocument();
      expect(screen.getByText(/1 cup brown sugar/i)).toBeInTheDocument();
      expect(screen.getByText(/packed/i)).toBeInTheDocument();
      expect(screen.getByText(/1 cup chocolate chips/i)).toBeInTheDocument();
      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });

    it('displays ingredient quantities as fractions', () => {
      const mockRecipeWithFractions = {
        ...mockRecipeComplete,
        ingredients: [
          { id: 'ing-1', quantity: 0.5, unit: 'cup', ingredient: { name: 'sugar' }, preparationNote: null, isOptional: false },
          { id: 'ing-2', quantity: 2.75, unit: 'cups', ingredient: { name: 'flour' }, preparationNote: null, isOptional: false },
          { id: 'ing-3', quantity: 0.333, unit: 'tsp', ingredient: { name: 'salt' }, preparationNote: null, isOptional: false },
        ],
      };

      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithFractions,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/1\/2 cup sugar/i)).toBeInTheDocument();
      expect(screen.getByText(/2 3\/4 cups flour/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/3 tsp salt/i)).toBeInTheDocument();
    });

    it('displays instructions in correct order', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      mockRecipeComplete.instructions.forEach((instruction) => {
        expect(screen.getByText(instruction)).toBeInTheDocument();
      });

      // Verify numbered steps (1, 2, 3...)
      mockRecipeComplete.instructions.forEach((_, index) => {
        expect(screen.getByText(String(index + 1))).toBeInTheDocument();
      });
    });

    it('renders tags correctly', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('dessert')).toBeInTheDocument();
      expect(screen.getByText('baking')).toBeInTheDocument();
      expect(screen.getByText('cookies')).toBeInTheDocument();
    });

    it('shows source information with external link', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const sourceLink = screen.getByRole('link', { name: /Sally's Baking Addiction/i });
      expect(sourceLink).toBeInTheDocument();
      expect(sourceLink).toHaveAttribute('href', 'https://example.com/recipe');
      expect(sourceLink).toHaveAttribute('target', '_blank');
      expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays recipe image when present', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const image = screen.getByAltText('Chocolate Chip Cookies');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('/api/recipes/recipe-1/image'));
    });

    it('shows draft badge for draft recipes', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('Minimal Recipe Display', () => {
    it('handles recipe with minimal data gracefully', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeMinimal,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('Simple Recipe')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // servings
      expect(screen.queryByText(/prep/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/easy|medium|hard/i)).not.toBeInTheDocument();
    });

    it('hides image when no image is present', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeMinimal,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.queryByRole('img', { name: /simple recipe/i })).not.toBeInTheDocument();
    });

    it('hides tags section when no tags present', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeMinimal,
        isLoading: false,
        error: null,
      });

      const { container } = render(<RecipeDetailPage />);

      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('hides source section when no source present', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeMinimal,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.queryByText('Source')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty message when no ingredients', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('No ingredients listed')).toBeInTheDocument();
    });

    it('shows empty message when no instructions', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeEmpty,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText('No instructions provided')).toBeInTheDocument();
    });
  });

  describe('HTML Entity Decoding', () => {
    it('decodes HTML entities in title', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/Recipe with & Entities/i)).toBeInTheDocument();
    });

    it('decodes HTML entities in description', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/Test & verify/i)).toBeInTheDocument();
    });

    it('decodes HTML entities in ingredients', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/tomatoes & peppers/i)).toBeInTheDocument();
      expect(screen.getByText(/chopped & diced/i)).toBeInTheDocument();
    });

    it('decodes HTML entities in instructions', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/Mix & cook/i)).toBeInTheDocument();
      expect(screen.getByText(/Serve's hot/i)).toBeInTheDocument();
    });

    it('decodes HTML entities in tags', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/pasta & sauce/i)).toBeInTheDocument();
      expect(screen.getByText(/Italian's best/i)).toBeInTheDocument();
    });

    it('decodes HTML entities in source', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeWithEntities,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/Chef's Collection/i)).toBeInTheDocument();
    });
  });

  describe('Navigation & Actions', () => {
    it('back button navigates to recipes list', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const backButton = screen.getByRole('button', { name: /back to recipes/i });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes');
    });

    it('edit button navigates to edit page', async () => {
      const user = userEvent.setup();
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalledWith('/recipes/recipe-1/edit');
    });

    it('delete button shows confirmation before deletion', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false); // User cancels
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this recipe? This action cannot be undone.'
      );
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('successful delete redirects to recipes list', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true); // User confirms
      mockMutateAsync.mockResolvedValue({});
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('recipe-1');
        expect(mockPush).toHaveBeenCalledWith('/recipes');
      });
    });

    it('delete cancellation keeps user on page', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false); // User cancels
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument();
    });

    it('handles delete error gracefully', async () => {
      const user = userEvent.setup();
      const mockAlert = jest.fn();
      global.alert = mockAlert;
      mockConfirm.mockReturnValue(true);
      mockMutateAsync.mockRejectedValue(new Error('Delete failed'));
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to delete recipe. Please try again.');
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('disables delete button while deletion is pending', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });
      (useDeleteRecipe as jest.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      render(<RecipeDetailPage />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Time Formatting', () => {
    it('formats times under 60 minutes correctly', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/^15 min$/i)).toBeInTheDocument();
      const cookTimes = screen.getAllByText(/12 min/i);
      expect(cookTimes.length).toBeGreaterThan(0); // appears in both metadata and instructions
    });

    it('formats times over 60 minutes with hours', () => {
      const longRecipe = {
        ...mockRecipeComplete,
        prepTimeMinutes: 90,
        cookTimeMinutes: 135,
      };
      (useRecipe as jest.Mock).mockReturnValue({
        data: longRecipe,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/1h 30m/i)).toBeInTheDocument(); // 90 min
      expect(screen.getByText(/2h 15m/i)).toBeInTheDocument(); // 135 min
    });

    it('formats exact hours without minutes', () => {
      const exactHourRecipe = {
        ...mockRecipeComplete,
        prepTimeMinutes: 60,
        cookTimeMinutes: 120,
      };
      (useRecipe as jest.Mock).mockReturnValue({
        data: exactHourRecipe,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      expect(screen.getByText(/^1h$/)).toBeInTheDocument();
      expect(screen.getByText(/^2h$/)).toBeInTheDocument();
    });

    it('calculates and displays total time correctly', () => {
      (useRecipe as jest.Mock).mockReturnValue({
        data: mockRecipeComplete,
        isLoading: false,
        error: null,
      });

      render(<RecipeDetailPage />);

      // 15 + 12 = 27 minutes
      expect(screen.getByText(/27 min/i)).toBeInTheDocument();
    });
  });
});
