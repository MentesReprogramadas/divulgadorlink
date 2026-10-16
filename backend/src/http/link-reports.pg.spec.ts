import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaLinkReportsRepository, setLinkReportsRepositoryForTest } from '@/repositories/link-reports-repository'
import { PrismaAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { submitLinkReport } from '@/use-cases/@Moderation/link-reports'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Banco F06 deve ser local descartável')
const db = new PrismaClient({ datasources: { db: { url } } })
const repo = new PrismaLinkReportsRepository(db, 'f06-test-secret')
let tenant: string, owner: string, reader: string, admin: string, link: string, host: string
beforeAll(async () => {
  setTenantsRepositoryForTest({ async findByHost(host) { const row = await db.tenant.findUnique({ where: { host } }); return row ? { id: row.id, host: row.host, name: row.name } : null } })
  setLinkReportsRepositoryForTest(repo)
  await app.ready()
})
beforeEach(async () => {
  tenant = 'f06-' + randomUUID(); owner = 'owner-' + tenant; reader = 'reader-' + tenant; admin = 'admin-' + tenant; host = tenant + '.test'
  setLinkReportsRepositoryForTest(repo)
  await db.tenant.create({ data: { id: tenant, host, name: 'F06' } })
  await db.user.createMany({ data: [[owner, 'USER'], [reader, 'USER'], [admin, 'ADMIN']].map(([id, role]) => ({ id: id!, tenantId: tenant, name: id!, role: role as 'USER' | 'ADMIN', passwordHash: 'fixture' })) })
  await db.network.create({ data: { id: 'net-' + tenant, tenantId: tenant, name: 'Site', slug: 'site', knownHosts: [] } })
  await db.niche.create({ data: { id: 'niche-' + tenant, tenantId: tenant, name: 'Estudo', slug: 'estudo' } })
  link = (await makeLink()).id
})
afterAll(async () => { setLinkReportsRepositoryForTest(null); await db.$disconnect() })
function headers(actor: string | null = reader, tokenTenant = tenant) {
  return { host, ...(actor ? { authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role: actor === admin ? 'ADMIN' : 'USER', typ: 'access' }) } : {}) }
}
async function makeLink() {
  const id = randomUUID()
  return db.link.create({ data: { id, tenantId: tenant, ownerId: owner, networkId: 'net-' + tenant, nicheId: 'niche-' + tenant, canonicalUrl: 'https://example.com/' + id, name: 'Link F06', description: 'Fixture', status: 'PUBLISHED' } })
}
function post(actor: string | null = reader, linkId = link, reason = 'SPAM', comment = 'Relato privado') { return app.inject({ method: 'POST', url: '/api/v1/links/' + linkId + '/reports', headers: headers(actor), payload: { reason, comment } }) }
function list(actor: string | null = admin, query = '') { return app.inject({ method: 'GET', url: '/api/v1/admin/reports' + query, headers: headers(actor) }) }
function decide(id: string, status = 'RESOLVED', expectedVersion = 1, actor = admin) { return app.inject({ method: 'PATCH', url: '/api/v1/admin/reports/' + id + '/decision', headers: headers(actor), payload: { status, expectedVersion, reason: 'Análise concluída' } }) }

describe('F06 PostgreSQL e HTTP', () => {
  it('F06-I02 exige sessão e ADMIN atual do tenant; não revela autor ou fila privada', async () => {
    expect((await post(null)).statusCode).toBe(401)
    const response = await post()
    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.json().report).sort()).toEqual(['createdAt', 'id', 'status'])
    expect((await list(reader)).statusCode).toBe(404)
    expect((await list(null)).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/api/v1/admin/reports', headers: headers(admin, 'different-tenant') })).statusCode).toBe(403)
    const queue = await list()
    expect(queue.statusCode).toBe(200)
    expect(queue.headers['cache-control']).toBe('private, no-store')
    expect(queue.body).not.toContain('reporterKey')
    expect(queue.body).not.toContain('passwordHash')
    await db.user.update({ where: { id: admin }, data: { role: 'USER' } })
    expect((await list()).statusCode).toBe(404)
  })
  it('F06-T01 deduplica concorrência e conserva o comentário original', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => post()))
    expect(responses.every(row => row.statusCode === 200)).toBe(true)
    expect(new Set(responses.map(row => row.json().report.id)).size).toBe(1)
    const repeated = await post(reader, link, 'SPAM', 'Texto substituto não deve sobrescrever')
    expect(repeated.statusCode).toBe(200)
    expect(await db.linkReport.count({ where: { tenantId: tenant } })).toBe(1)
    expect((await db.linkReport.findFirstOrThrow({ where: { tenantId: tenant } })).comment).toBe('Relato privado')
  })
  it('F06-T01/I01 dez criações em 24h: concorrência excedente retorna 429', async () => {
    const links = await Promise.all(Array.from({ length: 12 }, makeLink))
    const responses = await Promise.all(links.map(row => post(reader, row.id)))
    expect(responses.filter(row => row.statusCode === 200)).toHaveLength(10)
    expect(responses.filter(row => row.statusCode === 429)).toHaveLength(2)
    expect(await db.linkReport.count({ where: { tenantId: tenant } })).toBe(10)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
  })
  it('F06-T02 cem contas denunciam sem retirar o link nem abrir moderação automática', async () => {
    const actors = Array.from({ length: 100 }, () => randomUUID())
    await db.user.createMany({ data: actors.map(id => ({ id, tenantId: tenant, name: 'Visitante', passwordHash: 'fixture' })) })
    for (const actor of actors) expect((await post(actor)).statusCode).toBe(200)
    expect(await db.linkReport.count({ where: { tenantId: tenant } })).toBe(100)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
    expect(await db.moderationCase.count({ where: { tenantId: tenant } })).toBe(0)
  })
  it('F06-T03/I03 decisão concorrente cria uma auditoria e versão, sem alterar LinkStatus', async () => {
    const id = (await post()).json().report.id
    const responses = await Promise.all([decide(id, 'IN_REVIEW'), decide(id)])
    expect(responses.map(row => row.statusCode).sort()).toEqual([200, 409])
    const report = await db.linkReport.findUniqueOrThrow({ where: { id } })
    expect(report.version).toBe(2)
    expect(await db.auditLog.count({ where: { tenantId: tenant, entityId: id, action: 'report.decide' } })).toBe(1)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe('PUBLISHED')
    expect((await decide(id, 'RESOLVED', 1)).statusCode).toBe(409)
  })
  it('F06-T03 rollback atômico quando a auditoria falha', async () => {
    const id = (await post()).json().report.id
    setLinkReportsRepositoryForTest(new PrismaLinkReportsRepository(db, 'f06-test-secret', tx => new class extends PrismaAuditLogsRepository { override async create(): Promise<never> { throw new Error('fixture-audit-unavailable') } }(tx)))
    expect((await decide(id)).statusCode).toBe(500)
    expect(await db.linkReport.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'RECEIVED', version: 1, decisionReason: null })
    expect(await db.auditLog.count({ where: { tenantId: tenant, entityId: id } })).toBe(0)
  })
  it('F06-T04 filtros separam disponibilidade e conteúdo; paginação não duplica', async () => {
    await post(reader, link, 'EXPIRED_INVITE'); await post(reader, link, 'SPAM'); await post(reader, link, 'INAPPROPRIATE_CONTENT')
    const availability = (await list(admin, '?kind=AVAILABILITY')).json()
    expect(availability.reports).toHaveLength(1)
    expect(availability.reports[0].reason).toBe('EXPIRED_INVITE')
    const first = (await list(admin, '?kind=CONTENT&limit=1')).json()
    const next = (await list(admin, '?kind=CONTENT&limit=1&cursor=' + first.nextCursor)).json()
    expect(first.reports[0].id).not.toBe(next.reports[0].id)
    expect(next.nextCursor).toBeNull()
    expect((await list(admin, '?limit=51')).statusCode).toBe(400)
  })
  it('F06-T05 preserva histórico e terminalidade após resolver e repetir envio', async () => {
    const id = (await post()).json().report.id
    expect((await decide(id, 'IN_REVIEW')).statusCode).toBe(200)
    const resolved = await decide(id, 'RESOLVED', 2)
    expect(resolved.statusCode).toBe(200)
    expect((await post()).json().report).toMatchObject({ id, status: 'RESOLVED' })
    expect((await decide(id, 'IN_REVIEW', 3)).statusCode).toBe(409)
    const report = (await list(admin, '?status=RESOLVED')).json().reports[0]
    expect(report.history).toHaveLength(2)
    expect(report.comment).toBe('Relato privado')
    expect(report.decisionReason).toBe('Análise concluída')
    expect(report.version).toBe(3)
    expect(Object.keys(report.history[0]).sort()).toEqual(['action', 'after', 'createdAt', 'id'])
  })
  it('F06-PG01 FK composta e projeção impedem denúncia em link de outro tenant', async () => {
    const foreign = 'foreign-' + tenant
    await db.tenant.create({ data: { id: foreign, host: foreign + '.test', name: 'Foreign' } })
    await expect(db.linkReport.create({ data: { tenantId: foreign, linkId: link, reporterKey: 'a'.repeat(64), reason: 'SPAM', kind: 'CONTENT' } })).rejects.toThrow()
    expect((await app.inject({ method: 'POST', url: '/api/v1/links/' + link + '/reports', headers: { host: foreign + '.test', authorization: 'Bearer ' + app.jwt.sign({ sub: reader, tenantId: foreign, role: 'USER', typ: 'access' }) }, payload: { reason: 'SPAM' } })).statusCode).toBe(404)
    expect(await db.linkReport.count({ where: { tenantId: foreign } })).toBe(0)
  })
  it('F06-I01 entrada inválida, conta suspensa e link oculto não criam relato', async () => {
    expect((await post(reader, link, 'unknown')).statusCode).toBe(400)
    expect((await post(reader, link, 'SPAM', 'x'.repeat(501))).statusCode).toBe(400)
    await db.link.update({ where: { id: link }, data: { status: 'DRAFT' } })
    expect((await post()).statusCode).toBe(404)
    await db.link.update({ where: { id: link }, data: { status: 'PUBLISHED' } })
    await db.user.update({ where: { id: reader }, data: { status: 'BANNED' } })
    expect((await post()).statusCode).toBe(404)
    expect(await db.linkReport.count({ where: { tenantId: tenant } })).toBe(0)
  })
  it('F06-U02/PG02 a janela móvel expira sem apagar relato anterior', async () => {
    const input = { tenantId: tenant, actorId: reader, linkId: link, reason: 'SPAM' }
    const start = new Date('2026-10-14T12:00Z')
    const original = await submitLinkReport(input, repo, start)
    const again = await submitLinkReport(input, repo, new Date(start.getTime() + 86400000))
    expect(again.id).not.toBe(original.id)
    expect(await db.linkReport.count({ where: { tenantId: tenant } })).toBe(2)
  })
})
