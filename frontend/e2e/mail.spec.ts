import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { sql } from './db'

const A = 'http://tenant-a.localhost:3000'
const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as {
  tenantA: string
  password: string
  admin: string
}

type Mail = { kind: string; subject: string; html: string; text: string }

async function login(page: Page, email: string, password = state.password): Promise<void> {
  await page.goto(`${A}/login`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
}

async function call(page: Page, url: string, init: { method?: string; body?: unknown } = {}) {
  return page.evaluate(async ({ url, init }) => {
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('csrf='))?.slice(5) ?? ''
    const headers: Record<string, string> = {}
    if (init.method && init.method !== 'GET') headers['x-csrf-token'] = decodeURIComponent(csrf)
    if (init.body !== undefined) headers['content-type'] = 'application/json'
    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      credentials: 'include',
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    return { status: response.status, text: await response.text() }
  }, { url, init })
}

async function register(page: Page, email: string, phone: string): Promise<void> {
  await page.goto(`${A}/cadastro`)
  await page.getByLabel('Nome').fill('Mail')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Telefone').fill(phone)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Confirme o e-mail para enviar um link')).toBeVisible()
}

async function outbox(page: Page, email: string): Promise<Mail[]> {
  const result = await call(page, `/bff/v1/auth/email-outbox?to=${encodeURIComponent(email)}`)
  expect(result.status, result.text).toBe(200)
  return (JSON.parse(result.text) as { messages: Mail[] }).messages
}

function userId(email: string): string {
  return sql(`SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL`)
}

let serial = Date.now()

function nextPhone(): string {
  serial += 1
  return `5511${String(serial).slice(-8)}`
}

test('cadastro manda o código no e-mail e a tela não mostra o código', async ({ page }) => {
  const email = `otp-${serial}@tenant-a.test`
  await register(page, email, nextPhone())
  const inbox = await call(page, '/bff/v1/auth/confirmation-inbox?kind=EMAIL')
  expect(inbox.status).toBe(200)
  const code = (JSON.parse(inbox.text) as { code: string }).code
  const messages = await outbox(page, email)
  const otp = messages.find((item) => item.kind === 'otp')
  expect(otp?.html).toContain(code)
  expect(otp?.html).toContain('#0a192f')
  expect(otp?.html).toContain('logo-dark-mode-removebg.png')
  expect(otp?.html).not.toContain('logo-white-mode-removebg.png')
  expect(otp?.html).toContain('bgcolor="#0a192f"')
  expect(otp?.subject).not.toContain(code)
  await expect(page.getByText(code)).toHaveCount(0)
})

test('esqueci a senha troca a senha e entra com a nova', async ({ page }) => {
  const email = `reset-${serial}@tenant-a.test`
  const next = 'Senha-e2e-2'
  await register(page, email, nextPhone())
  await page.goto(`${A}/painel`)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await page.goto(`${A}/esqueci-senha`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByRole('status')).toContainText('Se existir uma conta')

  const messages = await outbox(page, email)
  const token = messages.find((item) => item.kind === 'password_reset')?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1] ?? ''
  expect(token.length).toBeGreaterThan(20)
  await page.goto(`${A}/recuperar-senha?token=${token}`)
  await page.getByLabel('Nova senha').fill(next)
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page.getByRole('status')).toHaveText('Senha salva.')
  await page.getByRole('link', { name: 'Entrar' }).click()
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(next)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
})

test('moderação avisa o dono quando o link é publicado', async ({ browser }) => {
  const email = `mod-${serial}@tenant-a.test`
  const owner = await browser.newPage()
  await register(owner, email, nextPhone())
  const ownerId = userId(email)
  const networkId = sql(`SELECT id FROM networks WHERE "tenantId" = '${state.tenantA}' LIMIT 1`)
  const nicheId = sql(`SELECT id FROM niches WHERE "tenantId" = '${state.tenantA}' LIMIT 1`)
  const linkId = `mail-${serial}`
  sql(`INSERT INTO links (id, "tenantId", "ownerId", "canonicalUrl", name, description, "networkId", "nicheId", status, "updatedAt") VALUES ('${linkId}', '${state.tenantA}', '${ownerId}', 'https://t.me/${linkId}', 'MailModeracao', 'caso', '${networkId}', '${nicheId}', 'PENDING_MODERATION', NOW())`)
  sql(`INSERT INTO moderation_cases (id, "tenantId", "linkId", "updatedAt") VALUES ('case-${linkId}', '${state.tenantA}', '${linkId}', NOW())`)

  const admin = await browser.newPage()
  await login(admin, state.admin)
  await admin.goto(`${A}/admin/moderacao`)
  const card = admin.locator('article', { hasText: 'MailModeracao' })
  await card.getByRole('button', { name: 'Aprovar' }).click()
  await expect(card).toHaveCount(0)
  expect(sql(`SELECT status FROM links WHERE id = '${linkId}'`)).toBe('PUBLISHED')

  const messages = await outbox(owner, email)
  const decision = messages.find((item) => item.kind === 'moderation')
  expect(decision?.text).toContain('MailModeracao')
  expect(decision?.text).toContain('publicado')
  expect(decision?.html).toContain('#4af9eb')
})

test('banimento avisa e o painel mostra a conta suspensa', async ({ browser }) => {
  const email = `ban-${serial}@tenant-a.test`
  const user = await browser.newPage()
  await register(user, email, nextPhone())
  const admin = await browser.newPage()
  await login(admin, state.admin)
  const banned = await call(admin, `/bff/v1/admin/users/${userId(email)}/ban`, {
    method: 'POST',
    body: { reason: 'golpe' },
  })
  expect(banned.status, banned.text).toBe(200)
  const messages = await outbox(user, email)
  expect(messages.find((item) => item.kind === 'ban')?.text).toContain('golpe')
  await user.goto(`${A}/painel`)
  await expect(user.getByText('Conta suspensa')).toBeVisible()
})

test('excluir a conta avisa e a senha deixa de entrar', async ({ page }) => {
  const email = `del-${serial}@tenant-a.test`
  await register(page, email, nextPhone())
  await page.goto(`${A}/painel/conta`)
  await page.getByLabel('Senha atual').fill(state.password)
  await page.getByRole('button', { name: 'Excluir conta' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  const messages = await outbox(page, email)
  expect(messages.find((item) => item.kind === 'account_deleted')?.text).toContain('Mail')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(sql(`SELECT count(*) FROM user_identifiers WHERE "normalizedValue" = '${email}'`)).toBe('0')
})
