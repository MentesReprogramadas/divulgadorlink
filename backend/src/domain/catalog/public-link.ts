export const PUBLIC_LINK_FILTER = `l."ownerHidden" = false AND l."status" = 'PUBLISHED' AND NOT EXISTS (
  SELECT 1 FROM "users" owner
  WHERE owner."id" = l."ownerId" AND owner."status" = 'BANNED'
)`
