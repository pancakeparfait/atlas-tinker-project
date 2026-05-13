import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageGallery } from '../image-gallery';

// Per TESTING.md Mocking — replace next/image with plain img so test asserts work.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

const images = [
  { id: 'A', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
  { id: 'B', order: 1, fileName: 'b.jpg', mimeType: 'image/jpeg' },
  { id: 'C', order: 2, fileName: 'c.jpg', mimeType: 'image/jpeg' },
];

// Hero <img> is the one whose alt starts with "Recipe photo". Thumbnails carry alt="".
function getHero(): HTMLElement {
  const heroes = screen
    .getAllByRole('img')
    .filter((el) => el.getAttribute('alt')?.startsWith('Recipe photo'));
  if (heroes.length !== 1) {
    throw new Error(`Expected exactly one hero <img>, found ${heroes.length}`);
  }
  return heroes[0];
}

describe('ImageGallery', () => {
  describe('A — empty state', () => {
    it('shows "No photos yet" heading and the empty-state body copy when images is []', () => {
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={[]} />);

      expect(screen.getByText('No photos yet')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Add photos to help others follow along with ingredients, process, and the finished dish.'
        )
      ).toBeInTheDocument();

      // No api-images img is rendered in the empty state.
      const apiImages = screen
        .queryAllByRole('img')
        .filter((el) => el.getAttribute('src')?.includes('/api/recipes/'));
      expect(apiImages).toHaveLength(0);
    });
  });

  describe('B — hero default', () => {
    it('renders the order=0 image as the hero with alt "Recipe photo 1 of 3"', () => {
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={images} />);

      const hero = getHero();
      expect(hero.getAttribute('src')).toBe('/api/recipes/r1/images/A');
      expect(hero.getAttribute('alt')).toBe('Recipe photo 1 of 3');
    });
  });

  describe('C — thumbnail click swaps the hero', () => {
    it('clicking the second thumbnail updates the hero src and alt', async () => {
      const user = userEvent.setup();
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={images} />);

      const secondThumb = screen.getByRole('button', { name: 'Show photo 2 of 3' });
      await user.click(secondThumb);

      const hero = getHero();
      expect(hero.getAttribute('src')).toBe('/api/recipes/r1/images/B');
      expect(hero.getAttribute('alt')).toBe('Recipe photo 2 of 3');
    });
  });

  describe('D — active thumbnail ring', () => {
    it('only the active thumbnail has ring-2 ring-primary classes', async () => {
      const user = userEvent.setup();
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={images} />);

      const first = screen.getByRole('button', { name: 'Show photo 1 of 3' });
      const second = screen.getByRole('button', { name: 'Show photo 2 of 3' });
      const third = screen.getByRole('button', { name: 'Show photo 3 of 3' });

      // Initially the first thumb is active.
      expect(first).toHaveClass('ring-2', 'ring-primary');
      expect(second).not.toHaveClass('ring-2');
      expect(third).not.toHaveClass('ring-2');

      // After clicking the second, only it has the active ring.
      await user.click(second);
      expect(second).toHaveClass('ring-2', 'ring-primary');
      expect(first).not.toHaveClass('ring-2');
      expect(third).not.toHaveClass('ring-2');
    });
  });

  describe('E — primary badge', () => {
    it('renders exactly one "Primary" badge, on the first thumbnail', () => {
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={images} />);

      const badges = screen.getAllByText('Primary');
      expect(badges).toHaveLength(1);

      const firstThumb = screen.getByRole('button', { name: 'Show photo 1 of 3' });
      expect(firstThumb).toContainElement(badges[0]);
    });
  });

  describe('F — keyboard focusability + aria-labels', () => {
    it('each thumbnail is a button with aria-label "Show photo N of M"', () => {
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={images} />);

      const thumbs = screen.getAllByRole('button', { name: /^Show photo \d+ of \d+$/ });
      expect(thumbs).toHaveLength(3);
      expect(thumbs[0]).toHaveAttribute('aria-label', 'Show photo 1 of 3');
      expect(thumbs[1]).toHaveAttribute('aria-label', 'Show photo 2 of 3');
      expect(thumbs[2]).toHaveAttribute('aria-label', 'Show photo 3 of 3');
    });
  });

  describe('Defensive sort', () => {
    it('renders the order=0 image as hero even when input array is out of order', () => {
      const shuffled = [images[2], images[0], images[1]]; // C, A, B
      render(<ImageGallery recipeId="r1" recipeTitle="Recipe" images={shuffled} />);

      const hero = getHero();
      expect(hero.getAttribute('src')).toBe('/api/recipes/r1/images/A');
      expect(hero.getAttribute('alt')).toBe('Recipe photo 1 of 3');
    });
  });
});
