import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page, type APIRequestContext } from '@playwright/test'
import { Queue, QueueEvents } from '../../backend/node_modules/bullmq'
import { sql } from './db'

const A = 'http://evolution.localhost:3000'
const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).evolution as { tenantA: string; admin: string; bia: string; eva: string; password: string; receitas: string }
const hook = 'http://127.0.0.1:3333/api/v1/integrations/evolution/webhook'

async function login(page: Page, email = state.admin) {
  await page.goto(`${A}/login`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
}
async function cycle() {
  const connection = { host: '127.0.0.1', port: 6380 }
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
  const messages = await (await request.get('http://127.0.0.1:4099/evolution/messages')).json() as { text: string; number: string }[]
  const message = messages.findLast(m => m.text.includes(name))
  expect(message?.number).toBe('fixture@g.us')
  const reference = /APROVAR (\S+)/.exec(message!.text)?.[1]
  expect(reference).toBeTruthy()
  return { id, name, reference: reference!, caseId: `case-${id}` }
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
  const messages = await (await request.get('http://127.0.0.1:4099/evolution/messages')).json() as { text: string }[]
  const message = messages.findLast(m => m.text.includes(name) && m.text.includes('APROVAR '))
  expect(message).toBeTruthy()
  return /APROVAR (\S+)/.exec(message!.text)![1]!
}

test('F42-E08 envio, contestação e edição percorrem a interface e o worker reais', async ({ page, request }) => {
  await login(page, state.eva)
  const name = `Jornada F42 ${randomUUID()}`
  await page.goto(`${A}/painel/links/novo`)
  await page.getByLabel('Nome', { exact: true }).fill(name)
  await page.getByLabel('Descrição', { exact: true }).fill('Comunidade de estudo')
  await page.getByLabel('URL', { exact: true }).fill(`https://example.com/${randomUUID()}`)
  await page.getByLabel('Rede').selectOption({ label: 'Site' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
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
    await dialog.getByLabel('Novo nome').fill(proposed)
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

test('F42-E05/E06 painel de integração limita acesso e funciona no mobile', async ({ page, browser }) => {
  await login(page)
  await page.goto(`${A}/admin/integracoes`)
  await expect(page.getByRole('heading', { name: 'Avisos e moderação pelo WhatsApp' })).toBeVisible()
  await expect(page.getByText('E2E Bot', { exact: true })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('fixture-webhook-secret')
  expect(await page.locator('body').innerText()).not.toContain('fixture-api-key')
  const viewport = page.viewportSize()!
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  const context = await browser.newContext()
  try {
    const other = await context.newPage()
    await login(other, state.bia)
    await other.goto(`${A}/admin/integracoes`)
    await expect(other.getByRole('heading', { name: 'Avisos e moderação pelo WhatsApp' })).toHaveCount(0)
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
  await request.post('http://127.0.0.1:4099/evolution/failure', { data: { enabled: true } })
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
  } finally { await request.post('http://127.0.0.1:4099/evolution/failure', { data: { enabled: false } }) }
})

test('F42-E09 envio bloqueado no provedor não ocupa a fila de pagamentos', async ({ request }) => {
  const row = await fixture(request, 'Canal lento')
  sql(`UPDATE operational_messages SET state='PENDING',"nextAttemptAt"=NOW() WHERE "resourceId"='${row.caseId}'`)
  await request.post('http://127.0.0.1:4099/evolution/gate', { data: { enabled: true } })
  const blocked = cycle()
  const connection = { host: '127.0.0.1', port: 6380 }
  const queue = new Queue('divulgador-links', { connection })
  const events = new QueueEvents('divulgador-links', { connection })
  try {
    await expect.poll(() => sql(`SELECT state FROM operational_messages WHERE "resourceId"='${row.caseId}'`)).toBe('PROCESSING')
    await events.waitUntilReady()
    const job = await queue.add('purge-analytics', {}, { jobId: `isolation-${randomUUID()}`, removeOnComplete: true, removeOnFail: true })
    await job.waitUntilFinished(events, 5_000)
    expect(sql(`SELECT state FROM operational_messages WHERE "resourceId"='${row.caseId}'`)).toBe('PROCESSING')
  } finally {
    await request.post('http://127.0.0.1:4099/evolution/gate', { data: { enabled: false } })
    await blocked
    await events.close(); await queue.close()
  }
})
