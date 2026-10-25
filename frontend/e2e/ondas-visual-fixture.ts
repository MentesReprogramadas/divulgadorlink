import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { roadmapApi } from './roadmap-profile'
import { capturePage } from './capture-page'
import { observeOndasPage } from './ondas-visual-capture'
import { appearanceThemes } from '../src/features/profiles/profile-appearance'

// The known E2E host composes the moderation stub; every case owns separate users and resources.
export function isolatedFixture() {
  const source = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).checklist as {
    tenantId: string; ownerId: string; owner: string; other: string; password: string
  }
  expect(source.tenantId).toMatch(/^[a-zA-Z0-9_-]+$/)
  expect(source.ownerId).toMatch(/^[a-zA-Z0-9_-]+$/)
  const tenantId = source.tenantId, ownerId = randomUUID(), otherId = randomUUID()
  const suffix = ownerId.replaceAll('-', ''), host = 'checklist.localhost'
  const owner = 'owner-' + suffix + '@fixture.test', other = 'editor-' + suffix + '@fixture.test'
  sql(`BEGIN;
    INSERT INTO users(id,"tenantId",name,"passwordHash",role,status,"createdAt","updatedAt") SELECT '${ownerId}','${tenantId}','Ana Ondas',"passwordHash",'USER','ACTIVE',now(),now() FROM users WHERE id='${source.ownerId}';
    INSERT INTO users(id,"tenantId",name,"passwordHash",role,status,"createdAt","updatedAt") SELECT '${otherId}','${tenantId}','Colaboradora Ondas',"passwordHash",'USER','ACTIVE',now(),now() FROM users WHERE id='${source.ownerId}';
    INSERT INTO user_identifiers(id,"userId","tenantId",kind,"normalizedValue","confirmedAt","createdAt") VALUES(gen_random_uuid(),'${ownerId}','${tenantId}','EMAIL','${owner}',now(),now()),(gen_random_uuid(),'${otherId}','${tenantId}','EMAIL','${other}',now(),now());
    COMMIT;`)
  expect(sql(`SELECT count(*) FROM users WHERE "tenantId"='${tenantId}' AND id IN ('${ownerId}','${otherId}')`)).toBe('2')
  expect(sql(`SELECT host FROM tenants WHERE id='${tenantId}'`)).toBe(host)
  return { ...source, tenantId, ownerId, otherId, owner, other, host, origin: runtime.web(host), profileSlug: 'ana-' + suffix, campaignSlug: 'c-' + suffix, collectionSlug: 'estudos-' + suffix }
}
export type Fixture = ReturnType<typeof isolatedFixture>
const pageErrors = new WeakMap<Page, string[]>()

function observe(page: Page) {
  if (pageErrors.has(page)) return
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
}

export async function login(page: Page, fixture: Fixture, other = false) {
  observeOndasPage(page)
  observe(page)
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: fixture.host, path: '/' }])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(fixture.origin + '/login')
  await page.getByLabel('E-mail').fill(other ? fixture.other : fixture.owner)
  await page.getByLabel('Senha').fill(fixture.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true })).toBeEnabled()
  await expect(page.locator('[data-skeleton]:visible, [data-pending="true"]:visible, [aria-busy="true"]:visible')).toHaveCount(0)
}

export async function audit(page: Page, info: TestInfo, label: string) {
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Não encontrado', exact: true })).toHaveCount(0)
  const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  expect(overflow.scrollWidth, label).toBeLessThanOrEqual(overflow.width + 1)
  expect(pageErrors.get(page) ?? [], label).toEqual([])
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  await info.attach(label + '.json', { contentType: 'application/json', body: JSON.stringify({
    path: new URL(page.url()).pathname, headings: await page.getByRole('heading', { level: 1 }).allTextContents(),
    viewport: page.viewportSize(), overflow, pageErrors: pageErrors.get(page) ?? [], violations: result.violations,
  }, null, 2) })
  expect(result.violations, label).toEqual([])
  await capturePage(page, info.outputPath(label + '.png'))
}

export async function visit(page: Page, fixture: Fixture, route: string) {
  observe(page)
  const response = await page.goto(fixture.origin + route)
  expect(response?.status(), route).toBe(200)
  expect(new URL(page.url()).pathname, route).toBe(route.split('?')[0])
}

export async function saveProfile(page: Page, fixture: Fixture, theme = 'Areia') {
  const group = randomUUID(), content = {
    slug: fixture.profileSlug, name: 'Ana Ondas', bio: 'Projetos e encontros da comunidade', avatarAssetId: null,
    requiresAge: false, primaryItemId: null, appearance: appearanceThemes.find(row => row.name === theme)!.appearance,
    categories: [{ id: group, name: 'Projetos', visible: true }],
    items: [{ id: randomUUID(), categoryId: group, type: 'URL', label: 'Conheça o projeto', destination: 'https://example.com/f12-a', visible: true }],
  }
  const saved = await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 0, content })
  expect(saved.status, JSON.stringify(saved.body)).toBe(200)
  return content
}

export async function publishProfile(page: Page) {
  const state = await roadmapApi(page, '/me/profile')
  expect(state.status).toBe(200)
  const published = await roadmapApi(page, '/me/profile/publish', 'POST', { expectedVersion: state.body.draft.version })
  expect(published.status, JSON.stringify(published.body)).toBe(200)
  expect(published.body.publishedRevisionId, JSON.stringify(published.body)).toBe(state.body.draft.version)
}

export async function redirect(page: Page, label: string, destinationUrl = 'https://example.com/f12-a') {
  const response = await roadmapApi(page, '/me/redirects', 'POST', { label, destinationUrl, requiresAge: false, expectedRevision: 0, requestKey: randomUUID() })
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  expect(response.body.destinationRevision.status).toBe('APPROVED')
  return response.body as { id: string; version: number; destinationRevision: { id: string } }
}

export { roadmapApi } from './roadmap-profile'
