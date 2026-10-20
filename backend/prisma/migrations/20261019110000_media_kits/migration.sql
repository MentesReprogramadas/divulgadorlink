CREATE TABLE media_kit_configs (
 "profileId" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,draft JSONB NOT NULL,publication JSONB,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),"publishedVersion" INTEGER,"sourceVersion" INTEGER,"publishedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 CHECK((publication IS NULL AND "publishedVersion" IS NULL AND "publishedAt" IS NULL) OR (publication IS NOT NULL AND "publishedVersion" IS NOT NULL AND "publishedAt" IS NOT NULL))
);
