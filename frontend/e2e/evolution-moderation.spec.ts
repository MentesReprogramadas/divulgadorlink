import { selectOption } from './select-control'
import { runtime as e2eRuntime } from './runtime.cjs'
import { createHmac, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page, type APIRequestContext } from '@playwright/test'
import { Queue, QueueEvents } from '../../backend/node_modules/bullmq'
import { sql } from './db'

const A = (e2eRuntime.web('evolution.localhost'))
const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).evolution as { tenantA: string; admin: string; bia: string; eva: string; password: string; receitas: string }
const hook = (e2eRuntime.apiOrigin + '/api/v1/integrations/evolution/webhook')
function legacyReference(text: string) {
  const id = /Revisão: (\S+)/.exec(text)![1]!
  return `${id}.${createHmac('sha256', 'fixture-webhook-secret').update(`evolution.action.v1:${id}`).digest('base64url')}`
}

async function login(page: Page, email = state.admin) {
  await page.goto(`${A}/login`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
}
async function cycle() {
  const connection = { host: '127.0.0.1', port: e2eRuntime.redisPort }
  const queue = new Queue('divulgador-evolution', { connection })
  const events = new QueueEvents('divulgador-evolution', { connection })
  try {
    await events.waitUntilReady()
    const job = await queue.add('evolution-cycle', {}, { jobId: `f42-${randomUUID()}`, removeOnComplete: true, removeOnFail: true })
    await job.waitUntilFinished(events, 30_000)
  } finally { await events.close(); await queue.close() }
}
async function fixture(request: APIRequestContext, prefix: string) {
  const id = `e2e-f42-${randomUUID()}`
  const name = `${prefix}-${id}`
  sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${id}',"tenantId","ownerId",'https://example.com/${id}','${name}','Descrição para revisão',"networkId","nicheId",'PENDING_MODERATION',NOW() FROM links WHERE id='${state.receitas}'`)
  sql(`INSERT INTO moderation_cases (id,"tenantId","linkId","updatedAt") VALUES ('case-${id}','${state.tenantA}','${id}',NOW())`)
  await cycle()
  sql(`UPDATE operational_messages SET "nextAttemptAt"=NOW() WHERE "tenantId"='${state.tenantA}' AND state IN ('PENDING','RETRY')`)
  await cycle()
  const messages = await (await request.get((e2eRuntime.stubOrigin + '/evolution/messages'))).json() as { text: string; number: string }[]
  const message = messages.findLast(m => m.text.includes(name))
  expect(message?.number).toBe('fixture@g.us')
  expect(message!.text).toContain('\n\n*Usuário*\n')
  expect(message!.text).toContain(`https://example.com/${id}`)
  expect(message!.text).toContain('Categoria:')
  expect(message!.text).toContain('\n\n*Ação*\n')
  const reference = legacyReference(message!.text)
  expect(reference).toBeTruthy()
  const providerId = sql(`SELECT "providerMessageId" FROM operational_messages WHERE id='${reference.split('.')[0]}'`)
  return { id, name, reference: reference!, providerId, caseId: `case-${id}` }
}
function payload(text: string, sender = '5511999999999@s.whatsapp.net', group = 'fixture@g.us') {
  return { event: 'messages.upsert', instance: 'E2E Bot', data: { key: { id: randomUUID(), remoteJid: group, participant: sender, fromMe: false }, messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: text } } }
}
async function command(request: APIRequestContext, text: string) {
  return request.post(hook, { headers: { 'x-evolution-secret': 'fixture-webhook-secret', host: 'evolution.localhost' }, data: payload(text) })
}

async function reviewReference(request: APIRequestContext, name: string) {
  await cycle()
  sql(`UPDATE operational_messages SET "nextAttemptAt"=NOW() WHERE "tenantId"='${state.tenantA}' AND state IN ('PENDING','RETRY')`)
  await cycle()
  const messages = await (await request.get((e2eRuntime.stubOrigin + '/evolution/messages'))).json() as { text: string }[]
  const message = messages.findLast(m => m.text.includes(name) && m.text.includes('Responda:'))
  expect(message).toBeTruthy()
  return legacyReference(message!.text)
}

test('F42-E11 cadastro concluído avisa novo usuário sem expor contatos no WhatsApp', async ({ request, playwright }) => {
  const name = `Cadastro-${randomUUID()}`
  const email = `novo-${randomUUID()}@example.test`
  const response = await request.post('http://127.0.0.1:3333/api/v1/auth/register', {
    headers: { host: 'evolution.localhost' }, data: { name, email, password: state.password },
  })
  expect(response.status()).toBe(201)
  const userId = (await response.json()).user.id as string
  expect(sql(`SELECT COUNT(*) FROM operational_messages WHERE "tenantId"='${state.tenantA}' AND kind='NEW_USER' AND "resourceId"='${userId}'`)).toBe('1')
  const anonymous = await playwright.request.newContext()
  try {
    const duplicate = await anonymous.post('http://127.0.0.1:3333/api/v1/auth/register', {
      headers: { host: 'evolution.localhost' }, data: { name, email, password: state.password },
    })
    expect(duplicate.status()).toBe(409)
  } finally { await anonymous.dispose() }
  await cycle()
  const messages = await (await request.get('http://127.0.0.1:4099/evolution/messages')).json() as { text: string }[]
  const notices = messages.filter(message => message.text.includes(name) && message.text.includes('NOVO USUÁRIO'))
  expect(notices).toHaveLength(1)
  expect(notices[0]!.text).not.toContain(email)
  expect(notices[0]!.text).not.toContain(state.password)
  expect(notices[0]!.text).toContain('confirmação dos contatos é uma etapa separada')
})

test('F42-E10 respostas normalizadas pela Evolution escolhem a citação exata entre várias pendências', async ({ request }) => {
  const first = await fixture(request, 'Primeiro')
  const second = await fixture(request, 'Segundo')
  const reply = async (text: string, quotedId?: string, referenceText = 'texto citado não autoriza decisões') => {
    const inbound = payload(text)
    return request.post(hook, { headers: { 'x-evolution-secret': 'fixture-webhook-secret' }, data: { ...inbound, data: {
      ...inbound.data, key: { ...inbound.data.key, participant: '12345678900000@lid', participantAlt: '5511999999999@s.whatsapp.net' },
      messageType: 'conversation', message: { conversation: text, messageContextInfo: {} },
      contextInfo: { stanzaId: quotedId, quotedType: 0, participant: '98765432100000@lid', quotedMessage: { conversation: referenceText } },
    } } })
  }
  await reply('APROVAR')
  await reply('APROVAR', 'unknown', `APROVAR ${first.reference}`)
  await reply(`APROVAR ${second.reference}`, first.providerId)
  await cycle()
  for (const row of [first, second]) expect(sql(`SELECT status FROM links WHERE id='${row.id}'`)).toBe('PENDING_MODERATION')
  await reply('APROVAR', first.providerId)
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${first.id}'`)).toBe('PUBLISHED')
  expect(sql(`SELECT status FROM links WHERE id='${second.id}'`)).toBe('PENDING_MODERATION')
  await reply('RECUSAR', second.providerId)
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${second.id}'`)).toBe('PENDING_MODERATION')
  const guidance = await (await request.get((e2eRuntime.stubOrigin + '/evolution/messages'))).json() as { text: string }[]
  expect(guidance.some(m => m.text.includes(second.name) && m.text.includes('RECUSAR e o motivo'))).toBe(true)
  await reply('RECUSAR Fora do tema', second.providerId)
  await reply('RECUSAR Resposta atrasada', first.providerId)
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${second.id}'`)).toBe('PRE_REJECTED')
  expect(sql(`SELECT status FROM links WHERE id='${first.id}'`)).toBe('PUBLISHED')
  const messages = await (await request.get((e2eRuntime.stubOrigin + '/evolution/messages'))).json() as { text: string }[]
  expect(messages.some(m => m.text.includes(first.name) && m.text.includes('A decisão anterior foi mantida'))).toBe(true)
  expect(sql(`SELECT count(*) FROM audit_logs WHERE action='moderation.decide' AND "entityId" IN ('${first.caseId}','${second.caseId}')`)).toBe('2')
})

test('F42-E08 envio, contestação e edição percorrem a interface e o worker reais', async ({ page, request }) => {
  await login(page, state.eva)
  const name = 'Jornada de estudos ' + test.info().project.name
  await page.goto(`${A}/painel/links/novo`)
  await page.getByLabel('Título do link', { exact: true }).fill(name)
  await page.getByLabel('Link de acesso', { exact: true }).fill(`https://example.com/${randomUUID()}`)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Descrição', { exact: true }).fill('Comunidade de estudo')
  await selectOption(page.getByLabel('Rede do link'), { label: 'Site' })
  await selectOption(page.getByLabel('Assunto do link'), { label: 'Jogos' })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Enviado para análise.' })).toBeVisible()
  const id = sql(`SELECT id FROM links WHERE name='${name}'`)
  expect(id).toBeTruthy()
  try {
    const first = await reviewReference(request, name)
    await command(request, `RECUSAR ${first} Precisa de esclarecimento`)
    await cycle()
    await page.goto(`${A}/painel/links/${id}/contestar`)
    await page.getByLabel('Explique o que aconteceu').fill('O grupo é destinado a estudos e segue as regras.')
    await page.getByRole('button', { name: 'Enviar contestação' }).click()
    await expect(page.getByText('Em revisão', { exact: true })).toBeVisible()
    const appeal = await reviewReference(request, name)
    expect(appeal).not.toBe(first)
    await command(request, `APROVAR ${appeal}`)
    await cycle()
    await page.goto(`${A}/link/${id}`)
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await page.goto(`${A}/painel/links`)
    await page.locator('article', { has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Editar' }).click()
    const dialog = page.getByRole('dialog', { name: 'Editar link' })
    const proposed = `${name} editado`
    await dialog.getByLabel('Título do link', { exact: true }).fill(proposed)
    await dialog.getByLabel('Nova descrição').fill('Proposta ainda não publicada')
    await dialog.getByRole('button', { name: 'Salvar texto' }).click()
    await expect(dialog.getByText('Proposta registrada')).toBeVisible()
    await expect.poll(() => sql(`SELECT count(*) FROM operational_messages WHERE "tenantId"='${state.tenantA}' AND kind='REVIEW_TEXT' AND payload->>'name'='${proposed}'`)).toBe('1')
    const edit = await reviewReference(request, proposed)
    await command(request, `RECUSAR ${edit} Manter o texto anterior`)
    await cycle()
    await page.goto(`${A}/link/${id}`)
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: proposed, exact: true })).toHaveCount(0)
    expect(sql(`SELECT count(*) FROM audit_logs WHERE action='moderation.decide' AND "entityId" IN (SELECT id FROM moderation_cases WHERE "linkId"='${id}')`)).toBe('2')
  } finally {
    sql(`UPDATE links SET status='DRAFT',"occupiesSlot"=false WHERE id='${id}'`)
  }
})

test('F42-E01 aprovação pelo grupo publica e audita sem duplicação', async ({ page, request }) => {
  await login(page)
  const row = await fixture(request, 'Aprovar')
  const inbound = payload(`APROVAR ${row.reference}`)
  const response = await request.post(hook, { headers: { 'x-evolution-secret': 'fixture-webhook-secret' }, data: inbound })
  expect(response.status()).toBe(200)
  await cycle()
  await page.goto(`${A}/link/${row.id}`)
  await expect(page.getByRole('heading', { name: row.name })).toBeVisible()
  await request.post(hook, { headers: { 'x-evolution-secret': 'fixture-webhook-secret' }, data: inbound })
  await cycle()
  expect(sql(`SELECT count(*) FROM audit_logs WHERE "entityId"='${row.caseId}' AND action='moderation.decide'`)).toBe('1')
  expect(sql(`SELECT "after"->>'channel' FROM audit_logs WHERE "entityId"='${row.caseId}' AND action='moderation.decide'`)).toBe('WHATSAPP')
  await page.reload()
  await expect(page.getByRole('heading', { name: row.name })).toBeVisible()
})

test('F42-E02 recusa precisa de motivo e não publica o link', async ({ page, request }) => {
  await login(page)
  const row = await fixture(request, 'Recusar')
  expect((await command(request, `RECUSAR ${row.reference}`)).status()).toBe(200)
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${row.id}'`)).toBe('PENDING_MODERATION')
  await command(request, `RECUSAR ${row.reference} Fora do tema`)
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${row.id}'`)).toBe('PRE_REJECTED')
  await page.goto(`${A}/admin/moderacao`)
  await expect(page.locator('article', { hasText: row.name })).toHaveCount(0)
  expect(sql(`SELECT "after"->>'reason' FROM audit_logs WHERE "entityId"='${row.caseId}' AND action='moderation.decide'`)).toBe('Fora do tema')
})

test('F42-E03 painel vence mensagem tardia e preserva decisão', async ({ page, request }) => {
  await login(page)
  const row = await fixture(request, 'Painel')
  await page.goto(`${A}/admin/moderacao`)
  const card = page.locator('article', { hasText: row.name })
  await card.getByRole('button', { name: 'Aprovar' }).click()
  await expect(card).toHaveCount(0)
  await command(request, `RECUSAR ${row.reference} Mensagem atrasada`)
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${row.id}'`)).toBe('PUBLISHED')
  expect(sql(`SELECT count(*) FROM audit_logs WHERE "entityId"='${row.caseId}' AND action='moderation.decide'`)).toBe('1')
})

test('F42-E05/E06 painel de integração limita acesso e funciona no mobile', async ({ page, browser }, testInfo) => {
  await login(page)
  await page.goto(`${A}/admin/integracoes`)
  const cookieChoice = page.getByRole('button', { name: 'Recusar', exact: true })
  if (await cookieChoice.count()) await cookieChoice.click()
  await expect(page.getByRole('heading', { name: 'Avisos e moderação pelo WhatsApp' })).toBeVisible()
  await expect(page.getByText('E2E Bot', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Desativar comandos', exact: true }).click()
  await expect(page.getByText('Comandos desativados', { exact: true })).toBeVisible()
  expect(sql(`SELECT value::jsonb->>'actionsEnabled' FROM configs WHERE "tenantId"='${state.tenantA}' AND key='EVOLUTION_INTEGRATION'`)).toBe('false')
  await page.getByRole('button', { name: 'Ativar comandos', exact: true }).click()
  await expect(page.getByText('Aprovação e recusa ativadas', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Revogar final 9999', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Vincular final 9999', exact: true })).toBeVisible()
  await cycle()
  expect(sql(`SELECT enabled FROM evolution_operators WHERE "tenantId"='${state.tenantA}'`)).toBe('f')
  await page.getByRole('button', { name: 'Vincular final 9999', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Revogar final 9999', exact: true })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('fixture-webhook-secret')
  expect(await page.locator('body').innerText()).not.toContain('fixture-api-key')
  const viewport = page.viewportSize()!
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  await expect(page.getByText('Conexão: conectada.', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('evolution-integration.png'), fullPage: true })
  const context = await browser.newContext()
  try {
    const other = await context.newPage()
    await login(other, state.bia)
    const denied = await other.goto(`${A}/admin/integracoes`)
    expect(denied?.status()).toBe(404)
    await expect(other.getByText('Conexão: conectada.', { exact: true })).toHaveCount(0)
  } finally { await context.close() }
})

test('F42-E07 webhook forjado, grupo errado e operador não autorizado não decidem', async ({ request }) => {
  const row = await fixture(request, 'Protegido')
  expect((await request.post(hook, { data: payload(`APROVAR ${row.reference}`) })).status()).toBe(401)
  const headers = { 'x-evolution-secret': 'fixture-webhook-secret' }
  expect((await request.post(hook, { headers, data: payload(`APROVAR ${row.reference}`, '5511888888888@s.whatsapp.net') })).status()).toBe(403)
  await request.post(hook, { headers, data: payload(`APROVAR ${row.reference}`, undefined, 'other@g.us') })
  await cycle()
  expect(sql(`SELECT status FROM links WHERE id='${row.id}'`)).toBe('PENDING_MODERATION')
})

test('F42-E04 Evolution indisponível não impede a decisão no painel', async ({ page, request }) => {
  const id = `e2e-f42-off-${randomUUID()}`
  await login(page)
  await request.post((e2eRuntime.stubOrigin + '/evolution/failure'), { data: { enabled: true } })
  try {
    sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${id}',"tenantId","ownerId",'https://example.com/${id}','F42 indisponível ${id}','Revisão',"networkId","nicheId",'PENDING_MODERATION',NOW() FROM links WHERE id='${state.receitas}'`)
    sql(`INSERT INTO moderation_cases (id,"tenantId","linkId","updatedAt") VALUES ('case-${id}','${state.tenantA}','${id}',NOW())`)
    await cycle()
    sql(`UPDATE operational_messages SET "nextAttemptAt"=NOW() WHERE "resourceId"='case-${id}'`)
    await cycle()
    expect(sql(`SELECT state FROM operational_messages WHERE "resourceId"='case-${id}'`)).toBe('RETRY')
    await page.goto(`${A}/admin/moderacao`)
    const card = page.locator('article', { hasText: id })
    await card.getByRole('button', { name: 'Aprovar' }).click()
    await expect(card).toHaveCount(0)
    expect(sql(`SELECT status FROM links WHERE id='${id}'`)).toBe('PUBLISHED')
  } finally { await request.post((e2eRuntime.stubOrigin + '/evolution/failure'), { data: { enabled: false } }) }
})

test('F42-E09 envio bloqueado no provedor não ocupa a fila de pagamentos', async ({ request }) => {
  const row = await fixture(request, 'Canal lento')
  sql(`UPDATE operational_messages SET state='PENDING',"nextAttemptAt"=NOW() WHERE "resourceId"='${row.caseId}'`)
  await request.post((e2eRuntime.stubOrigin + '/evolution/gate'), { data: { enabled: true } })
  const blocked = cycle()
  const connection = { host: '127.0.0.1', port: e2eRuntime.redisPort }
  const queue = new Queue('divulgador-links', { connection })
  const events = new QueueEvents('divulgador-links', { connection })
  try {
    await expect.poll(() => sql(`SELECT state FROM operational_messages WHERE "resourceId"='${row.caseId}'`)).toBe('PROCESSING')
    await events.waitUntilReady()
    const job = await queue.add('purge-analytics', {}, { jobId: `isolation-${randomUUID()}`, removeOnComplete: true, removeOnFail: true })
    await job.waitUntilFinished(events, 5_000)
    expect(sql(`SELECT state FROM operational_messages WHERE "resourceId"='${row.caseId}'`)).toBe('PROCESSING')
  } finally {
    await request.post((e2eRuntime.stubOrigin + '/evolution/gate'), { data: { enabled: false } })
    await blocked
    await events.close(); await queue.close()
  }
})


test('F42 páginas e convites: citação exata, recusa, contestação e aprovação pelo grupo', async ({ page, request }, info) => {
  await login(page, state.eva)
  const suffix = randomUUID().slice(0, 8), name = 'Página WA ' + suffix, slug = 'pagina-wa-' + suffix
  const mutate = async (route: string, body: unknown, method = 'POST') => page.evaluate(async ({ route, body, method }) => {
    const csrf = document.cookie.split('; ').find(value => value.startsWith('csrf='))?.slice(5) ?? ''
    const result = await fetch('/bff/v1/' + route, { method, headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf) }, body: JSON.stringify(body) })
    return { status: result.status, body: await result.json() }
  }, { route, body, method })
  const category = randomUUID()
  let handle: string | undefined
  try {
    const content = { slug, name, bio: 'Comunidade educativa.', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [{ id: category, name: 'Materiais', visible: true }], items: [{ id: randomUUID(), categoryId: category, type: 'URL', label: 'Aulas', destination: 'https://example.com/aulas', visible: true }] }
    const saved = await mutate('me/profile', { expectedVersion: 0, content }, 'PATCH'); expect(saved.status, JSON.stringify(saved.body)).toBe(200)
    const published = await mutate('me/profile/publish', { expectedVersion: 1 }); expect(published.status, JSON.stringify(published.body)).toBe(200)
    const profileReview = published.body.review.id as string
    const redirect = await mutate('me/redirects', { label: 'Convite WA ' + suffix, destinationUrl: 'https://example.com/comunidade', requiresAge: false, expectedRevision: 0, requestKey: randomUUID() }); expect(redirect.status, JSON.stringify(redirect.body)).toBe(200)
    handle = redirect.body.id as string
    const redirectReview = sql(`SELECT id FROM content_reviews WHERE "redirectRevisionId"='${redirect.body.destinationRevision.id}'`)
    await cycle()
    const sent = await (await request.get(e2eRuntime.stubOrigin + '/evolution/messages')).json() as { text: string; number: string }[]
    const pageNotice = sent.findLast(m => m.text.includes(name) && m.text.startsWith('🪪'))
    const inviteNotice = sent.findLast(m => m.text.includes('Convite WA ' + suffix) && m.text.startsWith('🎟️'))
    expect(pageNotice?.number).toBe('fixture@g.us'); expect(inviteNotice?.number).toBe('fixture@g.us')
    expect(pageNotice!.text).toContain('Materiais'); expect(pageNotice!.text).toContain('https://example.com/aulas')
    const pageReference = legacyReference(pageNotice!.text), inviteReference = legacyReference(inviteNotice!.text)
    const provider = (reference: string) => sql(`SELECT "providerMessageId" FROM operational_messages WHERE id='${reference.split('.')[0]}'`)
    const reply = async (text: string, reference: string, sender = '5511999999999@s.whatsapp.net') => {
      const inbound = payload(text, sender)
      return request.post(hook, { headers: { 'x-evolution-secret': 'fixture-webhook-secret' }, data: { ...inbound, data: { ...inbound.data, messageType: 'conversation', contextInfo: { stanzaId: provider(reference) } } } })
    }
    expect((await reply('APROVAR', pageReference, '5511888888888@s.whatsapp.net')).status()).toBe(403)
    await reply('RECUSAR Explique a finalidade educativa.', pageReference); await reply('APROVAR', inviteReference); await cycle()
    expect(sql(`SELECT status FROM content_reviews WHERE id='${profileReview}'`)).toBe('REJECTED')
    expect(sql(`SELECT status FROM content_reviews WHERE id='${redirectReview}'`)).toBe('APPROVED')
    await page.goto(A + '/painel/perfil'); await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Explique a finalidade educativa.')
    await page.getByRole('button', { name: 'Contestar recusa', exact: true }).click(); await page.getByLabel('Por que devemos reavaliar?').fill('Compartilhamos aulas e materiais para estudantes.'); await page.getByRole('button', { name: 'Enviar contestação', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
    await cycle()
    const messages = await (await request.get(e2eRuntime.stubOrigin + '/evolution/messages')).json() as { text: string }[]
    const appeal = messages.findLast(m => m.text.includes(name) && m.text.startsWith('📣')); expect(appeal).toBeTruthy()
    await reply('APROVAR', pageReference); await cycle(); expect(sql(`SELECT status FROM content_reviews WHERE id='${profileReview}'`)).toBe('PENDING')
    await reply('APROVAR', legacyReference(appeal!.text)); await cycle()
    await page.goto(A + '/p/' + slug); await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    const confirmations = await (await request.get(e2eRuntime.stubOrigin + '/evolution/messages')).json() as { text: string }[]
    expect(confirmations.some(m => m.text.startsWith('✅ *PÁGINA') && m.text.includes(name))).toBe(true)
    expect(confirmations.some(m => m.text.startsWith('✅ *CONVITE') && m.text.includes('Convite WA ' + suffix))).toBe(true)
    await info.attach('avisos-whatsapp', { body: [pageNotice!.text, inviteNotice!.text, appeal!.text, ...confirmations.filter(m => m.text.includes(name) && !m.text.includes('Responda:')).map(m => m.text)].join('\n\n---\n\n'), contentType: 'text/plain' })
    expect(sql(`SELECT count(*) FROM audit_logs WHERE action='content.review.decide' AND "entityId" IN ('${profileReview}','${redirectReview}')`)).toBe('3')
  } finally {
    sql(`DELETE FROM profiles WHERE "tenantId"='${state.tenantA}' AND slug='${slug}'`)
    if (handle) sql(`DELETE FROM redirect_handles WHERE id='${handle}' AND "tenantId"='${state.tenantA}'`)
  }
})
