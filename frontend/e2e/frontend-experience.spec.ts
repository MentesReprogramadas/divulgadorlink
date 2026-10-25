import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runtime } from './runtime.cjs'

const origin = runtime.web('tenant-a.localhost')

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
})

test('autocomplete: pausa, falha recuperável, teclado e saída durante requisição', async ({ page }, info) => {
  let calls = 0
  await page.route('**/bff/v1/search/suggest?*', async route => {
    calls++
    await route.fulfill({ status: calls === 1 ? 503 : 200, json: calls === 1 ? {} : { items: [{ id: 'fixture', name: 'Sugestão de teste', surfaceToken: 'signed+token' }] } })
  })
  await page.goto(origin + '/busca')
  const input = page.getByRole('combobox', { name: 'Busca', exact: true })
  await input.fill('j')
  await input.fill('jo')
  await input.fill('jogos')
  await expect(page.locator('main').getByRole('alert')).toHaveText('Não foi possível carregar as sugestões.')
  expect(calls).toBe(1)
  await expect(page.getByText('Nenhuma sugestão')).toHaveCount(0)
  await expect(input).not.toHaveAttribute('aria-controls')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(violation => violation.id)).toEqual([])
  await page.screenshot({ path: info.outputPath('suggestions-error.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  const option = page.getByRole('option', { name: 'Sugestão de teste' })
  await expect(option).toHaveAttribute('href', '/link/fixture?surfaceToken=signed%2Btoken')
  await expect(input).toBeFocused()
  await input.press('ArrowDown')
  await expect(option).toHaveAttribute('aria-selected', 'true')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([])
  await input.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(input).not.toHaveAttribute('aria-activedescendant')
  let release = () => {}
  const held = new Promise<void>(resolve => { release = resolve })
  let started = false
  await page.route('**/bff/v1/search/suggest?*', async route => { started = true; await held; await route.fulfill({ json: { items: [{ id: 'late', name: 'Resposta atrasada' }] } }).catch(() => {}) })
  try {
    await input.fill('novo')
    await expect.poll(() => started).toBe(true)
    await expect(page.getByRole('status', { name: 'Carregando sugestões' })).toBeVisible()
    await input.press('Tab')
    await page.keyboard.press('Tab')
    release()
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('listbox')).toHaveCount(0)
  } finally { release() }
})

test('busca real anuncia resultados; falha permite recuperação e vazio oferece saída', async ({ page }, info) => {
  await page.goto(origin + '/busca?q=Receitas')
  await expect(page.getByRole('status', { name: 'Resultados da busca' })).toContainText(/links? encontrado/)
  await expect(page.getByRole('link', { name: 'Receitas', exact: true })).toBeVisible()
  await page.route('**/bff/v1/search?*', route => route.fulfill({ status: 503, json: {} }))
  await page.goto(origin + '/busca?q=FalhaBuscaFixture')
  await expect(page.locator('main').getByRole('alert')).toContainText('Não foi possível carregar')
  await page.unroute('**/bff/v1/search?*')
  await page.route('**/bff/v1/search?*', route => route.fulfill({ json: { target: { kind: 'results', slug: null }, sponsored: [], organic: [] } }))
  await page.getByRole('button', { name: /Tentar de novo/ }).click()
  await expect(page.getByText('Nenhum link encontrado')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar o catálogo' })).toHaveAttribute('href', '/')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(violation => violation.id)).toEqual([])
  await page.screenshot({ path: info.outputPath('search-empty.png'), fullPage: true, animations: 'disabled' })
})

test('login preserva campos após falha e catálogo suporta reflow com movimento reduzido', async ({ page }, info) => {
  await page.route('**/bff/v1/auth/login', route => route.fulfill({ status: 503, json: { message: 'Serviço temporariamente indisponível.' } }))
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.invalid')
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('Serviço temporariamente indisponível.')
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('teste@example.invalid')
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('senha-de-teste')
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(origin + '/busca?q=Receitas')
  await expect(page.getByRole('status', { name: 'Resultados da busca' })).toContainText(/encontrado/)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  await page.screenshot({ path: info.outputPath('search-reflow-320.png'), fullPage: true, animations: 'disabled' })
})
