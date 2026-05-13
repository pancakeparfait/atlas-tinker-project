-- CreateTable
CREATE TABLE "recipe_images" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "file_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_images_recipe_id_order_idx" ON "recipe_images"("recipe_id", "order");

-- AddForeignKey
ALTER TABLE "recipe_images" ADD CONSTRAINT "recipe_images_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: copy existing single-image rows into recipe_images as order=0.
-- The prior schema permitted image_mime_type to be NULL even when image_data
-- was set, so we skip rows missing a MIME type rather than silently coercing
-- them to a bogus content type (CR-01: a NOT NULL violation here would abort
-- the entire migration and leave the database half-applied).
INSERT INTO recipe_images (id, recipe_id, "order", mime_type, data, file_name, created_at)
SELECT
  gen_random_uuid()::text,
  id,
  0,
  image_mime_type,
  image_data,
  COALESCE(image_file_name, 'image'),
  NOW()
FROM recipes
WHERE image_data IS NOT NULL
  AND image_mime_type IS NOT NULL;
