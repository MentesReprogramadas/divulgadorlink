import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

test.beforeEach(async ({ page, context }) => {
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: '127.0.0.1', path: '/' }])
  await page.route('**/bff/**', route => route.fulfill({ json: {} }))
  await page.route('https://**/*', route => route.abort())
})
test('SSR title, canonical, optional consent, busy and retry preserve the form', async ({ page }, info) => {
  let calls = 0
  let finish!: () => void
  const ready = new Promise<void>(resolve => { finish = resolve })
  let body: Record<string, unknown> = {}
  await page.route('**/api/affiliate-entry/natal', async route => { calls++; body = route.request().postDataJSON(); await ready; await route.fulfill({ status: 503, json: {} }) })
  const response = await page.goto('/ofertas/participar/natal?fbclid=real-click')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Ofertas de Natal' })).toBeVisible()
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://temlinkaqui.com/ofertas/participar/natal')
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(calls).toBe(0)
  const checkbox = page.getByRole('checkbox', { name: 'Autorizo usar meu número e compartilhar meu cadastro e a confirmação de ingresso com a Meta para medir e otimizar anúncios.' })
  await expect(checkbox).not.toBeChecked()
  await page.getByLabel('Seu WhatsApp com DDD').fill('(11) 99999-9999')
  await page.getByRole('button', { name: 'Continuar para o WhatsApp' }).click()
  await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByLabel('Seu WhatsApp com DDD')).toBeDisabled()
  finish()
  await expect(page.locator('form [role=alert]')).toContainText('tente novamente')
  expect(body).toMatchObject({ phone: '', marketingConsent: false, sourceUrl: 'http://127.0.0.1:3021/ofertas/participar/natal' })
  expect(body.fbclid).toBeUndefined()
  await expect(page.getByLabel('Seu WhatsApp com DDD')).toHaveValue('(11) 99999-9999')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const folder = path.resolve('../docs/frontend-profissional/evidencias/affiliate-entry-2026-10-30')
  await mkdir(folder, { recursive: true }); await page.screenshot({ path: path.join(folder, info.project.name + '.png'), fullPage: true, animations: 'disabled' })
})
test('disabled segment keeps the entry form unavailable', async ({ page }) => {
  await page.goto('/ofertas/participar/pausado')
  await expect(page.getByText('Este grupo está indisponível no momento. Tente novamente mais tarde.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar para o WhatsApp' })).toHaveCount(0)
})

test('privacy page explains optional measurement and limited retention', async ({ page }) => {
  await page.goto('/privacidade')
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Mensuração dos grupos de ofertas' }) })
  await expect(section).toContainText('cadastro inicial')
  await expect(section).toContainText('somente após confirmar sua entrada')
  await expect(section).toContainText('participar sem autorizar')
  await expect(section).toContainText('não torna o dado anônimo')
  await expect(section).toContainText('cifrados por até 7 dias')
  await expect(section).toContainText('HMAC')
  await expect(section).toContainText('até 90 dias')
})
