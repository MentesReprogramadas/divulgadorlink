CREATE TABLE profile_translations (
 "profileId" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,content JSONB NOT NULL,
 UNIQUE("profileId","tenantId","ownerId"),
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 CHECK(jsonb_typeof(content)='object')
);
