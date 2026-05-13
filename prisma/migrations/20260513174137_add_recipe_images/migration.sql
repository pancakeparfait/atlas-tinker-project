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

-- Data migration: copy existing single-image rows into recipe_images as order=0
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
WHERE image_data IS NOT NULL;
