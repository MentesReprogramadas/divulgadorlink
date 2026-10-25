import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { captureOndasState } from './ondas-visual-capture'
import { grantRichBlocks, uploadVisualProfilePhoto } from './ondas-profile-content-fixture'
import { isolatedFixture, login, saveProfile, publishProfile, redirect, roadmapApi, type Fixture } from './ondas-visual-fixture'
import { grantProfileCapability } from './profile-schedule-fixture'
import { appearanceThemes } from '../src/features/profiles/profile-appearance'
import { directionIds } from '../src/features/home-directions/directions'
import { preparePublicCapture } from './ondas-public-capture'

const publicOrigin = runtime.web(process.env.ONDAS_PUBLIC_HOST ?? 'ondas.localhost')
const devOrigin = new URL(publicOrigin)
devOrigin.port = process.env.ONDAS_DEV_PORT ?? '3013'
const missingId = '00000000-0000-4000-8000-000000000099'
const publicRoutes = [
  ['/', 'catalog-ready'], ['/divulgar', 'publisher-landing'], ['/busca', 'search-initial'],
  ['/nicho/jogos', 'niche-ready'], ['/rede/telegram', 'network-ready'], ['/paginas', 'directory-initial'],
  ['/termos', 'terms'], ['/privacidade', 'privacy'], ['/nao-encontrado', 'not-found'],
  ['/?cityId=3550308&languageTag=ja&modality=PRESENTIAL', 'catalog-empty-filtered'],
  ['/?cursor=one&cursor=two', 'catalog-invalid-filter'],
  ['/nicho/jogos?cityId=3550308&languageTag=ja&modality=PRESENTIAL', 'niche-empty-filtered'],
  ['/rede/telegram?cityId=3550308&languageTag=ja&modality=PRESENTIAL', 'network-empty-filtered'],
  ['/nicho/ondas-nao-existente', 'niche-not-found'], ['/rede/ondas-nao-existente', 'network-not-found'],
] as const

type PublicCard = { id: string; name: string; description: string; imageUrl?: string; imageAlt?: string; iconUrl?: string; surfaceToken: string; niche?: { name: string; slug: string }; network?: { name: string; slug: string } }
type HomeBody = { organic: PublicCard[]; sponsored: PublicCard[] }
type VisualProfileContent = Awaited<ReturnType<typeof saveProfile>> & { translations?: { primaryLocale: 'pt-BR'; entries: Array<{ locale: 'en'; name: string; bio: string; categories: Record<string, string>; items: Record<string, string> }> } }
const pageErrors = new WeakMap<Page, string[]>()
function observe(page: Page) { const errors: string[] = []; pageErrors.set(page, errors); page.on('pageerror', error => errors.push(error.message)) }

async function shot(page: Page, info: TestInfo, state: string, source: 'live' | 'presentation-fixture' | 'reference' = 'live', fullPage = true) {
  let failedImages: string[] = []
  if (fullPage) {
    const images = await page.evaluate(preparePublicCapture, { imageTimeoutMs: 15_000 })
    failedImages = images.failedImages
    await info.attach(state + '-image-readiness', { contentType: 'application/json', body: JSON.stringify(images) })
  }
  await captureOndasState(page, info, { route: new URL(page.url()).pathname + new URL(page.url()).search, state, source, fullPage })
  if (source === 'reference') {
    expect.soft(failedImages, state + ': all reference image responses must load').toEqual([])
    await expect.soft(page.getByRole('img', { name: /^Imagem indisponível para / }), state + ': reference photos must load').toHaveCount(0)
  }
  await info.attach(state + '-page-errors', { contentType: 'application/json', body: JSON.stringify(pageErrors.get(page) ?? []) })
  expect.soft(pageErrors.get(page) ?? [], state + ': unhandled page errors').toEqual([])
}

async function homeCards(page: Page) {
  const result = await page.request.get(publicOrigin + '/bff/v1/home')
  expect(result.status(), 'The public visual dataset must expose the real catalog API').toBe(200)
  const body = await result.json() as HomeBody
  return [...body.sponsored, ...body.organic]
}

function resultBody(cards: PublicCard[], target = { kind: 'results', slug: null as string | null, name: '' }) {
  return { target, sponsored: [], organic: cards, showImpressions: true }
}

async function optionsOpen(page: Page, name: string) {
  const trigger = page.getByRole('combobox', { name, exact: true })
  await expect(trigger).toBeEnabled()
  await trigger.click()
  const popup = page.locator('[data-select-popup]:visible')
  await expect(popup).toBeVisible()
  return { trigger, popup }
}

test.beforeEach(async ({ page }, info) => {
  observe(page)
  const mobile = Boolean(info.project.use.isMobile) || info.project.name.includes('mobile')
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date('2026-10-24T12:00:00.000Z'))
  await page.context().addCookies(['ondas.localhost', 'checklist.localhost'].map(domain => ({ name: 'tla_consent', value: 'denied', domain, path: '/' })))
  await page.route(/\/bff\/v1\/(?:analytics|metrics)(?:\/|\?|$)/, route => route.request().method() === 'POST' ? route.fulfill({ status: 204 }) : route.continue())
  await page.route(/https:\/\/(?:connect\.facebook\.net|www\.googletagmanager\.com|googleads\.g\.doubleclick\.net)\//, route => route.abort())
})

for (const [route, state] of publicRoutes) test('public surface: ' + state, async ({ page }, info) => {
  await page.goto(publicOrigin + route)
  if (state === 'catalog-invalid-filter') {
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível usar estes filtros')
    await expect(page.getByRole('link', { name: 'Limpar filtros', exact: true })).toHaveCSS('color', 'rgb(10, 25, 47)')
  }
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (state.endsWith('empty-filtered')) await expect(page.getByText('Nenhum link encontrado com estes filtros', { exact: true })).toBeVisible()
  await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  await shot(page, info, state)
})

test('public catalog: topics, filters, long select, city suggestions and keyboard', async ({ page }, info) => {
  await page.goto(publicOrigin)
  await expect(page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true })).toBeEnabled()
  const topics = page.getByRole('navigation', { name: 'Explorar por nicho' })
  const more = topics.getByRole('button', { name: 'Ver mais', exact: true })
  if (await more.count()) { await more.click(); await expect(topics.getByRole('button', { name: 'Ver menos', exact: true })).toHaveAttribute('aria-expanded', 'true') }
  await shot(page, info, 'catalog-topics-expanded')
  await page.getByText('Localização e preferências', { exact: true }).click()
  await expect(page.getByRole('form', { name: 'Filtrar catálogo' })).toBeVisible()
  await shot(page, info, 'catalog-discovery-expanded')
  let control = await optionsOpen(page, 'Idioma')
  await shot(page, info, 'catalog-language-popup-top', 'live', false)
  const list = control.popup.locator('[class*="select_list"]')
  const opticalBounds = await control.popup.locator('[data-optics]').first().boundingBox()
  await list.evaluate(element => { element.scrollTop = element.scrollHeight })
  await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await control.popup.locator('[data-optics]').first().boundingBox()).toEqual(opticalBounds)
  await shot(page, info, 'catalog-language-popup-bottom', 'live', false)
  await page.keyboard.press('Escape')
  await expect(control.trigger).toBeFocused()
  control = await optionsOpen(page, 'Filtrar por rede')
  await shot(page, info, 'catalog-network-popup', 'live', false)
  await page.keyboard.press('Escape')
  await expect(control.trigger).toBeFocused()
  const city = page.getByRole('combobox', { name: 'Cidade', exact: true })
  await city.fill('sao')
  await expect(page.getByRole('option').first()).toBeVisible()
  await city.press('ArrowDown')
  await shot(page, info, 'catalog-city-suggestions', 'live', false)
})

test('public search: real results and all presentation request states', async ({ page }, info) => {
  const cards = await homeCards(page)
  expect(cards.length).toBeGreaterThan(0)
  await page.goto(publicOrigin + '/busca?q=' + encodeURIComponent(cards[0].name))
  await expect(page.getByRole('heading', { name: 'Links encontrados', exact: true })).toBeVisible()
  await shot(page, info, 'search-real-results')
  let release: () => void = () => undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/search?**', async route => { await gate; await route.fulfill({ json: resultBody(cards.slice(0, 3)) }) })
  await page.goto(publicOrigin + '/busca?q=visual-loading', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status', { name: 'Carregando links', exact: true })).toBeVisible()
  await shot(page, info, 'search-loading', 'presentation-fixture')
  release()
  await expect(page.getByRole('heading', { name: 'Links encontrados', exact: true })).toBeVisible()
  await page.unroute('**/bff/v1/search?**')
  await page.route('**/bff/v1/search?**', route => route.fulfill({ status: 503, json: {} }))
  await page.goto(publicOrigin + '/busca?q=visual-error')
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await shot(page, info, 'search-error', 'presentation-fixture')
  await page.unroute('**/bff/v1/search?**')
  await page.route('**/bff/v1/search?**', route => route.fulfill({ json: resultBody(cards.slice(0, 3)) }))
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Links encontrados', exact: true })).toBeVisible()
  await shot(page, info, 'search-recovered', 'presentation-fixture')
  await page.unroute('**/bff/v1/search?**')
  await page.route('**/bff/v1/search?**', route => route.fulfill({ json: resultBody([]) }))
  await page.goto(publicOrigin + '/busca?q=visual-empty')
  await expect(page.getByText('Nenhum link encontrado', { exact: true })).toBeVisible()
  await shot(page, info, 'search-empty', 'presentation-fixture')
  for (const kind of ['niche', 'network'] as const) {
    await page.unroute('**/bff/v1/search?**')
    const facet = kind === 'niche' ? cards.find(card => card.niche)?.niche : cards.find(card => card.network)?.network
    expect(facet, 'Public cards need a real ' + kind + ' facet').toBeTruthy()
    await page.route('**/bff/v1/search?**', route => route.fulfill({ json: resultBody(cards.slice(0, 2), { kind, slug: facet!.slug, name: facet!.name }) }))
    await page.goto(publicOrigin + '/busca?q=visual-' + kind)
    await expect(page.getByText(kind === 'niche' ? 'Nicho encontrado' : 'Rede encontrada', { exact: true })).toBeVisible()
    await shot(page, info, 'search-context-' + kind, 'presentation-fixture')
  }
  await page.unroute('**/bff/v1/search?**')
  await page.goto(publicOrigin + '/busca?q=visual&cityId=9999999')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível usar estes filtros')
  await shot(page, info, 'search-invalid-filters')
})

test('public home: suggestions, signed-out favorite feedback, consent and navigation', async ({ page }, info) => {
  const cards = await homeCards(page)
  await page.route('**/bff/v1/search/suggest?**', route => route.fulfill({ json: { items: cards.slice(0, 3).map(card => ({ id: card.id, name: card.name, network: card.network })) } }))
  await page.goto(publicOrigin)
  await page.getByRole('combobox', { name: 'Busca', exact: true }).fill('comunidade')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await shot(page, info, 'home-suggestion-keyboard', 'presentation-fixture', false)
  await page.keyboard.press('Escape')
  const firstCard = page.locator('#home-catalog-results article').first()
  await firstCard.hover()
  await shot(page, info, 'catalog-card-hover')
  await firstCard.getByRole('link').first().focus()
  await shot(page, info, 'catalog-card-keyboard-focus')
  await page.route('**/bff/v1/me/favorites/*', route => route.fulfill({ status: 503, json: { message: 'Sem conexão. Tente novamente.' } }))
  await page.getByRole('button', { name: 'Salvar favorito', exact: true }).first().click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Sem conexão')
  await shot(page, info, 'favorite-error', 'presentation-fixture')
  await page.unroute('**/bff/v1/me/favorites/*')
  await page.route('**/bff/v1/me/favorites/*', route => route.fulfill({ json: { saved: true } }))
  await page.getByRole('button', { name: 'Salvar favorito', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Remover favorito', exact: true }).first()).toHaveAttribute('aria-pressed', 'true')
  await shot(page, info, 'favorite-saved', 'presentation-fixture')
  await page.context().clearCookies({ name: 'tla_consent' })
  await page.goto(publicOrigin)
  const consent = page.getByRole('region', { name: 'Este site usa cookies', exact: true })
  await expect(consent).toBeVisible()
  await shot(page, info, 'consent-initial', 'live', false)
  await consent.getByRole('button', { name: 'Ajustar preferências', exact: true }).click()
  await expect(consent.getByRole('group', { name: 'Cookies opcionais' })).toBeVisible()
  await shot(page, info, 'consent-preferences', 'live', false)
  await consent.getByRole('button', { name: 'Salvar preferências', exact: true }).click()
  await expect(consent).toHaveCount(0)
  await page.getByRole('button', { name: 'Gerenciar cookies', exact: true }).click()
  await expect(consent).toBeVisible()
  await shot(page, info, 'consent-reopened', 'live', false)
  await consent.getByRole('button', { name: 'Recusar', exact: true }).click()
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) {
    await menu.focus(); await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await shot(page, info, 'public-navigation-drawer', 'live', false)
    await page.keyboard.press('Escape'); await expect(menu).toBeFocused()
  } else await shot(page, info, 'public-navigation-desktop')
})

test('public detail: approved image, imageless card, broken-image fallback and copy', async ({ page }, info) => {
  const cards = await homeCards(page)
  const photo = cards.find(card => card.imageUrl), imageless = cards.find(card => !card.imageUrl)
  expect(photo, 'Visual dataset requires a real approved cover').toBeTruthy()
  expect(imageless, 'Visual dataset requires a real imageless link').toBeTruthy()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: publicOrigin })
  await page.goto(publicOrigin + '/link/' + photo!.id)
  await expect(page.locator('[data-detail-photo] img')).toBeVisible()
  const canonical = page.locator('link[rel="canonical"]')
  await expect(canonical).toHaveCount(1)
  const canonicalHref = await canonical.getAttribute('href')
  expect(canonicalHref, 'The public detail must expose its server canonical URL').toBeTruthy()
  const canonicalUrl = new URL(canonicalHref!)
  expect(canonicalUrl.origin).toBe('https://' + new URL(publicOrigin).hostname)
  expect(canonicalUrl.pathname).toBe('/link/' + encodeURIComponent(photo!.id))
  expect(canonicalUrl.search).toBe('')
  expect(canonicalUrl.hash).toBe('')
  await shot(page, info, 'detail-approved-cover')
  const copy = page.getByRole('button', { name: /Copiar/ }).first()
  await copy.click()
  await expect(page.getByText('Link copiado.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(canonicalUrl.href)
  await shot(page, info, 'detail-copy-feedback')
  await page.goto(publicOrigin + '/link/' + imageless!.id)
  await expect(page.locator('[data-detail-photo]')).toHaveCount(0)
  await shot(page, info, 'detail-without-cover')
  const coverPath = new URL(photo!.imageUrl!.replace(/^\/api\//, '/bff/'), publicOrigin).pathname
  let brokenCoverRequests = 0
  await page.route('**' + coverPath + '**', route => { brokenCoverRequests++; return route.fulfill({ status: 404 }) })
  const brokenCoverResponse = page.waitForResponse(response => new URL(response.url()).pathname === coverPath && response.status() === 404)
  await page.goto(publicOrigin + '/link/' + photo!.id)
  await brokenCoverResponse
  expect(brokenCoverRequests, 'The real image request must reach the local404 fixture').toBeGreaterThan(0)
  await expect(page.locator('[data-detail-photo] img')).toHaveCount(0)
  await shot(page, info, 'detail-image-load-fallback', 'presentation-fixture')
  await page.goto(publicOrigin + '/link/' + missingId)
  await expect(page.getByRole('heading', { name: 'Não encontrado', exact: true })).toBeVisible()
  await shot(page, info, 'detail-not-found')
})

test('public age dialog: protected, keyboard confirmation and unprotected empty result', async ({ page }, info) => {
  let confirmed = false
  await page.route('**/bff/v1/search?**', route => route.fulfill({ json: { ...resultBody([]), ageRequired: !confirmed } }))
  await page.route('**/bff/v1/age', async route => { expect(route.request().postDataJSON()).toEqual({ choice: 'yes' }); confirmed = true; await route.fulfill({ status: 204 }) })
  await page.goto(publicOrigin + '/busca?q=visual-restrito')
  const dialog = page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })
  await expect(dialog).toBeVisible()
  await shot(page, info, 'age-protected-dialog', 'presentation-fixture', false)
  await dialog.getByRole('button', { name: 'Tenho 18 anos ou mais' }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Nenhum link encontrado', { exact: true })).toBeVisible()
  await shot(page, info, 'age-confirmed', 'presentation-fixture')
})

test('public optical fallbacks: no WebGL and no ResizeObserver', async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function (this: HTMLCanvasElement, id: string, ...args: unknown[]) { return /webgl/i.test(id) ? null : Reflect.apply(original, this, [id, ...args]) } })
  })
  await page.goto(publicOrigin)
  await expect(page.locator('#home-catalog-results article').first()).toBeVisible()
  await shot(page, info, 'home-no-webgl-fallback', 'presentation-fixture')
  await page.addInitScript(() => { Object.defineProperty(window, 'ResizeObserver', { value: undefined, configurable: true }) })
  await page.goto(publicOrigin)
  await expect(page.locator('#home-catalog-results article').first()).toBeVisible()
  await shot(page, info, 'home-no-optical-observer-fallback', 'presentation-fixture')
})

async function publicProfile(page: Page, fixture: Fixture, theme: string, extended = false) {
  const content: VisualProfileContent = await saveProfile(page, fixture, theme)
  if (extended) {
    const extraGroup = randomUUID()
    content.appearance = { ...content.appearance!, searchEnabled: true }
    content.categories.push({ id: extraGroup, name: 'Materiais', visible: true })
    content.items = Array.from({ length: 23 }, (_, index) => ({ id: randomUUID(), categoryId: index < 21 ? content.categories[0].id : extraGroup, type: 'URL', label: index < 21 ? 'Projeto da comunidade ' + (index + 1) : 'Material de estudo ' + (index + 1), destination: 'https://example.com/f12-a', visible: true }))
    content.translations = { primaryLocale: 'pt-BR', entries: [{ locale: 'en', name: 'Anna and the community', bio: 'Projects, meetings and shared knowledge.', categories: { [content.categories[0].id]: 'Community projects', [extraGroup]: 'Learning materials' }, items: { [content.items[0].id]: 'Explore the community' } }] }
    expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 1, content })).status).toBe(200)
  }
  expect((await roadmapApi(page, '/me/forms', 'PUT', { expectedVersion: 0, definition: { enabled: true, purpose: 'contact', marketingAllowed: true, fields: [{ key: 'name', required: true }, { key: 'email', required: true }, { key: 'phone', required: false }, { key: 'message', required: false }] } })).status).toBe(200)
  await publishProfile(page)
  return content
}

for (const theme of appearanceThemes) test('public publication preserves theme: ' + theme.name, async ({ page, browser }, info) => {
  const fixture = isolatedFixture()
  await login(page, fixture)
  await publicProfile(page, fixture, theme.name)
  const context = await browser.newContext({ viewport: page.viewportSize()!, locale: 'pt-BR', reducedMotion: 'reduce', isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch) })
  try {
    await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: fixture.host, path: '/' }])
    const visitor = await context.newPage()
    observe(visitor)
    await visitor.goto(fixture.origin + '/p/' + fixture.profileSlug)
    await expect(visitor.getByRole('heading', { name: 'Ana Ondas', exact: true })).toBeVisible()
    await shot(visitor, info, 'profile-theme-' + theme.name)
    const form = visitor.getByRole('region', { name: 'Formulário de contato' })
    const optIn = form.getByRole('checkbox', { name: 'Quero receber novidades', exact: true })
    await optIn.focus(); await visitor.keyboard.press('Space')
    await expect(optIn).toBeChecked()
    await shot(visitor, info, 'profile-contact-opt-in-' + theme.name)
    await visitor.keyboard.press('Space')
    expect(await optIn.isChecked()).toBe(false)
  } finally { await context.close() }
})

test('public profile: search, pagination, translation, contact validation, pending, error and success', async ({ page, browser }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture()
  await login(page, fixture)
  await publicProfile(page, fixture, 'Areia', true)
  const context = await browser.newContext({ viewport: page.viewportSize()!, locale: 'pt-BR', reducedMotion: 'reduce', isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch) })
  try {
    await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: fixture.host, path: '/' }])
    const visitor = await context.newPage(), url = fixture.origin + '/p/' + fixture.profileSlug
    observe(visitor)
    await visitor.goto(url)
    await expect(visitor.getByRole('button', { name: 'Próximos links' })).toBeVisible()
    await shot(visitor, info, 'profile-search-first-page')
    await visitor.getByRole('button', { name: 'Próximos links' }).click()
    await expect(visitor.getByRole('button', { name: 'Voltar ao início' })).toBeVisible()
    await shot(visitor, info, 'profile-search-next-page')
    await visitor.getByRole('button', { name: 'Voltar ao início' }).click()
    await visitor.getByRole('button', { name: /^Filtros/ }).click()
    await expect(visitor.getByRole('dialog', { name: 'Filtros da página' })).toBeVisible()
    await shot(visitor, info, 'profile-filter-dialog', 'live', false)
    await visitor.getByRole('dialog', { name: 'Filtros da página' }).getByRole('combobox', { name: 'Grupo de links' }).click()
    await shot(visitor, info, 'profile-filter-popup', 'live', false)
    await visitor.keyboard.press('Escape')
    await visitor.getByRole('dialog', { name: 'Filtros da página' }).getByRole('button', { name: 'Concluir', exact: true }).click()
    const search = visitor.getByRole('searchbox', { name: 'Buscar nesta página' })
    await search.fill('nenhum-material-visual')
    await expect(visitor.getByText('Nenhum link encontrado.', { exact: true })).toBeVisible()
    await shot(visitor, info, 'profile-search-empty')
    await visitor.goto(url + '?locale=en')
    await expect(visitor.getByRole('heading', { name: 'Anna and the community', exact: true })).toBeVisible()
    await shot(visitor, info, 'profile-translated-with-fallback')
    await visitor.goto(url)
    const form = visitor.getByRole('region', { name: 'Formulário de contato' })
    await form.getByRole('button', { name: 'Enviar contato', exact: true }).click()
    await expect(form.getByLabel('Nome', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await shot(visitor, info, 'public-contact-validation')
    await form.getByLabel('Nome', { exact: true }).fill('Visitante de demonstração')
    await form.getByLabel('E-mail', { exact: true }).fill('visitor@fixture.test')
    await form.getByLabel('Mensagem', { exact: true }).fill('Olá, gostaria de conhecer a comunidade.')
    let release: () => void = () => undefined
    const gate = new Promise<void>(resolve => { release = resolve })
    await visitor.route('**/bff/v1/profiles/*/contact-form/submissions', async route => { await gate; await route.fulfill({ status: 503, json: { message: 'Sem conexão. Tente novamente.' } }) })
    await form.getByRole('button', { name: 'Enviar contato', exact: true }).click()
    await expect(form.getByRole('button', { name: 'Enviar contato', exact: true })).toBeDisabled()
    await shot(visitor, info, 'public-contact-pending', 'presentation-fixture')
    release()
    await expect(form.getByRole('alert')).toBeVisible()
    await shot(visitor, info, 'public-contact-error', 'presentation-fixture')
    await visitor.unroute('**/bff/v1/profiles/*/contact-form/submissions')
    await form.getByRole('button', { name: 'Enviar contato', exact: true }).click()
    await expect(visitor.getByText('Sua mensagem foi recebida.', { exact: true })).toBeVisible()
    await shot(visitor, info, 'public-contact-success')
    expect((await roadmapApi(visitor, '/me/forms/submissions')).status).toBe(401)
    await visitor.goto(url + '?q=a&q=b')
    await expect(visitor.getByRole('main').getByRole('alert')).toBeVisible()
    await shot(visitor, info, 'profile-invalid-query')
    await visitor.goto(url)
    let finishSearch: () => void = () => undefined
    const pendingSearch = new Promise<void>(resolve => { finishSearch = resolve })
    await visitor.route('**/bff/v1/profiles/' + fixture.profileSlug + '/items?**', async route => { await pendingSearch; await route.fulfill({ status: 503, json: {} }) })
    await visitor.getByRole('searchbox', { name: 'Buscar nesta página' }).fill('Projeto')
    await expect(visitor.getByRole('article', { name: 'Perfil público', exact: true })).toHaveAttribute('aria-busy', 'true')
    await shot(visitor, info, 'profile-search-pending', 'presentation-fixture')
    finishSearch()
    await expect(visitor.getByRole('main').getByRole('alert')).toBeVisible()
    await shot(visitor, info, 'profile-search-error', 'presentation-fixture')
    await visitor.unroute('**/bff/v1/profiles/' + fixture.profileSlug + '/items?**')
    await visitor.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
    await expect(visitor.getByRole('article', { name: 'Perfil público', exact: true })).not.toHaveAttribute('aria-busy', 'true')
    await shot(visitor, info, 'profile-search-recovered')
  } finally { await context.close() }
})

test('public profile: empty publication and real age restriction', async ({ page }, info) => {
  const fixture = isolatedFixture()
  await login(page, fixture)
  const content = await saveProfile(page, fixture, 'Oceano')
  const empty = { ...content, categories: [], items: [] }
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 1, content: empty })).status).toBe(200)
  const rejected = await roadmapApi(page, '/me/profile/publish', 'POST', { expectedVersion: 2 })
  expect(rejected.status).toBe(422)
  expect(rejected.body.message).toContain('pelo menos um link visível')
  // Publishing still requires a link; pausing every published link is a real empty state.
  grantProfileCapability(fixture, 'profile.scheduling')
  const paused = { ...content, items: content.items.map(item => ({ ...item, schedule: { startsAt: null, endsAt: null, timeZone: 'America/Sao_Paulo', paused: true } })) }
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 2, content: paused })).status).toBe(200)
  await publishProfile(page)
  expect((await roadmapApi(page, '/profiles/' + fixture.profileSlug)).body.items).toHaveLength(0)
  await page.goto(fixture.origin + '/p/' + fixture.profileSlug)
  await expect(page.getByRole('heading', { name: 'Ana Ondas', exact: true })).toBeVisible()
  await shot(page, info, 'profile-empty-publication')
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 3, content: { ...content, requiresAge: true } })).status).toBe(200)
  await publishProfile(page)
  await page.context().clearCookies({ name: 'age' })
  await page.goto(fixture.origin + '/p/' + fixture.profileSlug)
  const dialog = page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ana Ondas', exact: true })).toHaveCount(0)
  await shot(page, info, 'profile-age-protected', 'live', false)
  await dialog.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click()
  await expect(page.getByRole('heading', { name: 'Ana Ondas', exact: true })).toBeVisible()
  await shot(page, info, 'profile-age-confirmed')
})

async function publishReviewedProfile(page: Page, fixture: Fixture, browser: Browser) {
  const current = await roadmapApi(page, '/me/profile')
  const published = await roadmapApi(page, '/me/profile/publish', 'POST', { expectedVersion: current.body.draft.version })
  expect(published.status, JSON.stringify(published.body)).toBe(200)
  if (published.body.review?.status === 'PENDING') {
    // The reviewer is a new account owned exclusively by this local fixture.
    sql(`UPDATE users SET role='ADMIN' WHERE id='${fixture.otherId}' AND "tenantId"='${fixture.tenantId}'`)
    const context = await browser.newContext({ locale: 'pt-BR', reducedMotion: 'reduce' })
    try {
      const reviewer = await context.newPage()
      observe(reviewer)
      await login(reviewer, fixture, true)
      const decision = await roadmapApi(reviewer, '/admin/content-reviews/' + published.body.review.id + '/decision', 'POST', { decision: 'APPROVE' })
      expect(decision.status, JSON.stringify(decision.body)).toBe(200)
      expect(pageErrors.get(reviewer) ?? []).toEqual([])
    } finally { await context.close() }
  }
  expect((await roadmapApi(page, '/me/profile')).body.publishedVersion).toBe(current.body.draft.version)
}

test('public rich publication: real photo, banner, text, image, video consent and event states', async ({ page, browser }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture()
  await login(page, fixture)
  await saveProfile(page, fixture, 'Pêssego')
  grantRichBlocks(fixture)
  const photo = (await homeCards(page)).find(card => card.imageUrl)
  expect(photo, 'Use an approved existing cover, never invent an attachment').toBeTruthy()
  const imageResponse = await page.request.get(new URL(photo!.imageUrl!.replace('/api/', '/bff/'), publicOrigin).toString())
  expect(imageResponse.status()).toBe(200)
  const imageBytes = await imageResponse.body(), imageType = imageResponse.headers()['content-type'].split(';')[0]
  const assetId = await uploadVisualProfilePhoto(page, fixture, { bytes: imageBytes, mime: imageType })
  const current = await roadmapApi(page, '/me/profile'), { version, ...content } = current.body.draft
  const groupId = content.categories[0].id as string
  const event = (label: string, startsAt: string, endsAt: string, state: 'SCHEDULED' | 'CANCELLED') => ({ id: randomUUID(), categoryId: groupId, type: 'URL', label, destination: 'https://example.com/f12-a', visible: true, event: { description: 'Encontro da comunidade para trocar ideias e referências.', startsAt, endsAt, timeZone: 'America/Sao_Paulo', location: 'Online', state } })
  content.appearance = { ...content.appearance, coverStyle: 'banner' }
  content.contentBlocks = [
    { id: randomUUID(), visible: true, title: 'Sobre a comunidade', type: 'TEXT', body: 'Um espaço para compartilhar projetos, aprender e conhecer outras pessoas. Cada descoberta abre uma conversa.' },
    { id: randomUUID(), visible: true, title: 'Nossa inspiração', type: 'IMAGE', assetId, alt: photo!.imageAlt || 'Imagem pública de demonstração', caption: 'Capa aprovada da fixture, preparada pelo upload real do perfil.' },
    { id: randomUUID(), visible: true, title: 'Vídeo da comunidade', type: 'VIDEO', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
  ]
  content.items.push(event('Próximo encontro', '2030-06-12T17:00:00.000Z', '2030-06-12T19:00:00.000Z', 'SCHEDULED'), event('Encontro cancelado', '2030-06-13T17:00:00.000Z', '2030-06-13T19:00:00.000Z', 'CANCELLED'), event('Encontro anterior', '2020-06-12T17:00:00.000Z', '2020-06-12T19:00:00.000Z', 'SCHEDULED'))
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: version, content })).status).toBe(200)
  await publishReviewedProfile(page, fixture, browser)
  await page.goto(fixture.origin + '/p/' + fixture.profileSlug)
  await expect(page.getByRole('img', { name: photo!.imageAlt || 'Imagem pública de demonstração', exact: true })).toBeVisible()
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible()
  await expect(page.getByText('Encerrado', { exact: true })).toBeVisible()
  await shot(page, info, 'profile-rich-blocks-events-and-banner')
  await page.getByRole('button', { name: 'Carregar vídeo', exact: true }).focus()
  await shot(page, info, 'profile-video-consent-focus')
  const localPlayerUrl = 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ'
  let playerRequests = 0
  await page.route('https://www.youtube-nocookie.com/embed/**', route => { playerRequests++; return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="pt-BR"><head><title>Player local de teste</title></head><body style="margin:0;background:#071b2b;color:#effbff;display:grid;place-items:center;min-height:100vh;font:16px sans-serif">Player local: nenhum provedor externo foi carregado.</body></html>' }) })
  const playerResponse = page.waitForResponse(response => response.url() === localPlayerUrl)
  await page.keyboard.press('Enter')
  await expect(page.locator('iframe[title="Vídeo da comunidade"]')).toBeVisible()
  expect((await playerResponse).status()).toBe(200)
  expect(playerRequests, 'The player must reach the local HTML fixture after consent').toBe(1)
  await expect(page.locator('iframe[title="Vídeo da comunidade"]')).toHaveAttribute('src', localPlayerUrl)
  await expect(page.frameLocator('iframe[title="Vídeo da comunidade"]').getByText('Player local: nenhum provedor externo foi carregado.', { exact: true })).toBeVisible()
  await shot(page, info, 'profile-video-loaded-local-player', 'presentation-fixture')
  await expect(page.frameLocator('iframe[title="Vídeo da comunidade"]').getByText('Player local: nenhum provedor externo foi carregado.', { exact: true })).toBeVisible()
  const player = page.locator('iframe[title="Vídeo da comunidade"]')
  await player.evaluate(frame => frame.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await expect(player).toBeInViewport({ ratio: 1 })
  await shot(page, info, 'video-local-player-viewport', 'presentation-fixture', false)
  await expect(page.frameLocator('iframe[title="Vídeo da comunidade"]').getByText('Player local: nenhum provedor externo foi carregado.', { exact: true })).toBeVisible()
})

test('public directory: real published card, empty, loading, failure and retry', async ({ page }, info) => {
  const fixture = isolatedFixture()
  await login(page, fixture)
  await saveProfile(page, fixture)
  await publishProfile(page)
  expect((await roadmapApi(page, '/me/profile/discovery', 'PATCH', { expectedVersion: 0, enabled: true, nicheId: null })).status).toBe(200)
  const directory = await roadmapApi(page, '/profiles')
  expect(directory.status).toBe(200)
  const projection = { ...directory.body, profiles: directory.body.profiles.filter((profile: { slug: string }) => profile.slug === fixture.profileSlug), nextCursor: null }
  expect(projection.profiles).toHaveLength(1)
  await page.route('**/bff/v1/profiles?**', route => route.fulfill({ json: projection }))
  await page.goto(fixture.origin + '/paginas')
  await expect(page.getByRole('article')).toHaveCount(1)
  await shot(page, info, 'directory-populated-fixture-projection', 'presentation-fixture')
  await page.unroute('**/bff/v1/profiles?**')
  let release: () => void = () => undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/profiles?**', async route => { await gate; await route.fulfill({ status: 503, json: {} }) })
  await page.getByLabel('Buscar páginas', { exact: true }).fill('indisponível')
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
  await shot(page, info, 'directory-pending', 'presentation-fixture')
  release()
  await expect(page.getByRole('region', { name: 'Descoberta de páginas' }).getByRole('alert')).toBeVisible()
  await shot(page, info, 'directory-error', 'presentation-fixture')
  await page.unroute('**/bff/v1/profiles?**')
  await page.route('**/bff/v1/profiles?**', route => route.fulfill({ json: { ...projection, profiles: [] } }))
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
  await expect(page.getByText('Nenhuma página encontrada. Tente outro nome ou categoria.', { exact: true })).toBeVisible()
  await shot(page, info, 'directory-empty', 'presentation-fixture')
  await page.unroute('**/bff/v1/profiles?**')
  let finish: () => void = () => undefined
  const initialGate = new Promise<void>(resolve => { finish = resolve })
  await page.route('**/bff/v1/profiles?**', async route => { await initialGate; await route.fulfill({ json: projection }) })
  await page.getByLabel('Buscar páginas', { exact: true }).fill('Ana')
  await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
  await shot(page, info, 'directory-empty-loading-skeleton', 'presentation-fixture')
  finish()
  await expect(page.getByRole('article')).toHaveCount(1)
  await shot(page, info, 'directory-recovered', 'presentation-fixture')
})

test('public resources: campaign, media kit, channels, age, unavailable and unpublished states', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture()
  await login(page, fixture)
  await saveProfile(page, fixture, 'Botânico')
  const target = await redirect(page, 'Canal da comunidade')
  const groupId = randomUUID(), channelId = randomUUID()
  expect((await roadmapApi(page, '/me/profile/channel-groups/' + groupId, 'PUT', { name: 'Participe da comunidade', visible: true, expectedVersion: 1, channels: [{ id: channelId, label: 'Abrir comunidade', networkId: null, destinationRevisionId: target.destinationRevision.id, paused: false }] })).status).toBe(200)
  await publishProfile(page)
  grantProfileCapability(fixture, 'profile.analytics')
  const sources = await roadmapApi(page, '/me/profile/campaign-sources'), revisionId = sources.body.revisions[0].id as string
  const revision = await roadmapApi(page, '/me/profile/campaign-sources/' + revisionId)
  const campaign = await roadmapApi(page, '/me/profile/campaigns', 'POST', { name: 'Campanha Ondas', slug: fixture.campaignSlug, sourceRevisionId: revisionId, itemSelection: [revision.body.content.items.find((item: { type: string }) => item.type === 'URL').id] })
  expect(campaign.status).toBe(200)
  expect((await roadmapApi(page, '/me/profile/campaigns/' + campaign.body.id + '/publish', 'POST', { expectedVersion: campaign.body.version })).status).toBe(200)
  const kit = await roadmapApi(page, '/me/profile/media-kit', 'PATCH', { expectedVersion: 0, content: { publicFields: { showBio: true, showPhoto: true, contactIds: [] }, metricSelections: [], manualMetrics: [{ platform: 'INSTAGRAM', value: 12500, asOf: '2026-10-18' }] } })
  expect(kit.status).toBe(200)
  expect((await roadmapApi(page, '/me/profile/media-kit/publish', 'POST', { expectedVersion: kit.body.version })).status).toBe(200)
  for (const [route, state] of [[`/p/${fixture.profileSlug}`, 'profile-public-channels'], [`/p/${fixture.profileSlug}/c/${fixture.campaignSlug}`, 'campaign-public'], [`/p/${fixture.profileSlug}/midia-kit`, 'media-kit-public']] as const) {
    await page.goto(fixture.origin + route)
    await expect(page.getByRole('heading', { name: 'Ana Ondas', exact: true })).toBeVisible()
    await shot(page, info, state)
  }
  const link = page.getByRole('link', { name: 'Site: Abrir comunidade', exact: true })
  await page.goto(fixture.origin + '/p/' + fixture.profileSlug)
  const channelHref = await link.getAttribute('href')
  expect(channelHref).toBeTruthy()
  expect((await roadmapApi(page, '/me/redirects/' + target.id + '/disable', 'POST', { expectedRevision: target.version })).status).toBe(200)
  await page.goto(new URL(channelHref!, fixture.origin).toString())
  await expect(page.getByRole('heading', { name: 'Canal indisponível', exact: true })).toBeVisible()
  await shot(page, info, 'channel-unavailable')
  await page.goto(fixture.origin + '/p/' + fixture.profileSlug + '/canais/estado?idade=1')
  await expect(page.getByRole('heading', { name: 'Confirme sua idade', exact: true })).toBeVisible()
  await shot(page, info, 'channel-age-prompt')
  await page.goto(fixture.origin + '/r/' + target.id + '/estado')
  await expect(page.getByRole('heading', { name: 'Link permanente indisponível', exact: true })).toBeVisible()
  await shot(page, info, 'redirect-unavailable')
  await page.goto(fixture.origin + '/r/' + target.id + '/estado?idade=1')
  await expect(page.getByRole('heading', { name: 'Confirme sua idade', exact: true })).toBeVisible()
  await shot(page, info, 'redirect-age-prompt')
  for (const [route, state] of [[`/p/${fixture.profileSlug}/c/not-published`, 'campaign-not-found'], ['/p/ondas-not-published', 'profile-not-found'], ['/p/ondas-not-published/midia-kit', 'media-kit-not-found']] as const) {
    await page.goto(fixture.origin + route)
    await expect(page.getByRole('heading', { name: 'Não encontrado', exact: true })).toBeVisible()
    await shot(page, info, state)
  }
})

test('public collection and ownership: populated, empty, protected, private, verified and revoked', async ({ page, request }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture()
  await login(page, fixture)
  const linkId = randomUUID(), collectionId = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${linkId}','${fixture.tenantId}','${fixture.otherId}','https://example.com/ondas','Comunidade Ondas','Encontros e materiais de estudo',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  const favorite = await roadmapApi(page, '/me/favorites/' + linkId, 'PUT')
  expect(favorite.status).toBe(200)
  expect((await roadmapApi(page, '/me/collections', 'POST', { id: collectionId, name: 'Estudos Ondas' })).status).toBe(200)
  expect((await roadmapApi(page, '/me/collections/' + collectionId + '/items/' + favorite.body.favoriteId, 'PUT', { expectedVersion: 0 })).status).toBe(200)
  const currentCollection = await roadmapApi(page, '/me/collections/' + collectionId)
  const collection = await roadmapApi(page, '/me/collections/' + collectionId + '/publish', 'POST', { expectedVersion: currentCollection.body.collection.version, slug: fixture.collectionSlug, title: 'Estudos Ondas', description: 'Uma seleção para aprender e compartilhar.', curator: 'Ana Curadora', requiresAge: false })
  expect(collection.status, JSON.stringify(collection.body)).toBe(200)
  await page.goto(fixture.origin + '/colecoes/' + fixture.collectionSlug)
  await expect(page.getByRole('heading', { name: 'Estudos Ondas', exact: true })).toBeVisible()
  await shot(page, info, 'collection-populated')
  sql(`UPDATE links SET status='UNAVAILABLE' WHERE id='${linkId}' AND "tenantId"='${fixture.tenantId}'`)
  await page.reload()
  await expect(page.getByText('Sem links disponíveis no momento.', { exact: true })).toBeVisible()
  await shot(page, info, 'collection-empty')
  sql(`UPDATE links SET status='PUBLISHED' WHERE id='${linkId}' AND "tenantId"='${fixture.tenantId}'`)
  const protectedCollection = await roadmapApi(page, '/me/collections/' + collectionId)
  expect((await roadmapApi(page, '/me/collections/' + collectionId + '/publish', 'POST', { expectedVersion: protectedCollection.body.collection.version, slug: fixture.collectionSlug, title: 'Estudos Ondas', description: 'Uma seleção para aprender e compartilhar.', curator: 'Ana Curadora', requiresAge: true })).status).toBe(200)
  await page.goto(fixture.origin + '/colecoes/' + fixture.collectionSlug)
  const age = page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })
  await expect(age).toBeVisible()
  await shot(page, info, 'collection-age-protected', 'live', false)
  await age.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click()
  await expect(page.getByRole('heading', { name: 'Estudos Ondas', exact: true })).toBeVisible()
  await shot(page, info, 'collection-age-confirmed')
  await page.goto(fixture.origin + '/colecoes/ondas-not-published')
  await expect(page.getByRole('heading', { name: 'Não encontrado', exact: true })).toBeVisible()
  await shot(page, info, 'collection-private-not-found')
  const target = await redirect(page, 'Comprovação da comunidade')
  const challenge = await roadmapApi(page, '/me/redirects/' + target.id + '/ownership/challenges', 'POST', { revisionId: target.destinationRevision.id })
  expect(challenge.status).toBe(200)
  expect((await request.put(runtime.stubOrigin + '/ownership-file', { data: challenge.body.content })).status()).toBe(200)
  expect((await roadmapApi(page, '/me/redirects/' + target.id + '/ownership/verify', 'POST', { challengeId: challenge.body.id })).status).toBe(200)
  await page.goto(fixture.origin + '/verificacao/' + target.id)
  await expect(page.getByText('Controle do domínio comprovado', { exact: true })).toBeVisible()
  expect(await page.content()).not.toContain(challenge.body.content)
  await shot(page, info, 'ownership-verified')
  expect((await roadmapApi(page, '/me/redirects/' + target.id + '/ownership', 'DELETE')).status).toBe(200)
  await page.reload()
  await expect(page.getByText('Nenhuma comprovação válida para este destino.', { exact: true })).toBeVisible()
  await shot(page, info, 'ownership-revoked')
})

test('public invitation and unsubscribe: missing, invalid, pending, error and confirmed', async ({ page }, info) => {
  const fixture = isolatedFixture()
  await login(page, fixture)
  await page.goto(fixture.origin + '/equipe/convite')
  await expect(page.getByRole('button', { name: 'Aceitar convite', exact: true })).toBeDisabled()
  await shot(page, info, 'invitation-missing-token')
  await page.goto(fixture.origin + '/equipe/convite?token=visual-invalid')
  await page.getByRole('button', { name: 'Aceitar convite', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await shot(page, info, 'invitation-invalid-token')
  await page.goto(fixture.origin + '/resumos/cancelar')
  await expect(page.getByRole('button', { name: 'Parar resumos', exact: true })).toBeDisabled()
  await shot(page, info, 'unsubscribe-missing-token')
  await page.goto(fixture.origin + '/resumos/cancelar?token=visual-invalid')
  await page.getByRole('button', { name: 'Parar resumos', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await shot(page, info, 'unsubscribe-invalid-token')
  const token = randomBytes(32).toString('hex'), digest = createHash('sha256').update('niche-digest-unsubscribe.v1\0' + token).digest('hex')
  sql(`INSERT INTO niche_digest_batches(id,"tenantId","userId",status,attempts,"nextAttemptAt","createdAt","tokenHash",fingerprint,"linkIds") VALUES('${randomUUID()}','${fixture.tenantId}','${fixture.ownerId}','SKIPPED',0,now()+interval '1 day',now(),'${digest}','visual-unsubscribe',ARRAY[]::text[])`)
  await page.goto(fixture.origin + '/resumos/cancelar?token=' + token)
  await shot(page, info, 'unsubscribe-confirmation')
  let release: () => void = () => undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/niche-digests/unsubscribe', async route => { await gate; await route.fulfill({ status: 503, json: { message: 'Sem conexão. Tente novamente.' } }) })
  await page.getByRole('button', { name: 'Parar resumos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Parar resumos', exact: true })).toBeDisabled()
  await shot(page, info, 'unsubscribe-pending', 'presentation-fixture')
  release()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await shot(page, info, 'unsubscribe-error', 'presentation-fixture')
  await page.unroute('**/bff/v1/niche-digests/unsubscribe')
  await page.getByRole('button', { name: 'Parar resumos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resumos desativados', exact: true })).toBeVisible()
  expect(page.url()).not.toContain('token=')
  await shot(page, info, 'unsubscribe-confirmed')
})

test('public invitation: real token, sign-in requirement, pending, failed request and accepted', async ({ page, browser }, info) => {
  const fixture = isolatedFixture()
  await login(page, fixture)
  await saveProfile(page, fixture)
  const team = await roadmapApi(page, '/me/profile/team')
  expect(team.status).toBe(200)
  const invitation = await roadmapApi(page, '/me/profile/invitations', 'POST', { resourceId: team.body.resourceId, email: fixture.other, role: 'EDITOR', requestKey: randomUUID() })
  expect(invitation.status).toBe(200)
  expect(invitation.body.token).toBeTruthy()
  const url = fixture.origin + '/equipe/convite?token=' + encodeURIComponent(invitation.body.token)
  const context = await browser.newContext({ viewport: page.viewportSize()!, locale: 'pt-BR', reducedMotion: 'reduce', isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch) })
  try {
    await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: fixture.host, path: '/' }])
    const visitor = await context.newPage()
    observe(visitor)
    await visitor.goto(url)
    await expect(visitor.getByRole('button', { name: 'Aceitar convite', exact: true })).toBeEnabled()
    await shot(visitor, info, 'invitation-valid-token')
    await visitor.getByRole('button', { name: 'Aceitar convite', exact: true }).click()
    await expect(visitor.getByLabel('E-mail', { exact: true })).toBeVisible()
    await shot(visitor, info, 'invitation-sign-in-required')
    await login(visitor, fixture, true)
    await visitor.goto(url)
    let release: () => void = () => undefined
    const gate = new Promise<void>(resolve => { release = resolve })
    await visitor.route('**/bff/v1/invitations/accept', async route => { await gate; await route.fulfill({ status: 503, json: { message: 'Sem conexão. Tente novamente.' } }) })
    await visitor.getByRole('button', { name: 'Aceitar convite', exact: true }).click()
    await expect(visitor.getByRole('button', { name: 'Aceitar convite', exact: true })).toBeDisabled()
    await shot(visitor, info, 'invitation-pending', 'presentation-fixture')
    release()
    await expect(visitor.getByRole('main').getByRole('alert')).toBeVisible()
    await shot(visitor, info, 'invitation-request-error', 'presentation-fixture')
    await visitor.unroute('**/bff/v1/invitations/accept')
    await visitor.getByRole('button', { name: 'Aceitar convite', exact: true }).click()
    await expect(visitor.getByText('Convite aceito.', { exact: true })).toBeVisible()
    await shot(visitor, info, 'invitation-accepted')
  } finally { await context.close() }
})

for (const [route, state] of [
  ['/dev/homes', 'reference-gallery'], ['/dev/home-preview', 'reference-home-legacy'],
  ['/dev/home-preview/link/frequencia-indie', 'reference-detail-legacy'],
  ['/dev/homes/ondas', 'reference-ondas-home'], ['/dev/homes/ondas/link/frequencia-indie', 'reference-ondas-detail'],
  ...directionIds.filter(id => id !== 'ondas').map(id => ['/dev/homes/' + id, 'reference-direction-' + id] as const),
] as const) test('development reference: ' + state, async ({ page }, info) => {
  await page.goto(new URL(route, devOrigin).toString())
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await shot(page, info, state, 'reference')
})
