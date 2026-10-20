CREATE TABLE profile_suggestion_usage (
 "tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,day DATE NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),"reservedMicros" INTEGER NOT NULL DEFAULT 0 CHECK("reservedMicros">=0),
 "inputTokens" INTEGER NOT NULL DEFAULT 0,"outputTokens" INTEGER NOT NULL DEFAULT 0,"estimatedMicros" INTEGER NOT NULL DEFAULT 0,"knownAttempts" INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY("tenantId","ownerId",day),
 CHECK("inputTokens">=0 AND "outputTokens">=0 AND "estimatedMicros">=0 AND "knownAttempts">=0),
 FOREIGN KEY("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE INDEX profile_suggestion_usage_retention_idx ON profile_suggestion_usage(day);
CREATE TABLE profile_suggestions (
 id TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,"requestKey" TEXT NOT NULL,fingerprint TEXT NOT NULL,
 "baseVersion" INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('PENDING','READY','FAILED','APPLIED','DISCARDED')),
 source JSONB,plan JSONB,"usageRecorded" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"appliedVersion" INTEGER,
 UNIQUE("tenantId","ownerId","requestKey"),
 FOREIGN KEY("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE INDEX profile_suggestions_owner_page_idx ON profile_suggestions("tenantId","ownerId","createdAt");
CREATE INDEX profile_suggestions_retention_idx ON profile_suggestions("expiresAt");
