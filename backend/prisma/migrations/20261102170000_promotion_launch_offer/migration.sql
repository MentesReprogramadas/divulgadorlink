CREATE TABLE "promotion_launch_offers" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "linkId" TEXT NOT NULL,
 "linkName" TEXT NOT NULL, "prices" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "dismissedAt" TIMESTAMP(3), "reservedOrderId" TEXT,
 CONSTRAINT "launch_offer_owner_fk" FOREIGN KEY ("userId", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE CASCADE,
 CONSTRAINT "launch_offer_link_fk" FOREIGN KEY ("linkId", "tenantId") REFERENCES "links"("id", "tenantId") ON DELETE CASCADE
);
CREATE INDEX "promotion_launch_offers_tenantId_userId_createdAt_idx" ON "promotion_launch_offers"("tenantId", "userId", "createdAt");
CREATE INDEX "promotion_launch_offers_linkId_idx" ON "promotion_launch_offers"("linkId");
