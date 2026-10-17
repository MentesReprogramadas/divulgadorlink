ALTER TABLE "links" ADD COLUMN "acquisitionSource" TEXT;
ALTER TABLE "links" ADD COLUMN "acquisitionMedium" TEXT;
ALTER TABLE "links" ADD COLUMN "acquisitionCampaign" TEXT;
ALTER TABLE "links" ADD COLUMN "acquisitionContent" TEXT;
ALTER TABLE "links" ADD COLUMN "acquisitionTerm" TEXT;

CREATE TABLE "acquisition_touches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "landingPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acquisition_touches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "acquisition_touches_userId_key" ON "acquisition_touches"("userId");
CREATE INDEX "acquisition_touches_tenantId_campaign_idx" ON "acquisition_touches"("tenantId", "campaign");
ALTER TABLE "acquisition_touches" ADD CONSTRAINT "acquisition_touches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "funnel_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "linkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funnel_events_tenantId_eventId_key" ON "funnel_events"("tenantId", "eventId");
CREATE INDEX "funnel_events_tenantId_name_createdAt_idx" ON "funnel_events"("tenantId", "name", "createdAt");
