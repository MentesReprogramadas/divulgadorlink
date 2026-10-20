CREATE TABLE workspace_memberships (
 id TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,"userId" TEXT NOT NULL,
 grants JSONB NOT NULL DEFAULT '{}',version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 "revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 FOREIGN KEY("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CHECK("ownerId"<>"userId"),UNIQUE("tenantId","ownerId","userId")
);
CREATE INDEX workspace_memberships_user_idx ON workspace_memberships("tenantId","userId","revokedAt");
CREATE TABLE workspace_invitations (
 id TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,grants JSONB NOT NULL,
 "recipientHash" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"requestKey" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 UNIQUE("tenantId","ownerId","requestKey")
);
CREATE INDEX workspace_invitations_owner_idx ON workspace_invitations("tenantId","ownerId","createdAt");
