-- The existing ownership transfer updates dependent rows in one deferred transaction.
ALTER TABLE profile_content_blocks ALTER CONSTRAINT "profile_content_blocks_profileId_tenantId_ownerId_fkey" DEFERRABLE INITIALLY IMMEDIATE;
