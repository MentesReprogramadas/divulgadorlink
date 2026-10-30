import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'localhost', path: '/' }])
})

test('Pets presents the free group and preserves the existing invite handoff', async ({ page }) => {
  const inviteRequests: string[] = []
  page.on('request', request => {
    if (request.url().includes('/public/affiliates/pets')) inviteRequests.push(request.url())
  })
  const response = await page.goto('/ofertas/pets')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle('Achadinhos Pet no WhatsApp | Tem Link Aqui')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Achadinhos Pet')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://localhost/ofertas/pets')
  const links = page.getByRole('link', { name: 'Entrar no grupo grátis' })
  await expect(links).toHaveCount(1)
  await expect(links.first()).toHaveAttribute('href', '/ofertas/entrar/pets')
  expect(inviteRequests).toEqual([])
  await expect(page.getByRole('img', { name: 'Cachorro e gato ao lado da marca' })).toBeVisible()
  const imageLoaded = await page.locator('img[src="/ofertas/pets/avatar.webp"]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 512)
  expect(imageLoaded).toBe(true)
  await expect(page.locator('main details')).toHaveCount(0)
  await expect(page.locator('main section')).toHaveCount(0)
  await links.first().focus()
  await expect(links.first()).toBeFocused()
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('pets-landing.png'), fullPage: true })
  await page.route('**/ofertas/entrar/pets', route => route.fulfill({ contentType: 'text/html', body: '<h1>Convite preservado</h1>' }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/ofertas\/entrar\/pets$/)
})

test('Pets renders its content on the server and remains readable at 320px', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 } })
  const page = await context.newPage()
  const response = await page.goto(`${baseURL}/ofertas/pets`)
  const html = await response!.text()
  expect(html).toContain('Achadinhos Pet')
  expect(html).toContain('href="/ofertas/entrar/pets"')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entrar no grupo grátis' })).toHaveAttribute('href', '/ofertas/entrar/pets')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await context.close()
})
