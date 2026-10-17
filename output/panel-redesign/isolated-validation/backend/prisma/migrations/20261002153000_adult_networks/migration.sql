ALTER TABLE "networks" ADD COLUMN "requiresAge" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "networks" ("id", "tenantId", "name", "slug", "knownHosts", "isPublicFacet", "requiresAge", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t.id, v.name, v.slug, v.hosts::text[], true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants" t
CROSS JOIN (VALUES
    ('OnlyFans', 'onlyfans', '{onlyfans.com}'),
    ('Privacy', 'privacy', '{privacy.com.br}'),
    ('Fansly', 'fansly', '{fansly.com}'),
    ('Fatal Model', 'fatal-model', '{fatalmodel.com}')
) AS v(name, slug, hosts)
ON CONFLICT ("tenantId", "slug") DO NOTHING;
