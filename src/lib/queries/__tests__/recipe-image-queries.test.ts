/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  recipeImageKeys,
  useRecipeImages,
  useUploadRecipeImages,
  useDeleteRecipeImage,
  useReorderRecipeImages,
} from '../recipe-image-queries';
import { recipeKeys } from '../recipe-queries';

// ---------- fetch mock ----------
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  // Default OK response — individual tests may override
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ images: [] }),
  });
  (global as any).fetch = fetchMock;
});

// ---------- harness ----------
function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

function freshClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

describe('recipe-image-queries', () => {
  describe('Test A — useRecipeImages: query URL is GET /api/recipes/:id/images', () => {
    it('fetches images for the recipeId and returns { images }', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [
            { id: 'i1', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
          ],
        }),
      });

      const qc = freshClient();
      const { result } = renderHook(() => useRecipeImages('r1'), {
        wrapper: makeWrapper(qc),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // URL is exactly /api/recipes/r1/images, default GET (no init or method='GET')
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/recipes/r1/images');
      if (init !== undefined) {
        // If init is provided, method must be GET or absent
        expect(['GET', undefined]).toContain(init.method);
      }

      expect(result.current.data).toEqual({
        images: [
          { id: 'i1', order: 0, fileName: 'a.jpg', mimeType: 'image/jpeg' },
        ],
      });
    });
  });

  describe('Test B — useUploadRecipeImages: POST FormData with N `images` parts', () => {
    it('builds FormData with one `images` entry per file and POSTs to /api/recipes/:id/images', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imageIds: ['x', 'y'], failed: [] }),
      });

      const qc = freshClient();
      const { result } = renderHook(() => useUploadRecipeImages(), {
        wrapper: makeWrapper(qc),
      });

      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const fileB = new File(['b'], 'b.png', { type: 'image/png' });

      await act(async () => {
        await result.current.mutateAsync({
          recipeId: 'r1',
          files: [fileA, fileB],
        });
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/recipes/r1/images');
      expect(init.method).toBe('POST');
      // FormData body — must not set Content-Type (fetch sets multipart boundary)
      expect(init.headers).toBeUndefined();
      const body = init.body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect(body.getAll('images').length).toBe(2);
    });
  });

  describe('Test C — useDeleteRecipeImage: DELETE /api/recipes/:id/images/:imageId', () => {
    it('calls fetch with the binary URL and DELETE method', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const qc = freshClient();
      const { result } = renderHook(() => useDeleteRecipeImage(), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({
          recipeId: 'r1',
          imageId: 'i9',
        });
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/recipes/r1/images/i9');
      expect(init.method).toBe('DELETE');
    });
  });

  describe('Test D — useReorderRecipeImages: PATCH /reorder with JSON body', () => {
    it('calls fetch with PATCH + application/json + { orderedIds }', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const qc = freshClient();
      const { result } = renderHook(() => useReorderRecipeImages(), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({
          recipeId: 'r1',
          orderedIds: ['a', 'b'],
        });
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/recipes/r1/images/reorder');
      expect(init.method).toBe('PATCH');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(init.body).toBe(JSON.stringify({ orderedIds: ['a', 'b'] }));
    });
  });

  describe('Test E — cache invalidation: each mutation invalidates three keys', () => {
    it('upload onSuccess invalidates recipeImageKeys.all + recipeKeys.detail + recipeKeys.lists', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imageIds: ['x'], failed: [] }),
      });

      const qc = freshClient();
      const spy = jest.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useUploadRecipeImages(), {
        wrapper: makeWrapper(qc),
      });

      const file = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      await act(async () => {
        await result.current.mutateAsync({ recipeId: 'r1', files: [file] });
      });

      await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));

      const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
      expect(calls).toContainEqual(recipeImageKeys.all('r1'));
      expect(calls).toContainEqual(recipeKeys.detail('r1'));
      expect(calls).toContainEqual(recipeKeys.lists());
    });

    it('delete onSuccess invalidates recipeImageKeys.all + recipeKeys.detail + recipeKeys.lists', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const qc = freshClient();
      const spy = jest.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteRecipeImage(), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({ recipeId: 'r1', imageId: 'i9' });
      });

      await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));

      const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
      expect(calls).toContainEqual(recipeImageKeys.all('r1'));
      expect(calls).toContainEqual(recipeKeys.detail('r1'));
      expect(calls).toContainEqual(recipeKeys.lists());
    });

    it('reorder onSuccess invalidates recipeImageKeys.all + recipeKeys.detail + recipeKeys.lists', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const qc = freshClient();
      const spy = jest.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useReorderRecipeImages(), {
        wrapper: makeWrapper(qc),
      });

      await act(async () => {
        await result.current.mutateAsync({
          recipeId: 'r1',
          orderedIds: ['a', 'b'],
        });
      });

      await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));

      const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
      expect(calls).toContainEqual(recipeImageKeys.all('r1'));
      expect(calls).toContainEqual(recipeKeys.detail('r1'));
      expect(calls).toContainEqual(recipeKeys.lists());
    });
  });

  describe('Test F — non-OK response rejects mutations with verb-specific error', () => {
    it('upload rejects with "Failed to upload images" on 500', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

      const qc = freshClient();
      const { result } = renderHook(() => useUploadRecipeImages(), {
        wrapper: makeWrapper(qc),
      });

      const file = new File(['a'], 'a.jpg', { type: 'image/jpeg' });

      await expect(
        result.current.mutateAsync({ recipeId: 'r1', files: [file] })
      ).rejects.toThrow(/Failed to upload images/);
    });

    it('delete rejects with "Failed to delete image" on 500', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

      const qc = freshClient();
      const { result } = renderHook(() => useDeleteRecipeImage(), {
        wrapper: makeWrapper(qc),
      });

      await expect(
        result.current.mutateAsync({ recipeId: 'r1', imageId: 'i9' })
      ).rejects.toThrow(/Failed to delete image/);
    });

    it('reorder rejects with "Failed to reorder images" on 500', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

      const qc = freshClient();
      const { result } = renderHook(() => useReorderRecipeImages(), {
        wrapper: makeWrapper(qc),
      });

      await expect(
        result.current.mutateAsync({ recipeId: 'r1', orderedIds: ['a'] })
      ).rejects.toThrow(/Failed to reorder images/);
    });
  });

  describe('key factory', () => {
    it('recipeImageKeys.all returns ["recipes","images",recipeId] tuple', () => {
      expect(recipeImageKeys.all('r1')).toEqual(['recipes', 'images', 'r1']);
    });
  });
});
