ALTER TABLE "affiliate_offers"
ADD COLUMN "reportedDiscountPercent" INTEGER,
ADD COLUMN "oldPriceEstimated" BOOLEAN NOT NULL DEFAULT false,
ADD CONSTRAINT "affiliate_offers_reported_discount_range"
CHECK ("reportedDiscountPercent" IS NULL OR "reportedDiscountPercent" BETWEEN 1 AND 100),
ADD CONSTRAINT "affiliate_offers_estimated_price_evidence"
CHECK (NOT "oldPriceEstimated" OR ("reportedDiscountPercent" IS NOT NULL AND "reportedDiscountPercent" BETWEEN 1 AND 99 AND "oldPriceCents" IS NOT NULL AND "oldPriceCents" > "priceCents"));
