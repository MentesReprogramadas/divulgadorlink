CREATE TABLE "profile_measurements" (
 "profileId" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT false,"version" INTEGER NOT NULL DEFAULT 0 CHECK ("version">=0),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "profile_measurements_profile_fkey" FOREIGN KEY ("profileId","tenantId","ownerId") REFERENCES "profiles"("id","tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE TABLE "profile_interaction_events" (
 "id" TEXT PRIMARY KEY,"eventId" UUID NOT NULL,"tenantId" TEXT NOT NULL,"profileId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,
 "revisionId" INTEGER NOT NULL CHECK ("revisionId">0),"blockId" UUID,"kind" TEXT NOT NULL,"viewportBucket" TEXT NOT NULL,"scrollBucket" INTEGER,
 "sessionKey" VARCHAR(64) NOT NULL CHECK ("sessionKey" ~ '^[a-f0-9]{64}$'),"dedupeKey" VARCHAR(64) NOT NULL CHECK ("dedupeKey" ~ '^[a-f0-9]{64}$'),
 "day" DATE NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "profile_interaction_events_profile_fkey" FOREIGN KEY ("profileId","tenantId","ownerId") REFERENCES "profiles"("id","tenantId","ownerId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "profile_interaction_kind_check" CHECK ("kind" IN ('PAGE','IMPRESSION','CLICK','SCROLL')),
 CONSTRAINT "profile_interaction_viewport_check" CHECK ("viewportBucket" IN ('MOBILE','TABLET','DESKTOP')),
 CONSTRAINT "profile_interaction_block_check" CHECK (("kind" IN ('IMPRESSION','CLICK')) = ("blockId" IS NOT NULL)),
 CONSTRAINT "profile_interaction_scroll_check" CHECK (("kind"='SCROLL' AND "scrollBucket" IS NOT NULL AND "scrollBucket" IN (25,50,75,100)) OR ("kind"<>'SCROLL' AND "scrollBucket" IS NULL))
);
CREATE UNIQUE INDEX "profile_measurements_identity_key" ON "profile_measurements"("profileId","tenantId","ownerId");
CREATE UNIQUE INDEX "profile_events_event_key" ON "profile_interaction_events"("tenantId","eventId");
CREATE UNIQUE INDEX "profile_events_dedupe_key" ON "profile_interaction_events"("tenantId","profileId","dedupeKey");
CREATE INDEX "profile_events_context_time_idx" ON "profile_interaction_events"("tenantId","profileId","revisionId","createdAt");
CREATE INDEX "profile_events_retention_idx" ON "profile_interaction_events"("createdAt");
