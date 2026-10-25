import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'
import { sql } from './db'
import { roadmapApi } from './roadmap-profile'
import type { Fixture } from './ondas-visual-fixture'

/** A local, synthetic PREMIUM entitlement; never contacts a billing provider. */
export function grantRichBlocks(fixture: Pick<Fixture, 'tenantId' | 'ownerId'>) {
  expect(fixture.tenantId).toMatch(/^[a-zA-Z0-9_-]+$/)
  expect(fixture.ownerId).toMatch(/^[a-f0-9-]{36}$/)
  const existing = sql(`SELECT v.id FROM profile_plan_versions v JOIN profile_plans p ON p.id=v."planId" AND p."tenantId"=v."tenantId" WHERE v."tenantId"='${fixture.tenantId}' AND p.tier='PREMIUM' AND 'profile.richBlocks'=ANY(v.capabilities) ORDER BY v."createdAt" DESC LIMIT 1`)
  const plan = sql(`SELECT id FROM profile_plans WHERE "tenantId"='${fixture.tenantId}' AND tier='PREMIUM'`) || randomUUID()
  const version = existing || randomUUID(), account = randomUUID(), subscription = randomUUID()
  sql(`BEGIN;
    INSERT INTO profile_plans(id,"tenantId",tier,title,enabled,version,"createdAt","updatedAt") VALUES('${plan}','${fixture.tenantId}','PREMIUM','Fixture visual de conteúdo',false,0,now(),now()) ON CONFLICT("tenantId",tier) DO NOTHING;
    ${existing ? '' : `INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents",capabilities,"providerPriceId","providerProductId","createdAt") SELECT '${version}','${fixture.tenantId}','${plan}',coalesce(max(version),0)+1,1000,ARRAY['profile.page','profile.categories','profile.appearance','profile.history','profile.richBlocks'],'price_visual_${version.replaceAll('-', '')}','prod_visual_local',now() FROM profile_plan_versions WHERE "planId"='${plan}';`}
    INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","createdAt","updatedAt") VALUES('${account}','${fixture.tenantId}','${fixture.ownerId}',now(),now());
    INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","createdAt","updatedAt") VALUES('${subscription}','${fixture.tenantId}','${fixture.ownerId}','${account}','${version}','ACTIVE',now()-interval '1 day',now()+interval '30 days',now()+interval '30 days',now(),now());
    INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil") VALUES('${randomUUID()}','${fixture.tenantId}','${fixture.ownerId}','${subscription}','profile.richBlocks',now()-interval '1 day',now()+interval '30 days');
    COMMIT;`)
}

/** Uses the existing UI/prepareAvatar pipeline; the asset remains owned by this fixture. */
export async function uploadVisualProfilePhoto(page: Page, fixture: Pick<Fixture, 'origin'>, image: { bytes: Buffer; mime: string }) {
  await page.goto(fixture.origin + '/painel/perfil/dados')
  await expect(page.getByLabel('Nome da página', { exact: true })).toBeEnabled()
  const uploaded = page.waitForResponse(response => response.url().endsWith('/me/profile/avatar') && response.request().method() === 'POST')
  const extension = image.mime === 'image/webp' ? 'webp' : image.mime === 'image/png' ? 'png' : 'jpg'
  await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'capa-publica-de-fixture.' + extension, mimeType: image.mime, buffer: image.bytes })
  const response = await uploaded
  expect(response.status()).toBe(200)
  const assetId = (await response.json()).avatarAssetId as string
  await expect.poll(async () => (await roadmapApi(page, '/me/profile')).body.draft?.avatarAssetId).toBe(assetId)
  await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'saved')
  return assetId
}
