CREATE UNIQUE INDEX "profile_content_blocks_profileId_tenantId_ownerId_key"
ON "profile_content_blocks"("profileId", "tenantId", "ownerId");
