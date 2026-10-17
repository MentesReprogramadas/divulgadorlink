ALTER TABLE "orders" ADD COLUMN "brCode" TEXT;

CREATE INDEX "links_tenantId_status_id_idx" ON "links"("tenantId", "status", "id");

CREATE INDEX "promotions_surface_status_activatedAt_idx" ON "promotions"("surface", "status", "activatedAt");
