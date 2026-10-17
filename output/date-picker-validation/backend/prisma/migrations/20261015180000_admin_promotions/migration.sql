ALTER TABLE "promotions" ADD COLUMN "administrative" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "promotions" ALTER COLUMN "expiresAt" DROP NOT NULL;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_paid_expiry_required"
  CHECK ("administrative" OR "expiresAt" IS NOT NULL);
