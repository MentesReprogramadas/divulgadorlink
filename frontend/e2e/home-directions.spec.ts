import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'node:path'
import { homeDirections } from '../src/features/home-directions/directions'
import { selectOption } from './select-control'

const photos = new Set(['mountains', 'music', 'technology', 'travel', 'coffee', 'games', 'photography', 'food', 'reading'])
test.beforeEach(async ({ page, context }) => {
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: '127.0.0.1', path: '/' }])
  await page.addInitScript(() => { const style = document.createElement('style'); style.textContent = 'nextjs-portal { display: none; }'; document.addEventListener('DOMContentLoaded', () => document.head.append(style), { once: true }) })
  await page.route('**/bff/**', route => route.fulfill({ json: {} }))
  await page.route('**/dev/home-preview/photo/*', route => {
    const key = new URL(route.request().url()).pathname.split('/').pop()!
    return photos.has(key) ? route.fulfill({ path: path.join(__dirname, 'fixtures/home-preview', `${key}.jpg`), contentType: 'image/jpeg' }) : route.fulfill({ status: 404 })
  })
})

async function stable(page: Page) {
  for (const image of await page.locator('main img[src*="/photo/"]').all()) {
    if (!await image.isVisible()) continue
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveJSProperty('complete', true)
    expect(await image.evaluate((item: HTMLImageElement) => item.naturalWidth)).toBeGreaterThan(0)
  }
  await page.evaluate(async () => { await document.fonts.ready; for (const element of document.querySelectorAll<HTMLElement>('main *')) if (element.scrollWidth > element.clientWidth) element.scrollLeft = 0; window.scrollTo(0, 0) })
}

for (const direction of homeDirections) test(`${direction.name}: catálogo, filtros, favoritos, acessibilidade e layout`, async ({ page }, info) => {
  const errors: string[] = [], writes: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('/bff/') && request.method() !== 'GET') writes.push(request.url()) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/dev/homes/${direction.id}`)
  const main = page.getByRole('main', { name: `Home ${direction.name}` })
  await expect(main.locator('article')).toHaveCount(9)
  await expect(main.locator('article[data-featured]')).toHaveCount(3)
  await stable(page)
  expect(await main.locator('article').evaluateAll(articles => articles.every(article => {
    const copy = article.querySelector('h3')?.parentElement
    return !copy || copy.getBoundingClientRect().bottom <= article.getBoundingClientRect().bottom + 1
  }))).toBe(true)
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  expect(await main.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`${direction.id}.png`), fullPage: true, animations: 'disabled' })
  await page.screenshot({ path: info.outputPath(`${direction.id}-opening.png`), animations: 'disabled' })
  await expect(page).toHaveScreenshot(`${direction.id}.png`, { animations: 'disabled' })
  const search = main.getByLabel('O que você quer encontrar?')
  expect(await search.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(60)
  await search.focus(); await page.keyboard.press('Tab')
  const nextControl = direction.id === 'ondas' ? main.getByRole('link', { name: /^Abrir sugestão/ }).first() : main.getByRole('button', { name: 'Explorar', exact: true })
  await expect(nextControl).toBeFocused()
  expect(await nextControl.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await search.fill('frequencia'); await search.press('Enter')
  await expect(main.locator('article')).toHaveCount(1)
  await main.getByRole('button', { name: 'Limpar filtros' }).click()
  await main.getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }).click()
  await main.getByRole('button', { name: /^Favoritos/ }).click()
  await expect(main.locator('article')).toHaveCount(1)
  await main.getByRole('button', { name: 'Limpar filtros' }).click()
  await main.getByRole('navigation', { name: 'Explorar por nicho' }).getByRole('button', { name: 'Tecnologia', exact: true }).click()
  await selectOption(main.getByRole('combobox', { name: 'Filtrar por rede' }), 'whatsapp')
  await expect(main.getByRole('heading', { name: 'Nenhum link nesta seleção.' })).toBeVisible()
  await main.getByRole('button', { name: 'Ver todos os links' }).click()
  await expect(main.locator('article')).toHaveCount(9)
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.setViewportSize(info.project.use.viewport!)
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.evaluate(() => { document.documentElement.style.zoom = '' })
  expect(errors).toEqual([]); expect(writes).toEqual([])
})

test('galeria, sequência e retorno do detalhe para a direção escolhida', async ({ page, request }) => {
  await page.goto('/dev/homes')
  await expect(page.getByRole('main').getByRole('link', { name: /^Abrir home / })).toHaveCount(homeDirections.length)
  await page.getByRole('link', { name: 'Abrir home Aurora' }).click()
  await page.getByRole('link', { name: 'Próxima home: Metal' }).click()
  await expect(page.getByRole('main', { name: 'Home Metal' })).toBeVisible()
  await page.getByRole('link', { name: 'Home anterior: Aurora' }).click()
  await expect(page.getByRole('main', { name: 'Home Aurora' })).toBeVisible()
  await page.getByRole('link', { name: 'Ver detalhes de Fora do roteiro' }).click()
  await expect(page.getByRole('heading', { name: 'Fora do roteiro', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Caminho do link' }).getByRole('link', { name: 'Catálogo', exact: true }).click()
  await expect(page).toHaveURL(/\/dev\/homes\/aurora$/)
  expect((await request.get('/dev/homes/invalid-style')).status()).toBe(404)
  expect((await request.get('/dev/ui-lab')).status()).toBe(404)
})

test('movimento pode ser pausado; WebGL e ausência de GPU funcionam', async ({ page }, info) => {
  await page.goto('/dev/homes/aurora')
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'paused')
  await expect.poll(() => page.locator('main').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  await page.getByRole('button', { name: 'Retomar animações' }).click()
  expect(await page.locator('main').evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(true)
  await page.goto('/dev/homes/ondas')
  await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'webgl')
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null })
  await page.reload()
  await expect(page.getByRole('main', { name: 'Home Ondas' })).toBeVisible()
  await expect(page.locator('canvas')).not.toHaveAttribute('data-renderer', 'webgl')
  await page.getByRole('searchbox').fill('musica'); await page.getByRole('searchbox').press('Enter')
  await expect(page.locator('article')).toHaveCount(1)
  if (!info.project.use.hasTouch) {
    await page.goto('/dev/homes/magnetica')
    const card = page.locator('article').first()
    await card.hover({ position: { x: 50, y: 50 } })
    expect(await card.evaluate(element => element.style.getPropertyValue('--pull-x'))).not.toBe('')
  }
})
