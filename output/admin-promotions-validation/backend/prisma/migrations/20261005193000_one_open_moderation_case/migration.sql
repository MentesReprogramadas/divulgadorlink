-- Envios antigos ficaram PENDING_MODERATION sem linha em moderation_cases.
-- A fila do admin só lê caso aberto, então esses links não apareciam.
INSERT INTO "moderation_cases" ("id", "tenantId", "linkId", "createdAt", "updatedAt")
SELECT
  'case_' || md5(l."id"),
  l."tenantId",
  l."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "links" l
WHERE l."status" = 'PENDING_MODERATION'
  AND NOT EXISTS (
    SELECT 1 FROM "moderation_cases" c
    WHERE c."linkId" = l."id" AND c."closedAt" IS NULL
  );

-- Um link só pode ter um caso aberto. Caso fechado libera o próximo.
CREATE UNIQUE INDEX "moderation_cases_one_open_per_link"
ON "moderation_cases" ("linkId")
WHERE "closedAt" IS NULL;
