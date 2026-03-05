import { z } from 'zod';

export interface ImportedRecipe {
  title: string;
  description?: string;
  instructions: string[];
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
  }>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisineType?: string;
  imageUrl?: string;
}

export interface ImportStatus {
  field: string;
  success: boolean;
  confidence: 'high' | 'medium' | 'low';
  source: 'json-ld' | 'html-heuristic' | 'manual-required';
  value?: any;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  recipe?: ImportedRecipe;
  status: ImportStatus[];
  source: string;
  errors: string[];
}

const RecipeValidationSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.array(z.string()).min(1),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().optional(),
    unit: z.string().optional(),
  })).min(1),
  prepTimeMinutes: z.number().optional(),
  cookTimeMinutes: z.number().optional(),
  servings: z.number().optional(),
  cuisineType: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export function validateImportedRecipe(recipe: any): {
  isValid: boolean;
  errors: string[];
  recipe?: ImportedRecipe;
} {
  try {
    const validated = RecipeValidationSchema.parse(recipe);
    return {
      isValid: true,
      errors: [],
      recipe: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return {
      isValid: false,
      errors: ['Unknown validation error'],
    };
  }
}