CREATE TABLE profile_discovery (
  "profileId" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  "nicheId" TEXT,
  FOREIGN KEY ("profileId", "tenantId", "ownerId") REFERENCES profiles(id, "tenantId", "ownerId") ON DELETE CASCADE,
  FOREIGN KEY ("nicheId", "tenantId") REFERENCES niches(id, "tenantId") ON DELETE RESTRICT
);
CREATE INDEX profile_discovery_enabled_idx ON profile_discovery ("tenantId", "profileId") WHERE enabled;
CREATE UNIQUE INDEX "profile_discovery_profileId_tenantId_ownerId_key" ON profile_discovery ("profileId","tenantId","ownerId");
CREATE INDEX profile_discovery_niche_idx ON profile_discovery ("tenantId", "nicheId", "profileId") WHERE enabled;
CREATE TABLE profile_follows (
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "profileOwnerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("tenantId", "userId", "profileId"),
  FOREIGN KEY ("userId", "tenantId") REFERENCES users(id, "tenantId") ON DELETE CASCADE,
  FOREIGN KEY ("profileId", "tenantId", "profileOwnerId") REFERENCES profiles(id, "tenantId", "ownerId") ON DELETE CASCADE
);
