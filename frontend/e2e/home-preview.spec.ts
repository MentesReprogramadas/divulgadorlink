import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'node:path'
import { selectOption } from './select-control'

const photos = new Set(['mountains', 'music', 'technology', 'travel', 'coffee', 'games', 'photography', 'food', 'reading'])
const main = (page: Page) => page.getByRole('main', { name: 'Home reimaginada do Tem Link Aqui' })

test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => { const style = document.createElement('style'); style.textContent = 'nextjs-portal { display: none; }'; document.addEventListener('DOMContentLoaded', () => document.head.append(style), { once: true }) })
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: '127.0.0.1', path: '/' }])
  await page.route('**/bff/**', route => route.fulfill({ json: {} }))
  await page.route('**/dev/home-preview/photo/*', route => {
    const key = new URL(route.request().url()).pathname.split('/').pop()!
    return photos.has(key) ? route.fulfill({ path: path.join(__dirname, 'fixtures/home-preview', `${key}.jpg`), contentType: 'image/jpeg' }) : route.fulfill({ status: 404 })
  })
})

async function stablePhotos(page: Page) {
  const images = main(page).locator('img[src*="/photo/"]')
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveJSProperty('complete', true)
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
  }
  await main(page).locator('article[data-featured]').first().evaluateAll(elements => { elements[0]?.parentElement?.scrollTo(0, 0) })
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
}

test('catálogo, fotos, busca, nicho, rede e estado vazio', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/dev/home-preview')
  await expect(main(page).locator('article')).toHaveCount(9)
  await expect(main(page).locator('article[data-sponsored]')).toHaveCount(3)
  await stablePhotos(page)
  const descriptions = main(page).locator('article:not([data-featured]) p')
  expect(await descriptions.first().evaluate(element => getComputedStyle(element).webkitLineClamp)).toBe('2')
  await main(page).getByLabel('O que você quer encontrar?').fill('frequencia')
  await main(page).getByRole('button', { name: 'Explorar', exact: true }).click()
  await expect(main(page).locator('article')).toHaveCount(1)
  await expect(main(page).getByRole('heading', { name: 'Frequência indie' })).toBeVisible()
  await main(page).getByRole('button', { name: 'Limpar filtros' }).click()
  await main(page).getByRole('navigation', { name: 'Explorar por nicho' }).getByRole('button', { name: 'Tecnologia', exact: true }).click()
  await expect(main(page).locator('article')).toHaveCount(1)
  await selectOption(main(page).getByRole('combobox', { name: 'Filtrar por rede' }), 'whatsapp')
  await expect(main(page).getByRole('heading', { name: 'Nenhum link por aqui ainda.' })).toBeVisible()
  await main(page).getByRole('button', { name: 'Ver todos os links' }).click()
  await expect(main(page).locator('article')).toHaveCount(9)
  expect(errors).toEqual([])
})

test('favorito persiste entre catálogo e detalhes; ações da demo não enviam dados', async ({ page }) => {
  const writes: string[] = []
  page.on('request', request => { if (request.url().includes('/bff/') && request.method() !== 'GET') writes.push(request.url()) })
  await page.goto('/dev/home-preview')
  await main(page).getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }).click()
  await main(page).getByRole('button', { name: 'Favoritos', exact: false }).filter({ hasText: 'Favoritos' }).last().click()
  await expect(main(page).locator('article')).toHaveCount(1)
  await main(page).getByRole('link', { name: 'Ver detalhes de Fora do roteiro' }).click()
  await expect(main(page).getByRole('heading', { name: 'Fora do roteiro', exact: true })).toBeVisible()
  await expect(main(page).getByRole('button', { name: 'Remover Fora do roteiro dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await main(page).getByRole('button', { name: 'Acessar comunidade' }).click()
  await expect(main(page).getByRole('status')).toContainText('não abre um destino real')
  await main(page).getByRole('button', { name: 'Denunciar', exact: true }).click()
  await expect(main(page).getByRole('status')).toContainText('Nenhuma denúncia foi enviada')
  await page.reload()
  await expect(main(page).getByRole('button', { name: 'Remover Fora do roteiro dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  expect(writes).toEqual([])
})

test('leitura, teclado, reduced-motion, reflow e capturas', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/dev/home-preview')
  await stablePhotos(page)
  expect(await main(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  await main(page).getByRole('button', { name: 'Pausar movimento' }).click()
  await expect(main(page)).toHaveAttribute('data-motion', 'paused')
  const search = main(page).getByLabel('O que você quer encontrar?')
  await search.focus()
  await expect(search).toBeFocused()
  expect(await search.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Tab')
  await expect(main(page).getByRole('button', { name: 'Explorar', exact: true })).toBeFocused()
  const axe = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(axe.violations).toEqual([])
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.screenshot({ path: info.outputPath('home.png'), fullPage: true, animations: 'disabled' })
  await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled' })
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(main(page).getByRole('button', { name: 'Explorar', exact: true })).toBeVisible()
  }
  await page.setViewportSize(info.project.use.viewport!)
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.evaluate(() => { document.documentElement.style.zoom = '' })
  await page.goto('/dev/home-preview/link/fora-do-roteiro')
  await stablePhotos(page)
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('detail.png'), fullPage: true, animations: 'disabled' })
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true, animations: 'disabled' })
})

test('foto indisponível e rotas inválidas têm fallback', async ({ page, request }) => {
  await page.route('**/dev/home-preview/photo/mountains', route => route.fulfill({ status: 502 }))
  await page.goto('/dev/home-preview')
  await expect(main(page).getByRole('img', { name: 'Imagem indisponível para Fora do roteiro' })).toBeVisible()
  await main(page).getByRole('link', { name: 'Ver detalhes de Fora do roteiro' }).click()
  await expect(main(page).getByRole('img', { name: 'Imagem indisponível para Fora do roteiro' })).toBeVisible()
  expect((await request.get('/dev/home-preview/photo/not-allowed')).status()).toBe(404)
  expect((await request.get('/dev/home-preview/link/not-a-link')).status()).toBe(404)
  expect((await request.get('/dev/ui-lab')).status()).toBe(404)
})
