-- AlterTable
ALTER TABLE "Tag" ADD COLUMN "slug" TEXT;
ALTER TABLE "Tag" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Tag" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Tag" ADD COLUMN "seoText" TEXT;

-- Set default slugs for existing tags (lowercase name)
UPDATE "Tag" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL;

-- Make slug required and unique
ALTER TABLE "Tag" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
