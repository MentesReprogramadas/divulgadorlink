CREATE TABLE profile_button_test_drafts (
 "profileId" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL, content JSONB, UNIQUE("profileId","tenantId","ownerId"),
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE TABLE profile_button_tests (
 id UUID PRIMARY KEY, "profileId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "revisionId" INTEGER NOT NULL CHECK("revisionId">0), config JSONB NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('RUNNING','COMPLETE','STOPPED')), version INTEGER NOT NULL DEFAULT 0,
 "startedAt" TIMESTAMPTZ NOT NULL, "endsAt" TIMESTAMPTZ NOT NULL, "stoppedAt" TIMESTAMPTZ,
 UNIQUE(id,"tenantId","profileId","ownerId"),
 FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CHECK("endsAt">"startedAt")
);
CREATE UNIQUE INDEX profile_button_test_running ON profile_button_tests("profileId") WHERE status='RUNNING';
CREATE INDEX profile_button_test_owner_time ON profile_button_tests("tenantId","ownerId","startedAt" DESC);
CREATE TABLE profile_button_test_visits (
 id UUID PRIMARY KEY, "experimentId" UUID NOT NULL, "tenantId" TEXT NOT NULL,"profileId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,
 "sessionHash" VARCHAR(64) NOT NULL, variant INTEGER NOT NULL CHECK(variant IN (0,1)),
 "exposedAt" TIMESTAMPTZ NOT NULL,"clickedAt" TIMESTAMPTZ,
 UNIQUE("experimentId","sessionHash"),
 FOREIGN KEY("experimentId","tenantId","profileId","ownerId") REFERENCES profile_button_tests(id,"tenantId","profileId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX profile_button_test_visit_retention ON profile_button_test_visits("exposedAt");
