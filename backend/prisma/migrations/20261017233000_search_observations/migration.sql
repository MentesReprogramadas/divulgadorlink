CREATE TABLE "search_observations" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "term" TEXT NOT NULL CHECK (length("term") BETWEEN 1 AND 120),
 "sessionKey" TEXT NOT NULL CHECK ("sessionKey" ~ '^[a-f0-9]{64}$'),
 "day" DATE NOT NULL,
 "outcome" TEXT NOT NULL CHECK ("outcome" IN ('SUCCESS','FAILED','GATED')),
 "resultCount" INTEGER,
 "resultIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "nicheIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "networkIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "clickedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "search_observations_result_check" CHECK (
  ("outcome" = 'SUCCESS' AND "resultCount" IS NOT NULL AND "resultCount" >= 0 AND "resultCount" = cardinality("resultIds")) OR
  ("outcome" <> 'SUCCESS' AND "resultCount" IS NULL AND cardinality("resultIds") = 0 AND "clickedAt" IS NULL)
 )
);
CREATE UNIQUE INDEX "search_observations_tenantId_sessionKey_day_term_outcome_key" ON "search_observations"("tenantId","sessionKey","day","term","outcome");
CREATE INDEX "search_observations_tenantId_createdAt_idx" ON "search_observations"("tenantId","createdAt");
CREATE INDEX "search_observations_tenantId_sessionKey_day_idx" ON "search_observations"("tenantId","sessionKey","day");
