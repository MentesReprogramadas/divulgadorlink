-- EXPLAIN chooses the existing F03 partial index links_related_niche_idx.
-- Keep the already-applied creation migration immutable; remove only the redundant F05 index.
DROP INDEX IF EXISTS links_digest_selection_idx;
