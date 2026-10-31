UPDATE "affiliate_broadcasts" b
SET "productSnapshot" = b."productSnapshot" || jsonb_build_object('itemId', o."itemId", 'productUrl', o."productUrl", 'checkedAt', to_char(o."checkedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
FROM "affiliate_offers" o
WHERE o.id = b."offerId" AND o."tenantId" = b."tenantId"
AND o."itemId" IS NOT NULL AND b."productSnapshot" IS NOT NULL;
