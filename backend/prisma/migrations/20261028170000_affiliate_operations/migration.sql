-- CreateTable
CREATE TABLE "affiliate_instances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT,
    "ownerPhone" TEXT,
    "nextSendAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_segments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1024,
    "autoExpand" BOOLEAN NOT NULL DEFAULT false,
    "instanceId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextSequence" INTEGER NOT NULL DEFAULT 1,
    "provisionState" TEXT NOT NULL DEFAULT 'IDLE',
    "provisionStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 1024,
    "inviteUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_offers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "oldPriceCents" INTEGER,
    "imageUrl" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_broadcasts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "offerUpdatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_deliveries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "lockedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
    "oauthState" TEXT,
    "oauthVerifier" TEXT,
    "oauthExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_instances_id_tenantId_key" ON "affiliate_instances"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_instances_tenantId_name_key" ON "affiliate_instances"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_segments_id_tenantId_key" ON "affiliate_segments"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_segments_tenantId_slug_key" ON "affiliate_segments"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_groups_id_tenantId_key" ON "affiliate_groups"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_groups_tenantId_jid_key" ON "affiliate_groups"("tenantId", "jid");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_groups_segmentId_sequence_key" ON "affiliate_groups"("segmentId", "sequence");

-- CreateIndex
CREATE INDEX "affiliate_offers_tenantId_createdAt_idx" ON "affiliate_offers"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_offers_id_tenantId_key" ON "affiliate_offers"("id", "tenantId");

-- CreateIndex
CREATE INDEX "affiliate_broadcasts_tenantId_createdAt_idx" ON "affiliate_broadcasts"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_broadcasts_id_tenantId_key" ON "affiliate_broadcasts"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_broadcasts_tenantId_idempotencyKey_key" ON "affiliate_broadcasts"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "affiliate_deliveries_state_nextAttemptAt_idx" ON "affiliate_deliveries"("state", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "affiliate_deliveries_tenantId_createdAt_idx" ON "affiliate_deliveries"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_deliveries_broadcastId_groupId_key" ON "affiliate_deliveries"("broadcastId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_connections_tenantId_provider_key" ON "affiliate_connections"("tenantId", "provider");

-- AddForeignKey
ALTER TABLE "affiliate_instances" ADD CONSTRAINT "affiliate_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_segments" ADD CONSTRAINT "affiliate_segments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_segments" ADD CONSTRAINT "affiliate_segments_instanceId_tenantId_fkey" FOREIGN KEY ("instanceId", "tenantId") REFERENCES "affiliate_instances"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_groups" ADD CONSTRAINT "affiliate_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_groups" ADD CONSTRAINT "affiliate_groups_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_groups" ADD CONSTRAINT "affiliate_groups_instanceId_tenantId_fkey" FOREIGN KEY ("instanceId", "tenantId") REFERENCES "affiliate_instances"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_offers" ADD CONSTRAINT "affiliate_offers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_offers" ADD CONSTRAINT "affiliate_offers_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_broadcasts" ADD CONSTRAINT "affiliate_broadcasts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_broadcasts" ADD CONSTRAINT "affiliate_broadcasts_offerId_tenantId_fkey" FOREIGN KEY ("offerId", "tenantId") REFERENCES "affiliate_offers"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_deliveries" ADD CONSTRAINT "affiliate_deliveries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_deliveries" ADD CONSTRAINT "affiliate_deliveries_broadcastId_tenantId_fkey" FOREIGN KEY ("broadcastId", "tenantId") REFERENCES "affiliate_broadcasts"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_deliveries" ADD CONSTRAINT "affiliate_deliveries_groupId_tenantId_fkey" FOREIGN KEY ("groupId", "tenantId") REFERENCES "affiliate_groups"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_connections" ADD CONSTRAINT "affiliate_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
