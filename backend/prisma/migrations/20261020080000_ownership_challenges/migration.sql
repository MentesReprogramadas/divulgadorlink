CREATE TABLE ownership_challenges (
 id text PRIMARY KEY,
 "tenantId" text NOT NULL,
 "handleId" text NOT NULL,
 "ownerId" text NOT NULL,
 "revisionId" text NOT NULL,
 "destinationUrl" text NOT NULL,
 "tokenHash" text NOT NULL CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
 "createdAt" timestamptz NOT NULL DEFAULT now(),
 "expiresAt" timestamptz NOT NULL,
 "consumedAt" timestamptz,
 "verifiedAt" timestamptz,
 "validUntil" timestamptz,
 "revokedAt" timestamptz,
 CONSTRAINT ownership_handle_fk FOREIGN KEY ("handleId","tenantId","ownerId") REFERENCES redirect_handles(id,"tenantId","ownerId") ON DELETE CASCADE ON UPDATE CASCADE,
 CHECK ("expiresAt">"createdAt"),
 CHECK (("verifiedAt" IS NULL)=("validUntil" IS NULL)),
 CHECK ("verifiedAt" IS NULL OR "consumedAt" IS NOT NULL)
);
CREATE INDEX ownership_handle_idx ON ownership_challenges("tenantId","handleId","createdAt" DESC);
CREATE INDEX ownership_retention_idx ON ownership_challenges("createdAt");

CREATE FUNCTION revoke_changed_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."activeRevisionId" IS DISTINCT FROM OLD."activeRevisionId" OR NEW."ownerId" IS DISTINCT FROM OLD."ownerId" OR NEW.disabled THEN
  UPDATE ownership_challenges SET "revokedAt"=COALESCE("revokedAt",now()),"consumedAt"=COALESCE("consumedAt",now()) WHERE "handleId"=OLD.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ownership_destination_changed BEFORE UPDATE ON redirect_handles FOR EACH ROW EXECUTE FUNCTION revoke_changed_ownership();
