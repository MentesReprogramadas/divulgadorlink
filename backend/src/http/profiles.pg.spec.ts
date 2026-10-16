import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { app } from '@/app'
import { setProfilesForTest } from '@/http/controllers/@Profiles/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import type { ProfileContent } from '@/domain/profiles/profile'
import type { ProfileValidationPorts } from '@/use-cases/@Profiles/validate-profile'
const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, user: string, other: string, host: string, link: string
let ports: ProfileValidationPorts
beforeAll(async () => { setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); await app.ready() })
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); host = tenant + '.test'; user = 'u-' + tenant; other = 'o-' + tenant; link = 'l-' + tenant
  for (const id of [tenant, foreign]) {
    await db.tenant.create({ data: { id, host: id + '.test', name: 'F09 fixture' } })
    await db.config.create({ data: { tenantId: id, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.85' } })
    await db.network.create({ data: { id: 'r-' + id, tenantId: id, name: 'Site', slug: 'site', knownHosts: [] } })
    await db.niche.create({ data: { id: 'n-' + id, tenantId: id, name: 'Estudo', slug: 'estudo' } })
  }
  for (const [id, tenantId] of [[user, tenant], [other, tenant], ['f-' + tenant, foreign]]) {
    await db.user.create({ data: { id, tenantId, name: id, role: id === other ? 'ADMIN' : 'USER', passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  }
  await db.link.create({ data: { id: link, tenantId: tenant, ownerId: user, name: 'Link publicado', description: 'Estudos', canonicalUrl: 'https://example.com/' + link, nicheId: 'n-' + tenant, networkId: 'r-' + tenant, status: 'PUBLISHED' } })
  ports = { probe: async () => 200, judge: async () => ({ pass: true, confidence: 0.95, reasons: [] }) }; setProfilesForTest(db, ports)
})
afterAll(async () => { setProfilesForTest(null); await db.$disconnect() })
function call(method: 'GET' | 'POST' | 'PATCH', path = '', body?: unknown, actor: string | null = user, tokenTenant = tenant, requestHost = host, cookie?: string) {
  return app.inject({ method, url: '/api/v1/' + path, headers: { host: requestHost, ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role: actor === other ? 'ADMIN' : 'USER', typ: 'access' }) } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { payload: body } : {}) })
}
function content(slug = 'meu-perfil'): ProfileContent {
  const a = randomUUID(), b = randomUUID()
  return { slug, name: 'Ana', bio: 'Projetos e estudos', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [{ id: a, name: 'Projetos', visible: true }, { id: b, name: 'GrupoSecreto', visible: false }], items: [
    { id: randomUUID(), categoryId: a, type: 'URL', label: 'Site pessoal', destination: 'https://example.com/ana', visible: true },
    { id: randomUUID(), categoryId: a, type: 'URL', label: 'OcultoSentinela', destination: 'https://example.com/segredo', visible: false },
    { id: randomUUID(), categoryId: b, type: 'SOCIAL', label: 'FilhoSecreto', destination: 'https://example.com/privado', visible: true },
  ] }
}
async function save(c = content(), v = 0, actor = user) { const r = await call('PATCH', 'me/profile', { expectedVersion: v, content: c }, actor); expect(r.statusCode, r.body).toBe(200); return r.json().draft.version as number }
async function publish(v = 1) { const r = await call('POST', 'me/profile/publish', { expectedVersion: v }); expect(r.statusCode, r.body).toBe(200); return r }
it('F09-T01/I01 concorrência de slug tem um vencedor e outro 409; mesmo slug em outro tenant é válido', async () => {
  const c = content(), writes = await Promise.all([user, other].map(actor => call('PATCH', 'me/profile', { expectedVersion: 0, content: c }, actor)))
  expect(writes.map(r => r.statusCode).sort()).toEqual([200, 409]); expect(await db.profile.count({ where: { tenantId: tenant } })).toBe(1)
  expect((await call('PATCH', 'me/profile', { expectedVersion: 0, content: c }, 'f-' + tenant, foreign, foreign + '.test')).statusCode).toBe(200)
})
it('F09-T02/I02 outro dono, admin, visitante, tenant incompatível e suspensão não alteram dados privados', async () => {
  const c = content(); await save(c)
  expect((await call('GET', 'me/profile', undefined, null)).statusCode).toBe(401)
  expect((await call('GET', 'me/profile', undefined, user, foreign)).statusCode).toBe(403)
  expect((await call('GET', 'me/profile', undefined, other)).json().draft).toBeNull()
  expect((await call('PATCH', 'me/profile', { expectedVersion: 1, content: c, ownerId: user }, other)).statusCode).toBe(400)
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 }, other)).statusCode).toBe(409)
  await db.user.update({ where: { id: user }, data: { status: 'BANNED' } })
  expect((await call('PATCH', 'me/profile', { expectedVersion: 1, content: c })).statusCode).toBe(403)
  expect((await db.profile.findFirstOrThrow({ where: { tenantId: tenant } })).version).toBe(1)
})
it('F09-T04/T05 preview e público filtram ocultos; rascunho novo não altera publicação; retry não duplica', async () => {
  const c = content(); await save(c); expect((await call('GET', 'profiles/meu-perfil', undefined, null)).statusCode).toBe(404)
  const preview = await call('GET', 'me/profile/preview'); expect(preview.statusCode).toBe(200); expect(preview.body).not.toMatch(/OcultoSentinela|GrupoSecreto|FilhoSecreto|segredo|privado/)
  await publish(); expect((await publish()).json().publishedRevisionId).toBe(1)
  const live = await call('GET', 'profiles/meu-perfil', undefined, null); expect(live.json().items).toHaveLength(1); expect(live.body).not.toMatch(/ownerId|tenantId|password|OcultoSentinela|GrupoSecreto/)
  const v = await save({ ...c, name: 'NomeRascunhoSentinela' }, 1); expect(v).toBe(2)
  expect((await call('GET', 'profiles/meu-perfil', undefined, null)).body).not.toContain('NomeRascunhoSentinela')
  expect(await save({ ...c, name: 'NomeRascunhoSentinela' }, 1)).toBe(2)
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).statusCode).toBe(409)
  await publish(2); expect((await call('GET', 'profiles/meu-perfil', undefined, null)).json().name).toBe('NomeRascunhoSentinela')
})
it('F09-T06/I01 bloqueio textual, URL privada, destino morto e veredito suspeito conservam rascunho e publicação anterior', async () => {
  const c = content(); await save(c); await publish()
  await db.blocklistTerm.create({ data: { tenantId: tenant, term: 'proibido-fixture' } })
  let v = await save({ ...c, bio: 'proibido-fixture' }, 1)
  expect((await call('POST', 'me/profile/publish', { expectedVersion: v })).statusCode).toBe(422)
  for (const destination of ['javascript:alert(1)', 'http://example.com', 'https://127.0.0.1', 'https://admin:secret@example.com', 'https://[::1]/']) {
    v = await save({ ...c, items: [{ ...c.items[0], destination }] }, v)
    expect((await call('POST', 'me/profile/publish', { expectedVersion: v })).statusCode).toBe(422)
  }
  v = await save(c, v); ports.probe = async () => 404
  expect((await call('POST', 'me/profile/publish', { expectedVersion: v })).statusCode).toBe(422)
  ports.probe = async () => 200; ports.judge = async () => ({ pass: false, confidence: 0.99, reasons: ['fixture'] })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: v })).statusCode).toBe(422)
  expect((await call('GET', 'me/profile')).json().draft.version).toBe(v)
  expect((await call('GET', 'profiles/meu-perfil', undefined, null)).json().publishedRevisionId).toBe(1)
})
it('F09-I03 provedor indisponível/inconclusivo e disputa durante validação não publicam versão errada', async () => {
  const c = content(); await save(c)
  ports.judge = async () => { throw new Error('fixture provider unavailable') }
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).statusCode).toBe(503)
  ports.judge = async () => null
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).statusCode).toBe(503)
  ports.judge = async () => { await save({ ...c, bio: 'Alterado em outra aba' }, 1); return { pass: true, confidence: 1, reasons: [] } }
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).statusCode).toBe(409)
  expect((await call('GET', 'profiles/meu-perfil', undefined, null)).statusCode).toBe(404)
})
it('F09-PG01/I03 restrições tenant/dono, versões concorrentes e rollback SQL real', async () => {
  const c = content(); await save(c)
  const writes = await Promise.all(['A', 'B'].map(name => call('PATCH', 'me/profile', { expectedVersion: 1, content: { ...c, name } })))
  expect(writes.map(r => r.statusCode).sort()).toEqual([200, 409])
  const p = await db.profile.findFirstOrThrow({ where: { tenantId: tenant } })
  await expect(db.profile.update({ where: { id: p.id }, data: { publication: {}, publishedVersion: null } })).rejects.toThrow()
  await expect(db.profileCategory.create({ data: { id: randomUUID(), profileId: p.id, tenantId: foreign, ownerId: user, name: 'foreign', visible: true, position: 999 } })).rejects.toThrow()
  await db.link.create({ data: { id: 'foreign-link-' + tenant, tenantId: foreign, ownerId: 'f-' + tenant, name: 'Foreign', description: '', canonicalUrl: 'https://example.com/foreign', nicheId: 'n-' + foreign, networkId: 'r-' + foreign, status: 'PUBLISHED' } })
  await expect(db.profileItem.create({ data: { id: randomUUID(), profileId: p.id, categoryId: c.categories[0].id, tenantId: tenant, ownerId: user, type: 'CATALOG', label: 'Foreign', destination: 'foreign-link-' + tenant, linkId: 'foreign-link-' + tenant, position: 999, visible: true } })).rejects.toThrow()
  const trigger = 'f09_' + tenant.replaceAll('-', '')
  await db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${p.id}' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION ${trigger}()`)
  try {
    expect((await call('POST', 'me/profile/publish', { expectedVersion: 2 })).statusCode).toBe(500)
    expect((await db.profile.findUniqueOrThrow({ where: { id: p.id } })).publication).toBeNull()
    expect((await call('PATCH', 'me/profile', { expectedVersion: 2, content: { ...c, name: 'Rollback' } })).statusCode).toBe(500)
    expect((await db.profile.findUniqueOrThrow({ where: { id: p.id } })).version).toBe(2)
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON profiles`); await db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`) }
})
it('F09-I03 gravação interrompida depois da recriação de itens reverte versão e lista inteira', async () => {
  const c = content(); await save(c)
  const p = await db.profile.findFirstOrThrow({ where: { tenantId: tenant } }), trigger = 'f09_items_' + tenant.replaceAll('-', '')
  await db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."profileId"='${p.id}' THEN RAISE EXCEPTION 'synthetic item failure'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} AFTER INSERT ON profile_items FOR EACH ROW EXECUTE FUNCTION ${trigger}()`)
  try {
    expect((await call('PATCH', 'me/profile', { expectedVersion: 1, content: { ...c, name: 'NaoPersistir', items: [...c.items].reverse() } })).statusCode).toBe(500)
    const state = (await call('GET', 'me/profile')).json().draft
    expect(state.version).toBe(1); expect(state.name).toBe(c.name); expect(state.items.map((i: { id: string }) => i.id)).toEqual(c.items.map(i => i.id))
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON profile_items`); await db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`) }
})
it('F09-U04/U05/PG02 URL própria não cria Link/Niche/Network nem consome slot; catálogo exige dono, tenant e estado publicado', async () => {
  const c = content(), before = await db.link.count({ where: { tenantId: tenant } }); await save(c); await publish()
  expect(await db.link.count({ where: { tenantId: tenant } })).toBe(before)
  expect(await db.niche.count({ where: { tenantId: tenant } })).toBe(1); expect(await db.network.count({ where: { tenantId: tenant } })).toBe(1)
  const catalog = { ...c, items: [{ ...c.items[0], type: 'CATALOG' as const, destination: link }] }
  await save(catalog, 1); await publish(2)
  await db.network.update({ where: { id: 'r-' + tenant }, data: { requiresAge: true } })
  expect((await call('GET', 'profiles/meu-perfil', undefined, null)).json()).toEqual({ restricted: true })
  expect((await call('GET', 'profiles/meu-perfil', undefined, null, tenant, host, 'age=yes')).json().items).toHaveLength(1)
  await db.link.update({ where: { id: link }, data: { status: 'UNAVAILABLE' } })
  expect((await call('GET', 'profiles/meu-perfil', undefined, null)).json().items).toHaveLength(0)
  const v = await save({ ...catalog, bio: 'Mudou' }, 2)
  expect((await call('POST', 'me/profile/publish', { expectedVersion: v })).statusCode).toBe(422)
  await db.link.update({ where: { id: link }, data: { ownerId: other } })
  expect((await call('PATCH', 'me/profile', { expectedVersion: v, content: catalog })).statusCode).toBe(404)
})
it('F09 avatar valida bytes, isolamento, publicação e retirada; e-mail não confirmado não publica', async () => {
  expect((await call('POST', 'me/profile/avatar', { base64: Buffer.from('<svg/>').toString('base64') })).statusCode).toBe(400)
  const base64 = readFileSync('src/domain/profiles/avatar.fixture.png').toString('base64')
  const upload = await call('POST', 'me/profile/avatar', { base64 }); expect(upload.statusCode, upload.body).toBe(200)
  const id = upload.json().avatarAssetId, c = { ...content(), avatarAssetId: id }
  expect((await call('GET', 'me/profile/avatar/' + id, undefined, other)).statusCode).toBe(404)
  expect((await call('PATCH', 'me/profile', { expectedVersion: 0, content: { ...c, slug: 'outro-perfil' } }, other)).statusCode).toBe(422)
  await save(c); expect((await call('GET', 'profiles/meu-perfil/avatar/' + id, undefined, null)).statusCode).toBe(404)
  await db.userIdentifier.updateMany({ where: { userId: user }, data: { confirmedAt: null } })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).statusCode).toBe(403)
  await db.userIdentifier.updateMany({ where: { userId: user }, data: { confirmedAt: new Date() } }); await publish()
  const image = await call('GET', 'profiles/meu-perfil/avatar/' + id, undefined, null); expect(image.statusCode).toBe(200); expect(image.headers['content-type']).toBe('image/png')
  await call('POST', 'me/profile/unpublish', { expectedVersion: 1 }); expect((await call('GET', 'profiles/meu-perfil', undefined, null)).statusCode).toBe(404)
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).statusCode).toBe(409)
  expect((await call('POST', 'me/profile/unpublish', { expectedVersion: 1 })).statusCode).toBe(200)
  expect((await call('GET', 'me/profile')).json().draft.avatarAssetId).toBe(id)
})
it('F09 CSRF por cookie continua obrigatório para mutações privadas', async () => {
  const token = app.jwt.sign({ sub: user, tenantId: tenant, role: 'USER', typ: 'access' }), csrf = 'x'.repeat(32)
  const request = { method: 'PATCH' as const, url: '/api/v1/me/profile', payload: { expectedVersion: 0, content: content() } }
  expect((await app.inject({ ...request, headers: { host, cookie: 'accessToken=' + token } })).statusCode).toBe(403)
  expect((await app.inject({ ...request, headers: { host, cookie: 'accessToken=' + token + '; csrf=' + csrf, 'x-csrf-token': csrf } })).statusCode).toBe(200)
})
