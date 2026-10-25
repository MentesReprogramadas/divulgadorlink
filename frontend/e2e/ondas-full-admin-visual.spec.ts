import { readFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { captureOndasState } from './ondas-visual-capture'
import { captureDialogRemainder } from './ondas-admin-visual-tools'
import { installHydrationCdpProbe, attachHydrationCdpProbe } from './ondas-hydration-cdp-probe'
import { selectOption } from './select-control'
import { isolatedFixture, login, visit, roadmapApi, type Fixture } from './ondas-visual-fixture'
import type { BillingState, ProfilePlan } from '../src/features/profile-billing/billing-contract'
import type { AvailabilityData, UrlProposal } from '../src/features/availability/availability-contract'
import type { ReportQueueRow } from '../src/features/moderation/report-contract'
import type { PerformanceReport } from '../src/features/promotions/performance-contract'

// Presentation fixtures are local browser responses. They do not approve a payment,
// moderation decision, identifier change, or permission on the application server.
const raster = readFileSync(path.resolve(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png'))
const image = 'data:image/png;base64,' + raster.toString('base64')
const when = '2026-10-24T12:00:00.000Z'
const endpoint = (name: string) => '/bff/v1' + name
const errors = new WeakMap<Page, string[]>()
const heldFixtures = new WeakMap<Page, Array<{ held: boolean; requested: boolean }>>()

test.beforeEach(async ({ page }, info) => {
  await installHydrationCdpProbe(page)
  await page.setViewportSize({ width: info.project.use.isMobile ? 390 : 1440, height: info.project.use.isMobile ? 844 : 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date(when))
  const list: string[] = []
  errors.set(page, list)
  page.on('pageerror', error => list.push(error.message))
  await page.route(/facebook|google(tagmanager|adservices)|doubleclick/, route => route.abort())
})

test.afterEach(async ({ page }, info) => { await attachHydrationCdpProbe(page, info) })

async function shot(page: Page, info: TestInfo, name: string, options: { loading?: boolean; modal?: boolean; popup?: boolean } = {}) {
  if (options.loading) {
    const held = (heldFixtures.get(page) ?? []).filter(control => control.held)
    if (held.length) await expect.poll(() => held.every(control => control.requested), { message: name + ': waiting for the actual held request' }).toBe(true)
  }
  if (!options.loading) await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  if (!options.loading) await expect(page.getByLabel('Carregando gráficos', { exact: true })).toHaveCount(0)
  expect(errors.get(page) ?? [], name).toEqual([])
  const route = new URL(page.url()).pathname.replace(/\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}(?=\/|$)/gi, '/[id]')
  await captureOndasState(page, info, { route, state: name, source: 'presentation-fixture', fullPage: !options.modal && !options.popup })
  if (options.modal) await captureDialogRemainder(page, info, route, name)
}

async function jsonFixture(page: Page, pathname: string, initial: unknown, status = 200) {
  const control = { body: initial, status, release: () => {}, held: false, requested: false }
  const controls = heldFixtures.get(page) ?? []
  controls.push(control); heldFixtures.set(page, controls)
  let gate = Promise.resolve()
  await page.route(url => url.pathname === endpoint(pathname), async route => {
    control.requested = true
    if (control.held) await gate
    await route.fulfill({ status: control.status, json: control.body })
  })
  return {
    set(body: unknown, nextStatus = 200) { control.body = body; control.status = nextStatus },
    hold() { control.held = true; control.requested = false; gate = new Promise<void>(resolve => { control.release = resolve }); return () => { control.held = false; control.release() } },
  }
}

async function ready(page: Page) {
  await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

async function openSelect(page: Page, info: TestInfo, name: string, label: string) {
  const control = page.getByRole('combobox', { name, exact: true })
  if (!await control.isVisible()) {
    const filters = control.locator('xpath=ancestor::*[@data-workspace-filters][1]')
    if (await filters.count()) await filters.getByRole('button', { name: 'Ver mais filtros', exact: true }).click()
  }
  // Keep the anchored menu in the viewport; a full-page reset can flip it over another control.
  await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
  await control.click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await shot(page, info, label, { popup: true })
  await page.keyboard.press('Escape')
}

async function tab(page: Page, label: string, listName?: string) {
  const scope = listName ? page.getByRole('tablist', { name: listName, exact: true }) : page
  const item = scope.getByRole('tab', { name: label, exact: true })
  const select = page.getByRole('combobox', { name: listName ?? 'Área de gestão', exact: true })
  await expect.poll(async () => await item.isVisible() || await select.isVisible()).toBe(true)
  if (await item.isVisible()) await item.click()
  else await selectOption(select, { label })
}

async function ownLink(fixture: Fixture) {
  const id = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${id}','${fixture.tenantId}','${fixture.ownerId}','https://example.com/ondas-visual','Comunidade de criação','Encontros, referências e projetos compartilhados.',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  return id
}

async function signedIn(page: Page, admin = false) {
  const fixture = isolatedFixture()
  if (admin) sql(`UPDATE users SET role='ADMIN' WHERE id='${fixture.otherId}' AND "tenantId"='${fixture.tenantId}'`)
  await login(page, fixture, admin)
  await ready(page)
  return fixture
}

for (const form of [
  { route: '/login', api: '/auth/login', button: 'Entrar', prefix: 'auth-login', name: false, password: true },
  { route: '/cadastro', api: '/auth/register', button: 'Criar conta', prefix: 'auth-register', name: true, password: true },
  { route: '/esqueci-senha', api: '/auth/forgot-password', button: 'Enviar link', prefix: 'auth-forgot', name: false, password: false },
] as const) {
  test('Ondas auth visual ' + form.route, async ({ page }, info) => {
    const origin = runtime.web('checklist.localhost')
    await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'checklist.localhost', path: '/' }])
    const response = await jsonFixture(page, form.api, { message: 'Credenciais inválidas.' }, 401)
    await page.goto(origin + form.route)
    await shot(page, info, form.prefix + '-empty')
    await page.getByRole('button', { name: form.button, exact: true }).click()
    await expect(page.locator('input:invalid').first()).toBeFocused()
    // Inspect inline errors after verifying native focus, without its browser-owned balloon.
    await page.keyboard.press('Tab')
    await shot(page, info, form.prefix + '-validation')
    if (form.name) await page.getByLabel('Nome', { exact: true }).fill('Ana da comunidade')
    await page.getByLabel('E-mail', { exact: true }).fill('ana@fixture.test')
    if (form.password) await page.getByLabel('Senha', { exact: true }).fill('SomenteFixture123!')
    await shot(page, info, form.prefix + '-filled')
    const release = response.hold()
    try {
      await page.getByRole('button', { name: form.button, exact: true }).click()
      await expect(page.getByRole('button', { name: form.button, exact: true })).toBeDisabled()
      await shot(page, info, form.prefix + '-pending')
    } finally { release() }
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
    await shot(page, info, form.prefix + '-error')
    if (form.route === '/cadastro') {
      response.set({}, 409)
      await page.getByRole('button', { name: form.button, exact: true }).click()
      await expect(page.getByRole('main').getByRole('alert')).toContainText('já está cadastrado')
      await shot(page, info, form.prefix + '-existing-email')
    } else if (form.route === '/esqueci-senha') {
      response.set({})
      await page.getByRole('button', { name: form.button, exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Se existir uma conta')
      await shot(page, info, form.prefix + '-sent')
      response.set({ message: 'Muitas tentativas. Aguarde antes de reenviar.' }, 429)
      await page.getByRole('button', { name: form.button, exact: true }).click()
      await expect(page.getByRole('main').getByRole('alert')).toContainText('Muitas tentativas')
      await shot(page, info, form.prefix + '-rate-limit')
    }
    response.set({ message: 'Serviço indisponível. Tente novamente.' }, 503)
    await page.getByRole('button', { name: form.button, exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
    await shot(page, info, form.prefix + '-unavailable')
    await page.route(url => url.pathname === endpoint(form.api), route => route.abort('failed'))
    await page.getByRole('button', { name: form.button, exact: true }).click()
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível conectar')
    await shot(page, info, form.prefix + '-connection-error')
  })
}

test('Ondas recuperar senha: token, envio e confirmação locais', async ({ page }, info) => {
  const origin = runtime.web('checklist.localhost')
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'checklist.localhost', path: '/' }])
  const response = await jsonFixture(page, '/auth/reset-password', { message: 'Link inválido ou vencido.' }, 400)
  await page.goto(origin + '/recuperar-senha')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Link inválido')
  await shot(page, info, 'auth-reset-no-token')
  await page.goto(origin + '/recuperar-senha?token=visual-local-token')
  await shot(page, info, 'auth-reset-empty')
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page.getByLabel('Nova senha')).toBeFocused()
  await page.keyboard.press('Tab')
  await shot(page, info, 'auth-reset-validation')
  await page.getByLabel('Nova senha').fill('SomenteFixture123!')
  const release = response.hold()
  try {
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(page.getByRole('button', { name: 'Salvar senha' })).toBeDisabled()
    await shot(page, info, 'auth-reset-pending')
  } finally { release() }
  await expect(page.getByRole('main').getByRole('alert')).toContainText('vencido')
  await shot(page, info, 'auth-reset-expired')
  response.set({})
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page.getByRole('status')).toHaveText('Senha salva.')
  await shot(page, info, 'auth-reset-saved')
})

test('Ondas conta: identificadores e exclusão sem mutação real', async ({ page }, info) => {
  const fixture = await signedIn(page)
  const current = await roadmapApi(page, '/auth/session')
  const email = await jsonFixture(page, '/links/account/email', { message: 'Não foi possível alterar o identificador.' }, 409)
  await jsonFixture(page, '/links/account/phone', { message: 'Telefone já cadastrado.' }, 409)
  await jsonFixture(page, '/auth/account/delete', { message: 'Senha atual inválida.' }, 400)
  await visit(page, fixture, '/painel/conta')
  await ready(page)
  await shot(page, info, 'account-empty')
  await page.getByLabel('Novo e-mail').fill('novo@fixture.test')
  await page.getByLabel('Novo telefone').fill('+5511999990000')
  await page.getByLabel('Senha atual').fill('SenhaIncorreta123!')
  await shot(page, info, 'account-filled')
  const release = email.hold()
  try {
    await page.getByRole('button', { name: 'Trocar e-mail', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Trocar e-mail', exact: true })).toBeDisabled()
    await shot(page, info, 'account-email-pending')
  } finally { release() }
  await expect(page.getByRole('status')).toContainText('Não foi possível alterar')
  await shot(page, info, 'account-email-error')
  email.set({})
  await page.getByRole('button', { name: 'Trocar e-mail', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Confirme o novo identificador')
  await shot(page, info, 'account-email-confirmation')
  await page.getByRole('button', { name: 'Trocar telefone', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Telefone já cadastrado')
  await shot(page, info, 'account-phone-error')
  await page.getByRole('button', { name: 'Excluir conta', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Senha atual inválida.')
  await shot(page, info, 'account-delete-error')
  await jsonFixture(page, '/auth/session', { ...current.body, status: 'BANNED', canSubmit: false, banReason: 'Conta suspensa na fixture visual local.' })
  await page.evaluate(() => sessionStorage.removeItem('catalogo.session'))
  await page.reload(); await ready(page); await shot(page, info, 'account-suspended')
})

test('Ondas verificação: código e troca de e-mail sem enviar mensagem', async ({ page }, info) => {
  const fixture = await signedIn(page)
  const session = await roadmapApi(page, '/auth/session')
  await jsonFixture(page, '/auth/session', { ...session.body, canSubmit: false })
  const confirmation = await jsonFixture(page, '/auth/confirm', { confirmed: false, retryAfter: 0, destination: fixture.owner })
  const change = await jsonFixture(page, '/links/account/email', { message: 'Não foi possível trocar o e-mail.' }, 409)
  await page.evaluate(() => sessionStorage.removeItem('catalogo.session'))
  const releaseConfirmation = confirmation.hold()
  try { await visit(page, fixture, '/painel/verificar'); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'verification-loading', { loading: true }) } finally { releaseConfirmation() }
  await expect(page.getByRole('heading', { name: 'Confirme o e-mail' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar e-mail' })).toBeDisabled()
  await shot(page, info, 'verification-code-empty')
  const code = page.getByRole('textbox', { name: /Código|Dígito/ }).first()
  await code.fill('123')
  await shot(page, info, 'verification-code-partial')
  await code.fill('123456')
  await shot(page, info, 'verification-code-filled')
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click()
  await expect(page.getByRole('status')).toContainText('Código inválido')
  await shot(page, info, 'verification-code-error')
  await page.getByRole('button', { name: 'Trocar e-mail', exact: true }).click()
  await shot(page, info, 'verification-change-empty')
  await page.getByLabel('Novo e-mail').fill('outro@fixture.test')
  const release = change.hold()
  try {
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByRole('button', { name: 'Enviar código' })).toBeDisabled()
    await shot(page, info, 'verification-change-pending')
  } finally { release() }
  await expect(page.getByRole('status')).toContainText('Não foi possível trocar')
  await shot(page, info, 'verification-change-error')
  change.set({})
  await page.getByRole('button', { name: 'Enviar código' }).click()
  await expect(page.getByRole('status')).toContainText('novo e-mail')
  await shot(page, info, 'verification-change-sent')
})

const offers = ['Busca', 'Categoria', 'Toda a comunidade'].map((name, index) => ({ code: 'VISUAL_' + index, name, sortOrder: (index + 1) * 10, featured: index === 2, surfaces: index === 0 ? ['SEARCH'] : index === 1 ? ['NICHE'] : ['SEARCH', 'NICHE', 'HOME'], prices: [7, 14, 28].map(durationDays => ({ durationDays, amountCents: (index + 1) * durationDays * 100 })) }))

const plans: ProfilePlan[] = [
  { tier: 'FREE', title: 'Gratuito', versionId: null, amountCents: 0, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.page', label: 'Página pública', delivered: true }] },
  { tier: 'PRO', title: 'Pro', versionId: 'visual-pro', amountCents: 1290, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.analytics', label: 'Estatísticas dos botões', delivered: true }] },
  { tier: 'PREMIUM', title: 'Premium', versionId: 'visual-premium', amountCents: 2490, currency: 'BRL', interval: 'month', available: true, capabilities: [{ key: 'profile.analytics', label: 'Estatísticas dos botões', delivered: true }, { key: 'profile.richBlocks', label: 'Blocos de conteúdo', delivered: true }] },
]
const freeState: BillingState = { canCheckout: true, checkoutRequirement: null, capabilities: ['profile.page'], subscription: null, operations: [] }

test('Ondas pedidos: coleção, filtros, vazio, carregamento e erro', async ({ page }, info) => {
  const fixture = await signedIn(page), id = await ownLink(fixture)
  await jsonFixture(page, '/links/mine', { links: [{ id, name: 'Comunidade de criação', status: 'PUBLISHED' }] })
  const orders = await jsonFixture(page, '/orders/mine', { orders: ['PENDING_PAYMENT', 'PAID', 'PAID_LATE', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'].map((status, index) => ({ id: 'visual-order-' + index, linkId: id, amountCents: 2900 + index * 100, status, durationDays: 28, surfaces: ['SEARCH', 'NICHE'], createdAt: when })) })
  await visit(page, fixture, '/painel/pedidos'); await ready(page)
  await shot(page, info, 'orders-filled')
  await openSelect(page, info, 'Situação do pagamento', 'orders-status-options')
  await page.getByRole('searchbox').fill('sem resultado visual')
  await shot(page, info, 'orders-filter-empty')
  orders.set({ orders: [] }); await page.reload(); await ready(page)
  await shot(page, info, 'orders-empty')
  orders.set({ message: 'Pedidos indisponíveis.' }, 503); await page.reload(); await ready(page)
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'orders-error')
  const release = orders.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'orders-loading', { loading: true }) } finally { release() }
})

test('Ondas assinatura: catálogo e estados comerciais somente locais', async ({ page }, info) => {
  const fixture = await signedIn(page)
  const state = await jsonFixture(page, '/me/subscription', freeState)
  const catalog = await jsonFixture(page, '/profile-plans', { plans })
  await jsonFixture(page, '/subscriptions/checkout', { message: 'Pagamento indisponível. Sua assinatura não foi alterada.' }, 503)
  await jsonFixture(page, '/me/subscription/change', { message: 'A assinatura mudou. Atualize a situação.' }, 409)
  await jsonFixture(page, '/me/subscription/cancel', { message: 'Não foi possível solicitar o cancelamento.' }, 503)
  await visit(page, fixture, '/painel/assinatura'); await ready(page)
  await shot(page, info, 'subscription-catalog')
  await page.getByRole('article', { name: 'Pro', exact: true }).getByRole('button', { name: 'Assinar plano' }).click()
  await shot(page, info, 'subscription-checkout-confirmation', { modal: true })
  await page.getByRole('dialog').getByRole('button', { name: 'Ir para pagamento' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await shot(page, info, 'subscription-checkout-error', { modal: true })
  await page.keyboard.press('Escape')
  for (const status of ['PENDING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'INCOMPLETE', 'REVIEW', 'CANCELED', 'EXPIRED']) {
    state.set({ ...freeState, subscription: { id: 'visual-subscription', planVersionId: 'visual-pro', tier: 'PRO', title: 'Pro', status, version: 2, canChange: true, periodStart: '2026-10-01T12:00:00Z', periodEnd: '2026-11-01T12:00:00Z', paidThrough: '2026-11-01T12:00:00Z', cancelAtPeriodEnd: false, reviewReason: status === 'REVIEW' ? 'Conferência pendente' : null, resumeCheckoutUrl: null, hasPaidAccess: status === 'ACTIVE', nextPlan: null } })
    await page.reload(); await ready(page)
    await shot(page, info, 'subscription-' + status.toLowerCase())
    if (status === 'ACTIVE') {
      await page.getByRole('article', { name: 'Premium', exact: true }).getByRole('button', { name: 'Trocar no próximo ciclo' }).click()
      await shot(page, info, 'subscription-change-confirmation', { modal: true }); await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Cancelar renovação', exact: true }).click()
      await shot(page, info, 'subscription-cancel-confirmation', { modal: true }); await page.keyboard.press('Escape')
    }
  }
  for (const requirement of ['CREATE_PAGE', 'VERIFY'] as const) {
    state.set({ ...freeState, canCheckout: false, checkoutRequirement: requirement }); await page.reload(); await ready(page)
    await shot(page, info, 'subscription-requirement-' + requirement.toLowerCase())
  }
  state.set(freeState); catalog.set({ plans: [plans[0]] }); await page.reload(); await ready(page)
  await shot(page, info, 'subscription-only-free')
  catalog.set({ plans }); await visit(page, fixture, '/painel/assinatura?recurso=profile.analytics&checkout=returned'); await ready(page)
  await shot(page, info, 'subscription-context-returned')
  state.set({ message: 'Assinatura indisponível.' }, 503); await page.reload(); await ready(page)
  await shot(page, info, 'subscription-error')
  const release = state.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'subscription-loading', { loading: true }) } finally { release() }
})

test('Ondas publicação: todas as etapas e card real com ou sem anexo', async ({ page }, info) => {
  const fixture = await signedIn(page)
  const response = await jsonFixture(page, '/links', { message: 'Não foi possível enviar. Seus dados foram mantidos.' }, 503)
  await jsonFixture(page, '/links/submission-started', { recorded: false })
  await visit(page, fixture, '/painel/links/novo'); await ready(page)
  await shot(page, info, 'submission-address-empty')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Confira os campos desta etapa' })).toBeVisible()
  await shot(page, info, 'submission-address-validation')
  await page.getByLabel('Título do link').fill('Comunidade de criação')
  await page.getByLabel('Link de acesso').fill('https://example.com/ondas-local')
  await shot(page, info, 'submission-address-filled')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await shot(page, info, 'submission-content-empty')
  await page.getByLabel('Descrição', { exact: true }).fill('Encontros, referências e projetos compartilhados pela comunidade.')
  await openSelect(page, info, 'Rede do link', 'submission-network-options')
  await selectOption(page.getByRole('combobox', { name: 'Rede do link' }), { label: 'Site' })
  const niche = page.getByRole('combobox', { name: 'Assunto do link' })
  await niche.click(); await expect(page.getByRole('listbox')).toBeVisible()
  await shot(page, info, 'submission-niche-options')
  await page.getByRole('option').filter({ hasNotText: 'Escolha' }).first().click()
  await shot(page, info, 'submission-content-filled')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.locator('[data-preview]')).toBeVisible()
  await expect(page.locator('[data-preview] img')).toHaveCount(0)
  await shot(page, info, 'submission-review-without-image')
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByLabel('Ícone do link (opcional)').setInputFiles({ name: 'icone.png', mimeType: 'image/png', buffer: raster })
  await expect(page.getByRole('img', { name: 'Prévia do ícone escolhido' })).toBeVisible()
  await page.getByLabel('Imagem do link (opcional)').setInputFiles({ name: 'capa.png', mimeType: 'image/png', buffer: raster })
  await expect(page.getByRole('img', { name: 'Prévia da imagem escolhida' })).toBeVisible()
  await page.getByLabel('Descrição da imagem').fill('Pessoas criando juntas')
  await shot(page, info, 'submission-content-with-media')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.locator('[data-preview] img[alt="Pessoas criando juntas"]')).toBeVisible()
  await expect(page.locator('[data-preview] a')).toHaveCount(0)
  await shot(page, info, 'submission-review-with-media')
  const release = response.hold()
  try {
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled()
    await shot(page, info, 'submission-pending')
  } finally { release() }
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível enviar')
  await shot(page, info, 'submission-error-preserves-review')
  response.set({ id: 'visual-submission', status: 'PENDING_MODERATION' }, 201)
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, 'submission-result-dialog', { modal: true })
})

test('Ondas meus links: status, filtros, edição e anexos', async ({ page }, info) => {
  const fixture = await signedIn(page), id = await ownLink(fixture)
  const statuses = ['PUBLISHED', 'PENDING_MODERATION', 'PRE_REJECTED', 'DRAFT', 'UNAVAILABLE']
  const link = { id, name: 'Comunidade de criação', description: 'Encontros, referências e projetos compartilhados.', status: 'PUBLISHED', network: { name: 'Site', slug: 'site' }, niche: { name: 'Arte', slug: 'arte' } }
  const mine = await jsonFixture(page, '/links/mine', { links: statuses.map((status, index) => ({ ...link, id: index ? 'visual-link-' + index : id, status, name: index ? 'Comunidade · ' + status : link.name })), slotsUsed: 1 })
  await page.route(url => /^\/bff\/v1\/analytics\/links\/[^/]+$/.test(url.pathname), route => route.fulfill({ json: { impressions: 1200, clicks: 90, ctr: 7.5 } }))
  const media = await jsonFixture(page, '/links/' + id + '/media', { version: 2, assets: [], reviews: [] })
  await jsonFixture(page, '/links/' + id + '/discovery', { version: 1, metadata: { cityId: null, languageTag: 'pt', modality: 'ONLINE' } })
  await visit(page, fixture, '/painel/links'); await ready(page)
  await shot(page, info, 'my-links-statuses')
  await openSelect(page, info, 'Situação do link', 'my-links-status-options')
  await page.getByRole('searchbox', { name: 'Buscar nos meus links' }).fill('nenhum resultado visual')
  await shot(page, info, 'my-links-filter-empty')
  mine.set({ links: [] }); await page.reload(); await ready(page); await shot(page, info, 'my-links-empty')
  mine.set({ message: 'Links indisponíveis.' }, 503); await page.reload(); await ready(page); await shot(page, info, 'my-links-error')
  const releaseList = mine.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'my-links-loading', { loading: true }) } finally { releaseList() }
  mine.set({ links: [link] })
  await visit(page, fixture, '/painel/links/' + id + '/editar'); await ready(page)
  await shot(page, info, 'link-editor-no-media')
  await jsonFixture(page, '/links/' + id, { message: 'Texto não foi salvo. Seus dados foram mantidos.' }, 409)
  await page.getByLabel('Nova descrição').fill('Descrição atualizada, ainda em rascunho neste formulário.')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText('Texto não foi salvo')
  await shot(page, info, 'link-editor-save-error')
  media.set({ version: 3, assets: [{ id: 'visual-icon', kind: 'ICON', status: 'APPROVED', url: image, alt: null }, { id: 'visual-cover', kind: 'IMAGE', status: 'APPROVED', url: image, alt: 'Capa aprovada local' }, { id: 'visual-pending-cover', kind: 'IMAGE', status: 'PENDING', url: image, alt: 'Nova capa em análise' }], reviews: [{ kind: 'IMAGE', reason: 'Escolha uma imagem legível.' }] })
  await page.reload(); await ready(page)
  await expect(page.getByRole('img', { name: 'Capa aprovada local' })).toBeVisible()
  await shot(page, info, 'link-editor-approved-pending-rejected-media')
  mine.set({ links: [{ ...link, pendingText: { name: 'Nome proposto', description: 'Texto aguardando revisão.' } }] })
  await page.reload(); await ready(page)
  await shot(page, info, 'link-editor-pending-text')
  mine.set({ links: [] }); await page.reload(); await ready(page)
  await expect(page.getByText('Link não encontrado.', { exact: true })).toBeVisible(); await shot(page, info, 'link-editor-not-found')
  mine.set({ message: 'Links indisponíveis.' }, 503); await page.reload(); await ready(page)
  await shot(page, info, 'link-editor-error')
  const release = mine.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'link-editor-loading', { loading: true }) } finally { release() }
})

test('Ondas contestação: pendência e resposta preservam texto', async ({ page }, info) => {
  const fixture = await signedIn(page), id = await ownLink(fixture)
  const response = await jsonFixture(page, '/links/' + id + '/appeal', {}, 409)
  await visit(page, fixture, '/painel/links/' + id + '/contestar'); await ready(page)
  await shot(page, info, 'appeal-empty')
  await page.getByRole('button', { name: 'Enviar contestação' }).click()
  await expect(page.getByLabel('Explique o que aconteceu')).toBeFocused()
  await shot(page, info, 'appeal-validation')
  await page.getByLabel('Explique o que aconteceu').fill('O conteúdo foi atualizado e peço uma nova revisão da descrição.')
  const release = response.hold()
  try { await page.getByRole('button', { name: 'Enviar contestação' }).click(); await expect(page.getByRole('button', { name: 'Enviar contestação' })).toBeDisabled(); await shot(page, info, 'appeal-pending') } finally { release() }
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'appeal-error')
  response.set({}, 201); await page.getByRole('button', { name: 'Enviar contestação' }).click()
  await expect(page.getByRole('status')).toHaveText('Em revisão'); await shot(page, info, 'appeal-submitted')
})

test('Ondas disponibilidade: checagens, histórico e correção', async ({ page }, info) => {
  const fixture = await signedIn(page), id = await ownLink(fixture)
  const initial: AvailabilityData = { link: { id, name: 'Comunidade de criação', canonicalUrl: 'https://example.com/ondas-local', status: 'PUBLISHED' }, availability: { version: 2, state: 'UNKNOWN', checkedAt: null, disabledAt: null, failures: 0 }, proposals: [], pausedPromotions: [], canPropose: true }
  const response = await jsonFixture(page, '/links/' + id + '/availability', initial)
  await jsonFixture(page, '/links/' + id + '/url-proposals', { message: 'A versão mudou. Atualize antes de reenviar.' }, 409)
  for (const state of ['UNKNOWN', 'ACCESSIBLE', 'SUSPECT', 'INCONCLUSIVE', 'UNAVAILABLE'] as const) {
    response.set({ ...initial, availability: { ...initial.availability, state, checkedAt: state === 'UNKNOWN' ? null : when, disabledAt: state === 'UNAVAILABLE' ? when : null, failures: state === 'SUSPECT' ? 2 : 0 }, proposals: state === 'UNAVAILABLE' ? [{ id: 'visual-proposal', canonicalUrl: 'https://example.com/correcao', status: 'REJECTED', createdAt: when, decidedAt: when, decisionReason: 'Revise o convite.' }] : [], pausedPromotions: state === 'UNAVAILABLE' ? [{ id: 'visual-paused', surface: 'HOME', remainingMs: 129600000, pausedAt: when }] : [] })
    await visit(page, fixture, '/painel/links/' + id + '/disponibilidade'); await ready(page)
    await shot(page, info, 'availability-' + state.toLowerCase())
  }
  await page.getByRole('button', { name: 'Corrigir link', exact: true }).click()
  await shot(page, info, 'availability-correction-dialog', { modal: true })
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('https://example.com/novo-convite')
  await dialog.getByRole('button', { name: /Enviar/ }).click()
  await expect(dialog.getByRole('alert')).toBeVisible(); await shot(page, info, 'availability-correction-conflict', { modal: true })
  await page.keyboard.press('Escape')
  for (const status of [503, 403]) {
    response.set({ message: 'Indisponível nesta simulação.' }, status); await page.reload(); await ready(page)
    await shot(page, info, status === 403 ? 'availability-denied' : 'availability-error')
  }
  const release = response.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'availability-loading', { loading: true }) } finally { release() }
})

test('Ondas resultado: cobertura, gráficos, tabela e filtros', async ({ page }, info) => {
  const fixture = await signedIn(page), id = await ownLink(fixture)
  const totals = { impressions: 1800, clicks: 135, ctr: 7.5, investmentCents: 2900, cpcCents: 32, paidClicks: 90 }
  const report: PerformanceReport = { link: { id, name: 'Comunidade de criação' }, from: '2026-10-18', to: '2026-10-24', days: 7, promotionId: null, totals, daily: Array.from({ length: 7 }, (_, index) => ({ ...totals, day: '2026-10-' + (18 + index), impressions: 100 + index * 20, clicks: 10 + index, available: true, highlighted: true })), surfaces: [{ ...totals, surface: 'HOME' }, { ...totals, surface: 'SEARCH' }], coverage: { status: 'COMPLETE', availableFrom: '2026-01-01', investment: 'COMPLETE', currentDayPartial: false }, dataState: 'RECORDED', comparison: { from: '2026-10-11', to: '2026-10-17', days: 7, totals, coverage: 'COMPLETE' }, campaigns: [{ id: 'visual-campaign', surface: 'HOME', status: 'ACTIVE', activatedAt: when, expiresAt: '2026-11-01T12:00:00Z', administrative: false }] }
  const response = await jsonFixture(page, '/analytics/links/' + id + '/performance', report)
  await visit(page, fixture, '/painel/links/' + id + '/resultado'); await ready(page)
  await expect(page.getByRole('region', { name: 'Cliques por dia', exact: true }).locator('.recharts-surface')).toBeVisible()
  await shot(page, info, 'performance-charts')
  await tab(page, 'Tabela', 'Visualização dos resultados'); await shot(page, info, 'performance-table')
  for (const [label, body] of [
    ['no-events', { ...report, dataState: 'NO_EVENTS', totals: { impressions: 0, clicks: 0, ctr: 0, investmentCents: null, cpcCents: null, paidClicks: 0 }, daily: [], surfaces: [] }],
    ['partial', { ...report, coverage: { ...report.coverage, status: 'PARTIAL', investment: 'UNLINKED_HISTORY', currentDayPartial: true } }],
    ['outside-retention', { ...report, dataState: 'OUTSIDE_RETENTION', coverage: { ...report.coverage, status: 'UNAVAILABLE' } }],
  ] as const) {
    response.set(body); await page.reload(); await ready(page)
    if (label === 'partial') await expect(page.getByRole('region', { name: 'Cliques por dia', exact: true }).locator('.recharts-surface')).toBeVisible()
    if (label === 'outside-retention') await expect(page.getByRole('status').filter({ hasText: 'fora do prazo de retenção' })).toBeVisible()
    await shot(page, info, 'performance-' + label)
  }
  for (const status of [400, 403, 503]) {
    response.set({ message: 'Período inválido nesta simulação.' }, status); await page.reload(); await ready(page)
    await shot(page, info, 'performance-http-' + status)
  }
  const release = response.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'performance-loading', { loading: true }) } finally { release() }
})

test('Ondas checkout de destaque: escolhas, Pix e retorno sem cobrança real', async ({ page }, info) => {
  const fixture = await signedIn(page), id = await ownLink(fixture)
  const catalog = await jsonFixture(page, '/promotions/offers', { offers, cardEnabled: false })
  const mine = await jsonFixture(page, '/orders/mine', { orders: [] })
  const charge = await jsonFixture(page, '/promotions/checkout', { message: 'Não foi possível iniciar o pagamento.' }, 409)
  await jsonFixture(page, '/promotions/renew', { message: 'Renovação indisponível nesta simulação.' }, 409)
  const order = await jsonFixture(page, '/orders/visual-order', { id: 'visual-order', linkId: id, status: 'PENDING_PAYMENT', amountCents: 2900, brCode: 'PIX-LOCAL-SEM-VALOR', pixExpiresAt: '2026-10-25T12:00:00Z' })
  await visit(page, fixture, '/painel/links/' + id + '/destaque'); await ready(page)
  for (const duration of [7, 14, 28]) {
    await page.getByRole('radio', { name: duration + ' dias', exact: true }).check()
    await shot(page, info, 'checkout-plans-' + duration)
  }
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Cartão', exact: true })).toBeDisabled()
  await shot(page, info, 'checkout-method-card-unavailable')
  await page.getByRole('button', { name: 'Pagar com Pix', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'checkout-rejected')
  charge.set({ orderId: 'visual-order', amountCents: 2900 })
  order.set({ id: 'visual-order', linkId: id, status: 'PENDING_PAYMENT', amountCents: 2900 })
  await page.getByRole('button', { name: 'Pagar com Pix', exact: true }).click()
  await expect(page.getByText('Gerando cobrança Pix', { exact: true })).toBeVisible()
  await shot(page, info, 'checkout-pix-generating', { loading: true })
  mine.set({ orders: [{ id: 'visual-order', linkId: id, status: 'PENDING_PAYMENT', amountCents: 2900 }] })
  order.set({ id: 'visual-order', linkId: id, status: 'PENDING_PAYMENT', amountCents: 2900, brCode: 'PIX-LOCAL-SEM-VALOR', pixExpiresAt: '2026-10-25T12:00:00Z' })
  await page.reload(); await expect(page.getByRole('img', { name: 'QR Code Pix' })).toBeVisible()
  await shot(page, info, 'checkout-pix-ready')
  order.set({ id: 'visual-order', linkId: id, status: 'EXPIRED', amountCents: 2900 }); await page.reload()
  await expect(page.getByRole('status', { name: 'Situação', exact: true })).toHaveText('Pix expirado')
  await shot(page, info, 'checkout-pix-expired')
  for (const status of ['PAID', 'PAID_LATE']) {
    order.set({ id: 'visual-order', linkId: id, status, amountCents: 2900 })
    await visit(page, fixture, '/painel/links/' + id + '/destaque')
    await expect(page.getByRole('status').filter({ hasText: 'Concluído' })).toBeVisible()
    await shot(page, info, 'checkout-' + status.toLowerCase())
  }
  mine.set({ orders: [] }); catalog.set({ offers: [], cardEnabled: false }); await page.reload(); await ready(page)
  await shot(page, info, 'checkout-no-offers')
  catalog.set({ message: 'Planos indisponíveis.' }, 503); await page.reload(); await ready(page)
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'checkout-error')
  catalog.set({ offers, cardEnabled: false }); await visit(page, fixture, '/painel/links/' + id + '/destaque?renew=SEARCH'); await ready(page)
  await shot(page, info, 'checkout-renew-search')
  const release = catalog.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'checkout-loading', { loading: true }) } finally { release() }
})

test('Ondas moderação: quatro abas, anexos e diálogos de recusa', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const textCase = { id: 'visual-review', linkId: 'visual-link', name: 'Comunidade de criação', description: 'Encontros, referências e projetos compartilhados.', url: 'https://example.com/comunidade', status: 'PENDING_MODERATION', niche: 'Arte', network: 'Site', ownerName: 'Ana Ondas', ownerEmail: 'ana@fixture.test', source: 'APPEAL', appealText: 'O conteúdo foi atualizado para revisão.', previousName: 'Nome anterior da comunidade', previousDescription: 'Descrição anterior.' }
  const links = await jsonFixture(page, '/admin/moderation', { cases: [textCase, { ...textCase, id: 'visual-text-review', source: 'TEXT', appealText: null }] })
  const attachments = await jsonFixture(page, '/admin/moderation/media', { assets: [
    { id: 'visual-icon', linkId: 'visual-link', kind: 'ICON', name: 'Comunidade de criação', version: 3, url: image, alt: null, ownerName: 'Ana Ondas', network: { name: 'Site', slug: 'site' }, niche: { name: 'Arte', slug: 'arte' }, canApprove: true },
    { id: 'visual-cover', linkId: 'visual-link', kind: 'IMAGE', name: 'Comunidade de criação', version: 3, url: image, alt: 'Imagem proposta da comunidade', ownerName: 'Ana Ondas', canApprove: true },
    { id: 'visual-old-cover', linkId: 'visual-withdrawn', kind: 'IMAGE', name: 'Link retirado', version: 4, url: image, alt: 'Imagem de envio inelegível', canApprove: false },
  ] })
  await page.route(url => /^\/bff\/v1\/admin\/moderation(?:\/media)?\/[^/]+$/.test(url.pathname), route => route.request().method() === 'POST' ? route.fulfill({ status: 409, json: { message: 'Este envio mudou. Atualize antes de decidir.' } }) : route.fallback())
  const content = await jsonFixture(page, '/admin/content-reviews', { cases: [] })
  await page.route(url => /^\/bff\/v1\/admin\/content-reviews\/[^/]+\/decision$/.test(url.pathname), route => route.fulfill({ status: 409, json: { message: 'A versão mudou. Seus dados foram mantidos.' } }))
  await visit(page, fixture, '/admin/moderacao'); await ready(page)
  await expect(page.getByRole('heading', { name: 'Comunidade de criação', exact: true }).first()).toBeVisible()
  await shot(page, info, 'moderation-links-appeal-and-text')
  await openSelect(page, info, 'Origem da revisão', 'moderation-source-options')
  await page.getByRole('searchbox', { name: 'Buscar na fila' }).fill('sem resultado visual')
  await shot(page, info, 'moderation-links-filter-empty')
  await page.getByRole('searchbox', { name: 'Buscar na fila' }).fill('')
  await tab(page, 'Anexos', 'Tipo de publicação')
  await expect(page.getByRole('img', { name: 'Imagem proposta da comunidade', exact: true })).toBeVisible()
  await shot(page, info, 'moderation-attachments-filled')
  await openSelect(page, info, 'Tipo de anexo', 'moderation-attachment-kind-options')
  const cover = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Comunidade de criação · Imagem', exact: true }) })
  await cover.getByRole('button', { name: 'Aprovar anexo', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Análise de anexos', exact: true }).getByRole('alert')).toContainText('mudou')
  await shot(page, info, 'moderation-attachment-approval-conflict')
  await cover.getByRole('button', { name: 'Rejeitar anexo' }).click()
  await shot(page, info, 'moderation-attachment-rejection-empty', { modal: true })
  const rejection = page.getByRole('dialog', { name: 'Rejeitar anexo' })
  await rejection.getByRole('button', { name: 'Confirmar rejeição' }).click()
  await expect(rejection.getByLabel('Motivo da recusa')).toBeFocused()
  await page.keyboard.press('Tab')
  await shot(page, info, 'moderation-attachment-rejection-validation', { modal: true })
  await rejection.getByLabel('Motivo da recusa').fill('A imagem não está legível. Envie uma nova proposta.')
  await rejection.getByRole('button', { name: 'Confirmar rejeição' }).click()
  await expect(rejection.getByRole('alert')).toContainText('mudou')
  await shot(page, info, 'moderation-attachment-rejection-conflict', { modal: true }); await page.keyboard.press('Escape')
  for (const [label, kind, snapshot] of [
    ['Minha página', 'PROFILE', { name: 'Página da Ana', bio: 'Referências e projetos da comunidade.', requiresAge: false, categories: [{ id: 'visual-group', name: 'Projetos', visible: true }], items: [{ id: 'visual-item', categoryId: 'visual-group', label: 'Conheça o projeto', type: 'URL', destination: 'https://example.com/projeto', visible: true }] }],
    ['Links permanentes', 'REDIRECT', { label: 'Acesso à comunidade', destinationUrl: 'https://example.com/convite', requiresAge: false }],
  ] as const) {
    content.set({ cases: [{ id: 'visual-content-' + kind, kind, version: 2, status: 'PENDING', ownerName: 'Ana Ondas', snapshot, appealText: 'Atualizei o conteúdo para revisão.', createdAt: when, reason: null, canAppeal: false }] })
    await tab(page, label, 'Tipo de publicação'); await ready(page)
    await expect(page.getByRole('button', { name: 'Recusar', exact: true })).toBeVisible()
    await shot(page, info, 'moderation-' + kind.toLowerCase() + '-filled')
    await page.getByRole('button', { name: 'Recusar', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Motivo da recusa').fill('Revise a descrição antes de publicar.')
    await shot(page, info, 'moderation-' + kind.toLowerCase() + '-rejection', { modal: true }); await page.keyboard.press('Escape')
  }
  attachments.set({ assets: [] }); await page.reload(); await tab(page, 'Anexos', 'Tipo de publicação'); await ready(page)
  await shot(page, info, 'moderation-attachments-empty')
  attachments.set({ message: 'Fila indisponível.' }, 503); await page.reload(); await tab(page, 'Anexos', 'Tipo de publicação'); await ready(page)
  await shot(page, info, 'moderation-attachments-error')
  attachments.set({ message: 'Sem permissão.' }, 403); await page.reload(); await tab(page, 'Anexos', 'Tipo de publicação'); await ready(page)
  await shot(page, info, 'moderation-attachments-denied')
  links.set({ cases: [] }); await page.reload(); await ready(page); await shot(page, info, 'moderation-links-empty')
  links.set({}, 503); await page.reload(); await ready(page); await shot(page, info, 'moderation-links-error')
  const release = links.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'moderation-links-loading', { loading: true }) } finally { release() }
})

test('Ondas denúncias: estados, filtros e decisão preservada', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const row: ReportQueueRow = { id: 'visual-report', linkId: 'visual-link', status: 'RECEIVED', reason: 'INAPPROPRIATE_CONTENT', kind: 'CONTENT', comment: 'O título não corresponde ao conteúdo encontrado.', version: 2, createdAt: when, updatedAt: when, decisionReason: null, link: { name: 'Comunidade de criação', status: 'PUBLISHED' }, history: [{ id: 'visual-history', action: 'REPORT_RECEIVED', after: { status: 'RECEIVED' }, createdAt: when }] }
  const data = await jsonFixture(page, '/admin/reports', { reports: [row, { ...row, id: 'visual-report-availability', kind: 'AVAILABILITY', reason: 'EXPIRED_INVITE', status: 'IN_REVIEW' }, { ...row, id: 'visual-report-resolved', status: 'RESOLVED', decisionReason: 'Revisão concluída.' }], nextCursor: null })
  await jsonFixture(page, '/admin/reports/visual-report/decision', { message: 'A denúncia mudou. Atualize antes de decidir.' }, 409)
  await visit(page, fixture, '/admin/denuncias'); await ready(page)
  await expect(page.getByRole('article', { name: 'Denúncia visual-report', exact: true })).toBeVisible()
  await shot(page, info, 'reports-filled-states')
  await openSelect(page, info, 'Tipo', 'reports-kind-options')
  const card = page.getByRole('article', { name: 'Denúncia visual-report', exact: true })
  await card.getByLabel('Justificativa').fill('Vamos revisar o conteúdo antes de encerrar o relato.')
  await card.getByRole('button', { name: 'Salvar decisão' }).click()
  await expect(card.getByRole('alert')).toContainText('mudou')
  await shot(page, info, 'reports-decision-conflict')
  data.set({ reports: [], nextCursor: null }); await page.reload(); await ready(page); await shot(page, info, 'reports-empty')
  for (const status of [400, 403, 503]) { data.set({ message: 'Fila indisponível.' }, status); await page.reload(); await ready(page); await shot(page, info, 'reports-http-' + status) }
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'reports-loading', { loading: true }) } finally { release() }
})

test('Ondas correções administrativas: contexto e decisão', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const row: UrlProposal = { id: 'visual-url-proposal', linkId: 'visual-link', sourceUrl: 'https://example.com/antigo', canonicalUrl: 'https://example.com/novo-convite', status: 'PENDING', version: 3, createdAt: when, decidedAt: null, decisionReason: null, link: { name: 'Comunidade de criação', status: 'UNAVAILABLE' } }
  const data = await jsonFixture(page, '/admin/url-proposals', { proposals: [row, { ...row, id: 'visual-context-missing', version: null }], nextCursor: null })
  await jsonFixture(page, '/admin/url-proposals/' + row.id + '/decision', { message: 'A versão mudou. Sua justificativa foi mantida.' }, 409)
  await visit(page, fixture, '/admin/disponibilidade'); await ready(page)
  await expect(page.getByRole('article', { name: 'Correção ' + row.id })).toBeVisible()
  await shot(page, info, 'url-proposals-filled-and-missing-context')
  await openSelect(page, info, 'Decisão', 'url-proposals-decision-options')
  const card = page.getByRole('article', { name: 'Correção ' + row.id })
  await selectOption(card.getByRole('combobox', { name: 'Decisão' }), 'REJECT')
  await card.getByLabel('Justificativa').fill('Revise o convite para que o destino possa ser verificado.')
  await card.getByRole('button', { name: 'Salvar decisão' }).click()
  await expect(card.getByRole('alert')).toContainText('versão mudou')
  await shot(page, info, 'url-proposals-conflict')
  data.set({ proposals: [], nextCursor: null }); await page.reload(); await ready(page); await shot(page, info, 'url-proposals-empty')
  for (const status of [403, 503]) { data.set({}, status); await page.reload(); await ready(page); await shot(page, info, 'url-proposals-http-' + status) }
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'url-proposals-loading', { loading: true }) } finally { release() }
})

test('Ondas estornos: situações e falhas sem movimentar valores', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const data = await jsonFixture(page, '/admin/refunds', { refunds: ['REFUND_PENDING', 'REFUND_FAILED', 'REFUNDED', 'PAID_LATE'].map((status, index) => ({ orderId: 'visual-refund-' + index, userId: fixture.ownerId, userName: 'Ana Ondas', userEmail: 'ana@fixture.test', linkId: 'visual-link', linkName: 'Comunidade de criação', productCode: 'SEARCH_NICHE_HOME', durationDays: 28, method: index % 2 ? 'CARD' : 'PIX', amountCents: 4900, refundIds: index ? ['visual-provider-refund'] : [], attempts: index + 1, errors: status === 'REFUND_FAILED' ? ['Provedor indisponível.'] : [], createdAt: when, message: status === 'PAID_LATE' ? 'Pagamento confirmado após o prazo.' : null, status })) })
  await jsonFixture(page, '/admin/refunds/visual-refund-1/resolved', {}, 409)
  await visit(page, fixture, '/admin/estornos'); await ready(page)
  await shot(page, info, 'refunds-filled-states')
  await openSelect(page, info, 'Situação do estorno', 'refunds-status-options')
  await page.getByRole('button', { name: 'Marcar como estornado' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'refunds-resolution-error')
  await page.getByRole('searchbox', { name: 'Buscar estorno' }).fill('sem resultado visual')
  await shot(page, info, 'refunds-resolution-error-filter-empty')
  await page.reload(); await ready(page)
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.refund-grid > article')).toHaveCount(4)
  await page.getByRole('searchbox', { name: 'Buscar estorno' }).fill('sem resultado visual')
  await expect(page.getByRole('status').filter({ hasText: 'Nada por aqui ainda.' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.refund-grid > article')).toHaveCount(0)
  await shot(page, info, 'refunds-filter-empty')
  data.set({ refunds: [] }); await page.reload(); await ready(page); await shot(page, info, 'refunds-empty')
  data.set({}, 503); await page.reload(); await ready(page); await shot(page, info, 'refunds-error')
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'refunds-loading', { loading: true }) } finally { release() }
})

test('Ondas planos de destaque: durações e edição local', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const data = await jsonFixture(page, '/promotions/offers', { offers })
  const save = await jsonFixture(page, '/admin/offers/VISUAL_0', { message: 'Não foi possível salvar. Seus valores foram mantidos.' }, 503)
  await visit(page, fixture, '/admin/planos'); await ready(page)
  for (const duration of [7, 14, 28]) { await page.getByRole('radio', { name: duration + ' dias', exact: true }).check(); await shot(page, info, 'admin-offers-' + duration) }
  const edit = page.getByRole('article').filter({ hasText: 'Busca' }).first().getByRole('button', { name: 'Editar', exact: true })
  await edit.click(); await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, 'admin-offer-edit', { modal: true })
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nome', { exact: true }).fill('X'); await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible(); await shot(page, info, 'admin-offer-validation', { modal: true })
  await dialog.getByLabel('Nome', { exact: true }).fill('Busca criativa')
  const releaseSave = save.hold()
  try { await dialog.getByRole('button', { name: 'Salvar', exact: true }).click(); await expect(dialog.getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled(); await shot(page, info, 'admin-offer-saving', { modal: true }) } finally { releaseSave() }
  await expect(dialog.getByRole('alert')).toContainText('valores foram mantidos'); await shot(page, info, 'admin-offer-save-error', { modal: true })
  await page.keyboard.press('Escape'); await expect(edit).toBeFocused()
  data.set({ offers: [] }); await page.reload(); await ready(page); await shot(page, info, 'admin-offers-empty')
  data.set({}, 503); await page.reload(); await ready(page); await shot(page, info, 'admin-offers-error')
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'admin-offers-loading', { loading: true }) } finally { release() }
})

test('Ondas assinaturas administrativas: configuração, pendências e etapas', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const capabilities = ['profile.page', 'profile.categories', 'profile.appearance', 'profile.history', 'profile.analytics', 'profile.richBlocks'].map((key, index) => ({ key, label: ['Página pública', 'Categorias', 'Aparência', 'Histórico', 'Estatísticas dos botões', 'Blocos de conteúdo'][index]!, delivered: true }))
  const initial = { settings: { enabled: false, fiscalReviewed: false, publicOrigin: fixture.origin, livemode: false, version: 1 }, providerConfigured: false, webhookReady: false, salesEnabled: false, plans: [], capabilities, failedOperations: [{ id: 'visual-cancel', kind: 'CANCEL', lastError: 'Provedor indisponível', attempts: 3, createdAt: when }], failedEvents: [{ id: 'visual-event', lastError: 'Confirmação pendente', attempts: 2, receivedAt: when }], reviews: [{ id: 'visual-subscription-review', status: 'REVIEW', reviewReason: 'Conferir o pagamento no provedor.', updatedAt: when }] }
  const data = await jsonFixture(page, '/admin/profile-billing', initial)
  await jsonFixture(page, '/admin/profile-billing/settings', { message: 'Revise a configuração fiscal.' }, 409)
  await jsonFixture(page, '/admin/profile-billing/plans', { message: 'Confira o preço mensal e os recursos.' }, 409)
  await visit(page, fixture, '/admin/assinaturas'); await ready(page)
  await shot(page, info, 'admin-billing-incomplete-and-pending')
  await page.getByRole('button', { name: 'Configurar vendas' }).click()
  await shot(page, info, 'admin-billing-settings', { modal: true })
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar configuração' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('fiscal')
  await shot(page, info, 'admin-billing-settings-error', { modal: true }); await page.keyboard.press('Escape')
  await page.getByRole('article', { name: 'Configuração PRO', exact: true }).getByRole('button', { name: 'Configurar plano' }).click()
  await shot(page, info, 'admin-billing-plan-price-empty', { modal: true })
  await page.getByLabel('Valor mensal em reais').fill('12.90'); await page.getByLabel('Código do preço na Stripe').fill('price_visual_local')
  await shot(page, info, 'admin-billing-plan-price-filled', { modal: true })
  await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click()
  await shot(page, info, 'admin-billing-plan-capabilities', { modal: true })
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar configuração' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('pelo menos um recurso')
  await shot(page, info, 'admin-billing-plan-validation', { modal: true })
  await page.getByRole('dialog').getByLabel('Estatísticas dos botões', { exact: true }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar configuração' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Confira o preço')
  await shot(page, info, 'admin-billing-plan-save-error', { modal: true }); await page.keyboard.press('Escape')
  data.set({ ...initial, settings: { ...initial.settings, enabled: true, fiscalReviewed: true }, providerConfigured: true, webhookReady: true, salesEnabled: true, plans: ['PRO', 'PREMIUM'].map((tier, index) => ({ id: 'visual-plan-' + tier, tier, title: tier === 'PRO' ? 'Pro' : 'Premium', enabled: true, version: 2, versions: [{ id: 'visual-version-' + tier, amountCents: index ? 2490 : 1290, providerPriceId: 'price_visual_' + tier, capabilities: capabilities.slice(0, index ? 6 : 5).map(item => item.key), version: 2 }] })), failedOperations: [], failedEvents: [], reviews: [] })
  await page.reload(); await ready(page); await shot(page, info, 'admin-billing-configured-no-pending')
  data.set({}, 503); await page.reload(); await ready(page); await shot(page, info, 'admin-billing-error')
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'admin-billing-loading', { loading: true }) } finally { release() }
})

test('Ondas configurações: vidro, switches, resumos e limiar', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const facet = { id: 'visual-facet', name: 'Arte', slug: 'arte', requiresAge: false, isPublicFacet: true, summary: 'Encontre referências, grupos e projetos para criar em comunidade.', substantiveCount: 8, indexable: true }
  const data = await jsonFixture(page, '/admin/facets', { niches: [facet, { ...facet, id: 'visual-adult', name: 'Conteúdo adulto', requiresAge: true, indexable: false, summary: null }], networks: [{ ...facet, id: 'visual-network', name: 'Site', slug: 'site' }] })
  await jsonFixture(page, '/admin/settings/impressions', { showImpressions: true })
  const moderation = await jsonFixture(page, '/admin/settings/moderation', { threshold: 0.8 })
  await jsonFixture(page, '/admin/config/MODERATION_AUTO_APPROVE_THRESHOLD', { message: 'Não foi possível salvar. Seu ajuste foi mantido.' }, 409)
  await jsonFixture(page, '/admin/facets/niche/visual-facet', { message: 'Resumo não foi salvo. Tente novamente.' }, 503)
  await visit(page, fixture, '/admin/configuracoes'); await ready(page)
  await expect(page.getByRole('slider', { name: 'Limiar de aprovação da IA' })).toBeVisible()
  await shot(page, info, 'settings-filled')
  await openSelect(page, info, 'Tipo de catálogo', 'settings-catalog-type-options')
  await page.getByRole('button', { name: /Arte/ }).click()
  await shot(page, info, 'settings-summary-editor', { modal: true })
  await page.getByRole('dialog').getByLabel('Resumo de Arte').fill('Comunidades e referências para quem gosta de criar.')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar Arte' }).click()
  await expect(page.getByRole('dialog').getByText('Resumo não foi salvo. Tente novamente.')).toBeVisible()
  await shot(page, info, 'settings-summary-save-error', { modal: true }); await page.keyboard.press('Escape')
  const slider = page.getByRole('slider', { name: 'Limiar de aprovação da IA' })
  await slider.focus(); await page.keyboard.press('Home'); await shot(page, info, 'settings-threshold-zero-warning')
  await page.getByRole('button', { name: 'Salvar limiar' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'settings-threshold-save-error')
  data.set({ niches: [], networks: [] }); await page.reload(); await ready(page); await shot(page, info, 'settings-facets-empty')
  data.set({}, 503); moderation.set({ message: 'Limiar indisponível.' }, 503); await page.reload(); await ready(page)
  await shot(page, info, 'settings-load-error')
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'settings-loading', { loading: true }) } finally { release() }
})

test('Ondas destaques administrativos: consulta e todas as condições do diálogo', async ({ page }, info) => {
  const fixture = await signedIn(page, true), id = await ownLink(fixture)
  const found = await jsonFixture(page, '/links/' + id, { id, name: 'Comunidade de criação', available: true })
  const initial = { promotions: [], allowedSurfaces: ['SEARCH', 'NICHE', 'HOME'], eligible: true }
  const data = await jsonFixture(page, '/admin/links/' + id + '/promotions', initial)
  await visit(page, fixture, '/admin/destaques'); await ready(page)
  await shot(page, info, 'admin-highlight-empty')
  await page.getByLabel('Endereço do link no catálogo').fill('https://example.com/link/qualquer')
  await page.getByRole('button', { name: 'Consultar link' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('deste catálogo'); await shot(page, info, 'admin-highlight-invalid-url')
  await page.getByLabel('Endereço do link no catálogo').fill(fixture.origin + '/link/' + id)
  await page.getByRole('button', { name: 'Consultar link' }).click()
  await expect(page.getByRole('button', { name: 'Gerenciar destaque' })).toBeVisible(); await shot(page, info, 'admin-highlight-found')
  await page.getByRole('button', { name: 'Gerenciar destaque' }).click()
  await expect(page.getByRole('dialog').getByLabel('Onde destacar')).toBeVisible()
  await shot(page, info, 'admin-highlight-dialog-period', { modal: true })
  await openSelect(page, info, 'Onde destacar', 'admin-highlight-placement-options')
  await selectOption(page.getByRole('dialog').getByRole('combobox', { name: 'Período' }), 'indefinite')
  await shot(page, info, 'admin-highlight-indefinite', { modal: true })
  await selectOption(page.getByRole('dialog').getByRole('combobox', { name: 'Período' }), 'custom')
  await shot(page, info, 'admin-highlight-custom-date', { modal: true }); await page.keyboard.press('Escape')
  for (const [name, body] of [
    ['ineligible', { ...initial, eligible: false }],
    ['paid-surfaces', { ...initial, promotions: [{ id: 'visual-paid', surface: 'SEARCH', administrative: false, expiresAt: '2026-11-01T12:00:00Z' }] }],
    ['existing-indefinite', { ...initial, promotions: [{ id: 'visual-admin', surface: 'HOME', administrative: true, expiresAt: null }] }],
  ] as const) {
    data.set(body); await page.getByRole('button', { name: 'Gerenciar destaque' }).click()
    await expect(page.getByRole('dialog').locator('[data-skeleton]')).toHaveCount(0)
    await shot(page, info, 'admin-highlight-' + name, { modal: true }); await page.keyboard.press('Escape')
  }
  data.set({}, 503); await page.getByRole('button', { name: 'Gerenciar destaque' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible(); await shot(page, info, 'admin-highlight-dialog-error', { modal: true }); await page.keyboard.press('Escape')
  const release = data.hold()
  try { await page.getByRole('button', { name: 'Gerenciar destaque' }).click(); await expect(page.getByRole('dialog').locator('[data-skeleton]')).toBeVisible(); await shot(page, info, 'admin-highlight-dialog-loading', { loading: true, modal: true }) } finally { release() }
  await page.keyboard.press('Escape')
  found.set({}, 404); await page.getByRole('button', { name: 'Consultar link' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'admin-highlight-not-found')
})

test('Ondas integração WhatsApp: estados operacionais sem envio', async ({ page }, info) => {
  const fixture = await signedIn(page, true)
  const initial = { configured: true, enabled: true, actionsEnabled: true, connection: 'open', instance: 'Instância local de demonstração', group: 'Grupo operacional local', backlog: 3, version: 'visual-v1', operators: [{ phone: '5511999990000', enabled: true }], allowedPhones: ['5511999990000', '5511999990001'], messages: ['PENDING', 'PROCESSING', 'SENT', 'RETRY', 'UNCERTAIN', 'DEAD', 'CANCELLED'].map((state, index) => ({ id: 'visual-delivery-' + index, kind: index === 0 ? 'REVIEW_MEDIA' : index === 1 ? 'REVIEW_TEXT' : 'DECISION', state, attempts: index + 1, lastErrorCode: state === 'UNCERTAIN' ? 'delivery_unconfirmed' : null, createdAt: when })) }
  const data = await jsonFixture(page, '/admin/integrations/evolution/status', initial)
  const change = await jsonFixture(page, '/admin/integrations/evolution/settings', { message: 'Integração indisponível. Confira o estado antes de tentar novamente.' }, 503)
  await page.route(url => /^\/bff\/v1\/admin\/integrations\/evolution\/(deliveries|operators)\//.test(url.pathname), route => route.fulfill({ status: 503, json: { message: 'Operação local simulada; nenhuma mensagem enviada.' } }))
  await visit(page, fixture, '/admin/integracoes'); await ready(page)
  await shot(page, info, 'evolution-connected-delivery-states')
  const uncertain = page.getByRole('article').filter({ hasText: 'Entrega incerta' })
  await uncertain.getByRole('button', { name: 'Reprocessar entrega' }).click()
  await shot(page, info, 'evolution-uncertain-confirmation')
  await uncertain.getByRole('button', { name: 'Confirmar reenvio' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('nenhuma mensagem enviada'); await shot(page, info, 'evolution-operation-error')
  const releaseChange = change.hold()
  try { await page.getByRole('button', { name: 'Desativar avisos' }).click(); await expect(page.getByRole('button', { name: 'Desativar avisos' })).toBeDisabled(); await shot(page, info, 'evolution-settings-pending') } finally { releaseChange() }
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Integração indisponível')
  data.set({ ...initial, configured: false, enabled: false, actionsEnabled: false, connection: 'close', instance: '', group: '', backlog: 0, operators: [], allowedPhones: [], messages: [] }); await page.reload(); await ready(page)
  await shot(page, info, 'evolution-unconfigured-empty')
  data.set({}, 503); await page.reload(); await ready(page); await shot(page, info, 'evolution-error')
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'evolution-loading', { loading: true }) } finally { release() }
})

test('Ondas gestão: todas as áreas, subabas e apresentações de relatórios', async ({ page }, info) => {
  test.setTimeout(300_000)
  const fixture = await signedIn(page, true)
  const baseline = await roadmapApi(page, '/admin/office')
  expect(baseline.status).toBe(200)
  const statuses = ['PUBLISHED', 'PENDING_MODERATION', 'PRE_REJECTED', 'DRAFT', 'UNAVAILABLE']
  const office = { ...baseline.body, windowDays: 30, listCap: 40, linkStatusCounts: Object.fromEntries(statuses.map(status => [status, 1])), metrics: { users: 12, bannedUsers: 1, links: 5, publishedLinks: 1, pendingLinks: 1, impressions: 2400, clicks: 180, ctr: 7.5, paidCents: 8700, paidOrders: 3 }, topLinks: [{ id: 'visual-office-link', name: 'Comunidade de criação', status: 'PUBLISHED', impressions: 2400, clicks: 180, ctr: 7.5 }], topPayers: [{ userId: 'visual-user', name: 'Ana Ondas', email: 'ana@fixture.test', status: 'ACTIVE', paidCents: 8700, orders: 3 }], users: [{ id: 'visual-user', name: 'Ana Ondas', email: 'ana@fixture.test', status: 'ACTIVE', role: 'USER', links: 3 }, { id: 'visual-banned', name: 'Conta suspensa', email: 'suspensa@fixture.test', status: 'BANNED', role: 'USER', links: 0 }], links: statuses.map((status, index) => ({ id: 'visual-office-link-' + index, name: 'Comunidade · ' + status, status, url: 'https://example.com/comunidade', ownerName: 'Ana Ondas', ownerEmail: 'ana@fixture.test' })) }
  const data = await jsonFixture(page, '/admin/office', office)
  const daily = Array.from({ length: 10 }, (_, index) => { const orders = [1, 2, 3, 4, 5, 1, 2, 3, 4, 1][index]!; return { day: '2026-10-' + String(15 + index).padStart(2, '0'), orders, revenueCents: orders * 1290 } })
  const financeBase = await roadmapApi(page, '/admin/finance')
  expect(financeBase.status).toBe(200)
  const finance = await jsonFixture(page, '/admin/finance', { ...financeBase.body, summary: { revenueCents: 33540, paidOrders: 26, avgTicketCents: 1290, receivedCents: 33540, refundedCents: 0, refundOwedCents: 2900, feesCents: 650, netCents: 29990, savingsCents: 0, buyers: 1, newBuyers: 1, renewalOrders: 0 }, sample: { paidOrders: 26, checkouts: 34 }, daily, methods: [{ method: 'PIX', checkouts: 24, paid: 18, conversion: 0.75, expired: 2, paidLate: 1, pending: 3, revenueCents: 23220, feesCents: 200, medianSecondsToPay: 93 }, { method: 'CARD', checkouts: 10, paid: 8, conversion: 0.8, expired: 0, paidLate: 0, pending: 2, revenueCents: 10320, feesCents: 450, medianSecondsToPay: 36 }], heatmap: [{ weekday: 2, hour: 18, orders: 4, revenueCents: 5160 }, { weekday: 6, hour: 12, orders: 2, revenueCents: 2580 }], timeToPay: [{ label: 'Até 1 minuto', orders: 8 }, { label: 'De 1 a 5 minutos', orders: 18 }], products: [{ productCode: 'SEARCH_NICHE', durationDays: 28, orders: 26, revenueCents: 33540 }], refunds: [{ status: 'REFUND_PENDING', orders: 1, amountCents: 2900 }], campaigns: [{ source: 'comunidade', medium: 'social', campaign: 'projetos', orders: 26, revenueCents: 33540 }], buyers: [{ userId: 'visual-user', name: 'Ana Ondas', email: 'ana@fixture.test', orders: 26, revenueCents: 33540, firstPaidAt: when, lastPaidAt: when, methods: ['PIX'], isNew: true }], buyersTotal: 1 })
  const traffic = await jsonFixture(page, '/admin/traffic', { windowDays: 30, from: '2026-10-01', views: 240, entries: 120, daily: daily.map(row => ({ day: row.day, views: row.orders * 3, entries: row.orders })), paths: [{ path: '/', views: 140, entries: 70 }, { path: '/busca', views: 100, entries: 50 }], campaigns: [{ source: 'comunidade', medium: 'social', campaign: 'projetos', entries: 40 }], consent: { marketing: 12, denied: 8 }, funnel: [{ name: 'CompleteRegistration', count: 12 }, { name: 'StartLinkSubmission', count: 10 }, { name: 'SubmitLink', count: 8 }, { name: 'LinkPublished', count: 6 }], consentedRegistrations: [{ source: 'comunidade', medium: 'social', campaign: 'projetos', registrations: 3 }] })
  await jsonFixture(page, '/admin/search-opportunities', { threshold: 5, retentionDays: 90, from: '2026-10-01', to: '2026-10-24', page: 1, total: 2, items: [{ term: 'comunidade de arte', searches: 45, empty: 32, exits: 2, withResults: 13, exitRate: 15.4, opportunity: 'NO_RESULTS' }, { term: 'estudos', searches: 32, empty: 1, exits: 2, withResults: 31, exitRate: 6.5, opportunity: 'LOW_INTERACTION' }], networks: [{ id: 'visual-network', name: 'Site' }], niches: [{ id: 'visual-niche', name: 'Arte' }], coverage: [{ outcome: 'SUCCESS', count: 77 }, { outcome: 'FAILED', count: null }, { outcome: 'GATED', count: null }] })
  await jsonFixture(page, '/admin/retention', { before: '2025-10-24', pending: 320 })
  await jsonFixture(page, '/admin/users/visual-user/support', {}, 503)
  await visit(page, fixture, '/admin/visao'); await ready(page)
  for (const section of ['Métricas', 'Buscas', 'Tráfego', 'Financeiro', 'Mais clicados', 'Pagadores', 'Contas', 'Links', 'Retenção']) {
    await selectOption(page.getByLabel('Área de gestão', { exact: true }), { label: section }); await ready(page)
    const label = section.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-')
    await shot(page, info, 'office-' + label)
    const insights = page.getByRole('tablist', { name: section, exact: true })
    const insightLabels = await insights.getByRole('tab').allTextContents()
    for (const insight of insightLabels.length ? insightLabels : ['principal']) {
      if (insight !== 'principal') { await insights.getByRole('tab', { name: insight.trim(), exact: true }).click(); await ready(page) }
      const sublabel = insight.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-')
      await shot(page, info, 'office-' + label + '-' + sublabel)
      const reports = page.getByRole('tablist', { name: /^Visualização: / })
      for (let index = 0; index < await reports.count(); index++) {
        const report = reports.nth(index)
        for (const name of ['Tabela', 'Gráficos']) {
          const button = report.getByRole('tab', { name, exact: true })
          if (!await button.count()) continue
          await button.click(); await expect(button).toHaveAttribute('aria-selected', 'true')
          await shot(page, info, 'office-' + label + '-' + sublabel + '-report-' + index + '-' + name.toLowerCase())
        }
      }
    }
    if (section === 'Buscas') {
      const interpretation = page.locator('summary').filter({ hasText: 'Como interpretar' })
      await interpretation.click()
      await expect(page.getByText(/Pouca interação: até 10%/)).toBeVisible()
      await shot(page, info, 'office-search-interpretation-open')
      await interpretation.click()
    }
    if (section === 'Contas') {
      await page.getByRole('button', { name: 'Suspender', exact: true }).click()
      await shot(page, info, 'office-suspend-confirmation', { modal: true }); await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
      await page.getByRole('button', { name: 'Detalhes / suporte de Ana Ondas', exact: true }).click()
      await expect(page.getByRole('main').getByRole('alert')).toBeVisible(); await shot(page, info, 'office-support-error')
    }
    if (section === 'Links') {
      await openSelect(page, info, 'Situação dos links', 'office-link-status-options')
      await page.getByRole('button', { name: 'Tirar do ar', exact: true }).click()
      await shot(page, info, 'office-withdraw-published-confirmation', { modal: true }); await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
      await page.getByRole('button', { name: 'Retirar envio', exact: true }).first().click()
      await shot(page, info, 'office-withdraw-pending-confirmation', { modal: true }); await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
    }
  }
  data.set({ ...office, users: [], links: [], topLinks: [], topPayers: [] }); await page.reload(); await ready(page)
  for (const section of ['Contas', 'Links', 'Mais clicados', 'Pagadores']) { await selectOption(page.getByLabel('Área de gestão', { exact: true }), { label: section }); await ready(page); await shot(page, info, 'office-empty-' + section.replaceAll(' ', '-').toLowerCase()) }
  data.set({}, 503); await page.reload(); await ready(page); await shot(page, info, 'office-error')
  const release = data.hold()
  try { await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible(); await shot(page, info, 'office-loading', { loading: true }) } finally { release() }
  // These views have their own failure presentation, independent of the office summary.
  data.set(office); finance.set({}, 503); traffic.set({}, 503); await page.reload(); await ready(page)
  for (const section of ['Financeiro', 'Tráfego']) { await selectOption(page.getByLabel('Área de gestão', { exact: true }), { label: section }); await ready(page); await shot(page, info, 'office-' + section.toLowerCase() + '-error') }
})
