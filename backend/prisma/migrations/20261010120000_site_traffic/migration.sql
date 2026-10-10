CREATE TABLE "site_traffic_daily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "entries" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "site_traffic_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_traffic_daily_tenantId_day_path_source_medium_campaign_key" ON "site_traffic_daily"("tenantId", "day", "path", "source", "medium", "campaign");
CREATE INDEX "site_traffic_daily_tenantId_day_idx" ON "site_traffic_daily"("tenantId", "day");

CREATE TABLE "consent_daily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "choice" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "consent_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consent_daily_tenantId_day_choice_key" ON "consent_daily"("tenantId", "day", "choice");
