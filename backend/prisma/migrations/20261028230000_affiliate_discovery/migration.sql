CREATE TABLE "affiliate_discoveries" (
  "segmentId" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "terms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "cursor" INTEGER NOT NULL DEFAULT 0,
  "productsJson" JSONB NOT NULL DEFAULT '[]',
  "countsJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "error" TEXT,
  "checkedAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "configVersion" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "affiliate_discoveries_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "affiliate_discoveries_terms_check" CHECK (cardinality("terms") <= 5),
  CONSTRAINT "affiliate_discoveries_products_check" CHECK (jsonb_typeof("productsJson") = 'array' AND jsonb_array_length("productsJson") <= 100)
);
CREATE INDEX "affiliate_discoveries_enabled_nextRunAt_idx" ON "affiliate_discoveries"("enabled", "nextRunAt");
CREATE UNIQUE INDEX "affiliate_discoveries_segmentId_tenantId_key" ON "affiliate_discoveries"("segmentId", "tenantId");
