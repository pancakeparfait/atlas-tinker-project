import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { importRecipeFromUrl, getImportConfidenceScore } from '@/lib/recipe-importers/importer';
import { MealCategory, DifficultyLevel } from '@prisma/client';

const ImportRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = ImportRequestSchema.parse(body);

    // Import the recipe
    const importResult = await importRecipeFromUrl(url);

    if (!importResult.success && !importResult.recipe) {
      return NextResponse.json(
        { 
          error: 'Failed to import recipe',
          details: importResult.errors,
        },
        { status: 400 }
      );
    }

    // Calculate confidence score and recommendations
    const confidence = getImportConfidenceScore(importResult.status);

    // Prepare the response with imported data and review information
    const response = {
      importedRecipe: importResult.recipe,
      importStatus: importResult.status,
      confidence,
      source: importResult.source,
      errors: importResult.errors,
      suggestions: generateSuggestions(importResult.recipe!, importResult.status),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/recipes/import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import recipe' },
      { status: 500 }
    );
  }
}

function generateSuggestions(recipe: any, status: any[]): any {
  const suggestions: any = {};

  // Suggest meal category if not provided
  if (!recipe.mealCategory) {
    suggestions.mealCategory = suggestMealCategory(recipe.title, recipe.description);
  }

  // Suggest difficulty level based on complexity
  if (!recipe.difficultyLevel) {
    suggestions.difficultyLevel = suggestDifficultyLevel(recipe);
  }

  // Suggest serving size if not provided
  if (!recipe.servings) {
    suggestions.servings = 4; // Default suggestion
  }

  // Suggest prep time if not provided
  if (!recipe.prepTimeMinutes) {
    suggestions.prepTimeMinutes = suggestPrepTime(recipe);
  }

  // Suggest cook time if not provided
  if (!recipe.cookTimeMinutes) {
    suggestions.cookTimeMinutes = suggestCookTime(recipe);
  }

  return suggestions;
}

function suggestMealCategory(title?: string, description?: string): MealCategory {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('breakfast') || text.includes('morning') || text.includes('brunch')) {
    return MealCategory.BREAKFAST;
  }
  
  if (text.includes('lunch') || text.includes('sandwich') || text.includes('salad')) {
    return MealCategory.LUNCH;
  }
  
  if (text.includes('dessert') || text.includes('cake') || text.includes('cookie') || text.includes('pie')) {
    return MealCategory.DESSERT;
  }
  
  if (text.includes('snack') || text.includes('appetizer') || text.includes('dip')) {
    return MealCategory.SNACK;
  }

  return MealCategory.DINNER; // Default to dinner
}

function suggestDifficultyLevel(recipe: any): DifficultyLevel {
  let complexity = 0;

  // More ingredients = more complex
  if (recipe.ingredients?.length > 10) complexity += 1;
  if (recipe.ingredients?.length > 15) complexity += 1;

  // More steps = more complex
  if (recipe.instructions?.length > 8) complexity += 1;
  if (recipe.instructions?.length > 12) complexity += 1;

  // Longer cook time = more complex
  if (recipe.cookTimeMinutes > 60) complexity += 1;
  if (recipe.cookTimeMinutes > 120) complexity += 1;

  // Check for complex cooking techniques in instructions
  const instructionText = recipe.instructions?.join(' ').toLowerCase() || '';
  const complexTechniques = ['braise', 'poach', 'confit', 'sous vide', 'temper', 'fold', 'julienne'];
  if (complexTechniques.some(technique => instructionText.includes(technique))) {
    complexity += 2;
  }

  if (complexity >= 4) return DifficultyLevel.HARD;
  if (complexity >= 2) return DifficultyLevel.MEDIUM;
  return DifficultyLevel.EASY;
}

function suggestPrepTime(recipe: any): number {
  let minutes = 10; // Base prep time

  // More ingredients = more prep time
  if (recipe.ingredients?.length > 5) minutes += 5;
  if (recipe.ingredients?.length > 10) minutes += 10;

  // Check for prep-intensive ingredients/techniques
  const ingredientText = recipe.ingredients?.map((ing: any) => ing.name).join(' ').toLowerCase() || '';
  const instructions = recipe.instructions?.join(' ').toLowerCase() || '';

  if (ingredientText.includes('onion') || ingredientText.includes('garlic')) minutes += 5;
  if (instructions.includes('chop') || instructions.includes('dice') || instructions.includes('mince')) minutes += 10;
  if (instructions.includes('marinate')) minutes += 15;

  return Math.min(minutes, 60); // Cap at 60 minutes
}

function suggestCookTime(recipe: any): number {
  const instructions = recipe.instructions?.join(' ').toLowerCase() || '';

  // Look for cooking method clues
  if (instructions.includes('bake') || instructions.includes('roast')) return 45;
  if (instructions.includes('simmer') || instructions.includes('stew')) return 30;
  if (instructions.includes('sauté') || instructions.includes('fry')) return 15;
  if (instructions.includes('grill')) return 20;
  if (instructions.includes('microwave')) return 5;

  return 20; // Default
}