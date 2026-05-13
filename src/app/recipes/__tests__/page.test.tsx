import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipesPage from '../page';
import { useRecipes } from '@/lib/queries/recipe-queries';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

jest.mock('@/lib/queries/recipe-queries', () => ({
  useRecipes: jest.fn(),
}));

const baseRecipeFields = {
  description: undefined,
  cuisineType: undefined,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  servings: 4,
  difficultyLevel: 'EASY' as const,
  instructions: ['step 1'],
  source: undefined,
  sourceUrl: undefined,
  personalRating: undefined,
  tags: [],
  isDraft: false,
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  ingredients: [],
};

describe('RecipesPage primary thumbnail (IMG-07)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRecipes as jest.Mock).mockReturnValue({
      data: {
        recipes: [
          {
            id: 'r1',
            title: 'Tacos',
            mealCategory: 'DINNER',
            primaryImageId: 'img-1',
            ...baseRecipeFields,
          },
          {
            id: 'r2',
            title: 'Soup',
            mealCategory: 'DINNER',
            primaryImageId: null,
            ...baseRecipeFields,
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
      },
      isLoading: false,
      error: null,
    });
  });

  it('Test A: renders <img> with /api/recipes/r1/images/img-1 plus correct dimensions for a recipe with primaryImageId', () => {
    render(<RecipesPage />);

    const thumb = screen.getByAltText('Tacos') as HTMLImageElement;
    expect(thumb).toBeInTheDocument();
    expect(thumb.getAttribute('src')).toBe('/api/recipes/r1/images/img-1');
    expect(thumb.getAttribute('width')).toBe('160');
    expect(thumb.getAttribute('height')).toBe('120');
    expect(thumb.className).toContain('object-cover');
    expect(thumb.className).toContain('rounded-t-lg');
  });

  it('Test B: renders Utensils placeholder (no <img>) for a recipe without primaryImageId', () => {
    const { container } = render(<RecipesPage />);

    // No image element for the Soup recipe
    expect(screen.queryByAltText('Soup')).toBeNull();
    expect(
      container.querySelector('img[src^="/api/recipes/r2/images/"]')
    ).toBeNull();

    // Utensils placeholder is discoverable via its aria-label and SVG class
    expect(screen.getByLabelText('No photo for Soup')).toBeInTheDocument();
    expect(container.querySelector('.lucide-utensils')).not.toBeNull();
  });

  it('Test C: thumbnail alt text equals the recipe title', () => {
    render(<RecipesPage />);
    expect(screen.getByAltText('Tacos')).toBeInTheDocument();
  });
});
