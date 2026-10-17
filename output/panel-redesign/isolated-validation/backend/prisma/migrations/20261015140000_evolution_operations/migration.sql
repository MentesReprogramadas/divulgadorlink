CREATE TABLE "operational_messages" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "occurrenceKey" TEXT NOT NULL UNIQUE,
 "kind" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "snapshotHash" TEXT, "payload" JSONB NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lockedAt" TIMESTAMP(3),
 "providerMessageId" TEXT, "lastErrorCode" TEXT, "expiresAt" TIMESTAMP(3), "consumedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "operational_messages_tenantId_state_nextAttemptAt_idx" ON "operational_messages"("tenantId", "state", "nextAttemptAt");
CREATE INDEX "operational_messages_kind_resourceId_idx" ON "operational_messages"("kind", "resourceId");
CREATE TABLE "evolution_receipts" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "instance" TEXT NOT NULL, "providerMessageId" TEXT NOT NULL,
 "sender" TEXT NOT NULL, "reference" TEXT NOT NULL, "decision" TEXT NOT NULL, "reason" TEXT,
 "state" TEXT NOT NULL DEFAULT 'PENDING', "resultCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "evolution_receipts_instance_providerMessageId_key" ON "evolution_receipts"("instance", "providerMessageId");
CREATE INDEX "evolution_receipts_state_createdAt_idx" ON "evolution_receipts"("state", "createdAt");
CREATE TABLE "evolution_operators" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "phone" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "evolution_operators_tenantId_phone_key" ON "evolution_operators"("tenantId", "phone");
ALTER TABLE "operational_messages" ADD CONSTRAINT "operational_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evolution_receipts" ADD CONSTRAINT "evolution_receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evolution_operators" ADD CONSTRAINT "evolution_operators_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evolution_operators" ADD CONSTRAINT "evolution_operators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
