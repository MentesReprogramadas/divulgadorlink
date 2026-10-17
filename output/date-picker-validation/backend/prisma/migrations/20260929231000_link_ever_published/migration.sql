-- AlterTable
ALTER TABLE "links" ADD COLUMN "everPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "links" ADD COLUMN "approvedName" TEXT;
ALTER TABLE "links" ADD COLUMN "approvedDescription" TEXT;

-- Backfill published links
UPDATE "links"
SET
  "everPublished" = true,
  "approvedName" = "name",
  "approvedDescription" = "description"
WHERE "status" = 'PUBLISHED';
