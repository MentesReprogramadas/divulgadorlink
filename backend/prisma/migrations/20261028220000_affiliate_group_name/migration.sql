ALTER TABLE "affiliate_segments" ADD COLUMN "groupName" TEXT;

-- Existing themes also supplied the group name; preserve that name when splitting the fields.
UPDATE "affiliate_segments" SET "groupName" = "name" WHERE "groupName" IS NULL;
