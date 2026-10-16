-- Additive recovery journal. Existing terminal withdrawals remain terminal.
ALTER TYPE "PromotionStatus" ADD VALUE 'PAUSED';
ALTER TABLE promotions ADD COLUMN "pauseRevision" INTEGER NOT NULL DEFAULT 0 CHECK ("pauseRevision" >= 0);
ALTER TABLE promotion_investments ADD COLUMN "pauseRevision" INTEGER NOT NULL DEFAULT 0 CHECK ("pauseRevision" >= 0);
CREATE TABLE promotion_pauses (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "promotionId" TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "remainingMs" BIGINT CHECK ("remainingMs" IS NULL OR "remainingMs" > 0),
  CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt"),
  FOREIGN KEY ("promotionId", "tenantId") REFERENCES promotions(id, "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "promotion_pauses_promotionId_revision_key" ON promotion_pauses("promotionId", revision);
CREATE UNIQUE INDEX promotion_pauses_one_open ON promotion_pauses("promotionId") WHERE "endsAt" IS NULL;
CREATE INDEX "promotion_pauses_tenantId_promotionId_startsAt_idx" ON promotion_pauses("tenantId", "promotionId", "startsAt");
CREATE TABLE link_availability (
  "linkId" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  state VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (state IN ('UNKNOWN','ACCESSIBLE','SUSPECT','INCONCLUSIVE','UNAVAILABLE')),
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  "checkedAt" TIMESTAMP(3),
  "lastStatus" INTEGER,
  "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "leaseToken" TEXT,
  "notificationPendingAt" TIMESTAMP(3),
  "notificationSentAt" TIMESTAMP(3),
  "notificationNextAt" TIMESTAMP(3),
  "notificationAttempts" INTEGER NOT NULL DEFAULT 0 CHECK ("notificationAttempts" >= 0),
  CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL)),
  FOREIGN KEY ("linkId", "tenantId") REFERENCES links(id, "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "link_availability_linkId_tenantId_key" ON link_availability("linkId", "tenantId");
CREATE INDEX "link_availability_nextCheckAt_linkId_idx" ON link_availability("nextCheckAt", "linkId");
CREATE INDEX "link_availability_tenantId_disabledAt_idx" ON link_availability("tenantId", "disabledAt");
CREATE TABLE availability_hosts (
  host VARCHAR(253) PRIMARY KEY,
  "nextCheckAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE url_revisions (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "linkId" TEXT NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "expectedVersion" INTEGER NOT NULL CHECK ("expectedVersion" > 0),
  status VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "decisionReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CHECK ((status='PENDING' AND "decidedAt" IS NULL AND "decisionReason" IS NULL) OR (status<>'PENDING' AND "decidedAt" IS NOT NULL AND length(trim("decisionReason")) BETWEEN 3 AND 500)),
  FOREIGN KEY ("linkId", "tenantId") REFERENCES links(id, "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX url_revisions_one_pending ON url_revisions("linkId") WHERE status='PENDING';
CREATE INDEX "url_revisions_tenantId_status_createdAt_id_idx" ON url_revisions("tenantId", status, "createdAt", id);
CREATE INDEX "url_revisions_linkId_createdAt_idx" ON url_revisions("linkId", "createdAt");
