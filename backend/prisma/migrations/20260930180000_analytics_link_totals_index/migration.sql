-- CreateIndex
CREATE INDEX "analytics_events_tenantId_linkId_day_idx" ON "analytics_events"("tenantId", "linkId", "day");
