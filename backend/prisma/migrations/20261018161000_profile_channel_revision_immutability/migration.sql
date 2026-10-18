-- The same immutable-history contract and trigger function already used by F19.
-- Metadata can be appended for a publication; it cannot rewrite that publication's history.
CREATE TRIGGER profile_channel_revisions_immutable
BEFORE UPDATE ON profile_channel_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_profile_revision_update();
