import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { isolatedFixture, login, visit } from './ondas-visual-fixture'
import { sql } from './db'
import type { BillingState, ProfilePlan } from '../src/features/profile-billing/billing-contract'
import type { PerformanceReport } from '../src/features/promotions/performance-contract'

// Diagnostic against the existing development runtime: no server is started here.
// The API, isolated UUID users and database are the same local review fixtures.
const developmentOrigin = 'http://checklist.localhost:3013'
const base: BillingState = { canCheckout: true, checkoutRequirement: null, capabilities: ['profile.page'], subscription: null, operations: [] }
const plans: ProfilePlan[] = [
  { tier: 'FREE', title: 'Gratuito', versionId: null, amountCents: 0, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.page', label: 'Página pública', delivered: true }] },
  { tier: 'PRO', title: 'Pro', versionId: 'visual-pro', amountCents: 1290, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.analytics', label: 'Estatísticas dos botões', delivered: true }] },
  { tier: 'PREMIUM', title: 'Premium', versionId: 'visual-premium', amountCents: 2490, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.analytics', label: 'Estatísticas dos botões', delivered: true }] },
]

async function observe(page: Page) {
  const errors: Array<{ message: string; stack?: string; url: string }> = [], consoleMessages: Array<{ type: string; text: string; url: string }> = []
  const documents: Array<{ url: string; status: number; html: string }> = []
  page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack, url: page.url() }))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), url: page.url() }) })
  page.on('response', async response => {
    if (response.request().resourceType() !== 'document') return
    try { documents.push({ url: response.url(), status: response.status(), html: await response.text() }) } catch { /* Navigation cancellation is recorded by Playwright's trace. */ }
  })
  await page.addInitScript(() => {
    const samples: Array<Record<string, unknown>> = []
    Object.defineProperty(window, '__ondasHydrationSamples', { value: samples })
    const snapshot = (event: string) => samples.push({
      event, time: performance.now(), readyState: document.readyState,
      path: location.pathname, heading: document.querySelector('h1')?.textContent,
      menuEnabled: document.querySelector<HTMLButtonElement>('button[aria-label="Menu"]')?.disabled === false,
      lenses: [...document.querySelectorAll('[data-optics]')].map(element => element.getAttribute('data-optics')),
      ids: [...document.querySelectorAll('[id]')].map(element => element.id),
      main: document.querySelector('main')?.outerHTML,
    })
    document.addEventListener('DOMContentLoaded', () => snapshot('DOMContentLoaded'), { once: true })
    window.addEventListener('error', () => snapshot('window-error'))
  })
  return { errors, consoleMessages, documents }
}

async function record(page: Page, info: TestInfo, label: string, observed: Awaited<ReturnType<typeof observe>>) {
  const beforeBarrier = { errors: [...observed.errors], consoleMessages: [...observed.consoleMessages] }
  await expect(page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true })).toBeEnabled()
  await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await info.attach(label + '.json', { contentType: 'application/json', body: JSON.stringify({
    url: page.url(), runtime: 'existing-development-3013', hydrationBarrier: { before: beforeBarrier, menuEnabled: true },
    errors: observed.errors, consoleMessages: observed.consoleMessages,
    documents: observed.documents.map(document => ({ url: document.url, status: document.status })),
    earlyDOM: await page.evaluate(() => (window as Window & { __ondasHydrationSamples?: unknown[] }).__ondasHydrationSamples ?? []),
    headings: await page.getByRole('heading').allTextContents(),
  }, null, 2) })
  if (observed.errors.length) {
    await info.attach(label + '-client.html', { contentType: 'text/html', body: await page.content() })
    for (const [index, document] of observed.documents.entries()) await info.attach(label + '-server-' + index + '.html', { contentType: 'text/html', body: document.html })
  }
  expect(observed.errors, label + ': development hydration').toEqual([])
}

test.beforeEach(async ({ page }, info) => {
  await page.setViewportSize({ width: info.project.use.isMobile ? 390 : 1440, height: info.project.use.isMobile ? 844 : 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date('2026-10-24T12:00:00Z'))
})

test('Ondas diagnóstico dev de hidratação: assinatura e recargas dos estados', async ({ page }, info) => {
  test.setTimeout(180_000)
  const fixture = { ...isolatedFixture(), origin: developmentOrigin }
  const observed = await observe(page)
  await login(page, fixture)
  let state: BillingState = base
  await page.route(url => url.pathname === '/bff/v1/me/subscription', route => route.fulfill({ json: state }))
  await page.route(url => url.pathname === '/bff/v1/profile-plans', route => route.fulfill({ json: { plans } }))
  await page.route(url => url.pathname === '/bff/v1/subscriptions/checkout', route => route.fulfill({ status: 503, json: { message: 'Pagamento indisponível. Sua assinatura não foi alterada.' } }))
  await visit(page, fixture, '/painel/assinatura')
  await record(page, info, 'catalog', observed)
  await page.getByRole('article', { name: 'Pro', exact: true }).getByRole('button', { name: 'Assinar plano' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Ir para pagamento' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await page.keyboard.press('Escape')
  for (const status of ['PENDING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'INCOMPLETE', 'REVIEW', 'CANCELED', 'EXPIRED']) {
    state = { ...base, subscription: { id: 'visual-subscription', planVersionId: 'visual-pro', tier: 'PRO', title: 'Pro', status, version: 2, canChange: true, periodStart: '2026-10-01T12:00:00Z', periodEnd: '2026-11-01T12:00:00Z', paidThrough: '2026-11-01T12:00:00Z', cancelAtPeriodEnd: false, reviewReason: status === 'REVIEW' ? 'Conferência pendente' : null, resumeCheckoutUrl: null, hasPaidAccess: status === 'ACTIVE', nextPlan: null } }
    await page.reload(); await record(page, info, status.toLowerCase(), observed)
    if (status === 'ACTIVE') {
      await page.getByRole('article', { name: 'Premium', exact: true }).getByRole('button', { name: 'Trocar no próximo ciclo' }).click()
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Cancelar renovação', exact: true }).click()
      await page.keyboard.press('Escape')
    }
  }
})

test('Ondas diagnóstico dev de hidratação: configurações administrativas', async ({ page }, info) => {
  const fixture = { ...isolatedFixture(), origin: developmentOrigin }
  sql(`UPDATE users SET role='ADMIN' WHERE id='${fixture.otherId}' AND "tenantId"='${fixture.tenantId}'`)
  const observed = await observe(page)
  await login(page, fixture, true)
  const facet = { id: 'visual-facet', name: 'Arte', slug: 'arte', requiresAge: false, isPublicFacet: true, summary: 'Referências e projetos da comunidade.', substantiveCount: 8, indexable: true }
  await page.route(url => url.pathname === '/bff/v1/admin/facets', route => route.fulfill({ json: { niches: [facet], networks: [{ ...facet, id: 'visual-network', name: 'Site', slug: 'site' }] } }))
  await page.route(url => url.pathname === '/bff/v1/admin/settings/impressions', route => route.fulfill({ json: { showImpressions: true } }))
  await page.route(url => url.pathname === '/bff/v1/admin/settings/moderation', route => route.fulfill({ json: { threshold: .8 } }))
  await visit(page, fixture, '/admin/configuracoes')
  await expect(page.getByRole('slider', { name: 'Limiar de aprovação da IA' })).toBeVisible()
  await record(page, info, 'settings-first', observed)
  for (let index = 0; index < 3; index++) {
    await page.reload()
    await expect(page.getByRole('slider', { name: 'Limiar de aprovação da IA' })).toBeVisible()
    await record(page, info, 'settings-reload-' + index, observed)
  }
})

test('Ondas diagnóstico dev de hidratação: resultado e resposta 403', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = { ...isolatedFixture(), origin: developmentOrigin }, id = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${id}','${fixture.tenantId}','${fixture.ownerId}','https://example.com/ondas-hydration','Comunidade de criação','Encontros, referências e projetos compartilhados.',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  const observed = await observe(page)
  await login(page, fixture)
  const totals = { impressions: 1800, clicks: 135, ctr: 7.5, investmentCents: 2900, cpcCents: 32, paidClicks: 90 }
  const report: PerformanceReport = {
    link: { id, name: 'Comunidade de criação' }, from: '2026-10-18', to: '2026-10-24', days: 7, promotionId: null, totals,
    daily: Array.from({ length: 7 }, (_, index) => ({ ...totals, day: '2026-10-' + (18 + index), available: true, highlighted: true })),
    surfaces: [{ ...totals, surface: 'HOME' }],
    coverage: { status: 'COMPLETE', availableFrom: '2026-01-01', investment: 'COMPLETE', currentDayPartial: false }, dataState: 'RECORDED',
    comparison: { from: '2026-10-11', to: '2026-10-17', days: 7, totals, coverage: 'COMPLETE' }, campaigns: [],
  }
  let response: { status: number; body: unknown } = { status: 200, body: report }
  await page.route(url => url.pathname === '/bff/v1/analytics/links/' + id + '/performance', route => route.fulfill({ status: response.status, json: response.body }))
  await visit(page, fixture, '/painel/links/' + id + '/resultado')
  await expect(page.getByRole('region', { name: 'Cliques por dia', exact: true }).locator('.recharts-surface')).toBeVisible()
  await record(page, info, 'performance-recorded', observed)
  for (const [state, body] of [
    ['no-events', { ...report, dataState: 'NO_EVENTS', totals: { impressions: 0, clicks: 0, ctr: 0, investmentCents: null, cpcCents: null, paidClicks: 0 }, daily: [], surfaces: [] }],
    ['partial', { ...report, coverage: { ...report.coverage, status: 'PARTIAL', investment: 'UNLINKED_HISTORY', currentDayPartial: true } }],
    ['outside-retention', { ...report, dataState: 'OUTSIDE_RETENTION', coverage: { ...report.coverage, status: 'UNAVAILABLE' } }],
  ] as const) {
    response = { status: 200, body }; await page.reload()
    await expect(page.getByLabel('Carregando gráficos', { exact: true })).toHaveCount(0)
    await record(page, info, 'performance-' + state, observed)
  }
  for (const status of [400, 403, 503]) {
    response = { status, body: { message: 'Período inválido nesta simulação.' } }; await page.reload()
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
    await record(page, info, 'performance-http-' + status, observed)
  }
})
