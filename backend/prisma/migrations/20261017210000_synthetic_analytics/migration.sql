CREATE TYPE "AnalyticsEventType" AS ENUM ('REAL', 'SYNTHETIC');
ALTER TABLE analytics_events
  ADD COLUMN type "AnalyticsEventType" NOT NULL DEFAULT 'REAL',
  ADD COLUMN "simulationId" TEXT;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_event_provenance CHECK (
  (type = 'REAL' AND "simulationId" IS NULL) OR
  (type = 'SYNTHETIC' AND "simulationId" IS NOT NULL)
);
CREATE INDEX "analytics_events_tenantId_type_simulationId_id_idx"
  ON analytics_events ("tenantId", type, "simulationId", id);
