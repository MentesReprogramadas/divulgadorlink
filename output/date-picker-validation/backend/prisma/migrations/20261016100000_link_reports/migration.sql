CREATE TYPE "ReportReason" AS ENUM ('EXPIRED_INVITE', 'UNAVAILABLE_DESTINATION', 'SPAM', 'INAPPROPRIATE_CONTENT');
CREATE TYPE "ReportKind" AS ENUM ('AVAILABILITY', 'CONTENT');
CREATE TYPE "ReportStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'RESOLVED');
CREATE UNIQUE INDEX "links_id_tenantId_key" ON "links"("id", "tenantId");
CREATE TABLE "link_reports" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "reporterKey" CHAR(64) NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "kind" "ReportKind" NOT NULL,
  "comment" VARCHAR(500) NOT NULL DEFAULT '',
  "status" "ReportStatus" NOT NULL DEFAULT 'RECEIVED',
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "decisionReason" VARCHAR(500),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "link_reports_kind_check" CHECK (("reason" IN ('EXPIRED_INVITE','UNAVAILABLE_DESTINATION') AND "kind"='AVAILABILITY') OR ("reason" IN ('SPAM','INAPPROPRIATE_CONTENT') AND "kind"='CONTENT')),
  CONSTRAINT "link_reports_decision_check" CHECK (("status"='RECEIVED' AND "decisionReason" IS NULL) OR ("status"<>'RECEIVED' AND length(trim("decisionReason")) BETWEEN 3 AND 500 AND "decisionReason" IS NOT NULL)),
  CONSTRAINT "link_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "link_reports_linkId_tenantId_fkey" FOREIGN KEY ("linkId","tenantId") REFERENCES "links"("id","tenantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "link_reports_tenantId_reporterKey_createdAt_idx" ON "link_reports"("tenantId","reporterKey","createdAt");
CREATE INDEX "link_reports_dedup_idx" ON "link_reports"("tenantId","linkId","reporterKey","reason","createdAt");
CREATE INDEX "link_reports_tenantId_status_kind_createdAt_id_idx" ON "link_reports"("tenantId","status","kind","createdAt","id");
CREATE INDEX "link_reports_tenantId_createdAt_id_idx" ON "link_reports"("tenantId","createdAt","id");
