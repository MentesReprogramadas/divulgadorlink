CREATE TABLE profile_revisions (
 id TEXT PRIMARY KEY,
 "profileId" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "ownerId" TEXT NOT NULL,
 version INTEGER NOT NULL CHECK (version > 0),
 snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
 "avatarAssetId" TEXT,
 imported BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT profile_revisions_profile_fk FOREIGN KEY ("profileId", "tenantId", "ownerId") REFERENCES profiles(id, "tenantId", "ownerId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT profile_revisions_avatar_check CHECK ("avatarAssetId" IS NULL OR "avatarAssetId" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX profile_revisions_version_key ON profile_revisions("profileId", version);
CREATE INDEX profile_revisions_owner_version_idx ON profile_revisions("tenantId", "ownerId", "profileId", version);
-- Only the current publication is recoverable from the previous schema. The date is the import date.
INSERT INTO profile_revisions(id, "profileId", "tenantId", "ownerId", version, snapshot, "avatarAssetId", imported)
SELECT md5('f19:' || id)::uuid::text, id, "tenantId", "ownerId", "publishedVersion", COALESCE("publishedDraft", publication), COALESCE("publishedDraft", publication)->>'avatarAssetId', true
FROM profiles WHERE "publishedVersion" IS NOT NULL AND jsonb_typeof(COALESCE("publishedDraft", publication)) = 'object';
CREATE FUNCTION prevent_profile_revision_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Published profile revisions are immutable'; END;
$$;
CREATE TRIGGER profile_revisions_immutable BEFORE UPDATE ON profile_revisions FOR EACH ROW EXECUTE FUNCTION prevent_profile_revision_update();
