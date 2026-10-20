CREATE TABLE profile_memberships (
 id TEXT PRIMARY KEY, "profileId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,"userId" TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('EDITOR','VIEWER')),status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REVOKED')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 FOREIGN KEY("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CHECK("ownerId"<>"userId"), UNIQUE("profileId","userId")
);
CREATE INDEX profile_memberships_tenant_user_status_idx ON profile_memberships("tenantId","userId",status);
CREATE TABLE profile_invitations (
 id TEXT PRIMARY KEY,"profileId" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('EDITOR','VIEWER')),"recipientHash" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"requestKey" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE, UNIQUE("profileId","requestKey")
);
CREATE INDEX profile_invitations_profile_created_idx ON profile_invitations("profileId","createdAt");
