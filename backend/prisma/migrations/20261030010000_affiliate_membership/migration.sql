CREATE TABLE "affiliate_membership_tracking" (
 "groupId" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'BASELINING', "baselineAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
 "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "receivedDuringBaseline" INTEGER NOT NULL DEFAULT 0, "lastReceivedAt" TIMESTAMP(3), "lastErrorCode" TEXT,
 CONSTRAINT "affiliate_membership_tracking_group_fkey" FOREIGN KEY ("groupId", "tenantId") REFERENCES "affiliate_groups"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "affiliate_membership_tracking_groupId_tenantId_key" ON "affiliate_membership_tracking"("groupId", "tenantId");
CREATE INDEX "affiliate_membership_tracking_expiresAt_idx" ON "affiliate_membership_tracking"("expiresAt");
CREATE TABLE "affiliate_membership_states" (
 "tenantId" TEXT NOT NULL, "groupId" TEXT NOT NULL, "identityHash" CHAR(64) NOT NULL,
 "present" BOOLEAN NOT NULL, "lastEventAt" TIMESTAMP(3) NOT NULL,
 PRIMARY KEY ("tenantId", "groupId", "identityHash"),
 CONSTRAINT "affiliate_membership_states_tracking_fkey" FOREIGN KEY ("groupId", "tenantId") REFERENCES "affiliate_membership_tracking"("groupId", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "affiliate_membership_daily" (
 "tenantId" TEXT NOT NULL, "groupId" TEXT NOT NULL, "day" DATE NOT NULL,
 "joins" INTEGER NOT NULL DEFAULT 0, "leaves" INTEGER NOT NULL DEFAULT 0, "rejoins" INTEGER NOT NULL DEFAULT 0, "staleEvents" INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY ("tenantId", "groupId", "day"),
 CONSTRAINT "affiliate_membership_daily_tracking_fkey" FOREIGN KEY ("groupId", "tenantId") REFERENCES "affiliate_membership_tracking"("groupId", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
