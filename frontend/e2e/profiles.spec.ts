import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
const A = runtime.web('profiles.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; ownerId: string; catalogId: string; owner: string; other: string; password: string } }
function fixture() { const s = state(); sql(`DELETE FROM profiles WHERE "tenantId"='${s.tenantId}'; DELETE FROM profile_assets WHERE "tenantId"='${s.tenantId}'; UPDATE networks SET "requiresAge"=false WHERE "tenantId"='${s.tenantId}'`); return s }
async function login(page: Page, email = state().owner) {
  await page.goto(A + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
}
async function base(page: Page) {
  await page.goto(A + '/painel/perfil'); await page.getByLabel('Endereço do perfil').fill('ana-estudos'); await page.getByLabel('Nome público').fill('Ana Estudos'); await page.getByLabel('Descrição', { exact: true }).fill('Projetos, materiais e conversas sobre leitura.')
  await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo 1', { exact: true }).fill('Materiais')
}
async function add(page: Page, group: number, index: number, label: string, visible = true) {
  await page.getByRole('button', { name: 'Adicionar link ao grupo ' + group, exact: true }).click()
  const row = page.getByRole('group', { name: `Link ${index} do grupo ${group}`, exact: true })
  await row.getByLabel('Título do link').fill(label); await row.getByLabel('URL', { exact: true }).fill('https://example.com/f09-' + group + '-' + index)
  if (!visible) await row.getByLabel('Link visível', { exact: true }).uncheck()
  return row
}
async function privateCall(page: Page, path = '') { return page.evaluate(async path => { const r = await fetch('/bff/v1/me/profile' + path); return { status: r.status, text: await r.text() } }, path) }
test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  const s = fixture(); await login(page); await base(page)
  await add(page, 1, 1, 'Site principal'); await add(page, 1, 2, 'Material de leitura'); await add(page, 1, 3, 'OcultoSentinela', false)
  await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo 2', { exact: true }).fill('Redes sociais')
  const social = await add(page, 2, 1, 'Vídeos'); await social.getByLabel('Tipo de link').selectOption('SOCIAL'); await social.getByLabel('URL', { exact: true }).fill('https://example.com/videos')
  await page.getByLabel('Botão principal').selectOption({ label: 'Site principal' })
  await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png'))
  await expect(page.getByRole('status').filter({ hasText: 'Foto recebida.' })).toBeVisible()
  await page.getByRole('button', { name: 'Subir grupo 2', exact: true }).click()
  await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  const preview = page.getByRole('region', { name: 'Prévia do perfil', exact: true })
  await expect(preview.getByRole('link', { name: 'Vídeos' })).toBeVisible(); expect(await preview.innerHTML()).not.toContain('OcultoSentinela')
  await page.screenshot({ path: info.outputPath('profile-editor.png'), fullPage: true })
  await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  const context = await browser.newContext({ viewport: info.project.use.viewport })
  try {
    const guest = await context.newPage(); await guest.goto(A + '/p/ana-estudos')
    await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
    const profile = guest.getByRole('article', { name: 'Perfil público' })
    await expect(profile.getByRole('heading', { level: 2 })).toHaveText(['Redes sociais', 'Materiais'])
    await expect(profile.getByRole('link')).toHaveCount(3)
    expect(await guest.content()).not.toMatch(/OcultoSentinela|owner@profiles.test|passwordHash/)
    const response = await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(response).not.toContain('OcultoSentinela')
    expect(await profile.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    await guest.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
    await guest.screenshot({ path: info.outputPath('public-profile.png'), fullPage: true })
    await expect(guest.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://profiles.localhost/p/ana-estudos')
    await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  } finally { await context.close() }
  expect(sql(`SELECT COUNT(*) FROM links WHERE "tenantId"='${s.tenantId}'`)).toBe('1')
  await page.reload(); await expect(page.getByLabel('Nome público')).toHaveValue('Ana Estudos')
})
test('F09-E04 restrição de idade não entrega conteúdo no HTML/API antes do aceite real', async ({ page, browser }, info) => {
  fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check()
  await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  const context = await browser.newContext({ viewport: info.project.use.viewport })
  try {
    const guest = await context.newPage(); await guest.goto(A + '/p/ana-estudos')
    await expect(guest.getByRole('dialog')).toBeVisible(); expect(await guest.content()).not.toContain('Ana Estudos')
    expect(await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).toEqual({ restricted: true })
    await guest.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click()
    await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
    await expect(guest.getByRole('dialog')).toHaveCount(0)
  } finally { await context.close() }
})
test('F09-E02/T02/T06 sessão real, admin não ganha dono, suspeita/provedor bloqueiam e preservam página anterior', async ({ page, browser }) => {
  fixture(); await page.goto(A + '/painel/perfil'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible(); expect((await privateCall(page)).status).toBe(401)
  await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  for (const text of ['SuspeitoFixture', 'FalhaProvedorFixture']) {
    await page.getByLabel('Descrição', { exact: true }).fill(text); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('rascunho foi mantido')
    await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(text)
    const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(live).not.toContain(text)
  }
  const context = await browser.newContext()
  try { const other = await context.newPage(); await login(other, state().other); await other.goto(A + '/painel/perfil'); await expect(other.getByLabel('Nome público')).toHaveValue(''); expect((await privateCall(other)).text).not.toContain('FalhaProvedorFixture') } finally { await context.close() }
  await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil retirado do ar.' })).toBeVisible()
  expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
})
test('F09-E03 offline mantém dados, teclado salva, 320px e texto 200%, conflito entre abas não sobrescreve', async ({ page }, info) => {
  fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await page.context().setOffline(true); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Nome público')).toHaveValue('Ana Estudos')
  await page.context().setOffline(false); await page.getByLabel('Nome público').focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeFocused()
  const second = await page.context().newPage()
  try {
    await second.goto(A + '/painel/perfil'); await expect(second.getByLabel('Nome público')).toHaveValue('Ana Estudos')
    await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeVisible()
    await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado'); await second.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  } finally { await second.close() }
  await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true })
})
