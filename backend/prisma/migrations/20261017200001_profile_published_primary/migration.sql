-- A catalog entry may have been removed after publication. Backfilled authoring
-- snapshots must not retain a primary reference whose item no longer exists.
UPDATE "profiles" p
SET "publishedDraft" = jsonb_set(p."publishedDraft", '{primaryItemId}', 'null'::jsonb)
WHERE p."publishedDraft"->>'primaryItemId' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p."publishedDraft"->'items') item
    WHERE item->>'id' = p."publishedDraft"->>'primaryItemId'
  );
