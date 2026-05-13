import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MealCategory, DifficultyLevel } from '@prisma/client';

// WR-07: split RecipeListItem (list responses) vs RecipeDetail (detail
// responses). The previous `Recipe.images?` made the optionality invisible
// to callers — list responses never include `images`, detail responses
// always include it. Discriminating them in the type system prevents a
// caller from writing `recipes.recipes[0].images!.length` (runtime crash).
//
// `Recipe` remains exported as the discriminated union so legacy callers
// keep compiling; new code should prefer the specific variants.

interface RecipeBase {
  id: string;
  title: string;
  description?: string;
  cuisineType?: string;
  mealCategory: MealCategory;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings: number;
  difficultyLevel: DifficultyLevel;
  instructions: string[];
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  personalRating?: number;
  tags: string[];
  nutritionalInfo?: any;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients: Array<{
    id: string;
    quantity: number;
    unit: string;
    preparationNote?: string;
    isOptional: boolean;
    ingredient: {
      id: string;
      name: string;
      category: string;
    };
  }>;
}

export interface RecipeImageMeta {
  id: string;
  order: number;
  fileName: string;
  mimeType: string;
}

export interface RecipeListItem extends RecipeBase {
  /** Order=0 image id, or null when no images attached. List responses
   *  intentionally omit the full images array to keep payloads small. */
  primaryImageId: string | null;
  // No `images` key — see GET /api/recipes serializer.
}

export interface RecipeDetail extends RecipeBase {
  /** Full image metadata list, sorted by `order` ascending. Detail responses
   *  always include this (may be empty). Bytes are never included. */
  images: RecipeImageMeta[];
}

/** Discriminated union for callers that may receive either shape. */
export type Recipe = RecipeListItem | RecipeDetail;

export interface RecipeInput {
  title: string;
  description?: string;
  cuisineType?: string;
  mealCategory: MealCategory;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings: number;
  difficultyLevel: DifficultyLevel;
  instructions: string[];
  source?: string;
  sourceUrl?: string;
  personalRating?: number;
  tags: string[];
  nutritionalInfo?: any;
  isDraft?: boolean;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    preparationNote?: string;
    isOptional?: boolean;
  }>;
}

export interface RecipeSearchParams {
  q?: string;
  cuisine?: string;
  category?: MealCategory;
  difficulty?: DifficultyLevel;
  tags?: string[];
  isDraft?: boolean;
  page?: number;
  limit?: number;
}

const API_BASE = '/api/recipes';

// Query keys
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (params: RecipeSearchParams) => [...recipeKeys.lists(), params] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  image: (id: string) => [...recipeKeys.all, 'image', id] as const,
};

// Fetch functions. WR-07: list returns RecipeListItem[], detail / create /
// update return RecipeDetail. This makes the API contract visible at the
// type level — list responses have `primaryImageId` (no `images`), detail/
// mutation responses have `images` (no `primaryImageId`).
async function fetchRecipes(params: RecipeSearchParams = {}): Promise<{
  recipes: RecipeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        searchParams.set(key, value.join(','));
      } else {
        searchParams.set(key, value.toString());
      }
    }
  });

  const response = await fetch(`${API_BASE}?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recipes');
  }

  return response.json();
}

async function fetchRecipe(id: string): Promise<RecipeDetail> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recipe');
  }

  return response.json();
}

async function createRecipe(data: RecipeInput): Promise<RecipeDetail> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create recipe');
  }

  return response.json();
}

async function updateRecipe(id: string, data: Partial<RecipeInput>): Promise<RecipeDetail> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update recipe');
  }

  return response.json();
}

async function deleteRecipe(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete recipe');
  }
}

async function uploadRecipeImage(id: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/${id}/image`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }
}

async function deleteRecipeImage(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}/image`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete image');
  }
}

// Hooks
export function useRecipes(params: RecipeSearchParams = {}) {
  return useQuery({
    queryKey: recipeKeys.list(params),
    queryFn: () => fetchRecipes(params),
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => fetchRecipe(id),
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecipeInput> }) =>
      updateRecipe(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

// WR-03: legacy single-image hooks. Renamed from useUploadRecipeImage /
// useDeleteRecipeImage to avoid an auto-import collision with the Phase 2
// multi-image hooks in recipe-image-queries.ts. The new module's hooks
// (useUploadRecipeImages / useDeleteRecipeImage there) have incompatible
// call signatures, so the collision was a foot-gun — VSCode would happily
// pick either based on alphabetical order.
export function useUploadLegacyRecipeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadRecipeImage(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.image(id) });
    },
  });
}

export function useDeleteLegacyRecipeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRecipeImage,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.image(id) });
    },
  });
}