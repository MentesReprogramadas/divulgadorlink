CREATE UNIQUE INDEX "redirect_destinations_review_identity_key" ON "redirect_destinations"("id", "tenantId");
CREATE TABLE "content_reviews" (
 "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "profileId" TEXT, "redirectRevisionId" TEXT, "version" INTEGER NOT NULL,
 "snapshot" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "reason" TEXT,
 "appealText" TEXT, "appealedAt" TIMESTAMP(3), "resolvedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "content_reviews_owner_fk" FOREIGN KEY ("ownerId", "tenantId") REFERENCES "users"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "content_reviews_profile_fk" FOREIGN KEY ("profileId", "tenantId", "ownerId") REFERENCES "profiles"("id", "tenantId", "ownerId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "content_reviews_redirect_fk" FOREIGN KEY ("redirectRevisionId", "tenantId") REFERENCES "redirect_destinations"("id", "tenantId") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "content_reviews_kind_check" CHECK (("kind" = 'PROFILE' AND "profileId" IS NOT NULL AND "redirectRevisionId" IS NULL) OR ("kind" = 'REDIRECT' AND "redirectRevisionId" IS NOT NULL AND "profileId" IS NULL)),
 CONSTRAINT "content_reviews_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','SUPERSEDED'))
);
CREATE UNIQUE INDEX "content_reviews_profile_version_key" ON "content_reviews"("profileId", "version");
CREATE UNIQUE INDEX "content_reviews_redirect_key" ON "content_reviews"("redirectRevisionId");
CREATE INDEX "content_reviews_queue_idx" ON "content_reviews"("tenantId", "kind", "status", "createdAt");
ALTER TABLE "redirect_destinations" DROP CONSTRAINT "redirect_destinations_status_check";
ALTER TABLE "redirect_destinations" ADD CONSTRAINT "redirect_destinations_status_check" CHECK (status IN ('PENDING','PENDING_REVIEW','APPROVED','REJECTED','BLOCKED','FAILED','SUPERSEDED'));

CREATE UNIQUE INDEX "content_reviews_redirect_identity_key" ON "content_reviews"("redirectRevisionId", "tenantId");
