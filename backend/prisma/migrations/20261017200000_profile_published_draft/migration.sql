ALTER TABLE "profiles" ADD COLUMN "publishedDraft" JSONB;

-- Prefer the approved authoring snapshot. When draft and publication still match,
-- reconstruct the complete draft, including hidden groups and links.
UPDATE "profiles" p SET "publishedDraft" = COALESCE(
  (SELECT r.snapshot FROM content_reviews r WHERE r."profileId" = p.id AND r.version = p."publishedVersion" AND r.status = 'APPROVED' LIMIT 1),
  CASE WHEN p.version = p."publishedVersion" THEN
    jsonb_build_object('slug', p.slug, 'name', p.name, 'bio', p.bio,
      'avatarAssetId', p."avatarAssetId", 'requiresAge', p."requiresAge", 'primaryItemId', p."primaryItemId",
      'categories', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'visible', c.visible) ORDER BY c.position) FROM profile_categories c WHERE c."profileId" = p.id), '[]'::jsonb),
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'categoryId', i."categoryId", 'type', i.type, 'label', i.label, 'destination', i.destination, 'visible', i.visible) ORDER BY i.position) FROM profile_items i WHERE i."profileId" = p.id), '[]'::jsonb)
    ) || CASE WHEN p.appearance IS NOT NULL AND p.appearance <> 'null'::jsonb THEN jsonb_build_object('appearance', p.appearance) ELSE '{}'::jsonb END
  ELSE p.publication END
) WHERE p.publication IS NOT NULL AND p.publication <> 'null'::jsonb;
