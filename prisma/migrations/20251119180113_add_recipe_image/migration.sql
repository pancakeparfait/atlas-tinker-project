-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "image_data" BYTEA,
ADD COLUMN     "image_file_name" TEXT,
ADD COLUMN     "image_mime_type" TEXT,
ADD COLUMN     "import_status" JSONB,
ADD COLUMN     "is_draft" BOOLEAN NOT NULL DEFAULT false;
