ALTER TABLE profile_items ADD COLUMN event jsonb;
ALTER TABLE profile_items ADD CONSTRAINT profile_event_object CHECK (event IS NULL OR (type='URL' AND jsonb_typeof(event)='object'));
