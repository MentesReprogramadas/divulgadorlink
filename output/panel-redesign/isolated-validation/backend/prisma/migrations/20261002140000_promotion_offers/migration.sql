CREATE TABLE "promotion_offers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productCode" "PromotionProductCode" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "promotion_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_offers_tenantId_productCode_key" ON "promotion_offers"("tenantId", "productCode");
CREATE INDEX "promotion_offers_tenantId_sortOrder_idx" ON "promotion_offers"("tenantId", "sortOrder");

ALTER TABLE "promotion_offers" ADD CONSTRAINT "promotion_offers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "promotion_offers" ("id", "tenantId", "productCode", "name", "sortOrder", "featured", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t.id, v.code::"PromotionProductCode", v.name, v.sort, v.featured, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
CROSS JOIN (VALUES
    ('SEARCH', 'Busca', 10, false),
    ('NICHE', 'Nicho', 20, false),
    ('HOME', 'Home', 30, false),
    ('SEARCH_NICHE', 'Busca e nicho', 40, true),
    ('SEARCH_NICHE_HOME', 'Completo', 50, false)
) AS v(code, name, sort, featured)
ON CONFLICT ("tenantId", "productCode") DO NOTHING;
