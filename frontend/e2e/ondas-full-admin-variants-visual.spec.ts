import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { captureOndasState } from './ondas-visual-capture'
import { captureDialogRemainder } from './ondas-admin-visual-tools'
import { isolatedFixture, login, visit, type Fixture } from './ondas-visual-fixture'
import { sql } from './db'
import { selectOption } from './select-control'
import type { BillingState, ProfilePlan } from '../src/features/profile-billing/billing-contract'
import type { PerformanceReport } from '../src/features/promotions/performance-contract'
import type { ReportQueueRow } from '../src/features/moderation/report-contract'

// Only the fields consumed by the administrative review view; importing the
// application-wide ProfileContent also imports aliases outside e2e/tsconfig.
type ProfileReviewFixture = {
  slug: string; name: string; bio: string; avatarAssetId: null; requiresAge: boolean; primaryItemId: string | null
  categories: Array<{ id: string; name: string; visible: boolean }>
  items: Array<{ id: string; categoryId: string; label: string; type: 'URL' | 'CATALOG'; destination: string; visible: boolean }>
  buttonTest: { blockId: string; labels: [string, string]; samplePerVariant: number; durationDays: 7 | 14 | 28 }
  translations: { primaryLocale: 'pt-BR'; entries: Array<{ locale: 'en'; name: string; bio: string; categories: Record<string, string>; items: Record<string, string> }> }
}

const when = '2026-10-24T12:00:00Z'
const raster = readFileSync(path.resolve(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png'))
const image = 'data:image/png;base64,' + raster.toString('base64')

test.beforeEach(async ({ page }, info) => {
  await page.setViewportSize({ width: info.project.use.isMobile ? 390 : 1440, height: info.project.use.isMobile ? 844 : 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date(when))
})

async function respond(page: Page, pathname: string, body: unknown, status = 200, method = 'GET') {
  const current = { body, status }
  let held = false, gate = Promise.resolve(), release = () => {}
  await page.route(url => url.pathname === '/bff/v1' + pathname, async route => {
    if (route.request().method() !== method) { await route.fallback(); return }
    if (held) await gate
    await route.fulfill({ status: current.status, json: current.body })
  })
  return {
    set(next: unknown, code = 200) { current.body = next; current.status = code },
    hold() { held = true; gate = new Promise<void>(resolve => { release = resolve }); return () => { held = false; release() } },
  }
}

async function capture(page: Page, info: TestInfo, state: string, modal = false) {
  const route = new URL(page.url()).pathname.replace(/\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}(?=\/|$)/gi, '/[id]')
  await captureOndasState(page, info, { route, state, source: 'presentation-fixture', fullPage: !modal })
  if (modal) await captureDialogRemainder(page, info, route, state, { dialog: page.locator('dialog[open]').last() })
}

async function ready(page: Page) {
  await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0, { timeout: 60_000 })
}

async function session(page: Page, admin = false) {
  const fixture = isolatedFixture()
  if (admin) sql(`UPDATE users SET role='ADMIN' WHERE id='${fixture.otherId}' AND "tenantId"='${fixture.tenantId}'`)
  await login(page, fixture, admin); await ready(page)
  return fixture
}

async function link(fixture: Fixture) {
  const id = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${id}','${fixture.tenantId}','${fixture.ownerId}','https://example.com/ondas-variants','Comunidade de criação','Projetos e encontros da comunidade.',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  return id
}

const plans: ProfilePlan[] = [
  { tier: 'FREE', title: 'Gratuito', versionId: null, amountCents: 0, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.page', label: 'Página pública', delivered: true }] },
  { tier: 'PRO', title: 'Pro', versionId: 'visual-pro', amountCents: 1290, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.analytics', label: 'Estatísticas dos botões', delivered: true }] },
  { tier: 'PREMIUM', title: 'Premium', versionId: 'visual-premium', amountCents: 2490, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.richBlocks', label: 'Blocos de conteúdo', delivered: true }] },
]

test('Ondas variantes de assinatura: renovação, troca, processamento e atualização', async ({ page }, info) => {
  const fixture = await session(page)
  const active: BillingState = { canCheckout: true, checkoutRequirement: null, capabilities: ['profile.page', 'profile.analytics'], operations: [], subscription: { id: 'visual-subscription', planVersionId: 'visual-pro', tier: 'PRO', title: 'Pro', status: 'ACTIVE', version: 2, canChange: true, periodStart: '2026-10-01T12:00:00Z', periodEnd: '2026-11-01T12:00:00Z', paidThrough: '2026-11-01T12:00:00Z', cancelAtPeriodEnd: false, reviewReason: null, resumeCheckoutUrl: null, hasPaidAccess: true, nextPlan: null } }
  const state = await respond(page, '/me/subscription', active)
  const catalog = await respond(page, '/profile-plans', { plans })
  await respond(page, '/me/subscription/reconcile', { message: 'Não foi possível conferir agora. A situação anterior foi preservada.' }, 503, 'POST')
  const cancellation = await respond(page, '/me/subscription/cancel', { message: 'Cancelamento indisponível. Tente novamente.' }, 503, 'POST')
  await respond(page, '/me/billing-operations/visual-operation', { id: 'visual-operation', kind: 'CANCEL', state: 'PENDING', checkoutUrl: null, message: null })
  for (const [name, body] of [
    ['renewal-canceled', { ...active, subscription: { ...active.subscription!, cancelAtPeriodEnd: true } }],
    ['scheduled-change', { ...active, subscription: { ...active.subscription!, nextPlan: { tier: 'PREMIUM', title: 'Premium' } } }],
    ['existing-operation', { ...active, operations: [{ id: 'visual-existing', kind: 'CHANGE', state: 'PENDING' }] }],
    ['resume-payment', { ...active, subscription: { ...active.subscription!, status: 'PENDING', hasPaidAccess: false, resumeCheckoutUrl: 'https://checkout.stripe.com/c/pay/visual-local-do-not-open' } }],
  ] as const) {
    state.set(body); await visit(page, fixture, '/painel/assinatura'); await ready(page)
    await capture(page, info, 'subscription-variant-' + name)
  }
  catalog.set({ plans: [plans[0], { ...plans[1], available: false, amountCents: null, capabilities: [{ key: 'profile.analytics', label: 'Estatísticas dos botões', delivered: false }] }, plans[2]] })
  state.set(active); await page.reload(); await ready(page)
  await expect(page.getByRole('article', { name: 'Pro', exact: true })).toContainText('Preço ainda não definido')
  await capture(page, info, 'subscription-current-plan-preparation')
  catalog.set({ plans }); await visit(page, fixture, '/painel/assinatura?recurso=profile.subdomain&checkout=canceled'); await ready(page)
  await capture(page, info, 'subscription-unavailable-feature-canceled-checkout')
  await page.getByRole('button', { name: 'Conferir pagamento', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível conferir')
  await capture(page, info, 'subscription-reconcile-error')
  const release = state.hold()
  try {
    await page.getByRole('button', { name: 'Atualizar situação', exact: true }).click()
    await expect(page.getByRole('status', { name: 'Atualizando assinatura' })).toBeVisible()
    await capture(page, info, 'subscription-refresh-preserves-content')
  } finally { release() }
  await ready(page)
  await page.getByRole('button', { name: 'Cancelar renovação', exact: true }).click()
  const releaseCancellation = cancellation.hold()
  try {
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true })).toBeDisabled()
    await capture(page, info, 'subscription-cancel-pending', true)
  } finally { releaseCancellation() }
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await capture(page, info, 'subscription-cancel-error', true)
  cancellation.set({ operationId: 'visual-operation' }, 202)
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação recebida' })).toBeVisible()
  await capture(page, info, 'subscription-operation-processing')
})

test('Ondas variantes de resultados: lacunas, impressão, tooltip, paginação e calendário', async ({ page }, info) => {
  const fixture = await session(page), id = await link(fixture)
  const totals = { impressions: 4500, clicks: 240, ctr: 5.3, investmentCents: 4900, cpcCents: 49, paidClicks: 100 }
  const report: PerformanceReport = { link: { id, name: 'Comunidade de criação' }, from: '2026-10-10', to: '2026-10-24', days: 15, promotionId: null, totals, daily: Array.from({ length: 15 }, (_, index) => ({ ...totals, day: '2026-10-' + (10 + index), clicks: index * 5, impressions: index * 60, available: index !== 2, highlighted: index > 5 })), surfaces: [{ ...totals, surface: 'HOME' }, { ...totals, surface: 'RELATED' }], coverage: { status: 'PARTIAL', availableFrom: '2026-10-12', investment: 'UNLINKED_HISTORY', currentDayPartial: true }, dataState: 'RECORDED', comparison: { from: '2026-09-25', to: '2026-10-09', days: 15, totals, coverage: 'UNAVAILABLE' }, campaigns: [{ id: 'visual-admin-campaign', surface: 'HOME', status: 'ACTIVE', activatedAt: '2026-10-15T12:00:00Z', expiresAt: null, administrative: true }] }
  await respond(page, '/analytics/links/' + id + '/performance', report)
  await visit(page, fixture, '/painel/links/' + id + '/resultado'); await ready(page)
  await expect(page.getByRole('button', { name: 'Impressões', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Impressões', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Impressões por dia', exact: true })).toBeVisible()
  await capture(page, info, 'performance-impressions-partial-gaps')
  const chart = page.getByRole('region', { name: 'Impressões por dia', exact: true })
  await chart.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
  await chart.locator('.recharts-surface').focus(); await page.keyboard.press('ArrowRight')
  await expect(chart.locator('.recharts-tooltip-wrapper')).toBeVisible()
  await captureOndasState(page, info, { route: '/painel/links/[id]/resultado', state: 'performance-keyboard-tooltip', source: 'presentation-fixture', fullPage: false })
  await page.getByRole('tab', { name: 'Tabela', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resultados diários', exact: true })).toContainText('Indisponível')
  await capture(page, info, 'performance-table-unavailable-and-not-highlighted')
  const pagination = page.getByRole('navigation', { name: 'Paginação dos resultados diários' })
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click()
  await capture(page, info, 'performance-table-page-two')
  await pagination.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(pagination.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()
  await capture(page, info, 'performance-table-last-page')
  const campaigns = page.getByRole('combobox', { name: 'Campanha', exact: true })
  await campaigns.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
  await campaigns.click()
  await captureOndasState(page, info, { route: '/painel/links/[id]/resultado', state: 'performance-administrative-campaign-options', source: 'presentation-fixture', fullPage: false })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Abrir calendário', exact: true }).first().click()
  await expect(page.getByRole('grid')).toBeVisible()
  await capture(page, info, 'performance-filter-calendar')
  await page.keyboard.press('Escape')
  await page.getByText('Como os resultados são calculados', { exact: true }).click()
  await capture(page, info, 'performance-method-expanded')
})

test('Ondas variantes de anexos: preparação, validação, conflito e remoção', async ({ page }, info) => {
  const fixture = await session(page), id = await link(fixture)
  await respond(page, '/links/mine', { links: [{ id, name: 'Comunidade de criação', description: 'Projetos e encontros da comunidade.', status: 'PUBLISHED' }], total: 1 })
  await respond(page, '/links/' + id + '/discovery', { version: 1, metadata: { cityId: null, languageTag: 'pt', modality: 'ONLINE' } })
  const assets = [{ id: 'visual-approved-cover', kind: 'IMAGE', status: 'APPROVED', url: image, alt: 'Capa da comunidade' }]
  const media = await respond(page, '/links/' + id + '/media', { version: 3, assets, reviews: [] })
  const save = await respond(page, '/links/' + id + '/media/image', { message: 'Os anexos mudaram. Atualize antes de enviar.' }, 409, 'PUT')
  const remove = await respond(page, '/links/' + id + '/media/image', { message: 'Não foi possível remover o anexo.' }, 503, 'DELETE')
  await visit(page, fixture, '/painel/links/' + id + '/editar'); await ready(page)
  const editor = page.getByRole('region', { name: 'Anexos do link', exact: true })
  await editor.getByLabel('Imagem do link (opcional)').setInputFiles({ name: 'nao-e-imagem.txt', mimeType: 'text/plain', buffer: Buffer.from('Arquivo inválido apenas para teste local.') })
  await expect(editor.getByRole('alert')).toContainText('PNG, JPG ou WebP')
  await capture(page, info, 'media-invalid-file')
  await page.evaluate(() => {
    const target = window as typeof window & { __ondasReleaseDecode?: () => void; __ondasOriginalDecode?: typeof createImageBitmap }
    const original = target.createImageBitmap
    target.__ondasOriginalDecode = original
    const gate = new Promise<void>(resolve => { target.__ondasReleaseDecode = resolve })
    target.createImageBitmap = ((...args: unknown[]) => gate.then(() => Reflect.apply(original, target, args))) as typeof createImageBitmap
  })
  try {
    await editor.getByLabel('Imagem do link (opcional)').setInputFiles({ name: 'capa.png', mimeType: 'image/png', buffer: raster })
    await expect(editor.getByRole('status').filter({ hasText: 'Preparando imagem' })).toBeVisible()
    await capture(page, info, 'media-preparing-image')
  } finally {
    await page.evaluate(() => {
      const target = window as typeof window & { __ondasReleaseDecode?: () => void; __ondasOriginalDecode?: typeof createImageBitmap }
      target.__ondasReleaseDecode?.()
      if (target.__ondasOriginalDecode) target.createImageBitmap = target.__ondasOriginalDecode
      delete target.__ondasReleaseDecode; delete target.__ondasOriginalDecode
    })
  }
  await expect(editor.getByRole('img', { name: 'Prévia da imagem escolhida' })).toBeVisible()
  await editor.getByRole('button', { name: 'Enviar anexos para análise' }).click()
  await expect(editor.getByRole('alert')).toHaveText('Descreva a imagem antes de enviar.')
  await capture(page, info, 'media-alt-required')
  await editor.getByLabel('Descrição da imagem').fill('Nova capa preparada para revisão')
  const release = save.hold()
  try {
    await editor.getByRole('button', { name: 'Enviar anexos para análise' }).click()
    await expect(editor).toHaveAttribute('aria-busy', 'true')
    await capture(page, info, 'media-saving-proposal')
  } finally { release() }
  await expect(editor.getByRole('alert')).toContainText('mudaram')
  await expect(editor.getByRole('button', { name: 'Enviar anexos para análise' })).toBeDisabled()
  await capture(page, info, 'media-conflict-preserves-proposal')
  await editor.getByRole('button', { name: 'Atualizar anexos' }).click()
  await expect(editor).toHaveAttribute('aria-busy', 'false')
  await editor.getByRole('button', { name: 'Remover imagem escolhida' }).click()
  await capture(page, info, 'media-draft-removed-approved-retained')
  await editor.getByRole('button', { name: 'Remover imagem e propostas' }).click()
  await expect(editor.getByRole('alert')).toHaveText('Não foi possível remover o anexo.')
  await capture(page, info, 'media-remove-error')
  remove.set({ version: 4 }); media.set({ version: 4, assets: [], reviews: [] })
  await editor.getByRole('button', { name: 'Remover imagem e propostas' }).click()
  await expect(editor.getByRole('status')).toHaveText('Anexo removido.')
  await capture(page, info, 'media-remove-success')
  media.set({ message: 'Não foi possível carregar os anexos.' }, 503)
  await editor.getByRole('button', { name: 'Atualizar anexos' }).click()
  await expect(editor.getByRole('alert')).toBeVisible()
  await capture(page, info, 'media-refresh-error')
})

test('Ondas variantes de publicação: falhas independentes e rascunho local', async ({ page }, info) => {
  const fixture = await session(page)
  const facets = await respond(page, '/home', { message: 'Catálogo indisponível.' }, 503)
  const slots = await respond(page, '/links/mine', { message: 'Vagas indisponíveis.' }, 503)
  await respond(page, '/links/submission-started', { recorded: false })
  await visit(page, fixture, '/painel/links/novo')
  await expect(page.getByText('Não foi possível carregar redes e assuntos. Seu rascunho foi mantido.')).toBeVisible()
  await expect(page.getByText('Não foi possível consultar as vagas.')).toBeVisible()
  await capture(page, info, 'submission-facets-and-slots-errors')
  facets.set({ networks: [{ id: 'visual-network', name: 'Site', slug: 'site' }], niches: [{ id: 'visual-niche', name: 'Arte', slug: 'arte' }] })
  slots.set({ links: [], slotsUsed: 4 })
  await page.getByRole('button', { name: 'Recarregar redes e assuntos' }).click()
  await page.getByRole('button', { name: 'Consultar vagas novamente' }).click()
  await expect(page.getByText('Vagas em uso: 4 de 4.', { exact: true })).toBeVisible()
  await capture(page, info, 'submission-slots-used-and-recovery')
  await page.evaluate(() => localStorage.setItem('tla-link-draft', '{rascunho inválido'))
  await page.reload(); await ready(page)
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível recuperar o rascunho' })).toBeVisible()
  await capture(page, info, 'submission-draft-recovery-warning')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key: string, value: string) { if (key === 'tla-link-draft') throw new DOMException('Fixture local', 'QuotaExceededError'); return original.call(this, key, value) }
  })
  await page.getByLabel('Título do link').fill('Rascunho mantido nesta aba')
  await expect(page.getByRole('status').filter({ hasText: 'Não foi possível salvar o rascunho' })).toBeVisible()
  await capture(page, info, 'submission-draft-write-warning')
  await page.getByLabel('Link de acesso').fill('http://example.com/sem-https')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await capture(page, info, 'submission-https-validation')
})

test('Ondas variantes de meus links: paginação, ações e contagem indisponível', async ({ page }, info) => {
  const fixture = await session(page)
  const links = Array.from({ length: 14 }, (_, index) => ({ id: 'visual-many-' + index, name: 'Projeto ' + String(index + 1).padStart(2, '0'), description: 'Referências e encontros para criar juntos.', status: 'PUBLISHED', network: { name: index % 2 ? 'Site' : 'Telegram', slug: index % 2 ? 'site' : 'telegram' }, niche: { name: 'Arte', slug: 'arte' }, pendingText: index === 0 ? { name: 'Proposta de novo título', description: 'Proposta de nova descrição' } : null }))
  await respond(page, '/links/mine', { links, total: 14 })
  await page.route(url => /^\/bff\/v1\/analytics\/links\/visual-many-/.test(url.pathname), route => route.fulfill({ status: 503, json: {} }))
  await visit(page, fixture, '/painel/links'); await ready(page)
  await expect(page.getByText('Contagem indisponível').first()).toBeVisible()
  await capture(page, info, 'my-links-metrics-unavailable-and-pagination')
  const first = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Projeto 01', exact: true }) })
  await first.getByText('Mais opções', { exact: true }).click()
  await capture(page, info, 'my-links-more-actions-expanded')
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await capture(page, info, 'my-links-last-page')
})

test('Ondas variantes de moderação: traduções, botões, conteúdo oculto e recusa pendente', async ({ page }, info) => {
  const fixture = await session(page, true)
  const snapshot: ProfileReviewFixture = { slug: 'pagina-visual-local', name: 'Página da comunidade', bio: 'Referências e projetos para criar juntos.', avatarAssetId: null, requiresAge: true, primaryItemId: 'visual-item', categories: [{ id: 'visual-group', name: 'Projetos privados em revisão', visible: false }], items: [{ id: 'visual-item', categoryId: 'visual-group', label: 'Projeto em revisão', type: 'URL', destination: 'https://example.com/projeto', visible: false }, { id: 'visual-catalog', categoryId: 'visual-group', label: 'Link do catálogo', type: 'CATALOG', destination: 'visual-link', visible: true }], buttonTest: { blockId: 'visual-item', labels: ['Participe da comunidade', 'Conheça o projeto'], samplePerVariant: 30, durationDays: 14 }, translations: { primaryLocale: 'pt-BR', entries: [{ locale: 'en', name: 'Community projects', bio: 'Create and share references together.', categories: { 'visual-group': 'Projects' }, items: { 'visual-item': 'Explore the project' } }] } }
  await respond(page, '/admin/moderation', { cases: [] })
  const content = await respond(page, '/admin/content-reviews', { cases: [{ id: 'visual-profile-review', kind: 'PROFILE', ownerName: 'Ana Ondas', version: 3, status: 'PENDING', reason: null, canAppeal: false, appealText: null, snapshot }] })
  const decision = await respond(page, '/admin/content-reviews/visual-profile-review/decision', { message: 'A versão mudou; o motivo foi mantido.' }, 409, 'POST')
  await visit(page, fixture, '/admin/moderacao'); await ready(page)
  await page.getByRole('tab', { name: 'Minha página', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Versões de botão', exact: true })).toBeVisible()
  await capture(page, info, 'moderation-profile-hidden-content-button-versions')
  await page.getByText('Tradução · en', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Community projects', exact: true })).toBeVisible()
  await capture(page, info, 'moderation-profile-translation-expanded')
  await page.getByRole('button', { name: 'Recusar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Recusar publicação', exact: true })
  await dialog.getByLabel('Motivo da recusa').fill('Revise os textos e o acesso antes de reenviar.')
  const release = decision.hold()
  try { await dialog.getByRole('button', { name: 'Confirmar recusa' }).click(); await expect(dialog.getByRole('button', { name: 'Confirmar recusa' })).toBeDisabled(); await capture(page, info, 'moderation-content-rejection-pending', true) } finally { release() }
  await expect(dialog.getByRole('alert')).toContainText('versão mudou')
  await capture(page, info, 'moderation-content-rejection-conflict', true); await page.keyboard.press('Escape')
  content.set({ cases: [] }); await page.reload(); await page.getByRole('tab', { name: 'Minha página', exact: true }).click(); await ready(page)
  await capture(page, info, 'moderation-content-empty')
  content.set({}, 503); await page.reload(); await page.getByRole('tab', { name: 'Minha página', exact: true }).click(); await ready(page)
  await capture(page, info, 'moderation-content-error')
  const releaseLoad = content.hold()
  try { await page.reload(); await page.getByRole('tab', { name: 'Minha página', exact: true }).click(); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await capture(page, info, 'moderation-content-loading') } finally { releaseLoad() }
})

test('Ondas variantes de denúncias: histórico, próxima página e decisão salva', async ({ page }, info) => {
  const fixture = await session(page, true)
  const row: ReportQueueRow = { id: 'visual-report-detail', linkId: 'visual-link', status: 'IN_REVIEW', reason: 'SPAM', kind: 'CONTENT', comment: 'O link mudou de conteúdo depois da publicação.', version: 2, createdAt: when, updatedAt: when, decisionReason: 'Aguardando conferência do responsável.', link: { name: 'Comunidade de criação', status: 'PUBLISHED' }, history: [{ id: 'visual-history-1', action: 'REPORT_RECEIVED', after: { status: 'RECEIVED' }, createdAt: '2026-10-23T12:00:00Z' }, { id: 'visual-history-2', action: 'REPORT_DECIDED', after: { status: 'IN_REVIEW', reason: 'Aguardando conferência do responsável.' }, createdAt: when }] }
  const data = await respond(page, '/admin/reports', { reports: [row], nextCursor: 'visual-next-page' })
  const decision = await respond(page, '/admin/reports/' + row.id + '/decision', {}, 200, 'PATCH')
  await visit(page, fixture, '/admin/denuncias'); await ready(page)
  const card = page.getByRole('article', { name: 'Denúncia ' + row.id, exact: true })
  await card.getByText('Histórico (2)', { exact: true }).click()
  await capture(page, info, 'reports-history-expanded-pagination')
  await card.getByRole('combobox', { name: 'Próximo estado', exact: true }).click()
  await capture(page, info, 'reports-decision-options'); await page.keyboard.press('Escape')
  await card.getByLabel('Justificativa').fill('Conteúdo conferido e relato encerrado nesta fixture local.')
  const release = decision.hold()
  try { await card.getByRole('button', { name: 'Salvar decisão' }).click(); await expect(card.getByRole('button', { name: 'Salvar decisão' })).toBeDisabled(); await capture(page, info, 'reports-decision-pending') } finally { data.set({ reports: [], nextCursor: null }); release() }
  await expect(page.getByRole('status').filter({ hasText: 'Decisão salva.' })).toBeVisible()
  await capture(page, info, 'reports-decision-saved-empty')
})

test('Ondas variantes de destaque: calendário em modal, conflito e retorno', async ({ page }, info) => {
  const fixture = await session(page, true), id = await link(fixture)
  await respond(page, '/links/' + id, { id, name: 'Comunidade de criação', available: true })
  const data = await respond(page, '/admin/links/' + id + '/promotions', { promotions: [], allowedSurfaces: ['SEARCH', 'NICHE', 'HOME'], eligible: true })
  const save = await respond(page, '/admin/links/' + id + '/promotions', { message: 'O destaque mudou. Atualize a situação.' }, 409, 'PUT')
  await respond(page, '/admin/links/' + id + '/promotions', {}, 200, 'DELETE')
  await visit(page, fixture, '/admin/destaques'); await ready(page)
  await page.getByLabel('Endereço do link no catálogo').fill(fixture.origin + '/link/' + id)
  await page.getByRole('button', { name: 'Consultar link' }).click()
  await page.getByRole('button', { name: 'Gerenciar destaque' }).click()
  await expect(page.getByRole('dialog').getByLabel('Onde destacar')).toBeVisible()
  const dialog = page.getByRole('dialog')
  await selectOption(dialog.getByRole('combobox', { name: 'Período', exact: true }), 'custom')
  await dialog.getByRole('button', { name: 'Abrir calendário', exact: true }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  const previousMonth = await page.getByRole('button', { name: 'Mês anterior', exact: true }).boundingBox()
  const nextMonth = await page.getByRole('button', { name: 'Próximo mês', exact: true }).boundingBox()
  expect(Math.abs(previousMonth!.y - nextMonth!.y), 'Calendar navigation stays on one row inside the form').toBeLessThan(1)
  await capture(page, info, 'highlight-calendar-inside-dialog', true)
  await page.keyboard.press('Escape')
  await dialog.getByLabel('Data e hora de término').fill('23/10/2026 12:00')
  await dialog.getByRole('button', { name: 'Salvar destaque' }).click()
  await expect(dialog.getByRole('alert')).toContainText('futuro')
  await capture(page, info, 'highlight-past-date-validation', true)
  await dialog.getByLabel('Data e hora de término').fill('30/10/2026 12:00')
  const release = save.hold()
  try { await dialog.getByRole('button', { name: 'Salvar destaque' }).click(); await expect(dialog.getByRole('button', { name: 'Salvando…' })).toBeDisabled(); await capture(page, info, 'highlight-save-pending', true) } finally { release() }
  await expect(dialog.getByRole('alert')).toContainText('destaque mudou')
  await capture(page, info, 'highlight-save-conflict', true); await page.keyboard.press('Escape')
  data.set({ promotions: ['SEARCH', 'NICHE', 'HOME'].map(surface => ({ id: 'visual-paid-' + surface, surface, administrative: false, expiresAt: '2026-11-01T12:00:00Z' })), allowedSurfaces: ['SEARCH', 'NICHE', 'HOME'], eligible: true })
  await page.getByRole('button', { name: 'Gerenciar destaque' }).click()
  await expect(dialog.getByRole('button', { name: 'Salvar destaque' })).toBeDisabled()
  await capture(page, info, 'highlight-all-paid-surfaces-blocked', true); await page.keyboard.press('Escape')
  data.set({ promotions: [{ id: 'visual-administrative', surface: 'HOME', administrative: true, expiresAt: null }], allowedSurfaces: ['SEARCH', 'NICHE', 'HOME'], eligible: true })
  await page.getByRole('button', { name: 'Gerenciar destaque' }).click()
  await dialog.getByRole('button', { name: 'Remover destaque' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Destaque administrativo removido.')
  await capture(page, info, 'highlight-removed-notice')
})

test('Ondas variantes de retenção: vazio, pendência, erro e pedido enfileirado', async ({ page }, info) => {
  const fixture = await session(page, true)
  const data = await respond(page, '/admin/retention', { before: '2025-10-24', pending: 0 })
  const purge = await respond(page, '/admin/retention', { message: 'Não foi possível enfileirar.' }, 503, 'POST')
  await visit(page, fixture, '/admin/visao'); await ready(page)
  await selectOption(page.getByLabel('Área de gestão', { exact: true }), { label: 'Retenção' })
  await expect(page.getByRole('button', { name: 'Pedir expurgo' })).toBeDisabled()
  await capture(page, info, 'retention-no-events')
  data.set({ before: '2025-10-24', pending: 320 }); await page.reload(); await ready(page)
  await selectOption(page.getByLabel('Área de gestão', { exact: true }), { label: 'Retenção' })
  const release = purge.hold()
  try { await page.getByRole('button', { name: 'Pedir expurgo' }).click(); await expect(page.getByRole('button', { name: 'Pedir expurgo' })).toBeDisabled(); await capture(page, info, 'retention-request-pending') } finally { release() }
  await expect(page.getByRole('status')).toHaveText('Não foi possível enfileirar.')
  await capture(page, info, 'retention-request-error')
  purge.set({ queued: true }, 202)
  await page.getByRole('button', { name: 'Pedir expurgo' }).click()
  await expect(page.getByRole('status')).toContainText('Pedido enviado ao worker')
  await capture(page, info, 'retention-request-queued')
  data.set({}, 503); await page.reload(); await ready(page)
  await selectOption(page.getByLabel('Área de gestão', { exact: true }), { label: 'Retenção' })
  await expect(page.getByText('Não foi possível ler a retenção.', { exact: true })).toBeVisible()
  await capture(page, info, 'retention-load-error')
})

test('Ondas variantes de cobrança administrativa: Premium, atualização e reprocessamento', async ({ page }, info) => {
  const fixture = await session(page, true)
  const capabilities = ['profile.page', 'profile.categories', 'profile.appearance', 'profile.history', 'profile.analytics', 'profile.richBlocks', 'profile.subdomain'].map((key, index) => ({ key, label: ['Página pública', 'Categorias', 'Aparência', 'Histórico', 'Estatísticas dos botões', 'Blocos de conteúdo', 'Subdomínio'][index]!, delivered: index !== 6 }))
  const body = { settings: { enabled: true, fiscalReviewed: true, publicOrigin: fixture.origin, livemode: false, version: 2 }, providerConfigured: true, webhookReady: true, salesEnabled: true, capabilities, plans: [{ id: 'visual-premium-plan', tier: 'PREMIUM', title: 'Premium', enabled: true, version: 3, versions: [{ id: 'visual-premium-version', amountCents: 2490, providerPriceId: 'price_visual_premium', capabilities: capabilities.map(item => item.key), version: 3 }] }], failedOperations: [{ id: 'visual-cancel-operation', kind: 'CANCEL', lastError: 'Provedor indisponível.', attempts: 3, createdAt: when }, { id: 'visual-checkout-operation', kind: 'CHECKOUT', lastError: 'Precondição pendente.', attempts: 1, createdAt: when }], failedEvents: [{ id: 'visual-confirmation-event', lastError: 'Confirmação ainda pendente.', attempts: 2, receivedAt: when }], reviews: [] }
  const data = await respond(page, '/admin/profile-billing', body)
  const retry = await respond(page, '/admin/profile-billing/operations/visual-cancel-operation/retry', { message: 'Não foi possível repetir o cancelamento.' }, 503, 'POST')
  await respond(page, '/admin/profile-billing/events/visual-confirmation-event/retry', {}, 200, 'POST')
  await visit(page, fixture, '/admin/assinaturas'); await ready(page)
  await expect(page.getByText('Plano habilitado, mas as condições para vender acima ainda precisam ser concluídas.')).toBeVisible()
  await capture(page, info, 'admin-billing-unavailable-capability-and-checkout-failure')
  await page.getByRole('article', { name: 'Configuração PREMIUM', exact: true }).getByRole('button', { name: 'Editar plano' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('dialog').getByLabel('Subdomínio · indisponível neste ambiente')).toBeVisible()
  await capture(page, info, 'admin-billing-premium-capabilities', true)
  await page.keyboard.press('Escape')
  const release = data.hold()
  try { await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click(); await expect(page.getByRole('status', { name: 'Atualizando administração das assinaturas' })).toBeVisible(); await capture(page, info, 'admin-billing-refresh-preserves-layout') } finally { release() }
  await ready(page)
  const releaseRetry = retry.hold()
  try { await page.getByRole('button', { name: 'Tentar cancelamento novamente' }).click(); await expect(page.getByRole('button', { name: 'Tentar cancelamento novamente' })).toBeDisabled(); await capture(page, info, 'admin-billing-retry-pending') } finally { releaseRetry() }
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível repetir')
  await capture(page, info, 'admin-billing-retry-error')
  await page.getByRole('button', { name: 'Conferir novamente' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Nova tentativa registrada' })).toBeVisible()
  await capture(page, info, 'admin-billing-retry-received')
})

test('Ondas variantes de configuração: switch, resumos restritos e rede', async ({ page }, info) => {
  const fixture = await session(page, true)
  const row = { id: 'visual-adult-facet', name: 'Conteúdo adulto', slug: 'adulto', requiresAge: true, isPublicFacet: true, summary: null, substantiveCount: 2, indexable: false }
  await respond(page, '/admin/facets', { niches: [row], networks: [{ ...row, id: 'visual-network-facet', name: 'Site', slug: 'site', requiresAge: false, isPublicFacet: false }] })
  await respond(page, '/admin/settings/moderation', { threshold: 1 })
  await respond(page, '/admin/settings/impressions', { showImpressions: false })
  const change = await respond(page, '/admin/settings/impressions', { message: 'Configuração não foi salva.' }, 503, 'PATCH')
  await visit(page, fixture, '/admin/configuracoes'); await ready(page)
  const toggle = page.getByRole('switch', { name: 'Impressões no catálogo' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await capture(page, info, 'settings-impressions-off-maximum-threshold')
  const release = change.hold()
  try { await toggle.click(); await expect(toggle).toBeDisabled(); await capture(page, info, 'settings-impressions-saving') } finally { release() }
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Configuração não foi salva.')
  await capture(page, info, 'settings-impressions-error-retains-off')
  await page.getByRole('button', { name: /Conteúdo adulto/ }).click()
  await expect(page.getByRole('dialog').getByText(/Conteúdo 18\+ continua fora da busca/)).toBeVisible()
  await capture(page, info, 'settings-adult-summary-not-indexed', true); await page.keyboard.press('Escape')
  await selectOption(page.getByRole('combobox', { name: 'Tipo de catálogo', exact: true }), 'network')
  await page.getByRole('button', { name: /Site/ }).click()
  await expect(page.getByRole('dialog').getByText(/Este catálogo fica fora da busca/)).toBeVisible()
  await capture(page, info, 'settings-private-network-summary', true)
})

test('Ondas variantes de oportunidades: calendário de vidro e período válido', async ({ page }, info) => {
  const fixture = await session(page, true)
  await respond(page, '/admin/search-opportunities', { threshold: 5, retentionDays: 90, from: '2026-10-15', to: '2026-10-16', page: 1, total: 1, items: [{ term: 'comunidade de arte', searches: 45, empty: 32, exits: 2, withResults: 13, exitRate: 15.4, opportunity: 'NO_RESULTS' }], networks: [], niches: [], coverage: [{ outcome: 'SUCCESS', count: 45 }] })
  await visit(page, fixture, '/admin/visao'); await ready(page)
  await selectOption(page.getByRole('combobox', { name: 'Área de gestão', exact: true }), 'buscas')
  const panel = page.getByRole('region', { name: 'Oportunidades de busca', exact: true })
  await expect(panel.getByRole('heading', { name: 'Oportunidades nesta página', exact: true })).toBeVisible()
  const from = panel.getByLabel('De', { exact: true }), to = panel.getByLabel('Até', { exact: true })
  await from.locator('..').getByRole('button', { name: 'Abrir calendário', exact: true }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  await capture(page, info, 'search-opportunities-glass-calendar')
  await page.keyboard.press('Escape')
  await from.fill('15/10/2026'); await to.fill('14/10/2026'); await to.press('Tab')
  await expect(panel.getByRole('alert')).toContainText('Use uma data a partir de 15/10/2026.')
  await capture(page, info, 'search-opportunities-invalid-date-range')
  const applied = page.waitForResponse(response => response.url().includes('from=2026-10-15&to=2026-10-16'))
  await to.fill('16/10/2026'); await to.press('Tab'); await applied
  await expect(panel).toHaveAttribute('aria-busy', 'false')
  await capture(page, info, 'search-opportunities-valid-date-range')
})
