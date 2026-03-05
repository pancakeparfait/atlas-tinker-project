import { z } from 'zod';
import { MealCategory, DifficultyLevel } from '@prisma/client';

export const RecipeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  cuisineType: z.string().optional(),
  mealCategory: z.nativeEnum(MealCategory),
  prepTimeMinutes: z.number().min(0).optional(),
  cookTimeMinutes: z.number().min(0).optional(),
  servings: z.number().min(1, 'Servings must be at least 1'),
  difficultyLevel: z.nativeEnum(DifficultyLevel),
  instructions: z.array(z.string().min(1, 'Instruction cannot be empty')).min(1, 'At least one instruction is required'),
  source: z.string().optional(),
  sourceUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  personalRating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
  isDraft: z.boolean().default(false),
  ingredients: z.array(
    z.object({
      name: z.string().min(1, 'Ingredient name is required'),
      quantity: z.number().min(0, 'Quantity must be positive'),
      unit: z.string().min(1, 'Unit is required'),
      preparationNote: z.string().optional(),
      isOptional: z.boolean().default(false),
    })
  ).min(1, 'At least one ingredient is required'),
});

export type RecipeFormData = z.infer<typeof RecipeSchema>;

export const MEAL_CATEGORIES = [
  { value: MealCategory.BREAKFAST, label: 'Breakfast' },
  { value: MealCategory.LUNCH, label: 'Lunch' },
  { value: MealCategory.DINNER, label: 'Dinner' },
  { value: MealCategory.SNACK, label: 'Snack' },
  { value: MealCategory.DESSERT, label: 'Dessert' },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: DifficultyLevel.EASY, label: 'Easy' },
  { value: DifficultyLevel.MEDIUM, label: 'Medium' },
  { value: DifficultyLevel.HARD, label: 'Hard' },
] as const;

export const COMMON_UNITS = [
  'cup', 'cups',
  'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons',
  'lb', 'lbs', 'pound', 'pounds',
  'oz', 'ounce', 'ounces',
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters',
  'piece', 'pieces',
  'slice', 'slices',
  'clove', 'cloves',
  'pinch', 'dash',
  'to taste',
] as const;