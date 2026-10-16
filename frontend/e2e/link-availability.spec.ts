import { readFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Queue, QueueEvents } from '../../backend/node_modules/bullmq'
import { expect, test, type Page, type APIRequestContext } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'

const A = runtime.web('availability.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).availability as { tenantId: string; ownerId: string; networkId: string; nicheId: string; owner: string; other: string; admin: string; password: string; visualLink: string; visualProposal: string } }
function fixture(id: string, unavailable = false) {
  const s = state(), url = 'https://example.com/' + id
  const statements: string[] = []
  statements.push(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES ('${id}','${s.tenantId}','${s.ownerId}','${url}','Comunidade de leitura','Troca de livros e encontros','${s.networkId}','${s.nicheId}','${unavailable ? 'UNAVAILABLE' : 'PUBLISHED'}',${!unavailable},true,NOW())`)
  statements.push(`INSERT INTO link_availability ("linkId","tenantId",state,failures,"disabledAt","nextCheckAt") VALUES ('${id}','${s.tenantId}','${unavailable ? 'UNAVAILABLE' : 'UNKNOWN'}',${unavailable ? 3 : 0},${unavailable ? 'NOW()' : 'NULL'},'2000-01-01')`)
  statements.push(`INSERT INTO orders (id,"tenantId","userId","linkId",status,method,"productCode","durationDays","amountCents","savingsCents","updatedAt") VALUES ('order-${id}','${s.tenantId}','${s.ownerId}','${id}','PAID','PIX','SEARCH',7,700,0,NOW())`)
  statements.push(`INSERT INTO promotions (id,"tenantId","linkId",status,surface,"activatedAt","expiresAt","updatedAt","pauseRevision") VALUES ('promo-${id}','${s.tenantId}','${id}','${unavailable ? 'PAUSED' : 'ACTIVE'}','SEARCH',NOW(),NOW()+INTERVAL '7 days',NOW(),${unavailable ? 1 : 0})`)
  statements.push(`INSERT INTO promotion_investments (id,"tenantId","orderId","promotionId",surface,"amountCents","startsAt","endsAt") SELECT 'funding-${id}','${s.tenantId}','order-${id}',id,surface,700,"activatedAt","expiresAt" FROM promotions WHERE id='promo-${id}'`)
  if (unavailable) statements.push(`INSERT INTO promotion_pauses (id,"tenantId","promotionId",revision,"startsAt","remainingMs") VALUES ('pause-${id}','${s.tenantId}','promo-${id}',1,NOW(),604800000)`)
  sql("BEGIN;" + statements.join(";") + ";COMMIT;")
  return { id, url, corrected: url + '-corrigido' }
}
async function login(page: Page, email: string) {
  const logout = page.getByRole('button', { name: 'Sair', exact: true })
  if (await logout.count()) { await logout.click(); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible() }
  await page.goto(A + '/login')
  await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refusal = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true })
  if (await refusal.count()) await refusal.click()
}
async function cycle() {
  const connection = { host: '127.0.0.1', port: runtime.redisPort }, queue = new Queue('divulgador-availability', { connection }), events = new QueueEvents('divulgador-availability', { connection })
  try {
    await events.waitUntilReady()
    const job = await queue.add('availability-cycle', {}, { jobId: 'f07-' + randomUUID(), removeOnComplete: true, removeOnFail: true })
    await job.waitUntilFinished(events, 30000)
  } finally { await events.close(); await queue.close() }
}
async function probe(request: APIRequestContext, fixture: { id: string; url: string }, status: number | null) {
  await request.post(runtime.stubOrigin + '/availability/status', { data: { url: fixture.url, status } })
  // Advance the disposable schedule, without changing the link, failure count or monetary state.
  await expect.poll(() => sql(`SELECT CASE WHEN "leaseToken" IS NULL THEN 'free' ELSE 'busy' END FROM link_availability WHERE "linkId"='${fixture.id}'`)).toBe('free')
  sql(`UPDATE link_availability SET "nextCheckAt"='2000-01-01' WHERE "linkId"='${fixture.id}'`)
  sql(`UPDATE availability_hosts SET "nextCheckAt"='2000-01-01' WHERE host='example.com'`)
  await cycle()
}
const route = (id: string) => A + '/painel/links/' + id + '/disponibilidade'
const card = (page: Page, id: string) => page.getByRole('article', { name: 'Correção ' + id, exact: true })

test('F07-E01/T01/T05 worker retira no limiar, aprovação recupera URL e saldo pago', async ({ page, request }, info) => {
  const current = fixture('f07-journey-' + info.project.name)
  await probe(request, current, null)
  expect(sql(`SELECT status FROM links WHERE id='${current.id}'`)).toBe('PUBLISHED')
  expect(sql(`SELECT failures FROM link_availability WHERE "linkId"='${current.id}'`)).toBe('1')
  await probe(request, current, 410)
  expect(sql(`SELECT status FROM promotions WHERE id='promo-${current.id}'`)).toBe('ACTIVE')
  await probe(request, current, 410)
  expect(sql(`SELECT status FROM links WHERE id='${current.id}'`)).toBe('UNAVAILABLE')
  expect(sql(`SELECT status FROM promotions WHERE id='promo-${current.id}'`)).toBe('PAUSED')
  const remaining = Number(sql(`SELECT "remainingMs" FROM promotion_pauses WHERE "promotionId"='promo-${current.id}' AND "endsAt" IS NULL`))
  expect(remaining).toBeGreaterThan(604790000)
  await page.goto(A + '/link/' + current.id)
  await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible()
  await login(page, state().owner); await page.goto(route(current.id))
  await expect(page.getByRole('heading', { name: 'Tempo pago pausado' })).toBeVisible()
  await page.getByLabel('Convite para análise').fill(current.corrected)
  await page.getByRole('button', { name: 'Enviar correção' }).dblclick()
  await expect(page.getByRole('heading', { name: 'Correção enviada para análise' })).toBeVisible()
  expect(sql(`SELECT "canonicalUrl" FROM links WHERE id='${current.id}'`)).toBe(current.url)
  expect(sql(`SELECT COUNT(*) FROM url_revisions WHERE "linkId"='${current.id}' AND status='PENDING'`)).toBe('1')
  const revision = sql(`SELECT id FROM url_revisions WHERE "linkId"='${current.id}' AND status='PENDING'`)
  await login(page, state().admin); await page.goto(A + '/admin/disponibilidade')
  await card(page, revision).getByLabel('Decisão', { exact: true }).selectOption('APPROVE')
  await card(page, revision).getByLabel('Justificativa').fill('Convite corrigido e conteúdo conferido.')
  await card(page, revision).getByRole('button', { name: 'Salvar decisão' }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Decisão salva.' })).toBeVisible()
  expect(sql(`SELECT status FROM links WHERE id='${current.id}'`)).toBe('PUBLISHED')
  expect(sql(`SELECT "canonicalUrl" FROM links WHERE id='${current.id}'`)).toBe(current.corrected)
  const resumed = JSON.parse(sql(`SELECT json_build_object('status',p.status,'duration',EXTRACT(EPOCH FROM (p."expiresAt"-j."endsAt"))*1000)::text FROM promotions p JOIN promotion_pauses j ON j."promotionId"=p.id WHERE p.id='promo-${current.id}'`))
  expect(resumed.status).toBe('ACTIVE'); expect(Number(resumed.duration)).toBe(remaining)
  expect(sql(`SELECT "amountCents" FROM orders WHERE id='order-${current.id}'`)).toBe('700')
  await page.reload(); await expect(card(page, state().visualProposal)).toBeVisible()
  await page.screenshot({ path: info.outputPath('availability-queue.png'), fullPage: true })
  await page.goto(A + '/link/' + current.id)
  await expect(page.getByRole('heading', { name: 'Comunidade de leitura' })).toBeVisible()
})

test('F07-E02 proposta privada não aparece no público nem para outro dono', async ({ page }) => {
  await page.goto(A + '/link/' + state().visualLink)
  expect(await page.locator('body').innerText()).not.toContain('f07-corrected-private')
  const anonymous = await page.evaluate(async id => { const r = await fetch('/bff/v1/links/' + id + '/availability'); return { status: r.status, text: await r.text() } }, state().visualLink)
  expect(anonymous.status).toBe(401); expect(anonymous.text).not.toContain('f07-corrected-private')
  await login(page, state().other); await page.goto(route(state().visualLink))
  await expect(page.getByRole('alert').filter({ hasText: 'indisponível para esta conta' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('f07-corrected-private')
  const denied = await page.evaluate(async id => { const r = await fetch('/bff/v1/links/' + id + '/availability'); return { status: r.status, text: await r.text() } }, state().visualLink)
  expect(denied.status).toBe(404); expect(denied.text).not.toContain('f07-corrected-private')
  await page.goto(A + '/admin/disponibilidade')
  await expect(page.getByRole('button', { name: 'Salvar decisão' })).toHaveCount(0)
})

test('F07-E03 offline preserva convite e justificativa; recuperação por teclado e histórico', async ({ page }, info) => {
  const current = fixture('f07-offline-' + info.project.name, true)
  await login(page, state().owner); await page.goto(route(current.id))
  await page.getByLabel('Convite para análise').fill(current.corrected)
  await page.screenshot({ path: info.outputPath('availability-owner.png'), fullPage: true })
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Enviar correção' }).click()
  await expect(page.getByRole('form', { name: 'Corrigir convite' }).getByRole('alert')).toContainText('Sem conexão.')
  await expect(page.getByLabel('Convite para análise')).toHaveValue(current.corrected)
  await page.context().setOffline(false)
  await page.getByRole('button', { name: 'Enviar correção' }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Correção enviada para análise' })).toBeFocused()
  const revision = sql(`SELECT id FROM url_revisions WHERE "linkId"='${current.id}' AND status='PENDING'`)
  await login(page, state().admin); await page.goto(A + '/admin/disponibilidade')
  const proposal = card(page, revision)
  await proposal.getByLabel('Decisão', { exact: true }).selectOption('APPROVE')
  await proposal.getByLabel('Justificativa').fill('Destino conferido após corrigir o convite.')
  await page.context().setOffline(true); await proposal.getByRole('button', { name: 'Salvar decisão' }).click()
  await expect(proposal.getByRole('alert')).toContainText('Sem conexão.')
  await expect(proposal.getByLabel('Justificativa')).toHaveValue('Destino conferido após corrigir o convite.')
  expect(sql(`SELECT status FROM url_revisions WHERE id='${revision}'`)).toBe('PENDING')
  await page.context().setOffline(false); await proposal.getByRole('button', { name: 'Salvar decisão' }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Decisão salva.' })).toBeVisible()
  await login(page, state().owner); await page.goto(route(current.id)); await page.reload()
  await expect(page.getByRole('region', { name: 'Histórico de correções' })).toContainText('Aprovada')
  // Fixed timestamps and protocol for visual evidence; the real persisted journey was asserted above.
  await page.goto(route(state().visualLink))
  await expect(page.getByRole('heading', { name: 'Clube de estudos' })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('availability-320-text200.png'), fullPage: true })
})
