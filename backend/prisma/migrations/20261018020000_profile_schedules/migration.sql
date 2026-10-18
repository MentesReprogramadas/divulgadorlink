-- Expand only. Old rows and old JSON snapshots mean no schedule.
ALTER TABLE profile_items
 ADD COLUMN "startsAt" TIMESTAMP(3),
 ADD COLUMN "endsAt" TIMESTAMP(3),
 ADD COLUMN "timeZone" TEXT,
 ADD COLUMN paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profile_items
 ADD CONSTRAINT profile_items_schedule_window CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" < "endsAt"),
 ADD CONSTRAINT profile_items_schedule_zone CHECK (
   ("timeZone" IS NULL AND "startsAt" IS NULL AND "endsAt" IS NULL AND NOT paused)
   OR ("timeZone" IS NOT NULL AND length("timeZone") BETWEEN 1 AND 100)
 );
