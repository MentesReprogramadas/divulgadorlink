-- AlterTable
ALTER TABLE "verification_codes" ADD COLUMN "isResend" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "verification_codes" ADD COLUMN "userIdentifierId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "verification_codes_userIdentifierId_createdAt_idx" ON "verification_codes"("userIdentifierId", "createdAt");

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_userIdentifierId_fkey" FOREIGN KEY ("userIdentifierId") REFERENCES "user_identifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
