import { readFileSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'

const fixture = () => JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; owner: string; other: string; password: string }
const origin = runtime.web('profiles.localhost')
async function login(page: Page) {
  const data = fixture()
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail').fill(data.other)
  await page.getByLabel('Senha').fill(data.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('button', { name: 'Recusar', exact: true })
  if (await refuse.count()) await refuse.click()
}
test('support: real user reads, server write denials, compact banner, accessible exit and exact admin return', async ({ page }, info) => {
  await login(page)
  await page.goto(origin + '/admin/visao')
  const tab = page.getByRole('tab', { name: 'Contas', exact: true })
  if (await tab.isVisible()) await tab.click()
  else {
    await page.getByRole('combobox', { name: 'Área de gestão', exact: true }).click()
    await page.getByRole('option', { name: 'Contas', exact: true }).click()
  }
  await page.getByRole('textbox', { name: 'Buscar contas e links' }).fill(fixture().owner)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const entry = page.getByRole('button', { name: /^Detalhes \/ suporte de/ })
  await expect(entry).toHaveCount(1)
  await entry.focus()
  const originalScroll = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('Enter')
  const banner = page.getByRole('complementary', { name: 'Modo de suporte' })
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Somente leitura')
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const session = await page.evaluate(async () => {
    const response = await fetch('/bff/v1/auth/session')
    return { status: response.status, body: await response.json() as { role: string; support: { name: string } } }
  })
  expect(session.status).toBe(200)
  expect(session.body.role).toBe('USER')
  await expect(banner).toContainText(session.body.support.name)
  const supportCookie = (await page.context().cookies()).find(c => c.name === 'supportSession')!
  expect(supportCookie.httpOnly).toBe(true)
  const csrf = (await page.context().cookies()).find(c => c.name === 'csrf')!.value
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const status = await page.evaluate(async ({ method, csrf }) => (await fetch('/bff/v1/me/profile', { method, headers: { 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: '{}' })).status, { method, csrf })
    expect(status).toBe(403)
  }
  expect(await page.evaluate(async () => (await fetch('/bff/v1/admin/office')).status)).toBe(403)
  expect(await page.evaluate(async csrf => (await fetch('/bff/v1/auth/refresh', { method: 'POST', headers: { 'x-csrf-token': csrf } })).status, csrf)).toBe(403)
  expect(await page.evaluate(async () => (await fetch('/bff/v1/me/profile')).status)).toBe(200)
  for (const route of ['/me/subscription', '/me/favorites', '/me/collections', '/me/redirects', '/me/notification-preferences', '/orders/mine']) {
    const result = await page.evaluate(async route => {
      const response = await fetch('/bff/v1' + route)
      return { status: response.status, text: await response.text() }
    }, route)
    expect(result.status, `${route}: ${result.text}`).toBe(200)
  }
  await page.context().clearCookies({ name: 'supportSession' })
  expect(await page.evaluate(async csrf => (await fetch('/bff/v1/me/profile', { method: 'PATCH', headers: { 'x-csrf-token': csrf } })).status, csrf)).toBe(403)
  expect((await page.context().cookies()).find(c => c.name === 'supportSession')?.value).toBe(supportCookie.value)
  await page.goto(origin + '/painel/links')
  await expect(banner).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: info.outputPath('support-panel.png'), fullPage: true, animations: 'disabled' })
  const violations = await new AxeBuilder({ page }).include('[aria-label="Modo de suporte"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(violations.violations).toEqual([])
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  expect((await banner.locator('p').first().boundingBox())!.width).toBeGreaterThan(200)
  await page.screenshot({ path: info.outputPath('support-320-zoom.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Sair do suporte', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(origin + '/admin/visao')
  await expect(page.getByRole('textbox', { name: 'Buscar contas e links' })).toHaveValue(fixture().owner)
  await expect(entry).toHaveCount(1)
  await expect(banner).toHaveCount(0)
  await expect(page.locator('article[id^="support-user-"]')).toBeFocused()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(originalScroll)
  const replay = await page.request.get(runtime.web('127.0.0.1') + '/bff/v1/me/profile', { headers: { host: `profiles.localhost:${runtime.webPort}`, cookie: `supportSession=${supportCookie.value}` } })
  expect(replay.status()).toBe(401)
  expect(sql(`SELECT COUNT(*) FROM audit_logs WHERE "tenantId"='${fixture().tenantId}' AND action IN ('support.start','support.end')`)).not.toBe('0')
})

test('support PostgreSQL boundary refuses accidental GET writes with real database', async () => {
  const output = execFileSync('npx', ['vitest', 'run', 'src/lib/support-read-context.pg.spec.ts'], {
    cwd: path.resolve(__dirname, '../../backend'), shell: true, encoding: 'utf8',
    env: { ...process.env, PG_SPECS: '1', ANALYTICS_DATABASE_URL: runtime.databaseUrl },
  })
  expect(output).toContain('1 passed')
})
