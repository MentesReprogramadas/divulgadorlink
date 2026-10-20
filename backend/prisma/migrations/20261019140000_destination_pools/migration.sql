ALTER TABLE redirect_handles ADD CONSTRAINT redirect_handles_owner_identity_key UNIQUE(id,"tenantId","ownerId");
CREATE TABLE destination_pools (
 "handleId" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), cursor BIGINT NOT NULL DEFAULT 0 CHECK(cursor>=0), enabled BOOLEAN NOT NULL DEFAULT true,
 UNIQUE("handleId","tenantId"), UNIQUE("handleId","tenantId","ownerId"),
 FOREIGN KEY("handleId","tenantId","ownerId") REFERENCES redirect_handles(id,"tenantId","ownerId") ON DELETE CASCADE
);
CREATE TABLE destination_pool_members (
 "poolId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "revisionId" TEXT NOT NULL,
 position INTEGER NOT NULL CHECK(position>=0), weight INTEGER NOT NULL CHECK(weight BETWEEN 1 AND 100), paused BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY("poolId","revisionId"), UNIQUE("poolId",position),
 FOREIGN KEY("poolId","tenantId") REFERENCES destination_pools("handleId","tenantId") ON DELETE CASCADE,
 FOREIGN KEY("revisionId","tenantId") REFERENCES redirect_destinations(id,"tenantId") ON DELETE CASCADE
);
CREATE TABLE destination_pool_daily (
 "poolId" TEXT NOT NULL REFERENCES destination_pools("handleId") ON DELETE CASCADE,
 "revisionId" TEXT NOT NULL, day DATE NOT NULL, accesses INTEGER NOT NULL DEFAULT 0 CHECK(accesses>=0),
 PRIMARY KEY("poolId","revisionId",day)
);
CREATE INDEX destination_pool_daily_retention_idx ON destination_pool_daily(day);
