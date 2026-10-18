ALTER TABLE "links" ADD COLUMN "cityId" TEXT,
 ADD COLUMN "languageTag" TEXT,
 ADD COLUMN "modality" TEXT,
 ADD COLUMN "discoveryVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "links" ADD CONSTRAINT "links_city_shape" CHECK ("cityId" IS NULL OR "cityId" ~ '^[0-9]{7}$'),
 ADD CONSTRAINT "links_language_shape" CHECK ("languageTag" IS NULL OR "languageTag" ~ '^[a-z]{2}$'),
 ADD CONSTRAINT "links_modality_values" CHECK ("modality" IS NULL OR "modality" IN ('ONLINE','PRESENTIAL')),
 ADD CONSTRAINT "links_discovery_version_nonnegative" CHECK ("discoveryVersion" >= 0);
