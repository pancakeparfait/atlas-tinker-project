import React from 'react';
import { render, screen } from '@testing-library/react';
import { SortableThumbnailStrip } from '../sortable-thumbnail-strip';
import {
  useDeleteRecipeImage,
  useReorderRecipeImages,
} from '@/lib/queries/recipe-image-queries';

// Mock next/image so width/height props don't trigger Next runtime
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

jest.mock('@/lib/queries/recipe-image-queries', () => ({
  useDeleteRecipeImage: jest.fn(),
  useReorderRecipeImages: jest.fn(),
}));

// Capture the onDragEnd handler so we can invoke it directly without simulating
// pointer/keyboard sensor events. The captured callback also lets us assert the
// reorder mutation argument shape (UI-SPEC + plan Test D).
jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: any) => {
      (window as any).__dnd_onDragEnd__ = onDragEnd;
      return <div data-testid="dnd-root">{children}</div>;
    },
  };
});

afterEach(() => {
  delete (window as any).__dnd_onDragEnd__;
});

const mockImages = [
  { id: 'A', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
  { id: 'B', order: 1, fileName: 'b.jpg', mimeType: 'image/jpeg' },
  { id: 'C', order: 2, fileName: 'c.jpg', mimeType: 'image/jpeg' },
];

describe('SortableThumbnailStrip', () => {
  const deleteMutate = jest.fn();
  const reorderMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDeleteRecipeImage as jest.Mock).mockReturnValue({
      mutate: deleteMutate,
      mutateAsync: jest.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
    (useReorderRecipeImages as jest.Mock).mockReturnValue({
      mutate: reorderMutate,
      mutateAsync: jest.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    });
  });

  it('A — renders one drag handle and one delete button per image', () => {
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    expect(screen.getAllByRole('button', { name: /drag to reorder photos/i })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /remove photo/i })).toHaveLength(3);
  });

  it('B — only the order=0 thumbnail shows the Primary badge', () => {
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    const primary = screen.getAllByText('Primary');
    expect(primary).toHaveLength(1);
  });

  it('C — delete confirm flow: confirms then calls deleteMutation with imageId', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    const deleteButtons = screen.getAllByRole('button', { name: /remove photo/i });

    deleteButtons[1].click(); // delete the second thumbnail (id 'B')

    expect(confirmSpy).toHaveBeenCalledWith('Remove this photo from the recipe?');
    expect(deleteMutate).toHaveBeenCalledWith({ recipeId: 'r1', imageId: 'B' });
    confirmSpy.mockRestore();
  });

  it('C2 — canceled confirm does NOT call the delete mutation', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    const deleteButtons = screen.getAllByRole('button', { name: /remove photo/i });

    deleteButtons[0].click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutate).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('D — onDragEnd reorders ids and calls reorder mutation with the new order', () => {
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    // Simulate: move 'C' (index 2) onto 'A' (index 0) → expected order [C, A, B]
    const onDragEnd = (window as any).__dnd_onDragEnd__;
    expect(typeof onDragEnd).toBe('function');
    onDragEnd({ active: { id: 'C' }, over: { id: 'A' } });

    expect(reorderMutate).toHaveBeenCalledWith({
      recipeId: 'r1',
      orderedIds: ['C', 'A', 'B'],
    });
  });

  it('D2 — onDragEnd with same active/over id does NOT call reorder', () => {
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    const onDragEnd = (window as any).__dnd_onDragEnd__;
    onDragEnd({ active: { id: 'A' }, over: { id: 'A' } });
    expect(reorderMutate).not.toHaveBeenCalled();
  });

  it('E — aria labels on drag handle and delete button match UI-SPEC copy', () => {
    render(<SortableThumbnailStrip recipeId="r1" images={mockImages} />);
    expect(screen.getAllByLabelText('Drag to reorder photos').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Remove photo').length).toBeGreaterThan(0);
  });
});
