import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { actionReference } from '@/domain/notifications/evolution-command'
import { deliverOperationalMessage, processEvolutionReceipt, quotedReviewReference } from '@/use-cases/@Notifications/evolution-operations'
import { decideContentReview } from '@/use-cases/@Moderation/review-public-content'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { setProfilesForTest } from '@/http/controllers/@Profiles/routes'
import { setRedirectsForTest } from '@/http/controllers/@Redirects/routes'
import { setContentReviewsForTest } from '@/http/controllers/@Moderation/content-reviews'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
const previousEnv = { ...env }
let tenant: string, foreign: string, owner: string, other: string, admin: string, ports: PublicContentValidationPorts
beforeAll(async () => { setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } }); await app.ready() })
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); owner = 'owner-' + tenant; other = 'other-' + tenant; admin = 'admin-' + tenant
  for (const id of [tenant, foreign]) { await db.tenant.create({ data: { id, host: id + '.test', name: 'Review fixture' } }); await db.config.create({ data: { tenantId: id, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.85' } }) }
  for (const [id, role] of [[owner, 'USER'], [other, 'USER'], [admin, 'ADMIN']] as const) await db.user.create({ data: { id, tenantId: tenant, name: id, role, passwordHash: 'fixture', identifiers: { create: { tenantId: tenant, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  ports = { probe: async () => 200, judge: async () => ({ pass: false, confidence: .99, reasons: [] }) }
  setProfilesForTest(db, ports); setRedirectsForTest(db, ports); setContentReviewsForTest(db, ports)
})
afterAll(async () => { setProfilesForTest(null); setRedirectsForTest(null); setContentReviewsForTest(null); Object.assign(env, previousEnv); await db.$disconnect() })
function call(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, actor = owner, tokenTenant = tenant) {
  return app.inject({ method, url: '/api/v1/' + path, headers: { host: tenant + '.test', authorization: 'Bearer ' + app.jwt.sign({ sub: actor, tenantId: tokenTenant, role: actor === admin ? 'ADMIN' : 'USER', typ: 'access' }) }, ...(body ? { payload: body } : {}) })
}
function profile() { const id = randomUUID(); return { slug: 'pagina-pessoal', name: 'Meu projeto', bio: 'Apresentação', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [{ id, name: 'Projetos', visible: true }], items: [{ id: randomUUID(), categoryId: id, type: 'URL', label: 'Site', destination: 'https://example.com/projeto', visible: true }] } }
async function queuedProfile() {
  const content = profile(); expect((await call('PATCH', 'me/profile', { expectedVersion: 0, content })).statusCode).toBe(200)
  const response = await call('POST', 'me/profile/publish', { expectedVersion: 1 }); expect(response.statusCode, response.body).toBe(200)
  expect(response.json().review.status).toBe('PENDING'); return { id: response.json().review.id as string, content }
}
const decide = (id: string, decision: 'APPROVE' | 'REJECT', reason = 'Explique melhor o conteúdo.') => call('POST', 'admin/content-reviews/' + id + '/decision', { decision, reason }, admin)
it('perfil: fila idempotente por versão, isolamento, aprovação humana publica e não consome cota', async () => {
  const { id } = await queuedProfile()
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 1 })).json().review.id).toBe(id)
  expect(await db.contentReview.count({ where: { tenantId: tenant } })).toBe(1)
  expect((await call('GET', 'admin/content-reviews?kind=PROFILE')).statusCode).toBe(403)
  expect((await call('POST', 'admin/content-reviews/' + id + '/decision', { decision: 'APPROVE' })).statusCode).toBe(403)
  expect((await call('GET', 'admin/content-reviews?kind=PROFILE', undefined, admin, foreign)).statusCode).toBe(403)
  const queue = await call('GET', 'admin/content-reviews?kind=PROFILE', undefined, admin); expect(queue.json().cases[0].snapshot.name).toBe('Meu projeto')
  expect((await call('GET', 'admin/content-reviews?kind=REDIRECT', undefined, admin)).json().cases).toEqual([])
  expect((await call('POST', 'me/content-reviews/' + id + '/appeal', { text: 'Minha explicação' }, other)).statusCode).toBe(404)
  expect((await decide(id, 'APPROVE')).statusCode).toBe(200)
  expect((await call('GET', 'profiles/pagina-pessoal')).json().name).toBe('Meu projeto')
  expect((await decide(id, 'REJECT')).statusCode).toBe(409)
  expect(await db.link.count({ where: { tenantId: tenant } })).toBe(0)
})
it('conteúdo aprovado por humano não retorna à fila por cor; texto novo não herda essa aprovação', async () => {
  const content = { ...profile(), bio: 'Contato https://example.com/contato' }
  await call('PATCH', 'me/profile', { expectedVersion: 0, content })
  const queued = await call('POST', 'me/profile/publish', { expectedVersion: 1 })
  expect(queued.json().review.status).toBe('PENDING')
  expect((await decide(queued.json().review.id, 'APPROVE')).statusCode).toBe(200)
  ports.judge = async () => { throw new Error('provider unavailable') }
  const appearance = { background: '#173c32', buttonColor: '#d9efb6', backgroundStyle: 'solid', buttonStyle: 'shadow', radius: 'pill', font: 'modern', alignment: 'center' }
  await call('PATCH', 'me/profile', { expectedVersion: 1, content: { ...content, appearance } })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 2 })).json()).toEqual({ publishedRevisionId: 2 })
  expect(await db.contentReview.count({ where: { tenantId: tenant, status: 'PENDING' } })).toBe(0)
  ports.judge = async input => { expect(input.profileContext?.changedFields).toEqual(['nome']); return { pass: true, confidence: .98, reasons: [] } }
  await call('PATCH', 'me/profile', { expectedVersion: 2, content: { ...content, appearance, name: 'Meu projeto pessoal' } })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 3 })).json()).toEqual({ publishedRevisionId: 3 })
  ports.judge = async () => ({ pass: false, confidence: .99, reasons: [] })
  await call('PATCH', 'me/profile', { expectedVersion: 3, content: { ...content, appearance, name: 'Novo tema suspeito' } })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 4 })).json().review.status).toBe('PENDING')
  expect((await call('GET', 'profiles/pagina-pessoal')).json().name).toBe('Meu projeto pessoal')
})
it('aprovação humana adulta é contexto confiável: pontuação dispensa IA e edição recebe antes/depois completo', async () => {
  const content = { ...profile(), requiresAge: true, bio: 'Comunidade adulta +18. Contato https://example.com/contato' }
  await db.blocklistTerm.createMany({ data: ['adulta', '+18'].map(term => ({ tenantId: tenant, term })) })
  await call('PATCH', 'me/profile', { expectedVersion: 0, content })
  const queued = await call('POST', 'me/profile/publish', { expectedVersion: 1 })
  expect((await decide(queued.json().review.id, 'APPROVE')).statusCode).toBe(200)
  ports.judge = vi.fn(async () => { throw new Error('provider unavailable') })
  const organized = { ...content, categories: [{ ...content.categories[0], name: '...' }] }
  await call('PATCH', 'me/profile', { expectedVersion: 1, content: organized })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 2 })).json()).toEqual({ publishedRevisionId: 2 })
  expect(ports.judge).not.toHaveBeenCalled()
  ports.judge = vi.fn(async input => {
    expect(input.profileContext).toMatchObject({
      approved: { snapshot: { requiresAge: true, description: content.bio, groups: [{ name: '...' }], links: [{ destination: content.items[0].destination }] } },
      proposed: { requiresAge: true, description: 'Meu espaço: comunidade adulta +18. Contato https://example.com/contato', links: [{ destination: content.items[0].destination }] },
      changedFields: ['descrição'],
    })
    return { pass: true, confidence: .98, reasons: ['Finalidade e destinos preservados.'] }
  })
  const edited = { ...organized, bio: 'Meu espaço: comunidade adulta +18. Contato https://example.com/contato' }
  await call('PATCH', 'me/profile', { expectedVersion: 2, content: edited })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 3 })).json()).toEqual({ publishedRevisionId: 3 })
  expect(ports.judge).toHaveBeenCalledTimes(1)
  expect(await db.contentReview.count({ where: { tenantId: tenant, status: 'PENDING' } })).toBe(0)
  ports.judge = vi.fn(async () => ({ pass: false, confidence: .99, reasons: ['Proteção etária removida.'] }))
  await call('PATCH', 'me/profile', { expectedVersion: 3, content: { ...edited, requiresAge: false } })
  expect((await call('POST', 'me/profile/publish', { expectedVersion: 4 })).json().review.status).toBe('PENDING')
  expect(ports.judge).toHaveBeenCalledWith(expect.objectContaining({ profileContext: expect.objectContaining({ approved: expect.objectContaining({ snapshot: expect.objectContaining({ requiresAge: true }) }), proposed: expect.objectContaining({ requiresAge: false }) }) }))
})
it('recusa exige motivo, contestação apenas uma vez e novo conteúdo substitui o caso antigo', async () => {
  const { id, content } = await queuedProfile()
  expect((await call('POST', 'admin/content-reviews/' + id + '/decision', { decision: 'REJECT' }, admin)).statusCode).toBe(400)
  expect((await decide(id, 'REJECT')).statusCode).toBe(200)
  expect((await call('GET', 'me/profile')).json().review.canAppeal).toBe(true)
  expect((await call('POST', 'me/content-reviews/' + id + '/appeal', { text: '   ' })).statusCode).toBe(400)
  expect((await call('POST', 'me/content-reviews/' + id + '/appeal', { text: 'Conteúdo educativo, solicito reavaliação.' })).statusCode).toBe(200)
  expect((await decide(id, 'REJECT')).statusCode).toBe(200)
  expect((await call('POST', 'me/content-reviews/' + id + '/appeal', { text: 'Outra vez' })).statusCode).toBe(409)
  expect((await call('GET', 'me/profile')).json().review.canAppeal).toBe(false)
  expect((await call('PATCH', 'me/profile', { expectedVersion: 1, content: { ...content, name: 'Projeto corrigido' } })).statusCode).toBe(200)
  expect((await decide(id, 'APPROVE')).statusCode).toBe(409)
  const next = await call('POST', 'me/profile/publish', { expectedVersion: 2 }); expect(next.json().review.id).not.toBe(id)
})
it('IA indisponível segue para humano; aprovação revalida segurança e não publica snapshot antigo', async () => {
  ports.judge = async () => { throw new Error('provider') }
  const { id, content } = await queuedProfile()
  ports.probe = async () => null
  expect((await decide(id, 'APPROVE')).statusCode).toBe(503)
  expect((await call('GET', 'profiles/pagina-pessoal')).statusCode).toBe(404)
  ports.probe = async () => 200
  await call('PATCH', 'me/profile', { expectedVersion: 1, content: { ...content, name: 'Nova versão' } })
  expect((await decide(id, 'APPROVE')).statusCode).toBe(409)
  expect((await call('GET', 'admin/content-reviews?kind=PROFILE', undefined, admin)).json().cases).toEqual([])
})
it('convite: aprovação, recusa com destino anterior preservado, contestação e concorrência', async () => {
  const input = { label: 'Meu convite', destinationUrl: 'https://example.com/a', requiresAge: false, requestKey: randomUUID(), expectedRevision: 0 }
  const first = await call('POST', 'me/redirects', input); expect(first.statusCode, first.body).toBe(200); expect(first.json().destinationRevision.status).toBe('PENDING_REVIEW')
  const handle = first.json().id, detail = () => call('GET', 'me/redirects/' + handle)
  const id = (await detail()).json().revisions[0].review.id
  expect((await decide(id, 'APPROVE')).statusCode).toBe(200)
  const next = await call('POST', 'me/redirects/' + handle + '/destinations', { ...input, expectedRevision: 1, requestKey: randomUUID(), destinationUrl: 'https://example.com/b' }); expect(next.statusCode).toBe(200)
  const rejected = (await detail()).json().revisions[0].review.id
  expect((await decide(rejected, 'REJECT')).statusCode).toBe(200)
  expect((await call('GET', 'r/' + handle)).headers.location).toBe(input.destinationUrl)
  expect((await call('POST', 'me/content-reviews/' + rejected + '/appeal', { text: 'Destino de uma comunidade educativa.' })).statusCode).toBe(200)
  const results = await Promise.all([decide(rejected, 'APPROVE'), decide(rejected, 'REJECT')]); expect(results.map(r => r.statusCode).sort()).toEqual([200, 409])
  expect(await db.link.count({ where: { tenantId: tenant } })).toBe(0)
  expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'content.review.decide' } })).toBe(3)
})
it('conta suspensa ou não confirmada não é publicada; FK do convite impede tenant cruzado', async () => {
  const { id } = await queuedProfile()
  await db.user.update({ where: { id: owner }, data: { status: 'BANNED' } })
  expect((await decide(id, 'APPROVE')).statusCode).toBe(403)
  await db.user.update({ where: { id: owner }, data: { status: 'ACTIVE' } })
  await db.userIdentifier.updateMany({ where: { userId: owner }, data: { confirmedAt: null } })
  expect((await decide(id, 'APPROVE')).statusCode).toBe(403)
  await db.userIdentifier.updateMany({ where: { userId: owner }, data: { confirmedAt: new Date() } })
  const created = await call('POST', 'me/redirects', { label: 'Convite', destinationUrl: 'https://example.com', requiresAge: false, requestKey: randomUUID(), expectedRevision: 0 })
  const foreignOwner = await db.user.create({ data: { tenantId: foreign, name: 'Outra conta', passwordHash: 'fixture' } })
  await expect(db.contentReview.create({ data: { tenantId: foreign, ownerId: foreignOwner.id, kind: 'REDIRECT', redirectRevisionId: created.json().destinationRevision.id, version: 1, snapshot: {} } })).rejects.toThrow()
  const handle = created.json().id
  await call('POST', 'me/redirects/' + handle + '/destinations', { label: 'Convite corrigido', destinationUrl: 'https://example.com/corrigido', requiresAge: false, requestKey: randomUUID(), expectedRevision: 1 })
  const history = (await call('GET', 'me/redirects/' + handle)).json().revisions
  expect(history.map((row: { status: string }) => row.status)).toEqual(['PENDING_REVIEW', 'SUPERSEDED'])
  expect((await decide(history[1].review.id, 'APPROVE')).statusCode).toBe(409)
  expect((await call('GET', 'profiles/pagina-pessoal')).statusCode).toBe(404)
})

async function whatsapp() {
  Object.assign(env, { TENANT_HOST: tenant + '.test', EVOLUTION_ENABLED: '1', EVOLUTION_ACTIONS_ENABLED: '1', EVOLUTION_BASE_URL: 'https://evolution.example.test', EVOLUTION_INSTANCE_NAME: 'Fixture bot', EVOLUTION_API_KEY: 'fixture', EVOLUTION_GROUP_JID: 'fixture@g.us', EVOLUTION_WEBHOOK_AUTH_SECRET: 'fixture-secret', EVOLUTION_OPERATOR_PHONES: '5511999999999' })
  await db.evolutionOperator.create({ data: { tenantId: tenant, phone: '5511999999999', userId: admin } })
}
async function notice(id: string) {
  const event = await db.operationalMessage.findFirstOrThrow({ where: { resourceId: id, kind: { in: ['REVIEW_PROFILE', 'REVIEW_REDIRECT'] }, state: 'PENDING' }, orderBy: { createdAt: 'desc' } })
  await deliverOperationalMessage(db, event, async () => new Response(JSON.stringify({ key: { id: 'provider-' + event.id } })))
  return db.operationalMessage.findUniqueOrThrow({ where: { id: event.id } })
}
async function receipt(eventId: string, decision: 'APPROVE' | 'REJECT', reason?: string) {
  return db.evolutionReceipt.create({ data: { tenantId: tenant, instance: 'Fixture bot', providerMessageId: randomUUID(), sender: '5511999999999', reference: actionReference(eventId, 'fixture-secret'), decision, reason } })
}
it('WhatsApp identifica a citação exata entre página e convite e publica somente o envio escolhido', async () => {
  await whatsapp(); const page = await queuedProfile()
  const created = await call('POST', 'me/redirects', { label: 'Convite no grupo', destinationUrl: 'https://example.com/grupo', requiresAge: false, requestKey: randomUUID(), expectedRevision: 0 })
  const redirect = await db.contentReview.findFirstOrThrow({ where: { redirectRevisionId: created.json().destinationRevision.id } })
  const pageNotice = await notice(page.id), redirectNotice = await notice(redirect.id)
  expect(await quotedReviewReference(db, tenant, pageNotice.providerMessageId!, 'fixture-secret')).toBe(actionReference(pageNotice.id, 'fixture-secret'))
  expect(await quotedReviewReference(db, foreign, redirectNotice.providerMessageId!, 'fixture-secret')).toBeNull()
  const inbound = await receipt(redirectNotice.id, 'APPROVE'); await processEvolutionReceipt(db, inbound.id, ports); await processEvolutionReceipt(db, inbound.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: inbound.id } })).state).toBe('DONE')
  expect((await db.contentReview.findUniqueOrThrow({ where: { id: page.id } })).status).toBe('PENDING')
  expect((await call('GET', 'r/' + created.json().id)).headers.location).toBe('https://example.com/grupo')
  const confirm = await db.operationalMessage.findFirstOrThrow({ where: { resourceId: redirect.id, kind: 'DECISION' } })
  expect(confirm.payload).toMatchObject({ resourceType: 'REDIRECT', channel: 'WHATSAPP', status: 'APPROVED', reviewMessageId: redirectNotice.id })
  expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'content.review.decide' } })).toBe(1)
})
it('WhatsApp exige motivo, recusa, reenvia contestação e invalida a mensagem anterior', async () => {
  await whatsapp(); const page = await queuedProfile(), first = await notice(page.id)
  const empty = await receipt(first.id, 'REJECT'); await processEvolutionReceipt(db, empty.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: empty.id } })).resultCode).toBe('reason_required')
  expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: first.id } })).consumedAt).toBeNull()
  const denied = await receipt(first.id, 'REJECT', 'Explique o propósito.'); await processEvolutionReceipt(db, denied.id, ports)
  expect((await call('GET', 'me/profile')).json().review).toMatchObject({ status: 'REJECTED', reason: 'Explique o propósito.', canAppeal: true })
  await call('POST', 'me/content-reviews/' + page.id + '/appeal', { text: 'Projeto de educação.' })
  const appealed = await notice(page.id); expect(appealed.id).not.toBe(first.id)
  expect(appealed.payload).toMatchObject({ appeal: 'Projeto de educação.' })
  const stale = await receipt(first.id, 'APPROVE'); await processEvolutionReceipt(db, stale.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: stale.id } })).resultCode).toBe('review_reference_expired')
  const approved = await receipt(appealed.id, 'APPROVE'); await processEvolutionReceipt(db, approved.id, ports)
  expect((await call('GET', 'profiles/pagina-pessoal')).statusCode).toBe(200)
  expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: appealed.id } })).consumedAt).not.toBeNull()
})
it('WhatsApp mantém consumo e publicação intactos diante de expiração, falha técnica e revogação concorrente', async () => {
  await whatsapp(); const page = await queuedProfile(), event = await notice(page.id)
  await db.operationalMessage.update({ where: { id: event.id }, data: { expiresAt: new Date(0) } })
  const expired = await receipt(event.id, 'APPROVE'); await processEvolutionReceipt(db, expired.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: expired.id } })).resultCode).toBe('review_reference_expired')
  await db.operationalMessage.update({ where: { id: event.id }, data: { expiresAt: new Date(Date.now() + 60000) } })
  ports.probe = async () => null
  const unavailable = await receipt(event.id, 'APPROVE'); await processEvolutionReceipt(db, unavailable.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: unavailable.id } })).resultCode).toBe('review_validation_unavailable')
  ports.probe = async () => { await db.evolutionOperator.updateMany({ where: { tenantId: tenant }, data: { enabled: false } }); return 200 }
  const revoked = await receipt(event.id, 'APPROVE'); await processEvolutionReceipt(db, revoked.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: revoked.id } })).resultCode).toBe('operator_forbidden')
  expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: event.id } })).consumedAt).toBeNull()
  expect((await call('GET', 'profiles/pagina-pessoal')).statusCode).toBe(404)
})
it('WhatsApp e painel concorrem na mesma transação; só uma decisão e confirmação são gravadas', async () => {
  await whatsapp(); const page = await queuedProfile(), event = await notice(page.id)
  const inbound = await receipt(event.id, 'APPROVE')
  await Promise.allSettled([processEvolutionReceipt(db, inbound.id, ports), decideContentReview(db, { tenantId: tenant, ownerId: admin }, page.id, 'REJECT', 'Motivo', ports)])
  expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'content.review.decide' } })).toBe(1)
  expect(await db.operationalMessage.count({ where: { tenantId: tenant, kind: 'DECISION' } })).toBe(1)
  expect(['APPROVED', 'REJECTED']).toContain((await db.contentReview.findUniqueOrThrow({ where: { id: page.id } })).status)
})
it('WhatsApp cancela entrega de versão alterada e não permite operador de outro usuário', async () => {
  await whatsapp(); const page = await queuedProfile()
  const event = await db.operationalMessage.findFirstOrThrow({ where: { resourceId: page.id } })
  await call('PATCH', 'me/profile', { expectedVersion: 1, content: { ...page.content, name: 'Nova versão' } })
  await deliverOperationalMessage(db, event, async () => { throw new Error('Never send old content') })
  expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: event.id } })).state).toBe('CANCELLED')
  const next = await call('POST', 'me/profile/publish', { expectedVersion: 2 }), current = await notice(next.json().review.id)
  await db.evolutionOperator.updateMany({ where: { tenantId: tenant }, data: { userId: other } })
  const inbound = await receipt(current.id, 'APPROVE'); await processEvolutionReceipt(db, inbound.id, ports)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: inbound.id } })).resultCode).toBe('operator_forbidden')
  expect((await call('GET', 'profiles/pagina-pessoal')).statusCode).toBe(404)
})
