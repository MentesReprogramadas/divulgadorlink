-- Additive metadata only. Existing authoring/publication JSON and items remain unchanged.
CREATE TABLE "profile_channel_drafts" (
 "profileId" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "ownerId" TEXT NOT NULL,
 "settings" JSONB NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "profile_channel_drafts_pkey" PRIMARY KEY ("profileId"),
 CONSTRAINT "profile_channel_drafts_identity_key" UNIQUE ("profileId","tenantId","ownerId"),
 CONSTRAINT "profile_channel_drafts_shape" CHECK (COALESCE(
  jsonb_typeof(settings)='object' AND settings->'schemaVersion'='1'::jsonb
  AND jsonb_typeof(settings->'groups')='array' AND octet_length(settings::text)<=300000
 ,FALSE)),
 CONSTRAINT "profile_channel_drafts_profile_fk" FOREIGN KEY ("profileId","tenantId","ownerId")
  REFERENCES "profiles"("id","tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE TABLE "profile_channel_revisions" (
 "profileId" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "ownerId" TEXT NOT NULL,
 "version" INTEGER NOT NULL,
 "settings" JSONB NOT NULL,
 CONSTRAINT "profile_channel_revisions_pkey" PRIMARY KEY ("profileId","version"),
 CONSTRAINT "profile_channel_revisions_shape" CHECK (COALESCE(
  version>0 AND jsonb_typeof(settings)='object' AND settings->'schemaVersion'='1'::jsonb
  AND jsonb_typeof(settings->'groups')='array' AND octet_length(settings::text)<=300000
 ,FALSE)),
 CONSTRAINT "profile_channel_revisions_profile_fk" FOREIGN KEY ("profileId","tenantId","ownerId")
  REFERENCES "profiles"("id","tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "profile_channel_revisions_revision_fk" FOREIGN KEY ("profileId","version")
  REFERENCES "profile_revisions"("profileId","version") ON DELETE CASCADE ON UPDATE NO ACTION
);
