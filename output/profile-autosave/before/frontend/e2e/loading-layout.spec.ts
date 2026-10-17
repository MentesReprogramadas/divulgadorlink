import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'

const origin = runtime.web('tenant-a.localhost')
const fixture = () => JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { bia: string; admin: string; password: string; receitas: string }
async function login(page: Page, admin: boolean) {
  const data = fixture()
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail', { exact: true }).fill(admin ? data.admin : data.bia)
  await page.getByLabel('Senha', { exact: true }).fill(data.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Painel', exact: true })).toBeVisible()
}

for (const admin of [false, true]) {
  test(`L01 ${admin ? 'admin' : 'painel'}: skeletons durante rede lenta preservam cabeçalho, largura e controles`, async ({ page }, info) => {
    test.setTimeout(180_000)
    await login(page, admin)
    const id = fixture().receitas
    const routes: Array<[string, string]> = admin ? [
      ['/admin/visao', '/v1/admin/office'], ['/admin/moderacao', '/v1/admin/moderation'], ['/admin/denuncias', '/v1/admin/reports'], ['/admin/disponibilidade', '/v1/admin/url-proposals'], ['/admin/planos', '/v1/promotions/offers'], ['/admin/estornos', '/v1/admin/refunds'], ['/admin/integracoes', '/v1/admin/integrations/evolution/status'], ['/admin/configuracoes', '/v1/admin/facets'],
    ] : [
      ['/painel', '/v1/links/mine'], ['/painel/links', '/v1/links/mine'], ['/painel/pedidos', '/v1/orders/mine'], ['/painel/perfil', '/v1/me/profile'], ['/painel/favoritos', '/v1/me/favorites'], ['/painel/convites', '/v1/me/redirects'], ['/painel/lembretes', '/v1/promotions/mine/reminders'], [`/painel/links/${id}/editar`, '/v1/links/mine'], [`/painel/links/${id}/disponibilidade`, `/v1/links/${id}/availability`], [`/painel/links/${id}/resultado`, `/v1/analytics/links/${id}/performance`], [`/painel/links/${id}/destaque`, '/v1/promotions/offers'], [`/painel/denunciar/${id}`, `/v1/links/${id}`], ['/busca?q=Receitas', '/v1/search'],
    ]
    for (const [url, endpoint] of routes) await test.step(url, async () => {
      let release = () => {}; let intercepted = 0
      const held = new Promise<void>(resolve => { release = resolve })
      await page.route('**/bff/v1/**', async route => {
        if (new URL(route.request().url()).pathname === '/bff' + endpoint) { intercepted++; await held }
        await route.continue()
      })
      try {
        await page.goto(origin + url, { waitUntil: 'domcontentloaded' })
        await expect.poll(() => intercepted).toBeGreaterThan(0)
        await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
        const header = page.locator('header').first()
        const before = await header.boundingBox()
        const formBefore = url.endsWith('/perfil') ? await page.locator('[data-layout="profile-form"]').boundingBox() : null
        if (formBefore) {
          // The profile response determines creation versus group management. Both use
          // the same page width; the loading state cannot assume the draft or its count.
          await expect(page.locator('[data-skeleton] [data-skeleton-block]').first()).toBeVisible()
          await expect(page.locator('[data-skeleton] input:not(:disabled)')).toHaveCount(0)
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
        const name = url.split('?')[0].replaceAll('/', '-').replace(id, 'link').slice(1)
        await page.screenshot({ path: info.outputPath(name + '-loading.png'), fullPage: true, animations: 'disabled' })
        if (url.endsWith('/perfil') || url.endsWith('/configuracoes')) {
          const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
          expect(result.violations.map(v => v.id)).toEqual([])
        }
        release()
        await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
        const after = await header.boundingBox()
        expect(after).toEqual(before)
        if (formBefore) {
          const formAfter = await page.locator('[data-layout="profile-form"]').boundingBox()
          expect(formAfter!.x).toBe(formBefore.x)
          expect(formAfter!.width).toBe(formBefore.width)
        }
        await page.screenshot({ path: info.outputPath(name + '-ready.png'), fullPage: true, animations: 'disabled' })
      } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
    })
  })
}

test('L02 atualização da disponibilidade mantém o conteúdo e bloqueia atualização duplicada', async ({ page }) => {
  await login(page, false)
  await page.goto(origin + `/painel/links/${fixture().receitas}/disponibilidade`)
  await expect(page.getByText('Histórico de correções', { exact: true })).toBeVisible()
  let release = () => {}; let received = false
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/links/*/availability', async route => { received = true; await held; await route.continue() })
  try {
    const refresh = page.getByRole('button', { name: 'Atualizar dados', exact: true })
    await refresh.click()
    await expect.poll(() => received).toBe(true)
    await expect(refresh).toBeDisabled()
    await expect(page.getByText('Histórico de correções', { exact: true })).toBeVisible()
    await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
    release()
    await expect(refresh).toBeEnabled()
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
})

test('L03 envio mantém a dimensão do botão e os campos enquanto aguarda a resposta', async ({ page }) => {
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail', { exact: true }).fill(fixture().bia)
  await page.getByLabel('Senha', { exact: true }).fill(fixture().password)
  let release = () => {}; let received = false
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/auth/login', async route => { received = true; await held; await route.continue() })
  try {
    const button = page.getByRole('button', { name: 'Entrar', exact: true })
    const before = await button.boundingBox()
    await button.click(); await expect.poll(() => received).toBe(true)
    await expect(button).toBeDisabled()
    expect(await button.boundingBox()).toEqual(before)
    await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(fixture().bia)
    release()
    await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
})

test('L04 sessão lenta preserva a geometria do formulário de publicar e respeita movimento reduzido', async ({ page }, info) => {
  await login(page, false)
  await page.addInitScript(() => sessionStorage.removeItem('catalogo.session'))
  let release = () => {}; let received = false
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/auth/session', async route => { received = true; await held; await route.continue() })
  try {
    await page.goto(origin + '/painel/links/novo', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => received).toBe(true)
    await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const before = await page.locator('[data-layout="submission-form"]').boundingBox()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.locator('[data-skeleton-block]').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    await page.screenshot({ path: info.outputPath('submission-session-loading.png'), fullPage: true, animations: 'disabled' })
    release()
    await expect(page.getByLabel('Título do link', { exact: true })).toBeVisible()
    await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
    const after = await page.locator('[data-layout="submission-form"]').boundingBox()
    expect(after!.x).toBe(before!.x)
    expect(after!.y).toBe(before!.y)
    expect(after!.width).toBe(before!.width)
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(2)
    await page.screenshot({ path: info.outputPath('submission-session-ready.png'), fullPage: true, animations: 'disabled' })
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
})


test('L05 navegação entre abas mostra somente o skeleton de destino, sem a visão geral', async ({ page }, info) => {
  await login(page, false)
  await expect(page.getByRole('heading', { name: 'O que você quer fazer?', exact: true })).toBeVisible()
  let release = () => {}; let received = false
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/orders/mine', async route => { received = true; await held; await route.continue() })
  await page.evaluate(() => {
    const samples: string[] = []
    Object.assign(window, { navigationSamples: samples })
    new MutationObserver(() => {
      const main = document.querySelector('main')
      if (main?.querySelector('h1')?.textContent === 'Meus pedidos') samples.push(main.textContent ?? '')
    }).observe(document.body, { childList: true, subtree: true, characterData: true })
  })
  try {
    if (info.project.name.includes('mobile')) await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.locator('nav[aria-label="Áreas do painel"]:visible').getByRole('link', { name: 'Pedidos', exact: true }).click()
    await expect.poll(() => received).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meus pedidos')
    await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
    const samples = await page.evaluate(() => (window as Window & { navigationSamples?: string[] }).navigationSamples ?? [])
    expect(samples.length).toBeGreaterThan(0)
    expect(samples.join(' ')).not.toMatch(/O que você quer fazer|Precisa de atenção/)
    release()
    await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
})

test('L06 menu do site usa uma coluna no catálogo e busca e duas no painel e admin', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, true)
  for (const [url, columns] of [['/', 1], ['/busca', 1], ['/painel', 2], ['/admin/visao', 2]] as const) {
    await page.goto(origin + url)
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const nav = page.getByRole('navigation', { name: 'Navegação do site', exact: true })
    await expect(nav).toHaveAttribute('data-columns', String(columns))
    expect(await nav.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns)
    await page.screenshot({ path: info.outputPath('sidebar-' + (url.replaceAll('/', '-') || 'catalog') + '.png'), animations: 'disabled' })
    await page.keyboard.press('Escape')
  }
})
