import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { MealCategory, DifficultyLevel } from '@prisma/client';

const UpdateRecipeSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  cuisineType: z.string().optional(),
  mealCategory: z.nativeEnum(MealCategory).optional(),
  prepTimeMinutes: z.number().optional(),
  cookTimeMinutes: z.number().optional(),
  servings: z.number().min(1).optional(),
  difficultyLevel: z.nativeEnum(DifficultyLevel).optional(),
  instructions: z.array(z.string()).min(1, 'At least one instruction is required').optional(),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  personalRating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  nutritionalInfo: z.any().optional(),
  isDraft: z.boolean().optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    preparationNote: z.string().optional(),
    isOptional: z.boolean().default(false),
  })).min(1, 'At least one ingredient is required').optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Serialize the recipe to ensure dates are converted to strings
    // Also handle instructions which might be stored as objects or strings
    let instructionsArray: string[] = [];
    if (Array.isArray(recipe.instructions)) {
      instructionsArray = recipe.instructions.map((inst: any) => {
        if (typeof inst === 'string') {
          return inst;
        } else if (inst && typeof inst === 'object' && 'instruction' in inst) {
          return inst.instruction;
        }
        return String(inst);
      });
    }

    const serializedRecipe = {
      ...recipe,
      instructions: instructionsArray,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      ingredients: recipe.ingredients.map((ri) => ({
        ...ri,
        ingredient: {
          ...ri.ingredient,
          createdAt: ri.ingredient.createdAt.toISOString(),
        },
      })),
    };

    return NextResponse.json(serializedRecipe);
  } catch (error) {
    const { id } = await params;
    console.error(`GET /api/recipes/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateRecipeSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Check if recipe exists
      const existingRecipe = await tx.recipe.findUnique({
        where: { id },
      });

      if (!existingRecipe) {
        throw new Error('Recipe not found');
      }

      // Update recipe
      const recipe = await tx.recipe.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          cuisineType: data.cuisineType,
          mealCategory: data.mealCategory,
          prepTimeMinutes: data.prepTimeMinutes,
          cookTimeMinutes: data.cookTimeMinutes,
          servings: data.servings,
          difficultyLevel: data.difficultyLevel,
          instructions: data.instructions,
          source: data.source,
          sourceUrl: data.sourceUrl,
          personalRating: data.personalRating,
          tags: data.tags,
          nutritionalInfo: data.nutritionalInfo,
          isDraft: data.isDraft,
        },
      });

      // Update ingredients if provided
      if (data.ingredients) {
        // Remove existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: id },
        });

        // Add new ingredients
        for (const ingredientData of data.ingredients) {
          let ingredient = await tx.ingredient.findUnique({
            where: { name: ingredientData.name.toLowerCase() },
          });

          if (!ingredient) {
            ingredient = await tx.ingredient.create({
              data: {
                name: ingredientData.name.toLowerCase(),
                category: 'uncategorized',
              },
            });
          }

          await tx.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              ingredientId: ingredient.id,
              quantity: ingredientData.quantity,
              unit: ingredientData.unit,
              preparationNote: ingredientData.preparationNote,
              isOptional: ingredientData.isOptional,
            },
          });
        }
      }

      return recipe;
    });

    // Fetch the complete updated recipe
    const completeRecipe = await prisma.recipe.findUnique({
      where: { id: result.id },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!completeRecipe) {
      throw new Error('Failed to fetch updated recipe');
    }

    // Serialize dates
    let instructionsArray: string[] = [];
    if (Array.isArray(completeRecipe.instructions)) {
      instructionsArray = completeRecipe.instructions.map((inst: any) => {
        if (typeof inst === 'string') {
          return inst;
        } else if (inst && typeof inst === 'object' && 'instruction' in inst) {
          return inst.instruction;
        }
        return String(inst);
      });
    }

    const serializedRecipe = {
      ...completeRecipe,
      instructions: instructionsArray,
      createdAt: completeRecipe.createdAt.toISOString(),
      updatedAt: completeRecipe.updatedAt.toISOString(),
      ingredients: completeRecipe.ingredients.map((ri) => ({
        ...ri,
        ingredient: {
          ...ri.ingredient,
          createdAt: ri.ingredient.createdAt.toISOString(),
        },
      })),
    };

    return NextResponse.json(serializedRecipe);
  } catch (error) {
    const { id } = await params;
    console.error(`PUT /api/recipes/${id} error:`, error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Recipe not found') {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    await prisma.recipe.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    const { id } = await params;
    console.error(`DELETE /api/recipes/${id} error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}