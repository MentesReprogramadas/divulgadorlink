-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('DRAFT', 'PENDING_MODERATION', 'PRE_REJECTED', 'PUBLISHED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "nicheId" TEXT NOT NULL,
    "otherNote" TEXT,
    "status" "LinkStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocklist_terms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocklist_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "links_tenantId_ownerId_status_idx" ON "links"("tenantId", "ownerId", "status");

-- CreateIndex
CREATE INDEX "blocklist_terms_tenantId_idx" ON "blocklist_terms"("tenantId");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "niches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocklist_terms" ADD CONSTRAINT "blocklist_terms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
