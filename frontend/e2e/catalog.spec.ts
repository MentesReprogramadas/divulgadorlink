import { createSign, generateKeyPairSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { signWooviTestBody } from '../../backend/src/adapters/payments/woovi-test-signing'
import { getRaw, postRaw, promoteJob, redisScan, sql } from './db'

const A = 'http://tenant-a.localhost:3000'
const B = 'http://tenant-b.localhost:3000'
const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as {
  receitas: string
  off: string
  xss: string
  approve: string
  reject: string
  secret: string
  password: string
  bia: string
  eva: string
  admin: string
  dora: string
  tenantA: string
}

const BIA_STATE = path.join(__dirname, 'bia.storage.json')

type Call = { status: number; text: string }

async function login(page: Page, origin: string, email: string): Promise<void> {
  await page.goto(`${origin}/login`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
}

async function call(
  page: Page,
  url: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string>; csrf?: boolean } = {},
): Promise<Call> {
  return page.evaluate(async ({ url, init }) => {
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('csrf='))?.slice(5) ?? ''
    const headers: Record<string, string> = { ...(init.headers ?? {}) }
    if (init.csrf !== false && init.method && init.method !== 'GET') headers['x-csrf-token'] = decodeURIComponent(csrf)
    if (init.body !== undefined) headers['content-type'] = 'application/json'
    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      credentials: 'include',
      body: init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body),
    })
    return { status: response.status, text: await response.text() }
  }, { url, init })
}

async function accessCookie(page: Page): Promise<string> {
  return (await page.context().cookies()).find((cookie) => cookie.name === 'accessToken')?.value ?? ''
}

function assertBiaStateUsable(): void {
  const saved = JSON.parse(readFileSync(BIA_STATE, 'utf8')) as { cookies: Array<{ name: string; value: string }> }
  const token = saved.cookies.find((cookie) => cookie.name === 'accessToken')?.value ?? ''
  const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString() || '{}') as { tenantId?: string; exp?: number }
  if (claims.tenantId !== state.tenantA) {
    throw new Error(`bia.storage.json é de outro seed (tenant ${claims.tenantId ?? 'ausente'}); o projeto setup não rodou nesta execução`)
  }
  if (!claims.exp || claims.exp * 1000 - Date.now() < 15_000) {
    throw new Error('o access token de bia.storage.json venceu; a suíte passou do TTL de 5 min desde o setup')
  }
}

async function asBia(browser: Browser, viewport?: { width: number; height: number }) {
  assertBiaStateUsable()
  const context = await browser.newContext({ storageState: BIA_STATE, ...(viewport ? { viewport } : {}) })
  const page = await context.newPage()
  await page.goto(`${A}/painel`)
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  return { context, page }
}

async function contextOn(browser: Browser, origin: string, email: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, origin, email)
  return { context, page }
}

test('home, SEO, cards e isolamento visual', async ({ browser }) => {
  const page = await browser.newPage()
  const dialogs: string[] = []
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message())
    void dialog.dismiss()
  })
  await page.goto(A)
  await expect(page).toHaveTitle('Tenant A')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Links, comunidades e serviços organizados por tema e rede.')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tenant-a.localhost/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/)
  const og = await page.locator('meta[property="og:url"]').getAttribute('content')
  expect(og).toBe('https://tenant-a.localhost/')
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  expect(jsonLd).toContain('WebSite')
  expect(jsonLd).not.toContain('t.me')
  await expect(page.getByRole('link', { name: 'Receitas' })).toBeVisible()
  await expect(page.locator('article', { has: page.getByRole('link', { name: 'Receitas' }) }).locator('.impression-mark')).toHaveAttribute('aria-label', /\d+ impress/)
  const explore = page.getByRole('region', { name: 'Explorar' })
  await expect(explore.getByRole('link', { name: 'Jogos', exact: true })).toBeVisible()
  await expect(explore.getByRole('link', { name: 'Telegram', exact: true })).toBeVisible()
  await expect(page.getByText('SegredoDoB')).toHaveCount(0)
  await expect(page.getByText('NomeSecretoIndisponivel')).toHaveCount(0)
  await expect(page.getByText('<script>alert(1)</script>')).toBeVisible()
  const html = await page.content()
  expect(html).not.toContain('<script>alert(1)</script>')
  expect(html).not.toMatch(/ownerId|passwordHash|gatewayChargeId|WOOVI|JWT_SECRET/)
  expect(dialogs).toEqual([])
  await page.goto(B)
  await expect(page.getByRole('link', { name: 'SegredoDoB' })).toBeVisible()
  await expect(page.getByText('Receitas')).toHaveCount(0)
  await page.goto(`${A}/nicho/jogos`)
  await expect(page.getByRole('link', { name: 'Receitas', exact: true })).toBeVisible()
  await expect(page.getByText('SegredoDoB')).toHaveCount(0)
  await page.goto(`${A}/rede/telegram`)
  await expect(page.getByRole('link', { name: 'Receitas', exact: true })).toBeVisible()
  await expect(page.getByText('SegredoDoB')).toHaveCount(0)
})

test('indisponível, inexistente e outro tenant', async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto(`${A}/link/${state.off}`)
  await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible()
  await expect(page.getByText('NomeSecretoIndisponivel')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Acessar' })).toHaveCount(0)
  const missing = await page.goto(`${A}/link/nao-existe`)
  expect(missing?.status(), missing?.url()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Não encontrado' })).toBeVisible()
  const other = await page.goto(`${A}/link/${state.secret}`)
  expect(other?.status(), other?.url()).toBe(404)
  const gone = await getRaw(`/go/${state.secret}?to=https://example.com`, 'tenant-a.localhost')
  expect(gone.status).toBe(404)
})

test('busca mostra erro controlado e autocomplete real', async ({ browser }) => {
  const page = await browser.newPage()
  const document = await page.goto(`${A}/busca?q=receitas`, { waitUntil: 'domcontentloaded' })
  expect(await document?.text()).toContain('Carregando')
  await expect(page.locator('main').getByRole('alert')).toBeVisible()
  await expect(page.locator('main').getByRole('alert')).not.toContainText(/prisma|stack|JWT_SECRET/i)
  await page.getByLabel('Busca').fill('Rece')
  await expect(page.getByRole('listbox', { name: 'Sugestões' }).getByRole('option', { name: 'Receitas' })).toBeVisible()
  await page.getByLabel('Busca').fill('zzzz-sem-resultado')
  await expect(page.getByText('Nenhuma sugestão')).toBeVisible()
})

test('cadastro sem confirmação não envia link', async ({ browser }) => {
  const page = await browser.newPage()
  const email = `novo-${Date.now()}@tenant-a.test`
  await page.goto(`${A}/cadastro`)
  await page.getByLabel('Nome').fill('Novo')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/painel\/verificar/)
  const row = sql(`SELECT u.status FROM users u JOIN user_identifiers i ON i."userId" = u.id WHERE i."normalizedValue" = '${email}'`)
  expect(row).toBe('ACTIVE')
  await page.goto(`${A}/painel/links/novo`)
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()

  const mail = await call(page, '/bff/v1/auth/confirmation-inbox?kind=EMAIL')
  expect(mail.status, mail.text).toBe(200)
  const mailCode = (JSON.parse(mail.text) as { code: string }).code
  expect(mailCode).toMatch(/^\d{6}$/)
  const anonymous = await browser.newPage()
  await anonymous.goto(A)
  expect((await call(anonymous, '/bff/v1/auth/confirmation-inbox?kind=EMAIL')).status).toBe(401)

  await page.goto(`${A}/painel/verificar`)
  await expect(page.getByRole('link', { name: 'Voltar para o painel' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Reenviar/ })).toBeDisabled()
  await page.getByLabel('Dígito 1 de 6').fill('999999')
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click()
  await expect(page.getByText('Código inválido ou expirado.')).toBeVisible()
  await page.goto(`${A}/painel/links/novo`)
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()

  await page.goto(`${A}/painel/verificar`)
  const fresh = await call(page, '/bff/v1/auth/confirmation-inbox?kind=EMAIL')
  expect(fresh.status, fresh.text).toBe(200)
  const freshCode = (JSON.parse(fresh.text) as { code: string }).code
  await page.getByLabel('Dígito 1 de 6').fill(freshCode)
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click()
  await expect(page).toHaveURL(`${A}/painel`)
  await expect(page.getByRole('status').filter({ hasText: 'E-mail confirmado.' })).toBeVisible()
  await expect(page.getByText('Confirme o e-mail para enviar um link')).toHaveCount(0)
  await page.goto(`${A}/painel/links/novo`)
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled()
})

test('login, refresh e sessão mínima', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${A}/login`)
  await page.getByLabel('E-mail').fill('ninguem@tenant-a.test')
  await page.getByLabel('Senha').fill('errada-12')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('Credenciais inválidas.')
  await login(page, A, state.bia)
  const stored = await page.evaluate(() => ({
    raw: sessionStorage.getItem('catalogo.session') ?? '',
    cookie: document.cookie,
  }))
  const cookies = new Map((await page.context().cookies()).map((cookie) => [cookie.name, cookie]))
  const access = cookies.get('accessToken')
  const before = cookies.get('refreshToken')
  expect(access?.httpOnly).toBe(true)
  expect(before?.httpOnly).toBe(true)
  expect(cookies.get('csrf')?.httpOnly).toBe(false)
  expect(access?.sameSite).toBe('Lax')
  expect(JSON.parse(stored.raw)).toEqual({ role: 'USER', status: 'ACTIVE', canSubmit: true })
  expect(stored.raw).not.toContain(access?.value ?? 'access')
  expect(stored.cookie).not.toContain(access?.value ?? 'access')
  expect(stored.cookie).not.toContain(before?.value ?? 'refresh')

  const noCsrf = await call(page, '/bff/v1/auth/refresh', { method: 'POST', csrf: false })
  expect(noCsrf.status).toBe(403)
  const forged = await call(page, '/bff/v1/auth/refresh', { method: 'POST', csrf: false, headers: { 'x-csrf-token': 'f'.repeat(64) } })
  expect(forged.status).toBe(403)
  const refreshed = await call(page, '/bff/v1/auth/refresh', { method: 'POST' })
  expect(refreshed.status, refreshed.text).toBe(200)
  expect(JSON.parse(refreshed.text)).toEqual({ role: 'USER' })
  const after = (await page.context().cookies()).find((cookie) => cookie.name === 'refreshToken')
  expect(after?.value).not.toBe(before?.value)

  const second = await page.context().newPage()
  await second.goto(`${A}/painel/links`)
  await expect(second.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await expect(second.getByRole('heading', { name: 'Receitas' })).toBeVisible()
  await second.close()

  const csrf = (await page.context().cookies()).find((cookie) => cookie.name === 'csrf')?.value ?? ''
  await page.context().clearCookies()
  await page.context().addCookies([
    { name: 'refreshToken', value: before?.value ?? '', domain: 'tenant-a.localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
    { name: 'csrf', value: csrf, domain: 'tenant-a.localhost', path: '/', sameSite: 'Lax' },
  ])
  const replay = await call(page, '/bff/v1/auth/refresh', { method: 'POST' })
  expect(replay.status).toBe(401)
})

test('vitrine pagina por cursor com limite no servidor', async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto(A)
  const first = await call(page, '/bff/v1/home?limit=1')
  expect(first.status).toBe(200)
  const firstBody = JSON.parse(first.text) as { sponsored: Array<{ id: string }>; organic: Array<{ id: string }>; nextCursor: string | null }
  const firstIds = [...firstBody.sponsored, ...firstBody.organic].map((row) => row.id)
  expect(firstIds).toHaveLength(1)
  expect(firstBody.nextCursor).toBeTruthy()
  const second = await call(page, `/bff/v1/home?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor ?? '')}`)
  const secondBody = JSON.parse(second.text) as { sponsored: Array<{ id: string }>; organic: Array<{ id: string }> }
  const secondIds = [...secondBody.sponsored, ...secondBody.organic].map((row) => row.id)
  expect(secondIds).toHaveLength(1)
  expect(secondIds[0]).not.toBe(firstIds[0])
  const huge = JSON.parse((await call(page, '/bff/v1/home?limit=999999')).text) as { sponsored: unknown[]; organic: unknown[] }
  expect(huge.sponsored.length + huge.organic.length).toBeLessThanOrEqual(50)
  const invalid = await call(page, '/bff/v1/home?cursor=lixo')
  expect(invalid.status).toBe(400)
  expect(invalid.text).not.toMatch(/prisma|stack/i)
})

test('criação, SSRF, payload e edição publicada', async ({ browser }) => {
  const { page } = await asBia(browser)
  await page.goto(`${A}/painel/links/novo`)
  await page.getByLabel('Nome').fill('Bolo de cenoura')
  await page.getByLabel('Descrição').fill('Receita simples')
  await page.getByLabel('URL').fill('https://t.me/bolo')
  await page.getByLabel('Rede').selectOption({ label: 'Telegram' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Enviado para análise.')).toBeVisible()
  const created = sql(`SELECT status || '|' || "tenantId" FROM links WHERE name = 'Bolo de cenoura'`)
  expect(created).toBe(`PENDING_MODERATION|${state.tenantA}`)
  await page.goto(A)
  await expect(page.getByText('Bolo de cenoura')).toHaveCount(0)

  await page.goto(`${A}/painel/links/novo`)
  await page.getByLabel('Nome').fill('Loopback')
  await page.getByLabel('Descrição').fill('nao')
  await page.getByLabel('URL').fill('https://127.0.0.1/privado')
  await page.getByLabel('Rede').selectOption({ label: 'Telegram' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('URL não permitida.')
  const forbidden = ['https://localhost/x', 'https://10.0.0.1/x', 'https://169.254.169.254/', 'https://[::1]/x', 'https://[::ffff:127.0.0.1]/x']
  const facets = JSON.parse((await call(page, '/bff/v1/home')).text) as { networks: Array<{ id: string }>; niches: Array<{ id: string }> }
  for (const url of forbidden) {
    const status = await call(page, '/bff/v1/links', {
      method: 'POST',
      body: { url, name: 'bloqueio', description: 'x', networkId: facets.networks[0]?.id, nicheId: facets.niches[0]?.id },
    })
    expect(status.status, `${url} ${status.text}`).toBeGreaterThanOrEqual(400)
    expect(status.status).toBeLessThan(500)
    expect(status.status).not.toBe(403)
    expect(status.text).not.toMatch(/prisma|stack/i)
  }
  expect(sql(`SELECT count(*) FROM links WHERE name = 'bloqueio'`)).toBe('0')

  const withoutCsrf = await call(page, '/bff/v1/links', {
    method: 'POST',
    csrf: false,
    body: { url: 'https://t.me/semcsrf', name: 'SemCsrf', description: 'x', networkId: facets.networks[0]?.id, nicheId: facets.niches[0]?.id },
  })
  expect(withoutCsrf.status).toBe(403)
  expect(sql(`SELECT count(*) FROM links WHERE name = 'SemCsrf'`)).toBe('0')

  const abused = await call(page, '/bff/v1/links', {
    method: 'POST',
    body: { name: 'x', url: 'https://t.me/x', description: 'x', networkId: 'n', nicheId: 'n', tenantId: 'outro', ownerId: 'outro' },
  })
  expect(abused.status).toBe(400)
  expect(abused.text).not.toMatch(/prisma|stack/i)
  const huge = await call(page, '/bff/v1/links', { method: 'POST', body: { name: 'x'.repeat(1_200_000) } })
  expect(huge.status).toBe(413)
  expect(huge.text).not.toMatch(/prisma|stack/i)

  await page.goto(`${A}/painel/links`)
  const card = page.locator('article', { has: page.getByRole('heading', { name: 'Receitas' }) })
  await card.getByRole('button', { name: 'Editar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar link' })
  await dialog.getByLabel('Novo nome').fill('Receitas novas')
  await dialog.getByLabel('Nova descrição').fill('proposta')
  await dialog.getByRole('button', { name: 'Salvar texto' }).click()
  await expect(dialog.getByText('Proposta registrada')).toBeVisible()
  const proposal = sql(`SELECT count(*) FROM audit_logs WHERE action = 'link.text.proposed' AND "entityId" = '${state.receitas}'`)
  expect(proposal).toBe('1')
  const guest = await browser.newPage()
  await guest.goto(`${A}/link/${state.receitas}`)
  await expect(guest.getByRole('heading', { name: 'Receitas' })).toBeVisible()
  await expect(guest.getByText('Receitas novas')).toHaveCount(0)
})

test('analytics, clique e open redirect', async ({ browser }) => {
  const page = await browser.newPage()
  const impressionsBefore = Number(sql(`SELECT count(*) FROM analytics_events WHERE "linkId" = '${state.receitas}' AND kind = 'IMPRESSION'`))
  const clicksBefore = Number(sql(`SELECT count(*) FROM analytics_events WHERE "linkId" = '${state.receitas}' AND kind = 'CLICK'`))
  const counted = page.waitForResponse((response) => response.url().includes('/analytics/impressions') && response.status() === 201)
  await page.goto(`${A}/link/${state.receitas}`)
  await counted
  const href = await page.getByRole('link', { name: 'Acessar' }).getAttribute('href')
  expect(href).toContain('/go/')
  expect(href).toContain('surfaceToken=')
  expect(href).not.toContain('t.me')
  const repeated = page.waitForResponse((response) => response.url().includes('/analytics/impressions') && response.status() === 200)
  await page.reload()
  await repeated
  expect(Number(sql(`SELECT count(*) FROM analytics_events WHERE "linkId" = '${state.receitas}' AND kind = 'IMPRESSION'`)) - impressionsBefore).toBe(1)
  const token = new URL(href ?? '', A).searchParams.get('surfaceToken') ?? ''
  const forged = await page.evaluate(async ({ linkId, surfaceToken }) => {
    const response = await fetch('/bff/v1/analytics/impressions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ linkId, surfaceToken }),
    })
    return response.status
  }, { linkId: state.secret, surfaceToken: token })
  expect(forged).toBe(400)
  await page.route('https://t.me/**', (route) => route.abort())
  const redirects: Array<{ status: number; location: string }> = []
  page.on('response', (response) => {
    if (response.url().includes('/go/')) {
      redirects.push({ status: response.status(), location: response.headers().location ?? '' })
    }
  })
  await page.goto(`${A}/go/${state.receitas}?to=https://example.com&surfaceToken=${encodeURIComponent(token)}`, { timeout: 15_000 }).catch(() => undefined)
  const redirect = redirects.at(-1)
  expect(redirect?.status ?? 0).toBeGreaterThanOrEqual(300)
  expect(redirect?.status ?? 0).toBeLessThan(400)
  const location = redirect?.location ?? ''
  expect(location).toContain('https://t.me/receitas')
  expect(location).not.toContain('example.com')
  expect(Number(sql(`SELECT count(*) FROM analytics_events WHERE "linkId" = '${state.receitas}' AND kind = 'CLICK'`)) - clicksBefore).toBe(1)
  const { page: owner } = await asBia(browser)
  await owner.goto(`${A}/painel/links`)
  const card = owner.locator('article', { has: owner.getByRole('heading', { name: 'Receitas' }) })
  const metric = (label: string) => card.locator('.metric').filter({ has: owner.locator('.metric-label', { hasText: new RegExp(`^${label}$`) }) }).locator('.metric-value')
  await expect(metric('Impressões')).toHaveText(String(impressionsBefore + 1))
  await expect(metric('Cliques')).toHaveText(String(clicksBefore + 1))
})

test('checkout, webhook RSA, replay e assinatura inválida', async ({ browser }) => {
  const { page } = await asBia(browser)
  await page.goto(`${A}/painel/links/${state.receitas}/destaque`)
  await page.getByRole('radio', { name: '7 dias', exact: true }).check()
  await page.getByRole('radio', { name: 'Busca', exact: true }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  expect(sql(`SELECT count(*) FROM orders WHERE "linkId" = '${state.receitas}'`)).toBe('0')
  await page.getByRole('radio', { name: 'Pix', exact: true }).check()
  await page.getByRole('button', { name: 'Pagar com Pix' }).click()
  await expect(page.getByText('R$ 7,90')).toBeVisible()
  await expect(page.getByText('Pendente')).toBeVisible()
  const orderId = (await page.locator('[aria-label="Pedido"]').textContent())?.trim() ?? ''
  expect(orderId).toMatch(/[0-9a-f-]{36}/)
  await expect(page.getByLabel('Pix copia e cola')).toHaveText('00020126580014BR.GOV.BCB.PIX')
  await expect(page.getByText('gatewayChargeId')).toHaveCount(0)
  expect(sql(`SELECT "brCode" FROM orders WHERE id = '${orderId}'`)).toBe('00020126580014BR.GOV.BCB.PIX')
  await page.reload()
  await expect(page.getByLabel('Pedido')).toHaveText(orderId)
  await expect(page.getByLabel('Pix copia e cola')).toHaveText('00020126580014BR.GOV.BCB.PIX')
  const single = await call(page, `/bff/v1/orders/${orderId}`)
  expect(single.status).toBe(200)
  expect(single.text).not.toMatch(/gatewayChargeId|WOOVI/)
  const list = await call(page, '/bff/v1/orders/mine')
  expect(list.text).not.toContain('00020126580014BR.GOV.BCB.PIX')
  expect(sql(`SELECT status || '|' || "amountCents" FROM orders WHERE id = '${orderId}'`)).toBe('PENDING_PAYMENT|790')
  expect(sql(`SELECT surface FROM order_surfaces WHERE "orderId" = '${orderId}'`)).toBe('SEARCH')
  expect(sql(`SELECT "gatewayChargeId" IS NOT NULL FROM orders WHERE id = '${orderId}'`)).toBe('t')
  expect(sql(`SELECT count(*) FROM payments WHERE "orderId" = '${orderId}'`)).toBe('1')
  expect(redisScan(`*${orderId}*`)).toContain(orderId)

  const body = JSON.stringify({ eventId: 'evt-1', charge: { correlationID: orderId } })
  const paid = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    headers: { 'x-webhook-signature': signWooviTestBody(body) },
    body,
  })
  expect(paid.status).toBe(200)
  expect(sql(`SELECT status FROM orders WHERE id = '${orderId}'`)).toBe('PAID')
  expect(sql(`SELECT status FROM payments WHERE "orderId" = '${orderId}'`)).toBe('PAID')
  expect(sql(`SELECT count(*) FROM promotions WHERE "linkId" = '${state.receitas}' AND status = 'ACTIVE'`)).toBe('1')
  const replay = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    headers: { 'x-webhook-signature': signWooviTestBody(body) },
    body,
  })
  expect(replay.status).toBe(200)
  expect(sql(`SELECT count(*) FROM promotions WHERE "linkId" = '${state.receitas}'`)).toBe('1')

  const unsigned = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    body,
  })
  expect(unsigned.status).toBe(400)
  const bad = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    headers: { 'x-webhook-signature': 'nao-e-rsa' },
    body,
  })
  expect(bad.status).toBe(400)
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const otherSign = createSign('RSA-SHA256')
  otherSign.update(body)
  otherSign.end()
  const otherKey = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    headers: { 'x-webhook-signature': otherSign.sign(other.privateKey).toString('base64') },
    body,
  })
  expect(otherKey.status).toBe(400)
  const tampered = `${body} `
  const changed = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    headers: { 'x-webhook-signature': signWooviTestBody(body) },
    body: tampered,
  })
  expect(changed.status).toBe(400)
  const missingBody = JSON.stringify({ eventId: 'evt-ausente', charge: { correlationID: '00000000-0000-0000-0000-000000000000' } })
  const missing = await postRaw({
    path: '/api/v1/payments/woovi/webhook',
    host: 'tenant-a.localhost',
    headers: { 'x-webhook-signature': signWooviTestBody(missingBody) },
    body: missingBody,
  })
  expect(missing.status).toBe(400)
  expect(sql(`SELECT count(*) FROM promotions WHERE "linkId" = '${state.receitas}'`)).toBe('1')
  await page.goto(`${A}/painel/pedidos`)
  await expect(page.getByText('Pago')).toBeVisible()
})

test('logout idempotente', async ({ browser }) => {
  const { page } = await contextOn(browser, A, state.bia)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  expect((await page.context().cookies()).find((cookie) => cookie.name === 'refreshToken')).toBeUndefined()
  const again = await page.evaluate(async () => {
    const response = await fetch('/bff/v1/auth/logout', { method: 'POST', credentials: 'include' })
    return response.status
  })
  expect(again).toBe(204)
  const mine = await page.evaluate(async () => {
    const response = await fetch('/bff/v1/links/mine')
    return response.status
  })
  expect(mine).toBe(401)
})

test('IDOR e tenant', async ({ browser }) => {
  const eva = await contextOn(browser, A, state.eva)
  const analytics = await call(eva.page, `/bff/v1/analytics/links/${state.receitas}`)
  const edit = await call(eva.page, `/bff/v1/links/${state.receitas}`, { method: 'PATCH', body: { name: 'Invadido', description: 'x' } })
  const checkout = await call(eva.page, '/bff/v1/promotions/checkout', {
    method: 'POST',
    headers: { 'idempotency-key': `idor-${state.receitas}` },
    body: { linkId: state.receitas, surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' },
  })
  expect(analytics.status).toBe(404)
  expect(edit.status).toBe(404)
  expect(checkout.status).toBe(404)
  expect(edit.text).not.toContain('Receitas')
  const biaOrder = sql(`SELECT id FROM orders WHERE "linkId" = '${state.receitas}' ORDER BY "createdAt" DESC LIMIT 1`)
  const foreignOrder = await call(eva.page, `/bff/v1/orders/${biaOrder}`)
  expect(foreignOrder.status).toBe(404)
  expect(foreignOrder.text).not.toContain('BR.GOV.BCB.PIX')

  const biaState = JSON.parse(readFileSync(BIA_STATE, 'utf8')) as { cookies: Array<{ name: string; value: string }> }
  const token = biaState.cookies.find((cookie) => cookie.name === 'accessToken')?.value ?? ''
  expect(token.length).toBeGreaterThan(20)
  const hostB = await browser.newPage()
  await hostB.goto(B)
  const crossed = await hostB.evaluate(async (access) => {
    const response = await fetch('/bff/v1/links/mine', { headers: { authorization: `Bearer ${access}` } })
    return { status: response.status, text: await response.text() }
  }, token)
  expect(crossed.status).toBe(403)
  expect(crossed.text).not.toContain('Receitas')
  await hostB.goto(`${B}/busca?q=Receitas`)
  await expect(hostB.getByRole('listbox', { name: 'Sugestões' })).toHaveCount(0)
  await hostB.getByLabel('Busca').fill('Receitas')
  await expect(hostB.getByRole('option', { name: 'Receitas' })).toHaveCount(0)
  await expect(hostB.getByRole('link', { name: 'Receitas' })).toHaveCount(0)
})

test('admin não confia no cookie e a decisão persiste', async ({ browser }) => {
  const user = await asBia(browser)
  const hidden = await user.page.goto(`${A}/admin/moderacao`)
  expect(hidden?.status(), hidden?.url()).toBe(404)
  await user.page.evaluate(() => { document.cookie = 'catalogo_role=ADMIN; Path=/' })
  await user.page.goto(`${A}/admin/moderacao`)
  await expect(user.page.getByText('Área restrita.')).toBeVisible()
  await expect(user.page.getByText('FilaAprovar')).toHaveCount(0)
  expect(sql(`SELECT "closedAt" IS NULL FROM moderation_cases WHERE "linkId" = '${state.approve}'`)).toBe('t')

  const admin = await contextOn(browser, A, state.admin)
  await admin.page.goto(`${A}/admin/moderacao`)
  await expect(admin.page.getByText('FilaAprovar')).toBeVisible()
  await expect(admin.page.getByText('FilaRejeitar')).toBeVisible()
  const approveCard = admin.page.locator('article', { hasText: 'FilaAprovar' })
  await approveCard.getByRole('button', { name: 'Aprovar' }).click()
  await expect(approveCard).toHaveCount(0)
  expect(sql(`SELECT status FROM links WHERE name = 'FilaAprovar'`)).toBe('PUBLISHED')
  const rejectCard = admin.page.locator('article', { hasText: 'FilaRejeitar' })
  await rejectCard.getByRole('button', { name: 'Rejeitar' }).click()
  await expect(rejectCard).toHaveCount(0)
  expect(sql(`SELECT status FROM links WHERE name = 'FilaRejeitar'`)).toBe('PRE_REJECTED')
  const guest = await browser.newPage()
  await guest.goto(A)
  await expect(guest.getByRole('link', { name: 'FilaAprovar' })).toBeVisible()
  await expect(guest.getByText('FilaRejeitar')).toHaveCount(0)
  await admin.page.goto(`${A}/admin/estornos`)
  await expect(admin.page.getByText('Nenhum estorno')).toBeVisible()

  const foreign = await browser.newPage()
  await foreign.goto(B)
  const foreignToken = await accessCookie(admin.page)
  expect(foreignToken.length).toBeGreaterThan(20)
  const adminOnB = await foreign.evaluate(async (access) => {
    const response = await fetch('/bff/v1/admin/moderation', { headers: { authorization: `Bearer ${access}` } })
    return response.status
  }, foreignToken)
  expect(adminOnB).toBe(403)
})

test('mobile: home, busca, login, painel e checkout', async ({ browser }) => {
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const anonymous = await guest.newPage()
  await anonymous.goto(A)
  await expect(anonymous.getByRole('link', { name: 'Receitas' })).toBeVisible()
  await anonymous.goto(`${A}/busca`)
  await expect(anonymous.getByLabel('Busca')).toBeVisible()
  await anonymous.goto(`${A}/login`)
  await expect(anonymous.getByRole('button', { name: 'Entrar' })).toBeVisible()
  const { page } = await asBia(browser, { width: 390, height: 844 })
  await expect(page.getByRole('link', { name: 'Novo link' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await page.goto(`${A}/painel/links/${state.receitas}/destaque`)
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 500 })
  await page.getByRole('button', { name: 'Continuar' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
})

test('Pix expirado no browser: worker real expira, a tela esconde o código e nova tentativa gera outro pedido', async ({ browser }) => {
  const { page } = await asBia(browser)
  await page.goto(`${A}/painel/links/${state.receitas}/destaque`)
  await page.getByRole('radio', { name: 'Nicho', exact: true }).check()
  await page.getByRole('radio', { name: '7 dias', exact: true }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('radio', { name: 'Pix', exact: true }).check()
  await page.getByRole('button', { name: 'Pagar com Pix' }).click()
  await expect(page.getByLabel('Pix copia e cola')).toBeVisible()
  const orderId = (await page.getByLabel('Pedido').textContent())?.trim() ?? ''
  expect(orderId).toMatch(/[0-9a-f-]{36}/)
  expect(sql(`SELECT status FROM orders WHERE id = '${orderId}'`)).toBe('PENDING_PAYMENT')
  expect(sql(`SELECT hold FROM order_surfaces WHERE "orderId" = '${orderId}'`)).toBe('PENDING_PAYMENT')
  expect(redisScan(`bull:divulgador-links:expire-${orderId}`)).toContain(orderId)

  // Só o relógio é antecipado: o job expire-pix agendado roda de verdade no worker do E2E.
  sql(`UPDATE orders SET "pixExpiresAt" = NOW() + interval '3 seconds' WHERE id = '${orderId}'`)
  await page.reload()
  await expect(page.getByLabel('Situação')).toHaveText('Pendente')
  await expect(page.getByLabel('Pix copia e cola')).toBeVisible()
  await expect.poll(() => sql(`SELECT NOW() > "pixExpiresAt" FROM orders WHERE id = '${orderId}'`), { timeout: 10_000 }).toBe('t')
  expect(promoteJob(`expire-${orderId}`)).toContain('promoted')
  await expect.poll(() => sql(`SELECT status FROM orders WHERE id = '${orderId}'`), { timeout: 20_000 }).toBe('EXPIRED')
  expect(sql(`SELECT hold FROM order_surfaces WHERE "orderId" = '${orderId}'`)).toBe('RELEASED')
  expect(sql(`SELECT count(*) FROM promotions WHERE "linkId" = '${state.receitas}' AND surface = 'NICHE'`)).toBe('0')

  await expect(page.getByLabel('Situação')).toHaveText('Pix expirado', { timeout: 20_000 })
  await expect(page.getByLabel('Pix copia e cola')).toHaveCount(0)

  await page.getByRole('radio', { name: 'Nicho', exact: true }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Pagar com Pix' }).click()
  await expect(page.getByText('Dados inválidos.')).toHaveCount(0)
  await expect(page.getByLabel('Situação')).toHaveText('Pendente')
  await expect(page.getByLabel('Pix copia e cola')).toBeVisible()
  const retry = (await page.getByLabel('Pedido').textContent())?.trim() ?? ''
  expect(retry).toMatch(/[0-9a-f-]{36}/)
  expect(retry).not.toBe(orderId)
  expect(sql(`SELECT status FROM orders WHERE id = '${orderId}'`)).toBe('EXPIRED')
})

test('troca de e-mail guarda o anterior e tira o envio sem derrubar o publicado', async ({ browser }) => {
  const { page } = await asBia(browser)
  await page.goto(`${A}/painel/conta`)
  await page.getByLabel('Novo e-mail').fill('novo-e2e@tenant-a.test')
  await page.getByRole('button', { name: 'Trocar e-mail' }).click()
  await expect(page.getByRole('status')).toContainText('Confirme o novo identificador')
  await expect(page.getByRole('status')).not.toContainText(/\d{6}/)
  expect(sql(`SELECT "replacedAt" IS NOT NULL FROM user_identifiers WHERE "normalizedValue" = 'bia@tenant-a.test'`)).toBe('t')
  expect(sql(`SELECT "confirmedAt" IS NULL FROM user_identifiers WHERE "normalizedValue" = 'novo-e2e@tenant-a.test' AND "replacedAt" IS NULL`)).toBe('t')
  const guest = await browser.newPage()
  await guest.goto(A)
  await expect(guest.getByRole('link', { name: 'Receitas' })).toBeVisible()
  const denied = await call(page, '/bff/v1/links', {
    method: 'POST',
    body: { url: 'https://t.me/novo', name: 'NaoEnvia', description: 'x', networkId: 'n', nicheId: 'n' },
  })
  expect(denied.status, denied.text).toBe(403)
  expect(denied.text).not.toContain('CSRF')
})
