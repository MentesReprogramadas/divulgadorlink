CREATE TABLE "AffiliateImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AffiliateImage_tenantId_idx" ON "AffiliateImage"("tenantId");
ALTER TABLE "AffiliateImage" ADD CONSTRAINT "AffiliateImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_deliveries" ADD COLUMN "sentViaInstanceId" TEXT;
ALTER TABLE "affiliate_deliveries" ADD CONSTRAINT "affiliate_deliveries_sentViaInstanceId_tenantId_fkey" FOREIGN KEY ("sentViaInstanceId", "tenantId") REFERENCES "affiliate_instances"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "affiliate_segment_instances" (
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00',
    CONSTRAINT "affiliate_segment_instances_pkey" PRIMARY KEY ("segmentId", "instanceId")
);
CREATE INDEX "affiliate_segment_instances_instanceId_tenantId_idx" ON "affiliate_segment_instances"("instanceId", "tenantId");
ALTER TABLE "affiliate_segment_instances" ADD CONSTRAINT "affiliate_segment_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_segment_instances" ADD CONSTRAINT "affiliate_segment_instances_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_segment_instances" ADD CONSTRAINT "affiliate_segment_instances_instanceId_tenantId_fkey" FOREIGN KEY ("instanceId", "tenantId") REFERENCES "affiliate_instances"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Preserve both the existing provisioner and accounts already attached to groups.
INSERT INTO "affiliate_segment_instances" ("tenantId", "segmentId", "instanceId")
SELECT "tenantId", "id", "instanceId" FROM "affiliate_segments" WHERE "instanceId" IS NOT NULL
UNION SELECT "tenantId", "segmentId", "instanceId" FROM "affiliate_groups"
ON CONFLICT DO NOTHING;
