import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Starting image migration...')

  // Find all recipes with existing images
  const recipes = await prisma.recipe.findMany({
    where: {
      imageData: { not: null },
    },
    select: {
      id: true,
      imageData: true,
      imageMimeType: true,
      imageFileName: true,
    },
  })

  console.log(`Found ${recipes.length} recipes with images to migrate`)

  let migrated = 0
  let skipped = 0

  for (const recipe of recipes) {
    // Check if already migrated
    const existingImages = await prisma.recipeImage.count({
      where: { recipeId: recipe.id },
    })

    if (existingImages > 0) {
      console.log(
        `Recipe ${recipe.id}: Already migrated (${existingImages} images)`
      )
      skipped++
      continue
    }

    // Create RecipeImage record
    await prisma.recipeImage.create({
      data: {
        recipeId: recipe.id,
        order: 0, // Primary image
        data: recipe.imageData!,
        mimeType: recipe.imageMimeType!,
        fileName: recipe.imageFileName || 'migrated-image',
      },
    })

    migrated++
    console.log(`Recipe ${recipe.id}: Migrated successfully`)
  }

  console.log(`\nMigration complete:`)
  console.log(`  - Migrated: ${migrated}`)
  console.log(`  - Skipped: ${skipped}`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
