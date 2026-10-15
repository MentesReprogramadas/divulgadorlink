-- Contestação por envio: um link pode ter vários casos. O histórico fica.
DROP INDEX IF EXISTS "moderation_cases_linkId_key";

ALTER TABLE "moderation_cases" ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE INDEX "moderation_cases_linkId_closedAt_idx" ON "moderation_cases"("linkId", "closedAt");

-- Embedding: a intenção fica no banco mesmo se o Redis falhar.
CREATE TYPE "EmbeddingState" AS ENUM ('ABSENT', 'PENDING', 'READY', 'FAILED');
CREATE TYPE "EmbeddingJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

ALTER TABLE "links" ADD COLUMN "embeddingState" "EmbeddingState" NOT NULL DEFAULT 'ABSENT';

CREATE TABLE "embedding_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "status" "EmbeddingJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "snapshotName" TEXT NOT NULL,
    "snapshotDescription" TEXT NOT NULL,
    "snapshotNetworkId" TEXT NOT NULL,
    "snapshotNicheId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "embedding_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "embedding_jobs_status_nextAttemptAt_idx" ON "embedding_jobs"("status", "nextAttemptAt");
CREATE INDEX "embedding_jobs_linkId_idx" ON "embedding_jobs"("linkId");

ALTER TABLE "embedding_jobs" ADD CONSTRAINT "embedding_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "embedding_jobs" ADD CONSTRAINT "embedding_jobs_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Destaque mínimo para o banimento cancelar o que está ACTIVE, sem estorno.
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PromotionSurface" AS ENUM ('SEARCH', 'NICHE', 'HOME');

CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL,
    "surface" "PromotionSurface" NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotions_tenantId_linkId_status_idx" ON "promotions"("tenantId", "linkId", "status");
CREATE UNIQUE INDEX "promotions_one_active_surface" ON "promotions"("linkId", "surface") WHERE "status" = 'ACTIVE';

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
