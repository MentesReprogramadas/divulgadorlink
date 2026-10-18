-- CreateTable
CREATE TABLE "profile_billing_settings" (
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "publicOrigin" TEXT NOT NULL,
    "fiscalReviewed" BOOLEAN NOT NULL DEFAULT false,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_billing_settings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "profile_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "providerProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_plan_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "capabilities" TEXT[],
    "providerPriceId" TEXT,
    "providerProductId" TEXT,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_billing_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "scheduledVersionId" TEXT,
    "providerSubscriptionId" TEXT,
    "providerCheckoutId" TEXT,
    "providerScheduleId" TEXT,
    "checkoutUrl" TEXT,
    "checkoutExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidThrough" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "reconcileVersion" INTEGER NOT NULL DEFAULT 0,
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_entitlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "profile_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_billing_operations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "targetVersionId" TEXT,
    "kind" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "expectedVersion" INTEGER NOT NULL,
    "referencePeriodEnd" TIMESTAMP(3),
    "returnPath" TEXT,
    "returnOrigin" TEXT,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_billing_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_billing_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "kind" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "reconcileVersion" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "lastError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "profile_billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_plans_providerProductId_key" ON "profile_plans"("providerProductId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_plans_tenantId_tier_key" ON "profile_plans"("tenantId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "profile_plans_id_tenantId_key" ON "profile_plans"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_plan_versions_providerPriceId_key" ON "profile_plan_versions"("providerPriceId");

-- CreateIndex
CREATE INDEX "profile_plan_versions_tenantId_planId_version_idx" ON "profile_plan_versions"("tenantId", "planId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "profile_plan_versions_planId_version_key" ON "profile_plan_versions"("planId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "profile_plan_versions_id_tenantId_key" ON "profile_plan_versions"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_billing_accounts_providerCustomerId_key" ON "profile_billing_accounts"("providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_billing_accounts_tenantId_ownerId_key" ON "profile_billing_accounts"("tenantId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_billing_accounts_id_tenantId_ownerId_key" ON "profile_billing_accounts"("id", "tenantId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_subscriptions_providerSubscriptionId_key" ON "profile_subscriptions"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_subscriptions_providerCheckoutId_key" ON "profile_subscriptions"("providerCheckoutId");

-- CreateIndex
CREATE INDEX "profile_subscriptions_tenantId_ownerId_createdAt_idx" ON "profile_subscriptions"("tenantId", "ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "profile_subscriptions_id_tenantId_ownerId_key" ON "profile_subscriptions"("id", "tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "profile_entitlements_tenantId_ownerId_validUntil_idx" ON "profile_entitlements"("tenantId", "ownerId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "profile_entitlements_subscriptionId_capability_key" ON "profile_entitlements"("subscriptionId", "capability");

-- CreateIndex
CREATE INDEX "profile_billing_operations_state_nextAttemptAt_idx" ON "profile_billing_operations"("state", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "profile_billing_operations_tenantId_ownerId_requestKey_key" ON "profile_billing_operations"("tenantId", "ownerId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "profile_billing_operations_subscriptionId_kind_expectedVers_key" ON "profile_billing_operations"("subscriptionId", "kind", "expectedVersion");

-- CreateIndex
CREATE INDEX "profile_billing_events_state_nextAttemptAt_idx" ON "profile_billing_events"("state", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "profile_billing_events_tenantId_receivedAt_idx" ON "profile_billing_events"("tenantId", "receivedAt");

-- AddForeignKey
ALTER TABLE "profile_billing_settings" ADD CONSTRAINT "profile_billing_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_plans" ADD CONSTRAINT "profile_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_plan_versions" ADD CONSTRAINT "profile_plan_versions_planId_tenantId_fkey" FOREIGN KEY ("planId", "tenantId") REFERENCES "profile_plans"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_billing_accounts" ADD CONSTRAINT "profile_billing_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_billing_accounts" ADD CONSTRAINT "profile_billing_accounts_ownerId_tenantId_fkey" FOREIGN KEY ("ownerId", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_subscriptions" ADD CONSTRAINT "profile_subscriptions_accountId_tenantId_ownerId_fkey" FOREIGN KEY ("accountId", "tenantId", "ownerId") REFERENCES "profile_billing_accounts"("id", "tenantId", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_subscriptions" ADD CONSTRAINT "profile_subscriptions_planVersionId_tenantId_fkey" FOREIGN KEY ("planVersionId", "tenantId") REFERENCES "profile_plan_versions"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_subscriptions" ADD CONSTRAINT "profile_subscriptions_scheduledVersionId_tenantId_fkey" FOREIGN KEY ("scheduledVersionId", "tenantId") REFERENCES "profile_plan_versions"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_entitlements" ADD CONSTRAINT "profile_entitlements_subscriptionId_tenantId_ownerId_fkey" FOREIGN KEY ("subscriptionId", "tenantId", "ownerId") REFERENCES "profile_subscriptions"("id", "tenantId", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_billing_operations" ADD CONSTRAINT "profile_billing_operations_subscriptionId_tenantId_ownerId_fkey" FOREIGN KEY ("subscriptionId", "tenantId", "ownerId") REFERENCES "profile_subscriptions"("id", "tenantId", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_billing_operations" ADD CONSTRAINT "profile_billing_operations_targetVersionId_tenantId_fkey" FOREIGN KEY ("targetVersionId", "tenantId") REFERENCES "profile_plan_versions"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_billing_events" ADD CONSTRAINT "profile_billing_events_accountId_tenantId_ownerId_fkey" FOREIGN KEY ("accountId", "tenantId", "ownerId") REFERENCES "profile_billing_accounts"("id", "tenantId", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_billing_events" ADD CONSTRAINT "profile_billing_events_subscriptionId_tenantId_ownerId_fkey" FOREIGN KEY ("subscriptionId", "tenantId", "ownerId") REFERENCES "profile_subscriptions"("id", "tenantId", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Commercial versions are append-only. Publishing another edition does not rewrite a subscriber's price.
ALTER TABLE profile_plans ADD CONSTRAINT profile_plans_tier_check CHECK (tier IN ('FREE','PRO','PREMIUM'));
ALTER TABLE profile_plans ADD CONSTRAINT profile_plans_title_check CHECK (length(title) BETWEEN 1 AND 80);
ALTER TABLE profile_plans ADD CONSTRAINT profile_plans_version_check CHECK (version >= 0);
ALTER TABLE profile_plan_versions ADD CONSTRAINT profile_plan_versions_money_check CHECK (
 version > 0 AND "amountCents" >= 0 AND currency = 'BRL' AND "interval" = 'month'
 AND (("amountCents" = 0 AND "providerPriceId" IS NULL AND "providerProductId" IS NULL)
   OR ("amountCents" > 0 AND "providerPriceId" IS NOT NULL AND "providerProductId" IS NOT NULL))
);
ALTER TABLE profile_plan_versions ADD CONSTRAINT profile_plan_versions_capabilities_check CHECK (
 capabilities @> ARRAY['profile.page','profile.categories','profile.appearance','profile.history']::text[]
 AND capabilities <@ ARRAY['profile.page','profile.categories','profile.appearance','profile.history','profile.analytics','profile.scheduling','profile.richBlocks','profile.subdomain']::text[]
);
CREATE FUNCTION prevent_profile_plan_version_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'profile plan versions are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER profile_plan_versions_immutable BEFORE UPDATE ON profile_plan_versions
 FOR EACH ROW EXECUTE FUNCTION prevent_profile_plan_version_update();

ALTER TABLE profile_billing_settings ADD CONSTRAINT profile_billing_settings_version_check CHECK (version >= 0);
ALTER TABLE profile_subscriptions ADD CONSTRAINT profile_subscriptions_status_check CHECK (
 status IN ('PENDING','ACTIVE','PAST_DUE','CANCELED','UNPAID','INCOMPLETE','EXPIRED','REVIEW') AND version >= 0 AND "reconcileVersion" >= 0
);
ALTER TABLE profile_subscriptions ADD CONSTRAINT profile_subscriptions_period_check CHECK (
 ("periodStart" IS NULL AND "periodEnd" IS NULL) OR
 ("periodStart" IS NOT NULL AND "periodEnd" IS NOT NULL AND "periodEnd" > "periodStart")
);
-- A second Checkout may not create a second concurrently chargeable subscription for an account.
CREATE UNIQUE INDEX profile_subscriptions_one_open_account ON profile_subscriptions("accountId")
 WHERE status IN ('PENDING','ACTIVE','PAST_DUE','UNPAID','INCOMPLETE','REVIEW');
ALTER TABLE profile_entitlements ADD CONSTRAINT profile_entitlements_period_check CHECK ("validUntil" > "validFrom");
ALTER TABLE profile_entitlements ADD CONSTRAINT profile_entitlements_capability_check CHECK (
 capability IN ('profile.analytics','profile.scheduling','profile.richBlocks','profile.subdomain')
);
ALTER TABLE profile_billing_operations ADD CONSTRAINT profile_billing_operations_state_check CHECK (
 state IN ('PENDING','PROCESSING','DONE','FAILED') AND attempts >= 0 AND "expectedVersion" >= 0
 AND kind IN ('CHECKOUT','CANCEL','CHANGE') AND fingerprint ~ '^[a-f0-9]{64}$'
);
ALTER TABLE profile_billing_events ADD CONSTRAINT profile_billing_events_state_check CHECK (
 state IN ('PENDING','PROCESSING','PROCESSED','IGNORED','SUPERSEDED','FAILED') AND attempts >= 0
 AND "objectType" IN ('subscription','invoice','checkout')
);
-- No synthetic paid subscription, provider Customer/Price or entitlement is backfilled.
-- Existing accounts keep their free page through the existing projection and domain baseline.
