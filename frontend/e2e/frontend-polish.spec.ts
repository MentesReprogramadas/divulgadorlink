import { expect, test } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expectSelected, selectOption } from './select-control'

const origin = runtime.web('tenant-a.localhost')
type Metrics = { lcp: number; cls: number; longTasks: number; longTaskTime: number; interactionMax: number }
declare global { interface Window { frontendLab: Metrics } }

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
})

test('laboratório local: carregamento, estabilidade e resposta durante uso', async ({ page }, info) => {
  test.setTimeout(120_000)
  sql(`UPDATE links SET "languageTag"='pt' WHERE name='Receitas'`)
  await page.addInitScript(() => {
    window.frontendLab = { lcp: 0, cls: 0, longTasks: 0, longTaskTime: 0, interactionMax: 0 }
    let session = 0, first = 0, last = 0
    type Entry = PerformanceEntry & { hadRecentInput?: boolean; value?: number; interactionId?: number }
    for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask', 'event']) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
      const observer = new PerformanceObserver(list => {
        for (const item of list.getEntries() as Entry[]) {
          if (type === 'largest-contentful-paint') window.frontendLab.lcp = item.startTime
          if (type === 'layout-shift' && !item.hadRecentInput) {
            if (item.startTime - last > 1000 || item.startTime - first > 5000) { first = item.startTime; session = 0 }
            last = item.startTime; session += item.value ?? 0
            window.frontendLab.cls = Math.max(window.frontendLab.cls, session)
          }
          if (type === 'longtask') { window.frontendLab.longTasks++; window.frontendLab.longTaskTime += item.duration }
          if (type === 'event' && item.interactionId) window.frontendLab.interactionMax = Math.max(window.frontendLab.interactionMax, item.duration)
        }
      })
      const options: PerformanceObserverInit & { durationThreshold?: number } = { type, buffered: true, ...(type === 'event' ? { durationThreshold: 16 } : {}) }
      observer.observe(options)
    }
  })
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await session.send('Network.enable')
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 200_000, uploadThroughput: 75_000 })
  const samples: Array<Metrics & { route: string; sample: number }> = []
  for (const route of ['/?languageTag=pt', '/busca?q=Receitas']) {
    for (let sample = 0; sample < 3; sample++) {
      await page.goto(origin + route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      const input = page.getByRole('combobox', { name: 'Busca', exact: true })
      await input.fill('Receitas')
      await input.press('ArrowDown')
      await input.press('Escape')
      await page.waitForTimeout(200)
      samples.push({ route, sample, ...await page.evaluate(() => window.frontendLab) })
    }
  }
  expect(samples.every(sample => Number.isFinite(sample.lcp) && sample.lcp > 0 && Number.isFinite(sample.cls))).toBe(true)
  await info.attach('local-performance', { body: JSON.stringify({ conditions: { cpu: 4, latencyMs: 100, downloadBytesPerSecond: 200_000, note: 'Interação máxima de laboratório; não equivale ao INP de campo.' }, samples }, null, 2), contentType: 'application/json' })
})

test('formulário recupera cargas, resume erros e preserva dados com storage/rede indisponíveis', async ({ page }, info) => {
  const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { submitter: string; password: string }
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail', { exact: true }).fill(state.submitter)
  await page.getByLabel('Senha', { exact: true }).fill(state.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Painel', exact: true })).toBeVisible()
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem, remove = Storage.prototype.removeItem
    Storage.prototype.setItem = function (key, value) { if (key === 'tla-link-draft') throw new DOMException('blocked'); return write.call(this, key, value) }
    Storage.prototype.removeItem = function (key) { if (key === 'tla-link-draft') throw new DOMException('blocked'); return remove.call(this, key) }
  })
  let unavailable = true
  await page.route('**/bff/v1/home', route => unavailable ? route.fulfill({ status: 503, json: {} }) : route.continue())
  await page.route('**/bff/v1/links/mine?pageSize=24', route => unavailable ? route.abort() : route.continue())
  await page.goto(origin + '/painel/links/novo')
  await expect(page.getByRole('button', { name: 'Recarregar redes e assuntos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Consultar vagas novamente' })).toBeVisible()
  unavailable = false
  await page.getByRole('button', { name: 'Recarregar redes e assuntos' }).click()
  await page.getByRole('button', { name: 'Consultar vagas novamente' }).click()
  await expect(page.getByText(/Vagas em uso: \d+ de 4/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const summary = page.getByRole('region', { name: 'Confira os campos desta etapa' })
  await expect(summary).toBeFocused()
  await summary.getByRole('link', { name: 'Título do link' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Título do link', { exact: true })).toBeFocused()
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(axe.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([])
  await page.screenshot({ path: info.outputPath('submission-error-summary.png'), fullPage: true, animations: 'disabled' })
  await page.getByLabel('Título do link', { exact: true }).fill('Rascunho resiliente')
  await page.getByLabel('Link de acesso', { exact: true }).fill('https://example.invalid/resiliente')
  await expect(page.getByText(/Não foi possível salvar o rascunho neste navegador/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await summary.getByRole('link', { name: 'Rede do link' }).click()
  await expect(page.getByRole('combobox', { name: 'Rede do link', exact: true })).toBeFocused()
  await page.getByLabel('Descrição', { exact: true }).fill('Descrição preservada após falha de rede.')
  await selectOption(page.getByRole('combobox', { name: 'Rede do link', exact: true }), { label: 'Site' })
  await selectOption(page.getByRole('combobox', { name: 'Assunto do link', exact: true }), { label: 'Jogos' })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.route('**/bff/v1/links', route => route.abort())
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('Não foi possível conectar. Seu rascunho foi mantido. Tente novamente.')).toBeVisible()
  await page.locator('form[data-layout="submission-form"]').getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Descrição preservada após falha de rede.')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.unroute('**/bff/v1/links')
  await page.route('**/bff/v1/links', route => route.fulfill({ status: 201, json: { id: 'fixture-resiliente', status: 'PENDING_MODERATION' } }))
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Enviado para análise.', exact: true })).toBeVisible()
  await expect(page.getByText('Seu link foi enviado, mas não foi possível apagar o rascunho salvo neste navegador.')).toBeVisible()
})

test('falha real do layout Next usa recuperação independente sem revelar detalhes', async ({ page }, info) => {
  test.skip(process.env.E2E_ROOT_FAILURE_FIXTURE !== '1', 'A injeção de falha existe somente na cópia de validação, fora do código de produção.')
  await page.setExtraHTTPHeaders({ 'x-e2e-root-failure': '1' })
  await page.goto(origin + '/busca')
  await expect(page).toHaveTitle('Falha ao carregar | Tem Link Aqui')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Não foi possível abrir esta página')
  await expect(page.getByRole('banner')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('fixture-root-secret')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(violation => violation.id)).toEqual([])
  await page.screenshot({ path: info.outputPath('global-recovery.png'), fullPage: true, animations: 'disabled' })
  await page.setExtraHTTPHeaders({})
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Buscar', exact: true })).toBeVisible()
})

test('voltar do detalhe preserva lotes e posição do catálogo sem persistir tokens', async ({ page }) => {
  test.setTimeout(90_000)
  sql(`INSERT INTO links (id,"tenantId","canonicalUrl",name,"approvedName",description,"approvedDescription","networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt")
    SELECT 'history-fixture-'||n,l."tenantId",'https://example.invalid/history/'||n,'Histórico '||n,'Histórico '||n,'Descrição de teste','Descrição de teste',l."networkId",l."nicheId",'PUBLISHED',false,true,now()
    FROM (SELECT * FROM links WHERE name='Receitas' LIMIT 1) l CROSS JOIN generate_series(1,55) n ON CONFLICT (id) DO NOTHING`)
  try {
  await page.goto(origin)
  const cards = page.locator('#home-catalog-results article[data-link-id]')
  const initial = await cards.count()
  await page.getByRole('button', { name: 'Mostrar mais', exact: true }).click()
  await expect.poll(() => cards.count()).toBeGreaterThan(initial)
  const count = await cards.count()
  const target = cards.last()
  const name = await target.locator('h3').innerText()
  await target.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => scrollY)
  await target.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
  await page.goBack()
  await expect.poll(() => cards.count()).toBe(count)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(Math.max(0, scroll - 100))
  const state = await page.evaluate(() => JSON.stringify(history.state?.tlaCatalog ?? {}))
  expect(state).not.toMatch(/surfaceToken|signed|description|canonicalUrl/)
  await page.getByText('Localização e preferências', { exact: true }).click()
  const language = page.getByRole('combobox', { name: /^Idioma/ })
  await language.scrollIntoViewIfNeeded()
  const filterScroll = await page.evaluate(() => scrollY)
  await language.click()
  await page.getByRole('option').and(page.locator('[data-value="pt"]')).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('languageTag')).toBe('pt')
  await expect(language).toBeEnabled()
  await expectSelected(language, 'pt')
  await page.goBack()
  await expect.poll(() => cards.count()).toBe(count)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(Math.max(0, filterScroll - 100))
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(filterScroll + 100)
  } finally { sql(`DELETE FROM links WHERE id LIKE 'history-fixture-%'`) }
})
