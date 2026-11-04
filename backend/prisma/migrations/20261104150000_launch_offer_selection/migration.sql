ALTER TABLE "promotion_launch_offers"
 ADD COLUMN "productCode" TEXT,
 ADD COLUMN "durationDays" INTEGER,
 ADD CONSTRAINT "launch_offer_product_code_check" CHECK ("productCode" IN ('SEARCH','NICHE','HOME','SEARCH_NICHE','SEARCH_NICHE_HOME')),
 ADD CONSTRAINT "launch_offer_duration_check" CHECK ("durationDays" IN (7,14,28));
