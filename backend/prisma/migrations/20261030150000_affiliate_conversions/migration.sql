-- CreateTable
CREATE TABLE "affiliate_conversion_intents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "encryptedMeta" TEXT,
    "consentVersion" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_conversion_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_conversion_outbox" (
    "groupId" TEXT,
    "kind" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_conversion_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_conversion_intents_expiresAt_idx" ON "affiliate_conversion_intents"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_conversion_intents_tenantId_segmentId_phoneHash_key" ON "affiliate_conversion_intents"("tenantId", "segmentId", "phoneHash");

-- CreateIndex
CREATE INDEX "affiliate_conversion_outbox_state_nextAttemptAt_idx" ON "affiliate_conversion_outbox"("state", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_conversion_outbox_intentId_kind_key" ON "affiliate_conversion_outbox"("intentId", "kind");

-- AddForeignKey
ALTER TABLE "affiliate_conversion_intents" ADD CONSTRAINT "affiliate_conversion_intents_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion_outbox" ADD CONSTRAINT "affiliate_conversion_outbox_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "affiliate_conversion_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Initial capture has no group; qualification must point to the confirmed group.
ALTER TABLE "affiliate_conversion_outbox" ADD CONSTRAINT "affiliate_conversion_outbox_kind_group_check"
CHECK (("kind" = 'INITIAL_LEAD' AND "groupId" IS NULL) OR ("kind" = 'QUALIFIED_GROUP_LEAD' AND "groupId" IS NOT NULL));
