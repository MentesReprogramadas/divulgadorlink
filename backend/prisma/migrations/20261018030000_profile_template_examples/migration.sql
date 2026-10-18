-- Additive provenance marker. Old items and old JSON snapshots remain ordinary content.
ALTER TABLE profile_items ADD COLUMN "templateExample" BOOLEAN NOT NULL DEFAULT false;
