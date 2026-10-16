import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { app } from '@/app'
import { setRedirectsForTest } from '@/http/controllers/@Redirects/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { purgeRedirectHistory } from '@/repositories/redirects-repository'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
import { PrismaAccountDeletionRepository } from '@/use-cases/@Auth/delete-account'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, user: string, other: string, host: string, ports: PublicContentValidationPorts
beforeAll(async () => { setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); await app.ready() })
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); user = 'u-' + tenant; other = 'o-' + tenant; host = tenant + '.test'
  for (const id of [tenant, foreign]) {
    await db.tenant.create({ data: { id, host: id + '.test', name: 'F12 fixture' } })
    await db.config.create({ data: { tenantId: id, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.85' } })
  }
  for (const [id, tenantId] of [[user, tenant], [other, tenant], ['f-' + tenant, foreign]]) await db.user.create({ data: { id, tenantId, name: 'Responsável', role: id === other ? 'ADMIN' : 'USER', passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  ports = { probe: async () => 200, judge: async () => ({ pass: true, confidence: 0.99, reasons: [] }) }; setRedirectsForTest(db, ports)
})
afterAll(async () => { setRedirectsForTest(null); await db.$disconnect() })
function call(method: 'GET' | 'POST' | 'HEAD', path: string, body?: unknown, actor: string | null = user, tokenTenant = tenant, requestHost = host, cookie?: string) {
  return app.inject({ method, url: '/api/v1/' + path, headers: { host: requestHost, ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role: actor === other ? 'ADMIN' : 'USER', typ: 'access' }) } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { payload: body } : {}) })
}
const input = (expectedRevision = 0, destinationUrl = 'https://example.com/convite-a') => ({ expectedRevision, destinationUrl, label: 'Clube de estudos', requiresAge: false, requestKey: randomUUID() })
async function create(body = input()) { const r = await call('POST', 'me/redirects', body); expect(r.statusCode, r.body).toBe(200); return { body, ...r.json() } }

it('F12-T01/T03/U03/U04 mantém o endereço, registra versões e reenvio não duplica', async () => {
  const first = await create(), path = 'me/redirects/' + first.id
  expect((await call('POST', 'me/redirects', first.body)).json().id).toBe(first.id)
  expect((await call('GET', 'r/' + first.id, undefined, null)).headers.location).toBe(first.body.destinationUrl)
  const next = input(1, 'https://example.com/convite-b'), changed = await call('POST', path + '/destinations', next)
  expect(changed.statusCode, changed.body).toBe(200); expect(changed.json().stablePath).toBe(first.stablePath)
  expect((await call('POST', path + '/destinations', next)).json().destinationRevision.id).toBe(changed.json().destinationRevision.id)
  const publicResponse = await call('GET', 'r/' + first.id, undefined, null)
  expect(publicResponse.statusCode).toBe(302); expect(publicResponse.headers.location).toBe(next.destinationUrl); expect(publicResponse.headers['cache-control']).toContain('no-store')
  const detail = (await call('GET', path)).json(); expect(detail.revisions.map((r: { number: number }) => r.number)).toEqual([2, 1]); expect(await db.redirectDestination.count({ where: { handleId: first.id } })).toBe(2)
})
it('F12-T02 conteúdo suspeito, termo bloqueado e provedor ausente mantêm revisão anterior e proposta para correção', async () => {
  const first = await create(), path = 'me/redirects/' + first.id
  ports.judge = async () => ({ pass: false, confidence: 0.99, reasons: ['fixture'] })
  const blocked = await call('POST', path + '/destinations', input(1, 'https://example.com/segredo'))
  expect(blocked.statusCode).toBe(422); expect(blocked.json().resource).toEqual({ id: first.id, version: 2 })
  ports.judge = async () => null
  expect((await call('POST', path + '/destinations', input(2))).statusCode).toBe(503)
  ports.judge = async () => { throw new Error('secret-sentinel') }
  const failure = await call('POST', path + '/destinations', input(3)); expect(failure.statusCode).toBe(503); expect(failure.body).not.toContain('secret-sentinel')
  await db.blocklistTerm.create({ data: { tenantId: tenant, term: 'proibido' } })
  ports.judge = async () => ({ pass: true, confidence: 0.99, reasons: [] })
  expect((await call('POST', path + '/destinations', { ...input(4), label: 'proibido' })).statusCode).toBe(422)
  const live = await call('GET', 'r/' + first.id, undefined, null); expect(live.headers.location).toBe(first.body.destinationUrl); expect(live.body).not.toContain('segredo')
  const detail = (await call('GET', path)).json(); expect(detail.activeRevisionId).toBe(first.destinationRevision.id); expect(detail.revisions[0].status).toBe('BLOCKED')
})
it('F12-T01/T04 URL privada bloqueada sem probe, destino indisponível sem Location e recuperação usa nova validação', async () => {
  const first = await create(); let probes = 0; ports.probe = async () => { probes++; return 200 }
  expect((await call('POST', 'me/redirects/' + first.id + '/destinations', input(1, 'https://127.0.0.1/secret'))).statusCode).toBe(422); expect(probes).toBe(0)
  ports.probe = async () => 404
  const dead = await call('GET', 'r/' + first.id, undefined, null); expect(dead.json()).toEqual({ available: false }); expect(dead.headers.location).toBeUndefined()
  ports.probe = async () => 200
  expect((await call('POST', 'me/redirects/' + first.id + '/destinations', input(2))).statusCode).toBe(200)
  expect((await call('GET', 'r/' + first.id, undefined, null)).statusCode).toBe(302)
})
it('F12-I02 sem sessão, outro dono ADMIN, outro tenant e suspensão não ganham acesso privado', async () => {
  const first = await create(), path = 'me/redirects/' + first.id
  expect((await call('GET', path, undefined, null)).statusCode).toBe(401)
  expect((await call('GET', path, undefined, other)).statusCode).toBe(404)
  expect((await call('POST', path + '/destinations', input(1), other)).statusCode).toBe(404)
  expect((await call('GET', path, undefined, user, foreign)).statusCode).toBe(403)
  expect((await call('GET', path, undefined, 'f-' + tenant, foreign, foreign + '.test')).statusCode).toBe(404)
  const foreignPublic = await call('GET', 'r/' + first.id, undefined, null, foreign, foreign + '.test'); expect(foreignPublic.json()).toEqual({ available: false }); expect(foreignPublic.body).not.toContain(first.body.destinationUrl)
  await db.user.update({ where: { id: user }, data: { status: 'BANNED' } })
  expect((await call('POST', path + '/destinations', input(1))).statusCode).toBe(403)
  expect((await call('GET', 'r/' + first.id, undefined, null)).json()).toEqual({ available: false })
})
it('F12-I01 revisão lenta não substitui uma nova aprovada; clique durante pendência só usa versão aprovada', async () => {
  const first = await create(), path = 'me/redirects/' + first.id + '/destinations'
  let started: () => void = () => {}, release: () => void = () => {}
  const waiting = new Promise<void>(resolve => { started = resolve }), barrier = new Promise<void>(resolve => { release = resolve })
  ports.judge = async text => { if (text.name === 'Lento') { started(); await barrier }; return { pass: true, confidence: 0.99, reasons: [] } }
  const slow = call('POST', path, { ...input(1, 'https://example.com/lento'), label: 'Lento' }).then(r => r)
  await waiting
  expect((await call('GET', 'r/' + first.id, undefined, null)).headers.location).toBe(first.body.destinationUrl)
  const fast = await call('POST', path, input(2, 'https://example.com/novo')); expect(fast.statusCode, fast.body).toBe(200)
  release(); expect((await slow).statusCode).toBe(409)
  expect((await call('GET', 'r/' + first.id, undefined, null)).headers.location).toBe('https://example.com/novo')
})
it('F12-T05 métricas agregadas por revisão e dia, intervalo real, sem dono/admin/HEAD ou dado pessoal', async () => {
  const first = await create(), path = 'me/redirects/' + first.id
  await call('GET', 'r/' + first.id, undefined, null); await call('GET', 'r/' + first.id); await call('GET', 'r/' + first.id, undefined, other); await call('HEAD', 'r/' + first.id, undefined, null)
  expect((await db.redirectDaily.findFirstOrThrow({ where: { revisionId: first.destinationRevision.id } })).accesses).toBe(1)
  await call('POST', path + '/destinations', input(1, 'https://example.com/b')); await call('GET', 'r/' + first.id, undefined, null)
  const stats = (await call('GET', path)).json(); expect(stats.revisions.map((r: { accesses: unknown[] }) => r.accesses.length)).toEqual([1, 1]); expect(JSON.stringify(stats.revisions.map((r: { accesses: unknown[] }) => r.accesses))).not.toMatch(/session|email|ip|userAgent/)
  expect((await call('GET', path + '?from=2000-01-01&to=2000-01-02')).json().revisions.every((r: { accesses: unknown[] }) => r.accesses.length === 0)).toBe(true)
  expect((await call('GET', path + '?from=2026-02-31')).statusCode).toBe(400)
})
it('F12-I02 restrição não entrega destino/título ou incrementa antes do aceite', async () => {
  const first = await create({ ...input(), requiresAge: true })
  const restricted = await call('GET', 'r/' + first.id, undefined, null); expect(restricted.json()).toEqual({ restricted: true }); expect(restricted.headers.location).toBeUndefined()
  expect(await db.redirectDaily.count({ where: { revisionId: first.destinationRevision.id } })).toBe(0)
  expect((await call('GET', 'r/' + first.id, undefined, null, tenant, host, 'age=yes')).headers.location).toBe(first.body.destinationUrl)
})
it('F12-PG01 constraints impedem associação ativa de outro tenant; falha SQL não deixa aprovação parcial', async () => {
  const first = await create()
  const otherHandle = await db.redirectHandle.create({ data: { tenantId: foreign, ownerId: 'f-' + tenant, creationKey: randomUUID(), creationHash: 'fixture' } })
  await expect(db.redirectHandle.update({ where: { id: otherHandle.id }, data: { activeRevisionId: first.destinationRevision.id } })).rejects.toThrow()
  const blocked = await db.redirectDestination.create({ data: { handleId: first.id, tenantId: tenant, number: 999, requestKey: randomUUID(), requestHash: 'fixture', label: 'Bloqueado', destinationUrl: 'https://example.com/blocked', status: 'BLOCKED' } })
  await expect(db.redirectHandle.update({ where: { id: first.id }, data: { activeRevisionId: blocked.id } })).rejects.toThrow()
  const trigger = 'f12_' + tenant.replaceAll('-', '')
  await db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${first.id}' AND NEW."activeRevisionId" IS DISTINCT FROM OLD."activeRevisionId" THEN RAISE EXCEPTION 'synthetic'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON redirect_handles FOR EACH ROW EXECUTE FUNCTION ${trigger}()`)
  try {
    expect((await call('POST', 'me/redirects/' + first.id + '/destinations', input(1))).statusCode).toBe(500)
    const state = (await call('GET', 'me/redirects/' + first.id)).json(); expect(state.activeRevisionId).toBe(first.destinationRevision.id); expect(state.revisions.find((r: { number: number }) => r.number === 2).status).toBe('PENDING')
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON redirect_handles`); await db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`) }
})
it('F12-I03 chave reutilizada com conteúdo diferente não muda estado; retry retoma tentativa PENDING', async () => {
  const first = await create(), body = input(1, 'https://example.com/pendente')
  await db.redirectDestination.create({ data: { handleId: first.id, tenantId: tenant, number: 2, requestKey: body.requestKey, requestHash: (await import('node:crypto')).createHash('sha256').update(JSON.stringify([body.destinationUrl, body.label, body.requiresAge])).digest('hex'), label: body.label, destinationUrl: body.destinationUrl, status: 'PENDING' } })
  await db.redirectHandle.update({ where: { id: first.id }, data: { version: 2 } })
  expect((await call('POST', 'me/redirects', { ...first.body, label: 'Outra criação' })).statusCode).toBe(409)
  expect((await call('POST', 'me/redirects/' + first.id + '/destinations', body)).statusCode).toBe(200)
  expect((await call('POST', 'me/redirects/' + first.id + '/destinations', { ...body, label: 'Outro destino' })).statusCode).toBe(409)
  expect(await db.redirectDestination.count({ where: { handleId: first.id } })).toBe(2)
})
it('F12-I03 reenvios simultâneos devolvem a decisão já persistida, mesmo se uma validação tardia falhar', async () => {
  const body = input(); let started: () => void = () => {}, release: () => void = () => {}, calls = 0
  const waiting = new Promise<void>(resolve => { started = resolve }), barrier = new Promise<void>(resolve => { release = resolve })
  ports.judge = async () => { if (++calls === 1) { started(); await barrier; throw new Error('late provider failure') }; return { pass: true, confidence: 0.99, reasons: [] } }
  const first = call('POST', 'me/redirects', body).then(r => r); await waiting
  const repeated = await call('POST', 'me/redirects', body); expect(repeated.statusCode, repeated.body).toBe(200)
  release(); const original = await first
  expect(original.statusCode, original.body).toBe(200); expect(original.json()).toEqual(repeated.json())
  expect(await db.redirectDestination.count({ where: { handleId: original.json().id } })).toBe(1)
})
it('F12-I01 resolução que concorre com troca de destino não libera URL sem a validação correspondente', async () => {
  const first = await create(); let release: () => void = () => {}, started: () => void = () => {}
  const waiting = new Promise<void>(resolve => { started = resolve }), barrier = new Promise<void>(resolve => { release = resolve })
  ports.probe = async url => { if (url === first.body.destinationUrl) { started(); await barrier }; return 200 }
  const click = call('GET', 'r/' + first.id, undefined, null).then(r => r); await waiting
  expect((await call('POST', 'me/redirects/' + first.id + '/destinations', input(1, 'https://example.com/novo'))).statusCode).toBe(200)
  release(); const response = await click; expect(response.json()).toEqual({ available: false }); expect(response.headers.location).toBeUndefined()
})
it('F12-I02 conta não confirmada não cria; exclusão apaga destinos e mídia privada sem manter perfil público', async () => {
  await db.userIdentifier.updateMany({ where: { userId: user }, data: { confirmedAt: null } })
  expect((await call('POST', 'me/redirects', input())).statusCode).toBe(403)
  await db.userIdentifier.updateMany({ where: { userId: user }, data: { confirmedAt: new Date() } })
  const first = await create()
  await db.profile.create({ data: { tenantId: tenant, ownerId: user, slug: 'remover', name: 'Privado', version: 1, publishedVersion: 1, publication: { name: 'Privado' } } })
  await db.profileAsset.create({ data: { tenantId: tenant, ownerId: user, id: 'fixture', bytes: Buffer.from('synthetic') } })
  await new PrismaAccountDeletionRepository(db).anonymize(user)
  expect(await db.redirectHandle.count({ where: { id: first.id } })).toBe(0); expect(await db.redirectDestination.count({ where: { handleId: first.id } })).toBe(0)
  expect(await db.profile.count({ where: { ownerId: user } })).toBe(0); expect(await db.profileAsset.count({ where: { ownerId: user } })).toBe(0)
  expect((await call('GET', 'r/' + first.id, undefined, null)).json()).toEqual({ available: false })
})
it('F12-I03 desativação vence validação em voo e o endereço não é reciclado', async () => {
  const first = await create()
  let started: () => void = () => {}, release: () => void = () => {}
  const waiting = new Promise<void>(resolve => { started = resolve }), barrier = new Promise<void>(resolve => { release = resolve })
  ports.judge = async () => { started(); await barrier; return { pass: true, confidence: 0.99, reasons: [] } }
  const inFlight = call('POST', 'me/redirects/' + first.id + '/destinations', input(1)).then(r => r); await waiting
  const disabled = await call('POST', 'me/redirects/' + first.id + '/disable', { expectedRevision: 2 }); expect(disabled.statusCode).toBe(200)
  release(); expect((await inFlight).statusCode).toBe(409)
  ports.judge = async () => ({ pass: true, confidence: 0.99, reasons: [] })
  expect((await call('POST', 'me/redirects/' + first.id + '/disable', { expectedRevision: 1 })).statusCode).toBe(200)
  expect((await call('GET', 'r/' + first.id, undefined, null)).json()).toEqual({ available: false })
  expect((await call('POST', 'me/redirects/' + first.id + '/destinations', input(2))).statusCode).toBe(409)
  expect((await create()).id).not.toBe(first.id)
})
it('F12-I02 CSRF é exigido para cookie de sessão; token válido não contorna verificação', async () => {
  const csrf = 'a'.repeat(32), token = app.jwt.sign({ sub: user, tenantId: tenant, role: 'USER', typ: 'access' })
  const headers = { host, cookie: 'accessToken=' + token + ';csrf=' + csrf }
  const denied = await app.inject({ method: 'POST', url: '/api/v1/me/redirects', headers, payload: input() })
  expect(denied.statusCode).toBe(403); expect(await db.redirectHandle.count({ where: { tenantId: tenant } })).toBe(0)
  const allowed = await app.inject({ method: 'POST', url: '/api/v1/me/redirects', headers: { ...headers, 'x-csrf-token': csrf }, payload: input() })
  expect(allowed.statusCode, allowed.body).toBe(200)
})
it('F12-D14 retenção elimina expirados e excedentes, mantém no máximo 50 inclusive publicação antiga', async () => {
  const first = await create(), now = new Date('2027-06-01T12:00:00Z')
  await db.redirectDestination.update({ where: { id: first.destinationRevision.id }, data: { createdAt: new Date('2025-01-01T12:00:00Z') } })
  await db.redirectDestination.createMany({ data: Array.from({ length: 60 }, (_, i) => ({ id: randomUUID(), handleId: first.id, tenantId: tenant, number: i + 2, requestKey: randomUUID(), requestHash: 'fixture', label: 'Histórico', destinationUrl: 'https://example.com/history', status: 'BLOCKED', createdAt: i < 5 ? new Date('2025-01-01T12:00:00Z') : now })) })
  await db.redirectHandle.update({ where: { id: first.id }, data: { version: 61 } })
  await purgeRedirectHistory(db, now)
  const retained = await db.redirectDestination.findMany({ where: { handleId: first.id } }); expect(retained).toHaveLength(50); expect(retained.some(r => r.id === first.destinationRevision.id)).toBe(true); expect(retained.filter(r => r.number !== 1).every(r => r.createdAt >= new Date('2027-01-01'))).toBe(true)
})
