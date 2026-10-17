import { expectSelected, selectOption } from './select-control'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'

const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as {
  performance: { linkId: string; from: string; to: string; home: string; search: string };
  evolution: { bia: string; eva: string; password: string };
}
const A = runtime.web('evolution.localhost'), fixture = state.performance
const route = '/painel/links/' + fixture.linkId + '/resultado?from=' + fixture.from + '&to=' + fixture.to
async function login(page: Page, email = state.evolution.bia) {
  await page.goto(A + '/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state.evolution.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
}
test('F01-E01/T03/T05 campanha sem cliques, CPC real e filtros persistentes', async ({ page }) => {
  await login(page)
  const reportResponse = page.waitForResponse(r => r.url().includes('/performance?'))
  await page.goto(A + route)
  expect((await reportResponse).headers()['cache-control']).toBe('private, no-store')
  await expect(page.getByRole('heading', { name: 'Comunidade Aprender' })).toBeVisible()
  await selectOption(page.getByLabel('Campanha', { exact: true }), fixture.home)
  await page.getByRole('button', { name: 'Aplicar período' }).click()
  await expect(page.getByText(/CPC indisponível:/)).toBeVisible()
  await selectOption(page.getByLabel('Campanha', { exact: true }), fixture.search)
  await page.getByRole('button', { name: 'Aplicar período' }).focus()
  await page.keyboard.press('Enter')
  const summary = page.getByRole('definition').filter({ hasText: 'R$' })
  await expect(summary).toHaveCount(2)
  await expect(page.locator('dl > div').filter({ hasText: 'Custo por clique em destaque' })).toContainText('1,00')
  await expect(page).toHaveURL(new RegExp('promotionId=' + fixture.search))
  await page.reload()
  await expectSelected(page.getByLabel('Campanha', { exact: true }), fixture.search)
  await expect(page.getByRole('region', { name: 'Resultados diários' })).toContainText('Ativo no dia')
  await expect(page.getByText(/Comparação:/)).toContainText('mesma duração')
  expect(sql('SELECT COUNT(*) FROM promotion_investments WHERE "promotionId"=\'' + fixture.search + '\'')).toBe('1')
  await page.screenshot({ path: test.info().outputPath('performance.png'), fullPage: true })
})
test('F01-E02/T01 nega outro dono e exige sessão sem revelar dados', async ({ page }) => {
  await page.goto(A + route)
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Comunidade Aprender' })).toHaveCount(0)
  await login(page, state.evolution.eva)
  const response = page.waitForResponse(r => r.url().includes('/performance?'))
  await page.goto(A + route)
  const denied = await response
  expect(denied.status()).toBe(404)
  const body = await denied.text()
  expect(body).not.toContain('Comunidade Aprender')
  expect(body).not.toContain('investmentCents')
  await expect(page.getByRole('alert').filter({ hasText: 'Relatório indisponível para esta conta.' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resultados diários' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aplicar período' })).toHaveCount(0)
})
test('F01-E03 recuperação de rede, teclado, zoom e 320px', async ({ page }) => {
  await login(page)
  await page.goto(A + route)
  await expect(page.getByRole('heading', { name: 'Comunidade Aprender' })).toBeVisible()
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Atualizar relatório' }).click()
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  await page.context().setOffline(false)
  await page.getByRole('button', { name: 'Tentar de novo' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Comunidade Aprender' })).toBeVisible()
  await page.getByLabel('De', { exact: true }).focus()
  await expect(page.getByLabel('De', { exact: true })).toBeFocused()
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await expect(page.getByRole('button', { name: 'Aplicar período' })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('performance-zoom.png'), fullPage: true })
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.setViewportSize({ width: 320, height: 844 })
  expect((await page.getByLabel('De', { exact: true }).boundingBox())!.width).toBeGreaterThan(140)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('performance-320.png'), fullPage: true })
})
