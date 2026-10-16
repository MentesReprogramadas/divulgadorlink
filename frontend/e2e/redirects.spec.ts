import { readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, expect, test, type Page, type TestInfo } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
const A = runtime.web('redirects.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).redirects as { tenantId: string; ownerId: string; owner: string; other: string; password: string } }
function fixture() { const s = state(); sql(`DELETE FROM redirect_handles WHERE "tenantId"='${s.tenantId}'`); return s }
async function login(page: Page, email = state().owner) {
  await page.goto(A + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
  await page.goto(A + '/painel/convites')
}
async function fill(page: Page, label = 'Comunidade de estudos', destination = 'https://example.com/f12-a') {
  await page.getByLabel('Título do convite', { exact: true }).fill(label); await page.getByLabel('Destino do convite', { exact: true }).fill(destination)
}
async function save(page: Page) { await page.getByRole('button', { name: 'Validar e salvar destino', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Destino validado.' })).toBeVisible() }
async function privateRead(page: Page, id: string) { return page.evaluate(async id => { const r = await fetch('/bff/v1/me/redirects/' + id); return { status: r.status, text: await r.text() } }, id) }
async function externalGuest(info: TestInfo) {
  // Real browser redirects reach a real HTTPS fixture. Only this browser maps the provider host.
  const browser = await chromium.launch({ args: ['--no-proxy-server', '--host-resolver-rules=MAP example.com 127.0.0.1:' + runtime.externalPort] })
  const context = await browser.newContext({ viewport: info.project.use.viewport, isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch), ignoreHTTPSErrors: true })
  return { browser, context, page: await context.newPage() }
}
async function publicResponse(page: Page, id: string) {
  return page.request.get(runtime.web('127.0.0.1') + '/r/' + id, { headers: { host: 'redirects.localhost:' + runtime.webPort }, maxRedirects: 0 })
}

test('F12-E01/T01/T03/T04/T05 endereço fixo, cópia, destino A/B, validação pendente e indisponibilidade', async ({ page }, info) => {
  const s = fixture(); await login(page); await fill(page); await save(page)
  const stable = await page.getByLabel('Link permanente', { exact: true }).inputValue(), id = new URL(stable).pathname.split('/').at(-1)!
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: A })
  await page.getByRole('button', { name: 'Copiar endereço', exact: true }).click(); await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(stable)
  const external = await externalGuest(info)
  try {
    const guest = external.page
    await guest.goto(stable); await expect(guest.getByRole('heading', { name: 'Convite fixture A', exact: true })).toBeVisible()
    await fill(page, 'LentoFixture', 'https://example.com/f12-b'); await page.getByRole('button', { name: 'Validar e salvar destino', exact: true }).click()
    await expect.poll(async () => (await (await page.request.get(runtime.stubOrigin + '/redirect-validation/pending')).json()).count).toBe(1)
    await expect(page.getByRole('button', { name: 'Validar e salvar destino', exact: true })).toBeDisabled()
    await guest.goto(stable); await expect(guest.getByRole('heading', { name: 'Convite fixture A', exact: true })).toBeVisible(); expect(guest.url()).not.toContain('f12-b')
    await page.request.post(runtime.stubOrigin + '/redirect-validation/release')
    await expect(page.getByRole('status').filter({ hasText: 'Destino validado.' })).toBeVisible(); expect(await page.getByLabel('Link permanente', { exact: true }).inputValue()).toBe(stable)
    await guest.goto(stable); await expect(guest.getByRole('heading', { name: 'Convite fixture B', exact: true })).toBeVisible()
    const response = await publicResponse(guest, id); expect(response.status()).toBe(302); expect(response.headers()['cache-control']).toContain('no-store'); expect(response.headers().location).toBe('https://example.com/f12-b')
    await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click(); await expect(page.getByRole('region', { name: 'Histórico de destinos' })).toContainText('Versão 2')
    expect(sql(`SELECT COUNT(*) FROM redirect_daily d JOIN redirect_destinations r ON r.id=d."revisionId" WHERE r."handleId"='${id}'`)).toBe('2')
    await page.request.post(runtime.stubOrigin + '/availability/status', { data: { url: 'https://example.com/f12-b', status: 404 } })
    await guest.goto(stable); await expect(guest.getByRole('heading', { name: 'Convite indisponível', exact: true })).toBeVisible(); expect(await guest.content()).not.toContain('https://example.com/f12-b')
    await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    const refuse = guest.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
    await guest.screenshot({ path: info.outputPath('unavailable.png'), fullPage: true })
    await page.getByRole('form', { name: 'Editar convite permanente' }).screenshot({ path: info.outputPath('destination-form.png') })
  } finally { await page.request.post(runtime.stubOrigin + '/redirect-validation/release'); await external.browser.close(); await page.request.post(runtime.stubOrigin + '/availability/status', { data: { url: 'https://example.com/f12-b', status: 200 } }) }
  expect(sql(`SELECT COUNT(*) FROM links WHERE "tenantId"='${s.tenantId}'`)).toBe('0')
})

test('F12-E02/T02 sessão e outro ADMIN não liberam acesso; conteúdo suspeito e provedor mantêm destino anterior', async ({ page, browser }) => {
  fixture(); await page.goto(A + '/painel/convites'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  await login(page); await fill(page); await save(page)
  const stable = await page.getByLabel('Link permanente', { exact: true }).inputValue(), id = new URL(stable).pathname.split('/').at(-1)!
  for (const [label, error] of [['SuspeitoFixture', 'Conteúdo suspeito'], ['FalhaProvedorFixture', 'Validação automática indisponível']]) {
    await fill(page, label, 'https://example.com/f12-sentinela'); await page.getByRole('button', { name: 'Validar e salvar destino', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Links permanentes', exact: true }).getByRole('alert')).toContainText(error)
    await expect(page.getByLabel('Título do convite', { exact: true })).toHaveValue(label)
    const response = await publicResponse(page, id); expect(response.headers().location).toBe('https://example.com/f12-a')
  }
  const context = await browser.newContext()
  try {
    const other = await context.newPage(); await other.goto(A + '/painel/convites'); expect((await privateRead(other, id)).status).toBe(401)
    await login(other, state().other); const result = await privateRead(other, id); expect(result.status).toBe(404); expect(result.text).not.toMatch(/f12-sentinela|FalhaProvedorFixture|destinationUrl/)
    expect(await other.content()).not.toMatch(/f12-sentinela|FalhaProvedorFixture/)
  } finally { await context.close() }
})

test('F12-E03 offline mantém campos, teclado confirma, conflito entre abas e reflow 320px', async ({ page, browser }, info) => {
  fixture(); await login(page); await fill(page)
  await page.context().setOffline(true); await page.getByRole('button', { name: 'Validar e salvar destino', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Links permanentes', exact: true }).getByRole('alert')).toContainText('Sem conexão.')
  await expect(page.getByLabel('Título do convite', { exact: true })).toHaveValue('Comunidade de estudos')
  await page.context().setOffline(false); await page.getByLabel('Destino do convite', { exact: true }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Destino validado.' })).toBeFocused()
  const context = await browser.newContext({ storageState: await page.context().storageState() })
  try {
    const other = await context.newPage(); await other.goto(A + '/painel/convites'); await other.getByRole('button', { name: 'Comunidade de estudos · Publicado', exact: true }).click(); await expect(other.getByLabel('Link permanente', { exact: true })).toBeVisible()
    await fill(page, 'Atualização A'); await save(page)
    await fill(other, 'Atualização B'); await other.getByRole('button', { name: 'Validar e salvar destino', exact: true }).click()
    await expect(other.getByRole('region', { name: 'Links permanentes', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(other.getByLabel('Título do convite', { exact: true })).toHaveValue('Atualização B')
  } finally { await context.close() }
  await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; window.scrollTo(0, 0) })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('redirects-320-text200.png'), fullPage: true })
})

test('F12-E04 restrição de idade oculta destino no HTML e API até o aceite', async ({ page }, info) => {
  fixture(); await login(page); await fill(page, 'PrivadoSentinelaF12', 'https://example.com/f12-adulto'); await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check(); await save(page)
  const stable = await page.getByLabel('Link permanente', { exact: true }).inputValue(), id = new URL(stable).pathname.split('/').at(-1)!
  const external = await externalGuest(info)
  try {
    const guest = external.page; await guest.goto(stable)
    await expect(guest.getByRole('dialog')).toBeVisible(); expect(await guest.content()).not.toMatch(/PrivadoSentinelaF12|f12-adulto/)
    expect(await guest.evaluate(async id => (await fetch('/bff/v1/r/' + id)).json(), id)).toEqual({ restricted: true })
    await guest.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click(); await expect(guest.getByRole('heading', { name: 'Convite fixture A', exact: true })).toBeVisible()
  } finally { await external.browser.close() }
})
