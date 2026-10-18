import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'
const fixture = () => JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; owner: string; other: string; password: string; catalogId: string }
const origin = runtime.web('profiles.localhost'), agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'
const term = 'oficinas de astronomia'
async function login(page: Page, admin = true) {
  const data = fixture(); await page.goto(origin + '/login'); await page.getByLabel('E-mail').fill(admin ? data.other : data.owner); await page.getByLabel('Senha').fill(data.password); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
}
async function openReport(page: Page) {
  await page.goto(origin + '/admin/visao')
  const tab = page.getByRole('tab', { name: 'Buscas', exact: true })
  if (await tab.isVisible()) await tab.click()
  else { await page.getByRole('combobox', { name: 'Área de gestão', exact: true }).click(); await page.getByRole('option', { name: 'Buscas', exact: true }).click() }
  await expect(page.getByRole('region', { name: 'Oportunidades de busca' })).toHaveAttribute('aria-busy', 'false')
}
function reset() { sql(`DELETE FROM search_observations WHERE "tenantId"='${fixture().tenantId}'`) }
async function search(page: Page, query: string, consent = true, extra: Record<string,string> = {}, session = randomUUID()) {
  return page.request.get(runtime.web('127.0.0.1') + '/bff/v1/search?q=' + encodeURIComponent(query), { headers: { host: 'profiles.localhost:' + runtime.webPort, 'user-agent': agent, cookie: (consent ? 'tla_consent=marketing; ' : '') + 'analyticsSession=' + session, ...extra } })
}
test('F08-E01 consented search unlocks only at ten; personal terms and privacy opt-outs stay out of the admin report', async ({ page, browser }, info) => {
  reset()
  expect((await search(page, term, false)).status()).toBe(200)
  for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { 'x-analytics-test': '1' }, { 'user-agent': 'HeadlessChrome' }] as Array<Record<string,string>>) expect((await search(page, term, true, headers)).status()).toBe(200)
  for (const query of ['pessoa@privado.test', '5516992848391', 'cpf 12345678901']) expect((await search(page, query)).status()).toBe(200)
  expect(sql(`SELECT COUNT(*) FROM search_observations WHERE "tenantId"='${fixture().tenantId}'`)).toBe('0')
  const session = randomUUID()
  for (let i = 0; i < 5; i++) expect((await search(page, term, true, {}, session)).status()).toBe(200)
  for (let i = 0; i < 8; i++) expect((await search(page, term)).status()).toBe(200)
  await login(page); await openReport(page)
  const panel = page.getByRole('region', { name: 'Oportunidades de busca' }); await expect(panel).toContainText('Sem buscas suficientes')
  const visitor = await browser.newContext({ userAgent: agent }), publicPage = await visitor.newPage()
  try {
    await visitor.addCookies([{ name: 'tla_consent', value: 'marketing', url: origin }])
    await publicPage.goto(origin + '/busca?q=' + encodeURIComponent(term)); await expect(publicPage.getByText('Nenhum link encontrado', { exact: true })).toBeVisible()
    expect(sql(`SELECT COUNT(*) FROM search_observations WHERE "tenantId"='${fixture().tenantId}' AND term='${term}'`)).toBe('10')
    await panel.getByRole('button', { name: 'Atualizar oportunidades' }).click()
    const card = panel.getByRole('article', { name: term }); await expect(card).toContainText('Sem oferta'); await expect(card).toContainText('10')
    expect(await card.evaluate(el => parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThanOrEqual(16)
    const geometry = await card.boundingBox()
    let resume!: () => void
    const waiting = new Promise<void>(resolve => { resume = resolve })
    await page.route('**/bff/v1/admin/search-opportunities?**', async route => { await waiting; await route.continue() })
    await panel.getByRole('button', { name: 'Atualizar oportunidades' }).click()
    const placeholder = panel.locator('[data-skeleton] article').first(); await expect(placeholder).toBeVisible()
    const during = await placeholder.boundingBox()
    expect(Math.abs(during!.height - geometry!.height)).toBeLessThan(1)
    expect(Math.abs(during!.y - geometry!.y)).toBeLessThan(1)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: info.outputPath('search-opportunities-refresh.png'), fullPage: true, animations: 'disabled' })
    resume(); await expect(panel).toHaveAttribute('aria-busy', 'false'); await page.unroute('**/bff/v1/admin/search-opportunities?**')

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: info.outputPath('search-opportunities.png'), fullPage: true, animations: 'disabled' })
    const accessibility = await new AxeBuilder({ page }).include('[aria-label="Oportunidades de busca"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); expect(accessibility.violations).toEqual([])
    if (info.project.name.includes('mobile')) { await panel.getByRole('button', { name: 'Ver mais filtros' }).click(); await expect(panel.getByRole('combobox', { name: 'Rede nos resultados' })).toBeVisible(); await panel.getByRole('button', { name: 'Ver menos filtros' }).click() }
    await panel.getByRole('button', { name: 'Aplicar filtros' }).focus(); await page.keyboard.press('Enter'); await expect(card).toBeVisible()
    await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: info.outputPath('search-opportunities-320-zoom.png'), fullPage: true, animations: 'disabled' })
  } finally { await visitor.close() }
})
test('F08-E02 result query follows detail and exit; access control, loading and offline retry preserve the report', async ({ page, browser }, info) => {
  reset()
  const visitor = await browser.newContext({ userAgent: agent }), publicPage = await visitor.newPage()
  try {
    await visitor.addCookies([{ name: 'tla_consent', value: 'marketing', url: origin }])
    await publicPage.goto(origin + '/busca?q=' + encodeURIComponent('Comunidade de leitura'))
    const link = publicPage.getByRole('link', { name: 'Comunidade de leitura', exact: true }); await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toContain('queryId=')
    await link.click(); await expect(publicPage.getByRole('heading', { name: 'Comunidade de leitura', exact: true })).toBeVisible()
    const exit = publicPage.getByRole('link', { name: 'Acessar', exact: true }); expect(await exit.getAttribute('href')).toContain('queryId=')
    // Follow the real BFF/go request, but do not depend on the public external site's response.
    const href = await exit.getAttribute('href'); const result = await publicPage.evaluate(async href => { const response = await fetch(href!, { redirect: 'manual' }); return response.type }, href); expect(result).toBe('opaqueredirect')
    expect(sql(`SELECT COUNT(*) FROM search_observations WHERE "tenantId"='${fixture().tenantId}' AND "clickedAt" IS NOT NULL`)).toBe('1')
    const unauthorized = await publicPage.evaluate(async () => (await fetch('/bff/v1/admin/search-opportunities')).status); expect(unauthorized).toBe(401)
  } finally { await visitor.close() }
  await login(page, false); expect(await page.evaluate(async () => (await fetch('/bff/v1/admin/search-opportunities')).status)).toBe(403)
  await page.context().clearCookies(); await login(page)
  let release!: () => void
  const barrier = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/admin/search-opportunities?**', async route => { await barrier; await route.continue() })
  await page.goto(origin + '/admin/visao')
  const tab = page.getByRole('tab', { name: 'Buscas', exact: true }); if (await tab.isVisible()) await tab.click(); else { await page.getByRole('combobox', { name: 'Área de gestão', exact: true }).click(); await page.getByRole('option', { name: 'Buscas', exact: true }).click() }
  const panel = page.getByRole('region', { name: 'Oportunidades de busca' }); await expect(panel.getByRole('status', { name: 'Carregando oportunidades' })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: info.outputPath('search-opportunities-skeleton.png'), fullPage: true, animations: 'disabled' })
  release(); await expect(panel).toHaveAttribute('aria-busy', 'false'); await page.unroute('**/bff/v1/admin/search-opportunities?**')
  await page.route('**/bff/v1/admin/search-opportunities?**', route => route.abort())
  await panel.getByRole('button', { name: 'Atualizar oportunidades' }).click(); await expect(panel.getByRole('alert')).toBeVisible()
  await page.unroute('**/bff/v1/admin/search-opportunities?**'); await panel.getByRole('button', { name: 'Tentar de novo' }).click(); await expect(panel).toContainText('Sem buscas suficientes')
})
