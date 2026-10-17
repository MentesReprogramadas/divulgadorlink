import { logoutIfSignedIn } from './session-controls'
import { selectOption } from './select-control'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'

const A = runtime.web('reports.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).reports as { baseLink: string; tenantId: string; reader: string; admin: string; password: string } }
function fixture(label: string, mobile: boolean) {
  const id = randomUUID(), name = label + (mobile ? ' mobile' : ' desktop')
  sql('INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"everPublished","updatedAt") SELECT \'' + id + '\',"tenantId","ownerId",\'https://example.com/' + id + '\',\'' + name + '\',\'Comunidade de estudos\',"networkId","nicheId",\'PUBLISHED\',true,NOW() FROM links WHERE id=\'' + state().baseLink + '\'')
  return { id, name }
}
async function refuseCookies(page: Page) {
  const refusal = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true })
  if (await refusal.count()) await refusal.click()
}
async function login(page: Page, email: string) {
  await logoutIfSignedIn(page)
  await page.goto(A + '/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state().password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await refuseCookies(page)
}
function received(page: Page) { return page.waitForResponse(r => r.url().includes('/reports') && r.request().method() === 'POST') }
function reportCard(page: Page, id: string) { return page.getByRole('article', { name: 'Denúncia ' + id, exact: true }) }

test('F06-E01/T02/T03/T05 detalhe público, login com retorno, triagem e histórico persistido', async ({ page }, info) => {
  const link = fixture('Grupo de leitura', info.project.name.endsWith('mobile'))
  await page.goto(A + '/link/' + link.id)
  await refuseCookies(page)
  await page.getByRole('link', { name: 'Denunciar um link' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  await page.getByLabel('E-mail').fill(state().reader)
  await page.getByLabel('Senha').fill(state().password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(A + '/painel/denunciar/' + link.id)
  await expect(page.getByRole('heading', { name: 'Denunciar um link', exact: true })).toBeVisible()
  await selectOption(page.getByLabel('Motivo', { exact: true }), 'SPAM')
  await page.getByLabel('Comentário (opcional)').fill('Publicidade repetida. <script>window.f06Injected=true</script>')
  const posted = received(page)
  await page.getByRole('button', { name: 'Enviar denúncia' }).dblclick()
  const response = await posted
  expect(response.status()).toBe(200)
  const receipt = (await response.json()).report as { id: string; status: string }
  await expect(page.getByRole('heading', { name: 'Denúncia registrada' })).toBeFocused()
  expect(sql('SELECT COUNT(*) FROM link_reports WHERE "linkId"=\'' + link.id + '\'')).toBe('1')
  expect(sql('SELECT status FROM links WHERE id=\'' + link.id + '\'')).toBe('PUBLISHED')
  expect(Object.keys((await response.json()).report).sort()).toEqual(['createdAt', 'id', 'status'])
  await login(page, state().admin)
  await page.goto(A + '/admin/denuncias')
  const card = reportCard(page, receipt.id)
  await expect(card).toContainText('Publicidade repetida. <script>window.f06Injected=true</script>')
  expect(await page.evaluate(() => Object.hasOwn(window, 'f06Injected'))).toBe(false)
  await expect(card.locator('script')).toHaveCount(0)
  await card.getByLabel('Justificativa').fill('Conferindo o relato e o conteúdo do link.')
  await card.getByRole('button', { name: 'Salvar decisão' }).click()
  await expect(card.getByText('Em análise', { exact: true })).toBeVisible()
  expect(sql('SELECT version FROM link_reports WHERE id=\'' + receipt.id + '\'')).toBe('2')
  await selectOption(card.getByLabel('Próximo estado'), 'RESOLVED')
  await card.getByLabel('Justificativa').fill('Análise registrada para acompanhamento.')
  await card.getByRole('button', { name: 'Salvar decisão' }).focus()
  await page.keyboard.press('Enter')
  await expect(card.getByText('Resolvida', { exact: true })).toBeVisible()
  await page.reload()
  await expect(card).toContainText('Análise registrada para acompanhamento.')
  await card.getByText('Histórico (2)', { exact: true }).click()
  await expect(card.getByRole('listitem')).toHaveCount(2)
  expect(sql('SELECT COUNT(*) FROM audit_logs WHERE "entityId"=\'' + receipt.id + '\' AND action=\'report.decide\'')).toBe('2')
  expect(sql('SELECT status FROM links WHERE id=\'' + link.id + '\'')).toBe('PUBLISHED')
  // Stable database fixture for visual review; the journey above uses real generated IDs.
  await page.goto(A + '/admin/denuncias?kind=AVAILABILITY&status=IN_REVIEW')
  await expect(reportCard(page, 'f06-visual-report')).toBeVisible()
  await page.screenshot({ path: info.outputPath('reports-queue.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('reports-320.png'), fullPage: true })
})

test('F06-E02 fila e comentários privados não vazam no detalhe, DTO público ou acesso direto', async ({ page }) => {
  await page.goto(A + '/link/' + state().baseLink)
  await expect(page.getByRole('heading', { name: 'Clube de leitura' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('PRIVATE_REPORT_SENTINEL')
  const publicResponse = await page.evaluate(async id => { const r = await fetch('/bff/v1/links/' + id); return { status: r.status, body: await r.text() } }, state().baseLink)
  expect(publicResponse.status).toBe(200)
  const publicBody = publicResponse.body
  for (const forbidden of ['PRIVATE_REPORT_SENTINEL', 'reporterKey', 'decisionReason']) expect(publicBody).not.toContain(forbidden)
  expect(await page.evaluate(async id => (await fetch('/bff/v1/links/' + id + '/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'SPAM' }) })).status, state().baseLink)).toBe(401)
  await page.goto(A + '/admin/denuncias')
  await expect(page.getByRole('heading', { name: 'Denúncias', exact: true })).toHaveCount(0)
  await login(page, state().reader)
  const denied = await page.evaluate(async () => { const r = await fetch('/bff/v1/admin/reports'); return { status: r.status, body: await r.text() } })
  expect(denied.status).toBe(404)
  expect(denied.body).not.toContain('PRIVATE_REPORT_SENTINEL')
  await page.goto(A + '/admin/denuncias')
  await expect(page.getByRole('button', { name: 'Salvar decisão' })).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toContain('PRIVATE_REPORT_SENTINEL')
})

test('F06-E03 envio e decisão recuperam rede real, preservam texto e funcionam por teclado', async ({ page }, info) => {
  const link = fixture('Grupo de estudo', info.project.name.endsWith('mobile'))
  await login(page, state().reader)
  await page.goto(A + '/painel/denunciar/' + link.id)
  await selectOption(page.getByLabel('Motivo', { exact: true }), 'EXPIRED_INVITE')
  await page.getByLabel('Comentário (opcional)').fill('O convite informa que expirou.')
  await page.screenshot({ path: info.outputPath('reports-form.png'), fullPage: true })
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Enviar denúncia' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Sem conexão.' })).toBeVisible()
  await expect(page.getByLabel('Comentário (opcional)')).toHaveValue('O convite informa que expirou.')
  expect(sql('SELECT COUNT(*) FROM link_reports WHERE "linkId"=\'' + link.id + '\'')).toBe('0')
  await page.context().setOffline(false)
  const posted = received(page)
  await page.getByRole('button', { name: 'Enviar denúncia' }).focus()
  await page.keyboard.press('Enter')
  const id = (await (await posted).json()).report.id as string
  await expect(page.getByRole('heading', { name: 'Denúncia registrada' })).toBeFocused()
  await login(page, state().admin)
  await page.goto(A + '/admin/denuncias')
  const card = reportCard(page, id)
  await selectOption(card.getByLabel('Próximo estado'), 'RESOLVED')
  await card.getByLabel('Justificativa').fill('Relato recebido para acompanhamento do convite.')
  await page.context().setOffline(true)
  await card.getByRole('button', { name: 'Salvar decisão' }).click()
  await expect(card.getByRole('alert')).toContainText('Sem conexão.')
  await expect(card.getByLabel('Justificativa')).toHaveValue('Relato recebido para acompanhamento do convite.')
  expect(sql('SELECT version FROM link_reports WHERE id=\'' + id + '\'')).toBe('1')
  await page.context().setOffline(false)
  await card.getByRole('button', { name: 'Salvar decisão' }).focus()
  await page.keyboard.press('Enter')
  await expect(card.getByText('Resolvida', { exact: true })).toBeVisible()
  expect(sql('SELECT COUNT(*) FROM audit_logs WHERE "entityId"=\'' + id + '\' AND action=\'report.decide\'')).toBe('1')
  expect(sql('SELECT status FROM links WHERE id=\'' + link.id + '\'')).toBe('PUBLISHED')
})
