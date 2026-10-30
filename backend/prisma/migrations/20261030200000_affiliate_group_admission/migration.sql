ALTER TABLE affiliate_segments
 ADD COLUMN "groupPolicyEnabled" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "groupDisappearingSeconds" INTEGER NOT NULL DEFAULT 604800 CHECK ("groupDisappearingSeconds" IN (0,86400,604800,7776000)),
 ADD COLUMN "groupJoinApproval" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "groupAutoApproveDelaySeconds" INTEGER NOT NULL DEFAULT 120 CHECK ("groupAutoApproveDelaySeconds" BETWEEN 120 AND 86400);
ALTER TABLE affiliate_groups
 ADD COLUMN "groupPolicyState" TEXT NOT NULL DEFAULT 'PENDING',
 ADD COLUMN "groupPolicyErrorCode" TEXT,
 ADD COLUMN "groupPolicyAppliedHash" TEXT,
 ADD COLUMN "groupPolicyNextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "groupPolicyLeaseToken" TEXT,
 ADD COLUMN "groupPolicyLeaseExpiresAt" TIMESTAMP(3);
CREATE TABLE affiliate_group_admissions (
 id TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL,
 "groupId" TEXT NOT NULL,
 "participantHash" TEXT NOT NULL,
 "encryptedJid" TEXT,
 state TEXT NOT NULL DEFAULT 'PENDING',
 "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "eligibleAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("groupId","tenantId") REFERENCES affiliate_groups(id,"tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX affiliate_group_admissions_group_hash_key ON affiliate_group_admissions("groupId","participantHash");
CREATE INDEX affiliate_group_admissions_due_idx ON affiliate_group_admissions("tenantId","groupId",state,"eligibleAt");
