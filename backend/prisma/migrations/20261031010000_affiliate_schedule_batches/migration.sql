ALTER TABLE "affiliate_offers" ADD COLUMN "itemId" TEXT;
CREATE INDEX "affiliate_offers_tenantId_segmentId_itemId_idx" ON "affiliate_offers"("tenantId", "segmentId", "itemId");
UPDATE "affiliate_offers" o SET "itemId" = d."itemId"
FROM "affiliate_product_decisions" d JOIN "affiliate_broadcasts" b ON b.id = d."broadcastId" AND b."tenantId" = d."tenantId"
WHERE o.id = b."offerId" AND o."tenantId" = b."tenantId";

CREATE TABLE "affiliate_schedule_batches" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "segmentId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'BUILDING',
  "mode" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'RULES',
  "config" JSONB NOT NULL,
  "groupHash" TEXT NOT NULL,
  "groups" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliate_schedule_batches_segment_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE RESTRICT,
  CHECK ("status" IN ('BUILDING','DRAFT','APPROVED','CANCELLED','FAILED')),
  CHECK ("mode" IN ('AUTO','MANUAL'))
);
CREATE UNIQUE INDEX "affiliate_schedule_batches_id_tenantId_key" ON "affiliate_schedule_batches"("id", "tenantId");
CREATE UNIQUE INDEX "affiliate_schedule_batches_tenantId_idempotencyKey_key" ON "affiliate_schedule_batches"("tenantId", "idempotencyKey");
CREATE INDEX "affiliate_schedule_batches_tenantId_segmentId_createdAt_idx" ON "affiliate_schedule_batches"("tenantId", "segmentId", "createdAt");
CREATE TABLE "affiliate_scheduled_offers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'BUILDING',
  "snapshot" JSONB NOT NULL,
  "broadcastId" TEXT,
  "error" TEXT,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliate_scheduled_offers_batch_fkey" FOREIGN KEY ("batchId", "tenantId") REFERENCES "affiliate_schedule_batches"("id", "tenantId") ON DELETE CASCADE,
  CONSTRAINT "affiliate_scheduled_offers_broadcast_fkey" FOREIGN KEY ("broadcastId", "tenantId") REFERENCES "affiliate_broadcasts"("id", "tenantId") ON DELETE RESTRICT,
  CHECK ("state" IN ('BUILDING','READY','PENDING','PROCESSING','QUEUED','FAILED','CANCELLED'))
);
CREATE UNIQUE INDEX "affiliate_scheduled_offers_batchId_itemId_key" ON "affiliate_scheduled_offers"("batchId", "itemId");
CREATE INDEX "affiliate_scheduled_offers_state_scheduledAt_idx" ON "affiliate_scheduled_offers"("state", "scheduledAt");
CREATE INDEX "affiliate_scheduled_offers_tenantId_itemId_idx" ON "affiliate_scheduled_offers"("tenantId", "itemId");
