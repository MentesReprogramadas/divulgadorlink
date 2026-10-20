ALTER TABLE collections ADD COLUMN "publicationKey" TEXT NOT NULL DEFAULT gen_random_uuid()::text, ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PRIVATE', ADD COLUMN slug TEXT, ADD COLUMN publication JSONB, ADD COLUMN "publishedRevision" INTEGER;
ALTER TABLE collections ADD CONSTRAINT collections_publication_check CHECK (visibility IN ('PRIVATE','PUBLIC') AND (visibility='PRIVATE' OR (publication IS NOT NULL AND slug IS NOT NULL AND "publishedRevision" IS NOT NULL)));
CREATE UNIQUE INDEX collections_public_slug_key ON collections("tenantId",slug);
CREATE TABLE collection_slugs ("tenantId" TEXT NOT NULL,slug TEXT NOT NULL,"publicationKey" TEXT NOT NULL,PRIMARY KEY("tenantId",slug));
