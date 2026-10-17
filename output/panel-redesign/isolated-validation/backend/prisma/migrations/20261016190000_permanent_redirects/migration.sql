CREATE TABLE redirect_handles (
 id TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "creationKey" TEXT NOT NULL, "creationHash" TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0), "activeRevisionId" TEXT,
 disabled BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT redirect_handles_owner_fk FOREIGN KEY("ownerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT redirect_handles_identity_key UNIQUE(id,"tenantId"),
 CONSTRAINT redirect_handles_creation_key UNIQUE("tenantId","ownerId","creationKey")
);
CREATE INDEX redirect_handles_owner_page_idx ON redirect_handles("tenantId","ownerId",id);
CREATE TABLE redirect_destinations (
 id TEXT PRIMARY KEY, "handleId" TEXT NOT NULL, "tenantId" TEXT NOT NULL,
 number INTEGER NOT NULL CHECK(number > 0), "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 label TEXT NOT NULL, "destinationUrl" TEXT NOT NULL, "requiresAge" BOOLEAN NOT NULL DEFAULT false,
 status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','BLOCKED','FAILED','SUPERSEDED')),
 "errorMessage" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
 CONSTRAINT redirect_destinations_handle_fk FOREIGN KEY("handleId","tenantId") REFERENCES redirect_handles(id,"tenantId") ON DELETE CASCADE,
 CONSTRAINT redirect_destinations_number_key UNIQUE("handleId",number),
 CONSTRAINT redirect_destinations_request_key UNIQUE("handleId","requestKey"),
 CONSTRAINT redirect_destinations_identity_key UNIQUE("handleId","tenantId",id)
);
CREATE INDEX redirect_destinations_retention_idx ON redirect_destinations("createdAt");
ALTER TABLE redirect_handles ADD CONSTRAINT redirect_handles_active_fk FOREIGN KEY(id,"tenantId","activeRevisionId") REFERENCES redirect_destinations("handleId","tenantId",id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE redirect_daily (
 "revisionId" TEXT NOT NULL REFERENCES redirect_destinations(id) ON DELETE CASCADE,
 day DATE NOT NULL, accesses INTEGER NOT NULL DEFAULT 0 CHECK(accesses >= 0),
 PRIMARY KEY("revisionId",day)
);
CREATE INDEX redirect_daily_retention_idx ON redirect_daily(day);

CREATE FUNCTION ensure_redirect_active_approved() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."activeRevisionId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM redirect_destinations WHERE id=NEW."activeRevisionId" AND "handleId"=NEW.id AND "tenantId"=NEW."tenantId" AND status='APPROVED'
 ) THEN RAISE EXCEPTION 'Active redirect must reference its approved destination' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER redirect_handles_active_approved BEFORE INSERT OR UPDATE OF "activeRevisionId" ON redirect_handles FOR EACH ROW EXECUTE FUNCTION ensure_redirect_active_approved();
