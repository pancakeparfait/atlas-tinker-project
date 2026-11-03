import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // The seed is the sample data for a fresh database. Running it again on an
  // already-seeded database would duplicate rows (and hit the unique
  // constraint on Ingredient.name), so make it a no-op once recipes exist.
  const existingRecipes = await prisma.recipe.count()
  if (existingRecipes > 0) {
    console.log(
      `⏭️  Database already contains ${existingRecipes} recipe(s); skipping seed.`
    )
    return
  }

  await prisma.$transaction(seedSampleData, { timeout: 20000 })
  console.log('🎉 Database seeded successfully!')
}

async function seedSampleData(tx: Prisma.TransactionClient) {
  // Create sample ingredients
  const ingredients = [
    await tx.ingredient.upsert({
      where: { name: 'Chicken Breast' },
      update: {},
      create: {
        name: 'Chicken Breast',
        category: 'Protein',
        nutritionalData: {
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          fiber: 0
        },
        commonSubstitutes: ['Turkey Breast', 'Tofu', 'Tempeh'],
        allergenInfo: [],
        shelfLifeDays: 3
      }
    }),
    await tx.ingredient.upsert({
      where: { name: 'Rice' },
      update: {},
      create: {
        name: 'Rice',
        category: 'Grain',
        nutritionalData: {
          calories: 130,
          protein: 2.7,
          carbs: 28,
          fat: 0.3,
          fiber: 0.4
        },
        commonSubstitutes: ['Quinoa', 'Brown Rice', 'Cauliflower Rice'],
        allergenInfo: [],
        shelfLifeDays: 365
      }
    }),
    await tx.ingredient.upsert({
      where: { name: 'Broccoli' },
      update: {},
      create: {
        name: 'Broccoli',
        category: 'Vegetable',
        nutritionalData: {
          calories: 25,
          protein: 3,
          carbs: 5,
          fat: 0.3,
          fiber: 2.6
        },
        commonSubstitutes: ['Cauliflower', 'Brussels Sprouts', 'Green Beans'],
        allergenInfo: [],
        shelfLifeDays: 7
      }
    }),
    await tx.ingredient.upsert({
      where: { name: 'Olive Oil' },
      update: {},
      create: {
        name: 'Olive Oil',
        category: 'Fat',
        nutritionalData: {
          calories: 884,
          protein: 0,
          carbs: 0,
          fat: 100,
          fiber: 0
        },
        commonSubstitutes: ['Avocado Oil', 'Coconut Oil', 'Butter'],
        allergenInfo: [],
        shelfLifeDays: 730
      }
    }),
    await tx.ingredient.upsert({
      where: { name: 'Garlic' },
      update: {},
      create: {
        name: 'Garlic',
        category: 'Seasoning',
        nutritionalData: {
          calories: 149,
          protein: 6.4,
          carbs: 33,
          fat: 0.5,
          fiber: 2.1
        },
        commonSubstitutes: ['Garlic Powder', 'Shallots', 'Onion'],
        allergenInfo: [],
        shelfLifeDays: 14
      }
    })
  ]

  console.log(`✅ Created ${ingredients.length} ingredients`)

  // Create a sample recipe
  const recipe = await tx.recipe.create({
    data: {
      title: 'Garlic Chicken with Rice and Broccoli',
      description: 'A simple, healthy meal perfect for meal prep',
      cuisineType: 'American',
      mealCategory: 'DINNER',
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      servings: 4,
      difficultyLevel: 'EASY',
      instructions: [
        {
          step: 1,
          instruction: 'Season chicken breast with salt and pepper'
        },
        {
          step: 2,
          instruction: 'Heat olive oil in a large skillet over medium-high heat'
        },
        {
          step: 3,
          instruction: 'Add chicken and cook for 6-7 minutes per side until golden'
        },
        {
          step: 4,
          instruction: 'Add minced garlic and cook for 1 minute'
        },
        {
          step: 5,
          instruction: 'Steam broccoli until tender, about 5 minutes'
        },
        {
          step: 6,
          instruction: 'Cook rice according to package directions'
        },
        {
          step: 7,
          instruction: 'Serve chicken over rice with steamed broccoli'
        }
      ],
      source: 'Recipe Organizer',
      personalRating: 5,
      tags: ['healthy', 'meal-prep', 'easy', 'protein'],
      ingredients: {
        create: [
          {
            ingredientId: ingredients[0].id, // Chicken Breast
            quantity: 1.5,
            unit: 'lbs'
          },
          {
            ingredientId: ingredients[1].id, // Rice
            quantity: 1,
            unit: 'cup'
          },
          {
            ingredientId: ingredients[2].id, // Broccoli
            quantity: 1,
            unit: 'head'
          },
          {
            ingredientId: ingredients[3].id, // Olive Oil
            quantity: 2,
            unit: 'tbsp'
          },
          {
            ingredientId: ingredients[4].id, // Garlic
            quantity: 3,
            unit: 'cloves'
          }
        ]
      }
    }
  })

  console.log(`✅ Created sample recipe: ${recipe.title}`)

  // Create a sample meal plan
  const mealPlan = await tx.mealPlan.create({
    data: {
      name: 'Weekly Meal Plan - Week 1',
      startDate: new Date('2025-11-18'),
      endDate: new Date('2025-11-24'),
      budgetLimit: 150.00,
      notes: 'Focus on healthy, simple meals this week',
      plannedMeals: {
        create: [
          {
            recipeId: recipe.id,
            mealDate: new Date('2025-11-18'),
            mealType: 'DINNER',
            servingsPlanned: 4,
            notes: 'Meal prep for the week'
          },
          {
            recipeId: recipe.id,
            mealDate: new Date('2025-11-19'),
            mealType: 'LUNCH',
            servingsPlanned: 2,
            notes: 'Leftover from Monday dinner'
          }
        ]
      }
    }
  })

  console.log(`✅ Created sample meal plan: ${mealPlan.name}`)

  // Create a sample shopping list
  const shoppingList = await tx.shoppingList.create({
    data: {
      mealPlanId: mealPlan.id,
      name: 'Grocery List - Week 1',
      storeName: 'Local Grocery Store',
      estimatedCost: 45.00,
      status: 'DRAFT',
      items: {
        create: [
          {
            ingredientId: ingredients[0].id, // Chicken Breast
            quantity: 1.5,
            unit: 'lbs',
            estimatedPrice: 12.00,
            category: 'Meat',
            priority: 'HIGH'
          },
          {
            ingredientId: ingredients[1].id, // Rice
            quantity: 1,
            unit: 'bag',
            estimatedPrice: 3.50,
            category: 'Pantry',
            priority: 'MEDIUM'
          },
          {
            ingredientId: ingredients[2].id, // Broccoli
            quantity: 2,
            unit: 'heads',
            estimatedPrice: 4.00,
            category: 'Produce',
            priority: 'MEDIUM'
          }
        ]
      }
    }
  })

  console.log(`✅ Created sample shopping list: ${shoppingList.name}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })