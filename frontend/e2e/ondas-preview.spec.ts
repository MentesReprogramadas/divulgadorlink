import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'node:path'
import { selectOption } from './select-control'

const photos = new Set(['mountains', 'music', 'technology', 'travel', 'coffee', 'games', 'photography', 'food', 'reading'])
test.beforeEach(async ({ page, context }) => {
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: '127.0.0.1', path: '/' }])
  await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = 'nextjs-portal { display: none; }'; document.head.append(style) }, { once: true }) })
  await page.route('**/bff/**', route => route.fulfill({ json: {} }))
  await page.route('**/dev/home-preview/photo/*', route => {
    const photo = new URL(route.request().url()).pathname.split('/').pop()!
    return photos.has(photo) ? route.fulfill({ path: path.join(__dirname, 'fixtures/home-preview', `${photo}.jpg`), contentType: 'image/jpeg' }) : route.fulfill({ status: 404 })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function stable(page: Page) {
  for (const image of await page.locator('main img[src*="/photo/"]').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveJSProperty('complete', true)
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
  }
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
  await expect(page.locator('[data-optics="frosted"]')).toHaveCount(0)
}

async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('main').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
}

async function separatedPhotos(page: Page) {
  for (const photo of await page.locator('[data-card-photo], [data-collection-photo]').all()) {
    const boxes = await photo.evaluate(element => ({ bottom: element.getBoundingClientRect().bottom, contentTop: element.nextElementSibling!.getBoundingClientRect().top, labels: element.querySelectorAll('button, h1, h2, h3, p, small, span').length }))
    expect(boxes.contentTop).toBeGreaterThanOrEqual(boxes.bottom - 1)
    expect(boxes.labels).toBe(0)
  }
  if (await page.locator('[data-detail-content]').count()) {
    const media = await page.locator('[data-detail-photo]').evaluate(element => element.parentElement!.getBoundingClientRect().toJSON())
    const summary = await page.locator('[data-detail-content]').boundingBox()
    expect(summary).not.toBeNull()
    if (page.viewportSize()!.width > 850) expect(summary!.x).toBeGreaterThanOrEqual(media.right - 1)
    else expect(summary!.y).toBeGreaterThanOrEqual(media.bottom - 1)
  }
}

test('home completa: filtros combinados, ordenação, favoritos e coleções', async ({ page }) => {
  const errors: string[] = [], writes: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('/bff/') && request.method() !== 'GET') writes.push(request.url()) })
  await page.goto('/dev/homes/ondas')
  const main = page.getByRole('main', { name: 'Home Ondas' })
  await expect(main.locator('article')).toHaveCount(9)
  await expect(page.locator('[aria-labelledby="wave-title"] a')).toHaveCount(0)
  await expect(main.locator('article[data-featured]')).toHaveCount(3)
  const search = page.getByLabel('O que você quer encontrar?')
  await search.fill('frequencia'); await search.press('Enter')
  await expect(main.locator('article')).toHaveCount(1)
  await expect(main.getByRole('heading', { name: 'Frequência indie', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await page.getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }).click()
  await page.getByRole('button', { name: /^Favoritos/ }).click()
  await expect(main.locator('article')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remover Fora do roteiro dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('navigation', { name: 'Explorar por nicho' }).getByRole('button', { name: 'Tecnologia', exact: true }).click()
  await selectOption(page.getByRole('combobox', { name: 'Filtrar por rede' }), 'whatsapp')
  await expect(page.getByRole('heading', { name: 'Nenhum link nesta seleção.' })).toBeVisible()
  await accessible(page)
  await page.getByRole('button', { name: 'Ver todos os links' }).click()
  await selectOption(page.getByRole('combobox', { name: 'Ordenar links' }), 'views')
  await expect(main.locator('article:not([data-featured])').first()).toHaveAttribute('data-link', 'mesa-compartilhada')
  await page.getByRole('button', { name: 'Explorar Gastronomia', exact: true }).click()
  await expect(main.locator('article')).toHaveCount(2)
  await expect(main.getByRole('region', { name: 'Resultados da busca' })).toBeFocused()
  expect(errors).toEqual([]); expect(writes).toEqual([])
})

test('home e detalhes: capturas, contraste, teclado e reflow', async ({ page }, info) => {
  for (const [route, name] of [['/dev/homes/ondas', 'home'], ['/dev/homes/ondas/link/fora-do-roteiro', 'detail'], ['/dev/homes/ondas/link/cafe-e-conversa', 'long-title']] as const) {
    await page.goto(route); await stable(page); await accessible(page); await separatedPhotos(page)
    await page.screenshot({ path: info.outputPath(`${name}-full.png`), fullPage: true, animations: 'disabled' })
    await expect(page).toHaveScreenshot(`${name}.png`, { animations: 'disabled' })
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await separatedPhotos(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.setViewportSize(info.project.use.viewport!)
    await page.evaluate(() => { document.documentElement.style.zoom = '2' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.zoom = '' })
  }
  await page.goto('/dev/homes/ondas')
  await page.getByLabel('O que você quer encontrar?').focus(); await page.keyboard.press('Tab')
  const suggestion = page.getByRole('link', { name: /^Abrir sugestão/ }).first()
  await expect(suggestion).toBeFocused()
  expect(await suggestion.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
})

test('detalhes: navegação contextual, favorito, acesso simulado e erro de clipboard', async ({ page }) => {
  const writes: string[] = []
  page.on('request', request => { if (request.url().includes('/bff/') && request.method() !== 'GET') writes.push(request.url()) })
  await page.goto('/dev/homes/ondas')
  await page.getByRole('link', { name: 'Ver detalhes de Fora do roteiro' }).click()
  await expect(page).toHaveURL(/\/dev\/homes\/ondas\/link\/fora-do-roteiro$/)
  await page.getByRole('button', { name: 'Acessar comunidade' }).click()
  await expect(page.getByRole('status')).toContainText('não abre um destino real')
  await page.getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }).click()
  await expect(page.getByRole('button', { name: 'Remover Fora do roteiro dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }) })
  await page.getByRole('button', { name: 'Copiar link', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Link desta demonstração copiado.')
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('blocked')) } }) })
  await page.getByRole('button', { name: 'Copiar link', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Não foi possível copiar')
  await page.getByText('Encontrou um problema?', { exact: true }).click()
  await expect(page.getByText('Esta demonstração não envia denúncias.', { exact: false })).toBeVisible()
  await accessible(page)
  await page.getByRole('navigation', { name: 'Caminho do link' }).getByRole('link', { name: 'Catálogo' }).click()
  await expect(page).toHaveURL(/\/dev\/homes\/ondas$/)
  expect(writes).toEqual([])
})

test('fallback sem GPU, imagem indisponível, pausa e rota inválida', async ({ page, request }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) { return args[0] === 'webgl' ? null : original.apply(this, args) } as typeof original
  })
  await page.route('**/dev/home-preview/photo/mountains', route => route.fulfill({ status: 503 }))
  await page.goto('/dev/homes/ondas')
  const photo = page.locator('article[data-link="fora-do-roteiro"] [data-card-photo]')
  await photo.scrollIntoViewIfNeeded()
  await expect(photo.getByRole('img', { name: 'Imagem indisponível para Fora do roteiro', includeHidden: true })).toBeVisible()
  await expect(page.locator('canvas')).not.toHaveAttribute('data-renderer', 'webgl')
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  await expect(page.getByRole('main')).toHaveAttribute('data-motion', 'paused')
  await page.getByRole('button', { name: 'Retomar animações' }).click()
  await expect(page.getByRole('main')).toHaveAttribute('data-motion', 'running')
  await page.getByLabel('O que você quer encontrar?').fill('musica'); await page.getByLabel('O que você quer encontrar?').press('Enter')
  await expect(page.locator('main article')).toHaveCount(1)
  expect((await request.get('/dev/homes/ondas/link/inexistente')).status()).toBe(404)
})

test('refração muda os pixels, mantém o texto nítido e adapta a geometria', async ({ page }, info) => {
  await page.goto('/dev/homes/ondas'); await stable(page)
  const card = page.locator('article[data-link="fora-do-roteiro"]')
  const lens = card.locator('[data-card-content] > [data-optics]')
  await expect(lens).toHaveAttribute('data-optics', 'refractive')
  expect(await card.getByRole('heading').evaluate(element => getComputedStyle(element).filter)).toBe('none')
  const refracted = await card.screenshot({ path: info.outputPath('refraction-on.png'), animations: 'disabled' })
  await lens.locator('feDisplacementMap').evaluateAll(elements => elements.forEach(element => element.setAttribute('scale', '0')))
  const plain = await card.screenshot({ path: info.outputPath('refraction-off.png'), animations: 'disabled' })
  expect(refracted.equals(plain)).toBe(false)
  await page.setViewportSize({ width: 320, height: 900 })
  await expect.poll(() => lens.evaluate(element => Math.abs(Number(element.querySelector('filter')?.getAttribute('width')) - element.getBoundingClientRect().width))).toBeLessThan(1)
})

test('sem mapa 2D o vidro fosco mantém as ações funcionando', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) { return args[0] === '2d' ? null : original.apply(this, args) } as typeof original
  })
  await page.goto('/dev/homes/ondas')
  await expect(page.locator('article[data-link="fora-do-roteiro"] [data-card-content] > [data-optics]')).toHaveAttribute('data-optics', 'frosted')
  await page.getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }).click()
  await expect(page.getByRole('button', { name: 'Remover Fora do roteiro dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('O que você quer encontrar?').fill('musica')
  await page.getByLabel('O que você quer encontrar?').press('Enter')
  await expect(page.locator('main article')).toHaveCount(1)
})

test('transparência reduzida usa superfície opaca sem refração', async ({ page }) => {
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
  await page.goto('/dev/homes/ondas')
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true)
  const lens = page.locator('article[data-link="fora-do-roteiro"] [data-card-content] > [data-optics]')
  await expect(lens).toHaveAttribute('data-optics', 'frosted')
  expect(await lens.locator(':scope > span').first().evaluate(element => getComputedStyle(element).backdropFilter)).toBe('none')
  await page.getByRole('link', { name: 'Ver detalhes de Fora do roteiro' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fora do roteiro')
  await session.detach()
})

test('fundo tem movimento real e pausa respeita a preferência do navegador', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/dev/homes/ondas')
  const ground = page.locator('[data-wave-background]')
  const canvas = ground.locator('canvas')
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl')
  expect(await canvas.evaluate((element: HTMLCanvasElement) => {
    const gl = element.getContext('webgl')!
    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram
    return gl.getAttachedShaders(program)!.some(shader => gl.getShaderSource(shader)!.includes('float fold=sin'))
  })).toBe(true)
  const shaderTime = () => canvas.evaluate((element: HTMLCanvasElement) => {
    const gl = element.getContext('webgl')!, program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram
    const location = gl.getUniformLocation(program, 'time')
    if (!location) throw new Error('Shader sem uniforme de tempo')
    return Number(gl.getUniform(program, location))
  })
  const initialTime = await shaderTime()
  await expect.poll(shaderTime).toBeGreaterThan(initialTime + .05)
  await expect.poll(() => ground.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(2)
  const start = await ground.evaluate(element => Number(element.getAnimations({ subtree: true })[0].currentTime))
  await expect.poll(() => ground.evaluate(element => Number(element.getAnimations({ subtree: true })[0].currentTime))).toBeGreaterThan(start + 50)
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  expect(await ground.evaluate(element => element.getAnimations({ subtree: true }).every(animation => animation.playState === 'paused'))).toBe(true)
  await page.getByRole('button', { name: 'Retomar animações' }).click()
  await expect.poll(() => ground.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(2)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => ground.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
})

test('busca simples recomenda links, informa patrocinado e funciona com teclado', async ({ page }) => {
  await page.goto('/dev/homes/ondas')
  const search = page.getByLabel('O que você quer encontrar?')
  const form = page.getByRole('search')
  await expect(form.getByRole('button')).toHaveCount(0)
  await search.focus()
  await expect(page.getByRole('region', { name: 'Sugestões de busca' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Abrir sugestão/ })).toHaveCount(3)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: /^Abrir sugestão/ }).first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
  await expect(page.getByRole('region', { name: 'Sugestões de busca' })).toHaveCount(0)
  await search.fill('musica')
  const suggestion = page.getByRole('link', { name: 'Abrir sugestão Frequência indie' })
  await expect(suggestion).toContainText('Patrocinado')
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/frequencia-indie$/)
  await page.goto('/dev/homes/ondas')
  await search.fill('nenhum-resultadoteste')
  await expect(page.getByText('Nenhuma sugestão.', { exact: false })).toBeVisible()
  await search.press('Enter')
  await expect(page.getByRole('heading', { name: 'Nenhum link nesta seleção.' })).toBeVisible()
})

test('card inteiro abre detalhes, favorito é independente e select abre todo em vidro', async ({ page }) => {
  await page.goto('/dev/homes/ondas')
  const card = page.locator('article[data-link="fora-do-roteiro"]')
  await card.getByRole('button', { name: 'Salvar Fora do roteiro nos favoritos' }).click()
  await expect(page).toHaveURL(/\/dev\/homes\/ondas$/)
  const target = card.getByRole('link', { name: 'Ver detalhes de Fora do roteiro' })
  const cardBox = await card.boundingBox(), targetBox = await target.boundingBox()
  expect(targetBox!.height).toBeCloseTo(cardBox!.height, 0)
  expect(targetBox!.width).toBeCloseTo(cardBox!.width, 0)
  await target.click({ position: { x: 40, y: 40 } })
  await expect(page).toHaveURL(/fora-do-roteiro$/)
  await expect(page.getByText('Imagem ilustrativa do anexo do publicador')).toHaveCount(0)
  await page.goto('/dev/homes/ondas')
  await page.getByRole('combobox', { name: 'Filtrar por rede' }).click()
  const popup = page.locator('[data-select-popup]')
  await expect(popup.locator('[data-optics]')).toHaveAttribute('data-optics', 'refractive')
  expect(await popup.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await page.getByRole('option', { name: 'Telegram', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Filtrar por rede' })).toContainText('Telegram')
  await expect(page.locator('main article')).toHaveCount(2)
})
