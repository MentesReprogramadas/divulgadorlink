CREATE TABLE profile_content_blocks (
 "profileId" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,content JSONB NOT NULL,
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 CHECK(jsonb_typeof(content)='array')
);
