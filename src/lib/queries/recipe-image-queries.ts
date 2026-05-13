import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipeKeys } from './recipe-queries';

export interface RecipeImageMetadata {
  id: string;
  order: number;
  fileName: string;
  mimeType: string;
}

// Query keys
export const recipeImageKeys = {
  all: (recipeId: string) => ['recipes', 'images', recipeId] as const,
};

const API_BASE = '/api/recipes';

// Fetch functions
async function fetchRecipeImages(
  recipeId: string
): Promise<{ images: RecipeImageMetadata[] }> {
  const response = await fetch(`${API_BASE}/${recipeId}/images`);
  if (!response.ok) {
    throw new Error('Failed to fetch images');
  }
  return response.json();
}

async function uploadRecipeImages(
  recipeId: string,
  files: File[]
): Promise<{
  imageIds: string[];
  failed: Array<{ fileName: string; error: string }>;
}> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  // Do NOT set Content-Type — fetch sets the multipart boundary automatically.
  const response = await fetch(`${API_BASE}/${recipeId}/images`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload images');
  }

  return response.json();
}

async function deleteRecipeImage(
  recipeId: string,
  imageId: string
): Promise<{ ok: true }> {
  const response = await fetch(
    `${API_BASE}/${recipeId}/images/${imageId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete image');
  }

  return { ok: true };
}

async function reorderRecipeImages(
  recipeId: string,
  orderedIds: string[]
): Promise<{ ok: true }> {
  const response = await fetch(
    `${API_BASE}/${recipeId}/images/reorder`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to reorder images');
  }

  return { ok: true };
}

// Hooks
export function useRecipeImages(recipeId: string) {
  return useQuery({
    queryKey: recipeImageKeys.all(recipeId),
    queryFn: () => fetchRecipeImages(recipeId),
    enabled: !!recipeId,
  });
}

export function useUploadRecipeImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      files,
    }: {
      recipeId: string;
      files: File[];
    }) => uploadRecipeImages(recipeId, files),
    onSuccess: (_, { recipeId }) => {
      // prettier-ignore
      queryClient.invalidateQueries({ queryKey: recipeImageKeys.all(recipeId) });
      // prettier-ignore
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useDeleteRecipeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      imageId,
    }: {
      recipeId: string;
      imageId: string;
    }) => deleteRecipeImage(recipeId, imageId),
    onSuccess: (_, { recipeId }) => {
      // prettier-ignore
      queryClient.invalidateQueries({ queryKey: recipeImageKeys.all(recipeId) });
      // prettier-ignore
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useReorderRecipeImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recipeId,
      orderedIds,
    }: {
      recipeId: string;
      orderedIds: string[];
    }) => reorderRecipeImages(recipeId, orderedIds),
    onSuccess: (_, { recipeId }) => {
      // prettier-ignore
      queryClient.invalidateQueries({ queryKey: recipeImageKeys.all(recipeId) });
      // prettier-ignore
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}
