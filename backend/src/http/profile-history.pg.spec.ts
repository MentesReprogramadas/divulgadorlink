import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { setProfilesForTest } from '@/http/controllers/@Profiles/routes'
import { setContentReviewsForTest } from '@/http/controllers/@Moderation/content-reviews'
import { pruneProfileRevisions } from '@/repositories/profile-revisions'
import type { ProfileContent } from '@/domain/profiles/profile'
import type { ProfileValidationPorts } from '@/use-cases/@Profiles/validate-profile'
const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, user: string, other: string, foreignOwner: string, ports: ProfileValidationPorts
beforeAll(async () => { setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); await app.ready() })
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); user = 'u-' + tenant; other = 'o-' + tenant; foreignOwner = 'f-' + tenant
  for (const id of [tenant, foreign]) { await db.tenant.create({ data: { id, host: id + '.test', name: 'F19 fixture' } }); await db.config.create({ data: { tenantId: id, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '.85' } }) }
  for (const [id, tenantId, role] of [[user, tenant, 'USER'], [other, tenant, 'ADMIN'], [foreignOwner, foreign, 'USER']] as const) await db.user.create({ data: { id, tenantId, name: 'F19 fixture', role, passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  ports = { probe: async () => 200, judge: async () => ({ pass: true, confidence: .99, reasons: [] }) }
  setProfilesForTest(db, ports); setContentReviewsForTest(db, ports)
})
afterAll(async () => { setProfilesForTest(null); setContentReviewsForTest(null); await db.$disconnect() })
function call(method: 'GET' | 'POST' | 'PATCH', route: string, body?: unknown, actor: string | null = user, tokenTenant = tenant) {
  return app.inject({ method, url: '/api/v1/' + route, headers: { host: tenant + '.test', ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role: actor === other ? 'ADMIN' : 'USER', typ: 'access' }) } : {}) }, ...(body ? { payload: body } : {}) })
}
function content(): ProfileContent { const group = randomUUID(); return { slug: 'f19-pagina', name: 'Primeira versão', bio: 'Descrição inicial', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [{ id: group, name: 'Materiais', visible: true }], items: [{ id: randomUUID(), categoryId: group, type: 'URL', label: 'Aulas', destination: 'https://example.com/aulas', visible: true }] } }
async function save(value: ProfileContent, expectedVersion: number) { const response = await call('PATCH', 'me/profile', { content: value, expectedVersion }); expect(response.statusCode, response.body).toBe(200); return response.json().draft.version as number }
async function publish(expectedVersion: number) { const response = await call('POST', 'me/profile/publish', { expectedVersion }); expect(response.statusCode, response.body).toBe(200); return response }
const history = () => call('GET', 'me/profile/revisions')
const restore = (id: string, expectedVersion: number, actor: string | null = user, tokenTenant = tenant) => call('POST', 'me/profile/revisions/' + id + '/restore', { expectedVersion }, actor, tokenTenant)
it('F19-T01/T02 saves draft, compares privately and explicitly restores without changing the public page', async () => {
  const first = content(); await save(first, 0); await publish(1)
  const row = (await history()).json().revisions[0]
  await save({ ...first, name: 'Segunda versão' }, 1); await publish(2)
  await save({ ...first, name: 'Rascunho privado' }, 2)
  expect((await history()).json().revisions.map((item: { version: number }) => item.version)).toEqual([2, 1])
  const read = await call('GET', 'me/profile/revisions/' + row.id)
  expect(read.statusCode).toBe(200); expect(read.headers['cache-control']).toBe('private, no-store')
  expect((await call('GET', 'me/profile')).json().draft.name).toBe('Rascunho privado')
  expect((await call('GET', 'profiles/f19-pagina', undefined, null)).json().name).toBe('Segunda versão')
  expect((await restore(row.id, 2)).statusCode).toBe(409)
  const result = await restore(row.id, 3); expect(result.statusCode, result.body).toBe(200)
  expect(result.json().draft).toMatchObject({ version: 4, name: first.name }); expect(result.json().publishedVersion).toBe(2)
  expect((await call('GET', 'me/profile/preview')).json().name).toBe(first.name)
  expect((await call('GET', 'profiles/f19-pagina', undefined, null)).json().name).toBe('Segunda versão')
  expect((await restore(row.id, 3)).statusCode).toBe(409)
  await publish(4); await publish(4)
  expect((await history()).json().revisions).toHaveLength(3)
  expect((await db.user.findUniqueOrThrow({ where: { id: user } })).role).toBe('USER')
  expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'profile.revision.restored' } })).toBe(1)
})
it('F19-I02/Pg01 history is owner-only, immutable, constrained to tenant and excluded from public output', async () => {
  const first = content(); first.categories.push({ id: randomUUID(), name: 'SegredoHistorico', visible: false })
  await save(first, 0); await publish(1)
  const revision = (await history()).json().revisions[0]
  expect((await call('GET', 'me/profile/revisions', undefined, null)).statusCode).toBe(401)
  expect((await call('GET', 'me/profile/revisions/' + revision.id, undefined, other)).statusCode).toBe(404)
  expect((await restore(revision.id, 1, other)).statusCode).toBe(404)
  expect((await restore(revision.id, 1, foreignOwner, foreign)).statusCode).toBe(403)
  const publicResult = await call('GET', 'profiles/f19-pagina', undefined, null)
  expect(publicResult.body).not.toMatch(/SegredoHistorico|snapshot|revisions|ownerId|publishedDraft/)
  await expect(db.profileRevision.update({ where: { id: revision.id }, data: { snapshot: {} } })).rejects.toThrow()
  const profile = await db.profile.findFirstOrThrow({ where: { tenantId: tenant } })
  await expect(db.profileRevision.create({ data: { profileId: profile.id, tenantId: foreign, ownerId: foreignOwner, version: 99, snapshot: first } })).rejects.toThrow()
})
it('F19-T04/U02 restore revalidates URL availability and revoked catalog refs; rollback preserves draft and publication', async () => {
  const first = content()
  const network = await db.network.create({ data: { tenantId: tenant, name: 'Site', slug: 'site', knownHosts: [] } })
  const niche = await db.niche.create({ data: { tenantId: tenant, name: 'Estudo', slug: 'estudo' } })
  const link = await db.link.create({ data: { tenantId: tenant, ownerId: user, networkId: network.id, nicheId: niche.id, name: 'Aulas do catálogo', description: 'Estudo', canonicalUrl: 'https://example.com/catalogo', status: 'PUBLISHED' } })
  first.items.push({ id: randomUUID(), categoryId: first.categories[0].id, type: 'CATALOG', label: 'Catálogo', destination: link.id, visible: true })
  await save(first, 0); await publish(1)
  const row = (await history()).json().revisions[0]
  await save({ ...first, name: 'Rascunho preservado' }, 1)
  ports.probe = async () => 0
  expect((await restore(row.id, 2)).statusCode).toBe(422)
  ports.probe = async () => null
  expect((await restore(row.id, 2)).statusCode).toBe(503)
  ports.probe = async () => 200
  await db.link.update({ where: { id: link.id }, data: { status: 'PRE_REJECTED' } })
  expect((await restore(row.id, 2)).statusCode).toBe(422)
  expect((await call('GET', 'me/profile')).json().draft).toMatchObject({ version: 2, name: 'Rascunho preservado' })
  expect((await db.operationalMessage.count({ where: { tenantId: tenant, kind: 'REVIEW_PROFILE' } }))).toBe(0)
  expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'profile.revision.restored' } })).toBe(0)
})
it('F19-I01 concurrent restores have one winner and never create a second publication', async () => {
  const first = content(); await save(first, 0); await publish(1)
  const row = (await history()).json().revisions[0]
  const results = await Promise.all([restore(row.id, 1), restore(row.id, 1)])
  expect(results.map(result => result.statusCode).sort()).toEqual([200, 409])
  expect((await history()).json().revisions).toHaveLength(1)
  expect((await call('GET', 'me/profile')).json()).toMatchObject({ publishedVersion: 1, draft: { version: 2 } })
})
it('F19-T03 keeps 50/180 with protected current publication; expired entries cannot be read or restored', async () => {
  const first = content(); await save(first, 0); await publish(1)
  const profile = await db.profile.findFirstOrThrow({ where: { tenantId: tenant } })
  const now = new Date(), old = new Date(now.getTime() - 181 * 86400000), active = (await history()).json().revisions[0]
  await db.profileRevision.deleteMany({ where: { profileId: profile.id } })
  await db.profileRevision.create({ data: { id: active.id, profileId: profile.id, tenantId: tenant, ownerId: user, version: 1, createdAt: old, snapshot: first } })
  const expired = await db.profileRevision.create({ data: { profileId: profile.id, tenantId: tenant, ownerId: user, version: 2, createdAt: old, snapshot: first } })
  await db.profileRevision.createMany({ data: Array.from({ length: 59 }, (_, index) => ({ id: randomUUID(), profileId: profile.id, tenantId: tenant, ownerId: user, version: index + 3, snapshot: first })) })
  const listed = (await history()).json().revisions
  expect(listed).toHaveLength(50); expect(listed.some((row: { id: string }) => row.id === active.id)).toBe(true)
  expect((await call('GET', 'me/profile/revisions/' + expired.id)).statusCode).toBe(404)
  expect((await restore(expired.id, 1)).statusCode).toBe(404)
  await db.$transaction(tx => pruneProfileRevisions(tx, profile, now))
  expect(await db.profileRevision.count({ where: { profileId: profile.id } })).toBe(50)
  expect((await call('GET', 'profiles/f19-pagina', undefined, null)).statusCode).toBe(200)
})
it('F19 media decision: removed old photo is not retained and restoration omits it with a warning', async () => {
  const first = { ...content(), avatarAssetId: 'a'.repeat(64) }
  await db.profileAsset.create({ data: { id: first.avatarAssetId, tenantId: tenant, ownerId: user, bytes: Buffer.from('synthetic-avatar') } })
  await save(first, 0); await publish(1)
  const row = (await history()).json().revisions[0]
  await save({ ...first, name: 'Versão sem foto', avatarAssetId: null }, 1); await publish(2)
  expect(await db.profileAsset.count({ where: { tenantId: tenant } })).toBe(0)
  expect((await call('GET', 'me/profile/revisions/' + row.id)).json().photoAvailable).toBe(false)
  const result = await restore(row.id, 2); expect(result.statusCode, result.body).toBe(200)
  expect(result.json().draft.avatarAssetId).toBeNull(); expect(result.json().warnings).toHaveLength(1)
  expect((await call('GET', 'profiles/f19-pagina', undefined, null)).json().name).toBe('Versão sem foto')
})
it('F19 publication through human moderation also records a single restorable snapshot', async () => {
  const first = content(); await save(first, 0); await publish(1)
  await save({ ...first, name: 'Texto novo a revisar' }, 1)
  ports.judge = async () => ({ pass: false, confidence: .99, reasons: [] })
  const response = await publish(2), id = response.json().review.id
  expect((await history()).json().revisions).toHaveLength(1)
  const result = await call('POST', 'admin/content-reviews/' + id + '/decision', { decision: 'APPROVE' }, other)
  expect(result.statusCode, result.body).toBe(200)
  expect((await history()).json().revisions.map((row: { version: number }) => row.version)).toEqual([2, 1])
  await db.user.update({ where: { id: user }, data: { status: 'BANNED' } })
  expect((await restore((await db.profileRevision.findFirstOrThrow({ where: { tenantId: tenant, version: 1 } })).id, 2)).statusCode).toBe(403)
})
it('F19 migration imports only the recoverable active snapshot and labels its date as import date', async () => {
  const first = content(); await save(first, 0); await publish(1); await save({ ...first, name: 'Draft sentinel' }, 1)
  const profile = await db.profile.findFirstOrThrow({ where: { tenantId: tenant } })
  await db.profileRevision.deleteMany({ where: { profileId: profile.id } })
  const migration = readFileSync(path.join(__dirname, '../../prisma/migrations/20261017230000_profile_revisions/migration.sql'), 'utf8')
  const insert = migration.slice(migration.indexOf('INSERT INTO'), migration.indexOf('CREATE FUNCTION')).trim().replace('FROM profiles WHERE', 'FROM profiles WHERE id=$1 AND')
  await db.$executeRawUnsafe(insert, profile.id)
  const rows = (await history()).json().revisions; expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ imported: true, version: 1, summary: { name: first.name } })
  expect((await call('GET', 'me/profile')).json().draft.name).toBe('Draft sentinel')
})
