ALTER TABLE users ADD COLUMN "emailRenewal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN "notificationVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE renewal_reminders (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  channel VARCHAR(12) NOT NULL DEFAULT 'EMAIL' CHECK (channel='EMAIL'),
  "deliveryKey" TEXT NOT NULL UNIQUE,
  status VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','SKIPPED','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  payload JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("promotionId", "tenantId") REFERENCES promotions(id, "tenantId") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("tenantId", "promotionId", "expiresAt", channel)
);
CREATE INDEX renewal_reminders_due_idx ON renewal_reminders(status, "nextAttemptAt", id);
CREATE INDEX promotions_renewal_due_idx ON promotions("expiresAt", id) WHERE status='ACTIVE' AND NOT administrative;
