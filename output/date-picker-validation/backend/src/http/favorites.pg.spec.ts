import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { app } from '@/app'
import { setFavoritesDbForTest } from '@/http/controllers/@Collections/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local disposable database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, otherTenant: string, host: string, user: string, other: string, link: string
beforeAll(async () => { setFavoritesDbForTest(db); setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); await app.ready() })
beforeEach(async () => {
  tenant = randomUUID(); otherTenant = randomUUID(); host = tenant + '.test'; user = 'u-' + tenant; other = 'o-' + tenant; link = 'l-' + tenant
  for (const id of [tenant, otherTenant]) {
    await db.tenant.create({ data: { id, host: id + '.test', name: 'F04' } })
    await db.network.create({ data: { id: 'r-' + id, tenantId: id, name: 'Site', slug: 'site', knownHosts: [] } })
    await db.niche.create({ data: { id: 'n-' + id, tenantId: id, name: 'Estudo', slug: 'estudo' } })
  }
  for (const id of [user, other]) await db.user.create({ data: { id, tenantId: tenant, name: id, passwordHash: 'fixture' } })
  await db.user.create({ data: { id: 'foreign-' + tenant, tenantId: otherTenant, name: 'Foreign', passwordHash: 'fixture' } })
  await db.link.create({ data: { id: link, tenantId: tenant, ownerId: other, name: 'SentinelaSalva', description: 'DescricaoPrivadaQuandoOculto', canonicalUrl: 'https://example.com/f04', nicheId: 'n-' + tenant, networkId: 'r-' + tenant, status: 'PUBLISHED' } })
})
afterAll(async () => { setFavoritesDbForTest(null); await db.$disconnect() })
function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, actor: string | null = user, tokenTenant = tenant, requestHost = host, role = 'USER') {
  return app.inject({ method, url: '/api/v1/me/' + path, headers: { host: requestHost, ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role, typ: 'access' }) } : {}) }, ...(body ? { payload: body } : {}) })
}
async function collection(name = 'Estudos') {
  const r = await call('POST', 'collections', { id: randomUUID(), name }); expect(r.statusCode).toBe(200); return r.json().collection as { id: string; name: string; version: number }
}
async function favorite(id = link) {
  const r = await call('PUT', 'favorites/' + id); expect(r.statusCode).toBe(200); return r.json().favoriteId as string
}
it('F04-U01/I01/T01/T03 concurrent save is unique and persistent in new authenticated requests', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => call('PUT', 'favorites/' + link)))
  expect(results.every(r => r.statusCode === 200)).toBe(true)
  expect(new Set(results.map(r => r.json().favoriteId)).size).toBe(1)
  expect(await db.favorite.count({ where: { tenantId: tenant } })).toBe(1)
  const list = await call('GET', 'favorites'); expect(list.headers['cache-control']).toBe('private, no-store'); expect(list.json().items[0]).toMatchObject({ linkId: link, available: true, name: 'SentinelaSalva' })
  expect((await call('GET', 'favorites/' + link)).json().saved).toBe(true)
  expect(await db.analyticsEvent.count({ where: { tenantId: tenant } })).toBe(0)
})
it('F04-I02/T02 owner isolation, tenant, anonymous, suspended user and ADMIN cannot read another collection', async () => {
  const c = await collection(); await favorite()
  expect((await call('GET', 'favorites', undefined, null)).statusCode).toBe(401)
  expect((await call('GET', 'collections/' + c.id, undefined, other)).statusCode).toBe(404)
  expect((await call('GET', 'collections/' + c.id, undefined, other, tenant, host, 'ADMIN')).statusCode).toBe(404)
  expect((await call('GET', 'favorites', undefined, user, otherTenant)).statusCode).toBe(403)
  expect((await call('GET', 'favorites', undefined, 'foreign-' + tenant, otherTenant, otherTenant + '.test')).json().items).toEqual([])
  expect((await call('GET', 'favorites', undefined, other)).json().items).toEqual([])
  await db.user.update({ where: { id: user }, data: { status: 'BANNED' } })
  expect((await call('GET', 'favorites')).statusCode).toBe(403); expect((await call('PUT', 'favorites/' + link)).statusCode).toBe(403)
})
it('F04-U02/I01/T05 multiple collections retain favorite and catalog after deleting one', async () => {
  const f = await favorite(), a = await collection('Primeira'), b = await collection('Segunda')
  for (const c of [a, b]) expect((await call('PUT', 'collections/' + c.id + '/items/' + f, { expectedVersion: 0 })).json().collection.version).toBe(1)
  expect((await call('PUT', 'collections/' + b.id + '/items/' + f, { expectedVersion: 0 })).json().collection.version).toBe(1)
  expect((await call('DELETE', 'collections/' + a.id + '?expectedVersion=1')).statusCode).toBe(200)
  expect((await call('GET', 'collections/' + b.id)).json().items[0].id).toBe(f)
  expect(await db.favorite.findUnique({ where: { id: f } })).toBeTruthy(); expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
  await call('DELETE', 'favorites/' + link); await call('DELETE', 'favorites/' + link)
  expect((await call('GET', 'collections/' + b.id)).json().items).toEqual([])
})
it('F04-PG02/T04 unavailable, banned-owner and adult references are redacted and cannot be saved anew', async () => {
  await favorite()
  for (const status of ['UNAVAILABLE', 'PENDING_MODERATION'] as const) {
    await db.link.update({ where: { id: link }, data: { status } })
    const r = await call('GET', 'favorites'); expect(r.json().items[0].available).toBe(false); expect(r.body).not.toContain('SentinelaSalva'); expect(r.body).not.toContain('DescricaoPrivada'); expect(r.body).not.toContain('href')
    expect((await call('PUT', 'favorites/' + link)).statusCode).toBe(404)
  }
  await db.link.update({ where: { id: link }, data: { status: 'PUBLISHED' } }); await db.user.update({ where: { id: other }, data: { status: 'BANNED' } })
  expect((await call('GET', 'favorites')).json().items[0].available).toBe(false)
  await db.user.update({ where: { id: other }, data: { status: 'ACTIVE' } }); await db.network.update({ where: { id: 'r-' + tenant }, data: { requiresAge: true } })
  expect((await call('PUT', 'favorites/' + link)).statusCode).toBe(404)
  const accepted = await app.inject({ method: 'GET', url: '/api/v1/me/favorites', headers: { host, cookie: 'age=yes', authorization: 'Bearer ' + app.jwt.sign({ sub: user, tenantId: tenant, role: 'USER', typ: 'access' }) } })
  expect(accepted.json().items[0].available).toBe(true)
})
it('F04-I03/PG03 creation retry, stale versions, reorder and failed mutation preserve final state', async () => {
  const id = randomUUID(), body = { id, name: 'Uma coleção' }
  await call('POST', 'collections', body); await call('POST', 'collections', body)
  expect(await db.collection.count({ where: { id } })).toBe(1)
  const writes = await Promise.all(['Novo A', 'Novo B'].map(name => call('PATCH', 'collections/' + id, { name, expectedVersion: 0 })))
  expect(writes.map(r => r.statusCode).sort()).toEqual([200, 409])
  const f = await favorite(); await call('PUT', 'collections/' + id + '/items/' + f, { expectedVersion: 1 })
  expect((await call('PUT', 'collections/' + id + '/items/no-such-favorite', { expectedVersion: 2 })).statusCode).toBe(404)
  expect((await call('GET', 'collections/' + id)).json().collection.version).toBe(2)
  const second = 'second-' + tenant
  await db.link.create({ data: { id: second, tenantId: tenant, name: 'Segundo', description: 'd', canonicalUrl: 'https://example.com/second', nicheId: 'n-' + tenant, networkId: 'r-' + tenant, status: 'PUBLISHED' } })
  const f2 = await favorite(second); await call('PUT', 'collections/' + id + '/items/' + f2, { expectedVersion: 2 })
  expect((await call('PATCH', 'collections/' + id + '/items/' + f2, { expectedVersion: 3, move: 'up' })).statusCode).toBe(200)
  expect((await call('GET', 'collections/' + id)).json().items.map((r: { id: string }) => r.id)).toEqual([f2, f])
  expect((await call('DELETE', 'collections/' + id + '?expectedVersion=0')).statusCode).toBe(409)
})
it('F04-PG01/T02 database rejects cross-owner and cross-tenant relationships without partial writes', async () => {
  const f = await favorite(), c = await collection()
  await expect(db.collectionItem.create({ data: { collectionId: c.id, favoriteId: f, tenantId: tenant, userId: other, position: 0 } })).rejects.toThrow()
  await expect(db.favorite.create({ data: { tenantId: otherTenant, userId: 'foreign-' + tenant, linkId: link } })).rejects.toThrow()
  expect(await db.collectionItem.count({ where: { collectionId: c.id } })).toBe(0)
})
it('F04-PG04 bounded pages, strict input and deleted resources do not expose foreign cursors', async () => {
  for (let i = 0; i < 23; i++) await call('POST', 'collections', { id: randomUUID(), name: 'Coleção ' + i })
  const first = (await call('GET', 'collections')).json(); expect(first.items).toHaveLength(20)
  const next = (await call('GET', 'collections?cursor=' + first.nextCursor)).json(); expect(next.items).toHaveLength(3); expect(next.nextCursor).toBeNull()
  expect(new Set([...first.items, ...next.items].map((r: { id: string }) => r.id)).size).toBe(23)
  expect((await call('GET', 'collections?cursor=foreign')).statusCode).toBe(404)
  expect((await call('POST', 'collections', { id: randomUUID(), name: '  ' })).statusCode).toBe(400)
  expect((await call('POST', 'collections', { id: randomUUID(), name: 'Ok', userId: other })).statusCode).toBe(400)
})
it('F04-I03/PG05 failure after item insert rolls back item and version together', async () => {
  const f = await favorite(), c = await collection(), suffix = tenant.replaceAll('-', ''), fn = 'f04_fail_' + suffix, trigger = 'f04_fail_trigger_' + suffix
  await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${c.id}' THEN RAISE EXCEPTION 'synthetic failure after insert'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION ${fn}()`)
  try {
    expect((await call('PUT', 'collections/' + c.id + '/items/' + f, { expectedVersion: 0 })).statusCode).toBe(500)
    expect(await db.collectionItem.count({ where: { collectionId: c.id } })).toBe(0)
    expect((await db.collection.findUniqueOrThrow({ where: { id: c.id } })).version).toBe(0)
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON collections`); await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()` ) }
})
it('F04-PG06 deletion of private account cascades private data and preserves the public catalog', async () => {
  const f = await favorite(), c = await collection()
  await call('PUT', 'collections/' + c.id + '/items/' + f, { expectedVersion: 0 })
  await db.user.delete({ where: { id: user } })
  expect(await db.favorite.count({ where: { userId: user } })).toBe(0)
  expect(await db.collection.count({ where: { userId: user } })).toBe(0)
  expect(await db.collectionItem.count({ where: { userId: user } })).toBe(0)
  expect(await db.link.findUnique({ where: { id: link } })).toBeTruthy()
})
it('F04-PG07 favorites and collection item pages cover all rows once and cookie mutations require CSRF', async () => {
  const c = await collection()
  for (let i = 0; i < 24; i++) {
    const id = 'page-' + i + tenant
    await db.link.create({ data: { id, tenantId: tenant, name: 'Page ' + i, description: 'd', canonicalUrl: 'https://example.com/' + id, nicheId: 'n-' + tenant, networkId: 'r-' + tenant, status: 'PUBLISHED' } })
    const f = await favorite(id)
    expect((await call('PUT', 'collections/' + c.id + '/items/' + f, { expectedVersion: i })).statusCode).toBe(200)
  }
  for (const path of ['favorites', 'collections/' + c.id]) {
    const a = (await call('GET', path)).json(), b = (await call('GET', path + '?cursor=' + a.nextCursor)).json()
    expect(a.items).toHaveLength(20); expect(b.items).toHaveLength(4); expect(b.nextCursor).toBeNull()
    expect(new Set([...a.items, ...b.items].map((r: { id: string }) => r.id)).size).toBe(24)
  }
  const token = app.jwt.sign({ sub: user, tenantId: tenant, role: 'USER', typ: 'access' }), csrf = 'c'.repeat(32)
  const mutation = (valid: boolean) => app.inject({ method: 'PUT', url: '/api/v1/me/favorites/' + link, headers: { host, cookie: 'accessToken=' + token + '; csrf=' + csrf, ...(valid ? { 'x-csrf-token': csrf } : {}) } })
  expect((await mutation(false)).statusCode).toBe(403); expect((await mutation(true)).statusCode).toBe(200)
})
