CREATE UNIQUE INDEX profiles_id_tenant_key ON profiles(id,"tenantId");
CREATE TABLE agency_workspaces (
 id UUID PRIMARY KEY,"tenantId" TEXT NOT NULL,"agencyOwnerId" TEXT NOT NULL,"maxClients" INTEGER NOT NULL DEFAULT 10 CHECK("maxClients" BETWEEN 1 AND 100),
 CONSTRAINT agency_workspaces_owner_key UNIQUE("agencyOwnerId","tenantId"),UNIQUE(id,"tenantId","agencyOwnerId"),
 FOREIGN KEY("agencyOwnerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE TABLE agency_clients (
 id UUID PRIMARY KEY,"workspaceId" UUID NOT NULL,"tenantId" TEXT NOT NULL,"agencyOwnerId" TEXT NOT NULL,"profileId" TEXT NOT NULL,"clientOwnerId" TEXT NOT NULL,
 name TEXT NOT NULL CHECK(char_length(name) BETWEEN 1 AND 80),version INTEGER NOT NULL DEFAULT 0,"archivedAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("workspaceId","profileId"),UNIQUE(id,"tenantId","agencyOwnerId","profileId","clientOwnerId"),
 FOREIGN KEY("workspaceId","tenantId","agencyOwnerId") REFERENCES agency_workspaces(id,"tenantId","agencyOwnerId") ON DELETE CASCADE,
 FOREIGN KEY("profileId","tenantId","clientOwnerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE
);
CREATE TABLE agency_access_requests (
 id UUID PRIMARY KEY,"clientId" UUID NOT NULL,"tenantId" TEXT NOT NULL,"agencyOwnerId" TEXT NOT NULL,"profileId" TEXT NOT NULL,"clientOwnerId" TEXT NOT NULL,"userId" TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('EDITOR','VIEWER')),status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','DECLINED','REVOKED','EXPIRED')),
 "requestKey" UUID NOT NULL,version INTEGER NOT NULL DEFAULT 0,"expiresAt" TIMESTAMPTZ NOT NULL,
 "membershipId" TEXT REFERENCES profile_memberships(id) ON DELETE SET NULL,"membershipVersion" INTEGER,
 "workspaceMembershipId" TEXT,"workspaceMembershipVersion" INTEGER,"parentMembershipId" TEXT,"parentMembershipVersion" INTEGER,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("agencyOwnerId","requestKey"),
 FOREIGN KEY("clientId","tenantId","agencyOwnerId","profileId","clientOwnerId") REFERENCES agency_clients(id,"tenantId","agencyOwnerId","profileId","clientOwnerId") ON DELETE CASCADE,
 FOREIGN KEY("userId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE UNIQUE INDEX agency_access_pending ON agency_access_requests("clientId","userId") WHERE status='PENDING';
CREATE INDEX agency_access_client_inbox ON agency_access_requests("tenantId","clientOwnerId",status,"createdAt" DESC);
CREATE UNIQUE INDEX agency_access_derived_grant ON agency_access_requests("membershipId","membershipVersion") WHERE status='APPROVED';
CREATE TABLE agency_profile_transfers (
 id UUID PRIMARY KEY,"tenantId" TEXT NOT NULL,"profileId" TEXT NOT NULL,"sourceOwnerId" TEXT NOT NULL,"targetOwnerId" TEXT,
 "pageName" TEXT NOT NULL,"pageSlug" TEXT NOT NULL,"recipientHash" TEXT NOT NULL,"profileVersion" INTEGER NOT NULL,"requestKey" UUID NOT NULL,version INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED')),
 "expiresAt" TIMESTAMPTZ NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("sourceOwnerId","requestKey"),
 FOREIGN KEY("profileId","tenantId") REFERENCES profiles(id,"tenantId") ON DELETE CASCADE,
 FOREIGN KEY("sourceOwnerId","tenantId") REFERENCES users(id,"tenantId") ON DELETE CASCADE
);
CREATE UNIQUE INDEX agency_transfer_pending ON agency_profile_transfers("profileId") WHERE status='PENDING';
CREATE INDEX agency_transfer_recipient ON agency_profile_transfers("tenantId","recipientHash",status);

-- Defer only FKs that propagate the page owner's identity; other operations remain immediate.
DO $$ DECLARE row RECORD; BEGIN
 FOR row IN
  WITH RECURSIVE ownership(relid,attnum) AS (
   SELECT 'profiles'::regclass::oid,attnum FROM pg_attribute WHERE attrelid='profiles'::regclass AND attname='ownerId'
   UNION
   SELECT c.conrelid,c.conkey[k.n] FROM ownership o JOIN pg_constraint c ON c.confrelid=o.relid AND c.contype='f'
   JOIN LATERAL generate_subscripts(c.confkey,1) k(n) ON c.confkey[k.n]=o.attnum
  ) SELECT DISTINCT c.conrelid::regclass AS relation,c.conname FROM ownership o JOIN pg_constraint c ON c.confrelid=o.relid AND c.contype='f'
   JOIN LATERAL generate_subscripts(c.confkey,1) k(n) ON c.confkey[k.n]=o.attnum
 LOOP EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',row.relation,row.conname); END LOOP;
END $$;

CREATE OR REPLACE FUNCTION prevent_profile_revision_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('temlink.profile_transfer',true)=NEW."profileId"
  AND (to_jsonb(NEW)-'ownerId')=(to_jsonb(OLD)-'ownerId')
  AND EXISTS(SELECT 1 FROM profiles WHERE id=NEW."profileId" AND "tenantId"=NEW."tenantId" AND "ownerId"=NEW."ownerId")
 THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Published profile revisions are immutable';
END $$;
