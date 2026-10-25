ALTER TABLE "links" ADD COLUMN "mediaVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "link_media_assets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('ICON', 'IMAGE')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED')),
  "bytes" BYTEA NOT NULL,
  "alt" TEXT,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "link_media_assets_linkId_tenantId_fkey" FOREIGN KEY ("linkId", "tenantId") REFERENCES "links"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "link_media_alt" CHECK (("kind" = 'ICON' AND "alt" IS NULL) OR ("kind" = 'IMAGE' AND "alt" IS NOT NULL AND length(trim("alt")) BETWEEN 1 AND 250)),
  CONSTRAINT "link_media_size" CHECK (octet_length("bytes") BETWEEN 1 AND CASE WHEN "kind" = 'ICON' THEN 262144 ELSE 1048576 END)
);
CREATE UNIQUE INDEX "link_media_one_slot_status" ON "link_media_assets" ("tenantId", "linkId", "kind", "status");
CREATE INDEX "link_media_assets_tenantId_status_createdAt_idx" ON "link_media_assets" ("tenantId", "status", "createdAt");
