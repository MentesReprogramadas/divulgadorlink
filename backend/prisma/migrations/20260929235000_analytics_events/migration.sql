CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_events_sessionId_linkId_surface_day_kind_key" ON "analytics_events"("sessionId", "linkId", "surface", "day", "kind");
CREATE INDEX "analytics_events_tenantId_day_idx" ON "analytics_events"("tenantId", "day");
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
