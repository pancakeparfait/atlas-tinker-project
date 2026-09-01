-- Make PlannedMeal.recipeId optional (nullable).
-- No data loss: all existing rows have a non-null recipe_id.

-- 1. Drop the existing NOT NULL + RESTRICT FK.
ALTER TABLE "planned_meals" DROP CONSTRAINT "planned_meals_recipe_id_fkey";
ALTER TABLE "planned_meals" ALTER COLUMN "recipe_id" DROP NOT NULL;

-- 2. Recreate the FK with ON DELETE SET NULL so deleting a recipe
--    leaves the planned-meal row intact with recipe_id = null.
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipe_id_fkey"
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Composite index for the common date-range query pattern.
CREATE INDEX "planned_meals_meal_plan_id_meal_date_meal_type_idx"
  ON "planned_meals"("meal_plan_id", "meal_date", "meal_type");
