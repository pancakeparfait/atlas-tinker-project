import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { MealCategory, DifficultyLevel } from '@prisma/client';

const CreateRecipeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  cuisineType: z.string().optional(),
  mealCategory: z.nativeEnum(MealCategory),
  prepTimeMinutes: z.number().optional(),
  cookTimeMinutes: z.number().optional(),
  servings: z.number().min(1),
  difficultyLevel: z.nativeEnum(DifficultyLevel),
  instructions: z.array(z.string()).min(1, 'At least one instruction is required'),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  personalRating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
  nutritionalInfo: z.any().optional(),
  isDraft: z.boolean().default(false),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    preparationNote: z.string().optional(),
    isOptional: z.boolean().default(false),
  })).min(1, 'At least one ingredient is required'),
});

const RecipeSearchSchema = z.object({
  q: z.string().optional(),
  cuisine: z.string().optional(),
  category: z.nativeEnum(MealCategory).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  tags: z.string().optional(), // comma-separated tags
  isDraft: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = RecipeSearchSchema.parse(Object.fromEntries(searchParams));

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { tags: { has: query.q } },
      ];
    }

    if (query.cuisine) {
      where.cuisineType = { contains: query.cuisine, mode: 'insensitive' };
    }

    if (query.category) {
      where.mealCategory = query.category;
    }

    if (query.difficulty) {
      where.difficultyLevel = query.difficulty;
    }

    if (query.tags) {
      const tags = query.tags.split(',').map(tag => tag.trim());
      where.tags = { hasSome: tags };
    }

    if (query.isDraft) {
      where.isDraft = query.isDraft === 'true';
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.recipe.count({ where }),
    ]);

    // Serialize dates to strings and handle instructions format
    const serializedRecipes = recipes.map((recipe) => {
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
      
      return {
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
    });

    return NextResponse.json({
      recipes: serializedRecipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/recipes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateRecipeSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Create recipe
      const recipe = await tx.recipe.create({
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

      // Create or find ingredients and link them
      for (const ingredientData of data.ingredients) {
        let ingredient = await tx.ingredient.findUnique({
          where: { name: ingredientData.name.toLowerCase() },
        });

        if (!ingredient) {
          ingredient = await tx.ingredient.create({
            data: {
              name: ingredientData.name.toLowerCase(),
              category: 'uncategorized', // Default category
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

      return recipe;
    });

    // Fetch the complete recipe with ingredients
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
      throw new Error('Failed to fetch created recipe');
    }

    // Serialize dates and handle instructions format
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

    return NextResponse.json(serializedRecipe, { status: 201 });
  } catch (error) {
    console.error('POST /api/recipes error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}