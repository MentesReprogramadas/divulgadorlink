-- Campaigns copy an owned approved snapshot; existing profiles and events remain unchanged.
CREATE TABLE campaign_pages (
 id TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"ownerId" TEXT NOT NULL,"profileId" TEXT NOT NULL,
 name VARCHAR(80) NOT NULL,slug VARCHAR(40) NOT NULL,state VARCHAR(12) NOT NULL DEFAULT 'DRAFT',
 "sourceRevisionId" TEXT NOT NULL,"sourceVersion" INTEGER NOT NULL,"sourceSnapshot" JSONB NOT NULL,content JSONB NOT NULL,publication JSONB,
 version INTEGER NOT NULL DEFAULT 1,"publishedVersion" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT campaign_pages_profile_fk FOREIGN KEY("profileId","tenantId","ownerId") REFERENCES profiles(id,"tenantId","ownerId") ON DELETE CASCADE,
 CONSTRAINT campaign_pages_profile_slug_key UNIQUE("profileId",slug),
 CONSTRAINT campaign_pages_identity_key UNIQUE(id,"tenantId","profileId","ownerId"),
 CONSTRAINT campaign_pages_state CHECK(state IN ('DRAFT','PUBLISHED','ARCHIVED')),
 CONSTRAINT campaign_pages_versions CHECK(version>0 AND ("publishedVersion" IS NULL OR ("publishedVersion">0 AND "publishedVersion"<=version))),
 CONSTRAINT campaign_pages_shape CHECK(jsonb_typeof("sourceSnapshot")='object' AND jsonb_typeof(content)='object')
);
CREATE INDEX campaign_pages_owner_idx ON campaign_pages("tenantId","ownerId","createdAt",id);
ALTER TABLE profile_interaction_events ADD COLUMN "campaignId" TEXT;
ALTER TABLE profile_interaction_events ADD CONSTRAINT profile_events_campaign_fk FOREIGN KEY("campaignId","tenantId","profileId","ownerId") REFERENCES campaign_pages(id,"tenantId","profileId","ownerId") ON DELETE CASCADE;
CREATE INDEX profile_events_campaign_time_idx ON profile_interaction_events("tenantId","campaignId","revisionId","createdAt") WHERE "campaignId" IS NOT NULL;
