-- Additive only: no existing account is opted in and no renewal preference is changed.
ALTER TABLE users ADD COLUMN "emailDigest" BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN "digestFrequency" VARCHAR(8) NOT NULL DEFAULT 'WEEKLY', ADD COLUMN "nextDigestAt" TIMESTAMP(3);
ALTER TABLE users ADD CONSTRAINT users_digest_frequency CHECK ("digestFrequency" IN ('WEEKLY','MONTHLY'));
CREATE UNIQUE INDEX niches_id_tenant_key ON niches(id,"tenantId");
CREATE INDEX links_digest_selection_idx ON links("tenantId","nicheId",status,id);
CREATE TABLE niche_follows (
 "tenantId" TEXT NOT NULL,"userId" TEXT NOT NULL,"nicheId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY("tenantId","userId","nicheId"),
 FOREIGN KEY("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 FOREIGN KEY("nicheId","tenantId") REFERENCES niches(id,"tenantId") ON DELETE CASCADE
);
CREATE TABLE niche_digest_receipts (
 "tenantId" TEXT NOT NULL,"userId" TEXT NOT NULL,"nicheId" TEXT NOT NULL,"linkId" TEXT NOT NULL,reason VARCHAR(8) NOT NULL,"seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY("tenantId","userId","nicheId","linkId"),
 FOREIGN KEY("tenantId","userId","nicheId") REFERENCES niche_follows("tenantId","userId","nicheId") ON DELETE CASCADE,
 FOREIGN KEY("linkId","tenantId") REFERENCES links(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT niche_digest_receipt_reason CHECK(reason IN ('BASELINE','SENT'))
);
CREATE TABLE niche_digest_batches (
 id TEXT NOT NULL PRIMARY KEY,"tenantId" TEXT NOT NULL,"userId" TEXT NOT NULL,status VARCHAR(8) NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"sentAt" TIMESTAMP(3),
 "tokenHash" TEXT NOT NULL UNIQUE,fingerprint TEXT NOT NULL,"linkIds" TEXT[] NOT NULL,payload JSONB,
 FOREIGN KEY("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT niche_digest_batch_status CHECK(status IN ('PENDING','SENT','SKIPPED','FAILED')),
 CONSTRAINT niche_digest_batch_attempts CHECK(attempts BETWEEN 0 AND 5)
);
CREATE UNIQUE INDEX niche_digest_one_pending_idx ON niche_digest_batches("tenantId","userId") WHERE status='PENDING';
CREATE INDEX niche_digest_due_idx ON niche_digest_batches(status,"nextAttemptAt",id);
CREATE INDEX niche_digest_owner_idx ON niche_digest_batches("tenantId","userId","createdAt");
CREATE INDEX users_digest_due_idx ON users("nextDigestAt",id) WHERE "emailDigest" AND status='ACTIVE';
