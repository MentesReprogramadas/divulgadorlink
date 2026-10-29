CREATE TABLE "affiliate_invite_metrics" (
  "segmentId" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "buttonClicks" INTEGER NOT NULL DEFAULT 0,
  "automaticRedirects" INTEGER NOT NULL DEFAULT 0,
  "buttonRedirects" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "affiliate_invite_metrics_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "affiliate_invite_metrics_segmentId_tenantId_key" ON "affiliate_invite_metrics"("segmentId", "tenantId");
CREATE TABLE "affiliate_invite_events" (
  "tenantId" TEXT NOT NULL,
  "segmentId" TEXT NOT NULL,
  "eventId" UUID NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('VIEW','BUTTON_CLICK','AUTOMATIC_REDIRECT','BUTTON_REDIRECT')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("tenantId", "segmentId", "eventId", "kind"),
  CONSTRAINT "affiliate_invite_events_segmentId_tenantId_fkey" FOREIGN KEY ("segmentId", "tenantId") REFERENCES "affiliate_segments"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "affiliate_invite_events_createdAt_idx" ON "affiliate_invite_events"("createdAt");
