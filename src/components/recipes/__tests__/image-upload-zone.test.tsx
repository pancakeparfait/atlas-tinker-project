import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageUploadZone } from '../image-upload-zone';
import { useUploadRecipeImages } from '@/lib/queries/recipe-image-queries';
import { IMAGE_CONFIG } from '@/lib/storage/storage-adapter';

jest.mock('@/lib/queries/recipe-image-queries', () => ({
  useUploadRecipeImages: jest.fn(),
}));

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['a'], name, { type });
  // Avoid allocating real bytes — override the size for client-side validation tests.
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
}

const validImage = (name = 'photo.jpg') =>
  makeFile(name, 'image/jpeg', 1024);

describe('ImageUploadZone', () => {
  const mutateAsync = jest.fn().mockResolvedValue({ imageIds: ['x'], failed: [] });

  beforeEach(() => {
    jest.clearAllMocks();
    (useUploadRecipeImages as jest.Mock).mockReturnValue({
      mutateAsync,
      isPending: false,
    });
  });

  it('A — idle copy shows browse instruction and configures hidden input correctly', () => {
    render(<ImageUploadZone recipeId="r1" />);
    expect(screen.getByText('Drag photos here, or click to browse')).toBeInTheDocument();

    const zone = screen.getByRole('button', { name: /upload recipe photos/i });
    expect(zone).toBeInTheDocument();

    const input = zone.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.multiple).toBe(true);
    expect(input.accept).toBe('image/jpeg,image/png,image/webp,image/gif');
  });

  it('B — dragover swaps to drop copy and applies primary border; dragleave reverts', () => {
    render(<ImageUploadZone recipeId="r1" />);
    const zone = screen.getByRole('button', { name: /upload recipe photos/i });

    fireEvent.dragOver(zone);
    expect(screen.getByText('Drop to add photos')).toBeInTheDocument();
    expect(zone.className).toMatch(/border-primary/);

    fireEvent.dragLeave(zone);
    expect(screen.getByText('Drag photos here, or click to browse')).toBeInTheDocument();
    expect(zone.className).not.toMatch(/border-primary/);
  });

  it('C — selecting two valid files via input triggers mutateAsync with both files', async () => {
    render(<ImageUploadZone recipeId="r1" />);
    const zone = screen.getByRole('button', { name: /upload recipe photos/i });
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement;

    const fileA = validImage('a.jpg');
    const fileB = validImage('b.jpg');
    fireEvent.change(input, { target: { files: [fileA, fileB] } });

    // mutateAsync is async; allow microtask to flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const call = mutateAsync.mock.calls[0][0];
    expect(call.recipeId).toBe('r1');
    expect(call.files).toEqual([fileA, fileB]);
  });

  it('D — oversized file is rejected client-side with the 10MB error; valid file still uploads', async () => {
    render(<ImageUploadZone recipeId="r1" />);
    const zone = screen.getByRole('button', { name: /upload recipe photos/i });
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement;

    const big = makeFile('huge.jpg', 'image/jpeg', IMAGE_CONFIG.maxSizeBytes + 1);
    const ok = validImage('ok.jpg');
    fireEvent.change(input, { target: { files: [big, ok] } });

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText('Photo must be under 10MB')).toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const call = mutateAsync.mock.calls[0][0];
    expect(call.files).toEqual([ok]); // big was filtered
  });

  it('E — wrong MIME type rejected with the JPEG/PNG/WebP/GIF error', async () => {
    render(<ImageUploadZone recipeId="r1" />);
    const zone = screen.getByRole('button', { name: /upload recipe photos/i });
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement;

    const txt = makeFile('notes.txt', 'text/plain', 100);
    fireEvent.change(input, { target: { files: [txt] } });

    await Promise.resolve();
    await Promise.resolve();

    expect(
      screen.getByText('Only JPEG, PNG, WebP, and GIF are supported')
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('F — uploading progress copy renders while mutation is pending', () => {
    (useUploadRecipeImages as jest.Mock).mockReturnValue({
      mutateAsync,
      isPending: true,
    });
    render(<ImageUploadZone recipeId="r1" />);
    expect(screen.getByText(/Uploading photo/i)).toBeInTheDocument();
  });

  it('G — Enter key on focused zone triggers file input click', () => {
    render(<ImageUploadZone recipeId="r1" />);
    const zone = screen.getByRole('button', { name: /upload recipe photos/i });
    const clickSpy = jest
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});

    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
