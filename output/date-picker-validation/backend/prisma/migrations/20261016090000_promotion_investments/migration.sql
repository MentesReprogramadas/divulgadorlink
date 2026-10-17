-- Additive attribution ledger. Historical promotions are deliberately not inferred.
CREATE UNIQUE INDEX "promotions_id_tenantId_key" ON "promotions"("id", "tenantId");
CREATE UNIQUE INDEX "orders_id_tenantId_key" ON "orders"("id", "tenantId");
CREATE TABLE "promotion_investments" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "surface" "PromotionSurface" NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" >= 0),
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_investments_interval_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "promotion_investments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "promotion_investments_orderId_tenantId_fkey" FOREIGN KEY ("orderId", "tenantId") REFERENCES "orders"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "promotion_investments_promotionId_tenantId_fkey" FOREIGN KEY ("promotionId", "tenantId") REFERENCES "promotions"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "promotion_investments_orderId_surface_key" ON "promotion_investments"("orderId", "surface");
CREATE INDEX "promotion_investments_tenantId_promotionId_startsAt_endsAt_idx" ON "promotion_investments"("tenantId", "promotionId", "startsAt", "endsAt");
