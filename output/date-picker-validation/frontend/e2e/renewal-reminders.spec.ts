import { readFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Queue, QueueEvents } from '../../backend/node_modules/bullmq'
import { expect, test, type Page } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'

const A = runtime.web('renewal.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).renewal as { tenantId: string; ownerId: string; networkId: string; nicheId: string; owner: string; other: string; password: string } }
function fixture(suffix: string) {
  const s = state(), id = 'f02-' + suffix
  // Freeze to noon on the run's UTC day, then two days later; same protocol for desktop/mobile.
  const expires = new Date(); expires.setUTCHours(12, 0, 0, 0); expires.setUTCDate(expires.getUTCDate() + 2)
  sql(`BEGIN; UPDATE users SET "emailRenewal"=false,"notificationVersion"="notificationVersion"+1 WHERE id='${s.ownerId}'; UPDATE promotions SET status='CANCELLED' WHERE "tenantId"='${s.tenantId}'; INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES ('${id}','${s.tenantId}','${s.ownerId}','https://example.com/${id}','Comunidade de estudos','Materiais e encontros','${s.networkId}','${s.nicheId}','PUBLISHED',false,true,NOW()); INSERT INTO promotions (id,"tenantId","linkId",status,surface,"activatedAt","expiresAt","updatedAt") VALUES ('promo-${id}','${s.tenantId}','${id}','ACTIVE','SEARCH','${new Date(expires.getTime() - 7 * 86400000).toISOString()}','${expires.toISOString()}',NOW()); COMMIT;`)
  return id
}
async function login(page: Page, email: string) {
  await page.goto(A + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
}
async function cycle() {
  const connection = { host: '127.0.0.1', port: runtime.redisPort }, queue = new Queue('divulgador-renewal-reminders', { connection }), events = new QueueEvents('divulgador-renewal-reminders', { connection })
  try { await events.waitUntilReady(); const job = await queue.add('renewal-reminder-cycle', {}, { jobId: randomUUID(), removeOnComplete: true }); await job.waitUntilFinished(events, 30000) }
  finally { await events.close(); await queue.close() }
}
test('F02-E01/T01/T04/T05 opt-in, e-mail e CTA usam a renovação sem compra automática', async ({ page, request }, info) => {
  const id = fixture('journey-' + info.project.name), s = state()
  await login(page, s.owner); await expect(page.getByRole('complementary', { name: 'Aviso de vencimento' })).toContainText('Um destaque')
  await page.getByRole('link', { name: 'Ver lembretes de renovação' }).click()
  await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click()
  const checkbox = page.getByRole('checkbox', { name: 'Receber lembretes por e-mail' }); await expect(checkbox).not.toBeChecked()
  await checkbox.check(); await page.getByRole('button', { name: 'Salvar preferência' }).dblclick(); await expect(page.getByRole('status').filter({ hasText: 'Preferência salva.' })).toBeVisible()
  await page.keyboard.press('Escape')
  await cycle()
  const mails = () => request.get(runtime.stubOrigin + '/renewal-mails').then(r => r.json())
  await expect.poll(async () => (await mails()).filter((m: { text: string }) => m.text.includes(id))).toHaveLength(1)
  await cycle(); expect((await mails()).filter((m: { text: string }) => m.text.includes(id))).toHaveLength(1)
  expect(sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${id}'`)).toBe('0')
  await page.screenshot({ path: info.outputPath('renewal-reminders.png'), fullPage: true })
  await page.getByRole('link', { name: 'Ver renovação', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Renovar destaque', exact: true })).toBeVisible()
  expect(sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${id}'`)).toBe('0')
  // Explicit confirmation in the shared checkout is the only action that may create a renewal order.
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Pagar com Pix', exact: true }).click()
  await expect.poll(() => sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${id}' AND renewal=true`)).toBe('1')
  await page.goto(A + '/painel/lembretes'); await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click(); await checkbox.uncheck(); await page.getByRole('button', { name: 'Salvar preferência' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Preferência salva.' })).toBeVisible()
  sql(`UPDATE promotions SET "expiresAt"="expiresAt"+INTERVAL '1 hour' WHERE id='promo-${id}'`)
  await cycle(); expect((await mails()).filter((m: { text: string }) => m.text.includes(id))).toHaveLength(1)
})
test('F02-E02 acesso privado não expõe dados ao público ou a outro dono', async ({ page }, info) => {
  const id = fixture('privacy-' + info.project.name)
  await page.goto(A + '/painel/lembretes'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  const denied = await page.evaluate(() => fetch('/bff/v1/promotions/mine/reminders').then(async r => ({ status: r.status, text: await r.text() })))
  expect(denied.status).toBe(401); expect(denied.text).not.toContain(id)
  await login(page, state().other); await page.goto(A + '/painel/lembretes'); await expect(page.getByText('Nada por aqui ainda.')).toBeVisible(); expect(await page.locator('body').innerText()).not.toContain(id)
  await page.goto(A + '/link/' + id); expect(await page.locator('body').innerText()).not.toContain('Receber lembretes por e-mail')
})
test('F02-E03 offline mantém opção, teclado salva e reload confirma no mobile', async ({ page }, info) => {
  fixture('offline-' + info.project.name); await login(page, state().owner); await page.goto(A + '/painel/lembretes')
  await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click()
  const checkbox = page.getByRole('checkbox', { name: 'Receber lembretes por e-mail' }); await checkbox.focus(); await page.keyboard.press('Space'); await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Salvar preferência' }).click(); await expect(page.getByRole('form', { name: 'Preferência de lembretes' }).getByRole('alert')).toContainText('Sem conexão.')
  await expect(checkbox).toBeChecked(); await page.context().setOffline(false); await page.getByRole('button', { name: 'Salvar preferência' }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Preferência salva.' })).toBeFocused(); await page.reload(); await page.getByRole('button', { name: 'Configurar avisos', exact: true }).click(); await expect(checkbox).toBeChecked()
  await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('renewal-320-text200.png'), fullPage: true })
})
