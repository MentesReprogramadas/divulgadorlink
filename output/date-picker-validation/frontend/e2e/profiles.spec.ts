import { selectOption } from './select-control'
import AxeBuilder from '@axe-core/playwright'
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
async function editorSection(page: Page, label: string) {
  const select = page.getByLabel('Editar minha página', { exact: true })
  if (await select.isVisible()) await selectOption(select, { label })
  else await page.getByRole('tab', { name: label, exact: true }).click()
}
async function step(page: Page, target: number) {
  if (!await page.getByRole('list', { name: 'Etapas do formulário' }).count()) { await editorSection(page, ['Sua página', 'Foto e acesso', 'Grupos e links', 'Publicação'][target]); return }
  if (await page.getByRole('tab', { name: 'Criar minha página', exact: true }).isVisible()) await editorSection(page, 'Criar minha página')
  const current = await page.getByRole('list', { name: 'Etapas do formulário' }).locator('li').evaluateAll(items => items.findIndex(item => item.hasAttribute('aria-current')))
  if (target < current) await page.getByRole('list', { name: 'Etapas do formulário' }).getByRole('button').nth(target).click()
  else for (let index = current; index < target; index++) await page.getByRole('button', { name: 'Continuar', exact: true }).click()
}
async function base(page: Page) {
  await page.goto(A + '/painel/perfil'); await page.getByLabel('Personalize o link da sua página').fill('ana-estudos'); await page.getByLabel('Título da sua página').fill('Ana Estudos'); await page.getByLabel('Descrição', { exact: true }).fill('Projetos, materiais e conversas sobre leitura.')
  await step(page, 2); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Materiais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
}
async function add(page: Page, group: number, index: number, label: string, visible = true) {
  await page.getByRole('button', { name: 'Adicionar link', exact: true }).click()
  const row = page.getByRole('dialog')
  await row.getByLabel('Título do link').fill(label); await row.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/f09-' + group + '-' + index)
  if (!visible) await row.getByLabel('Link visível', { exact: true }).uncheck()
  await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  return page.locator('[data-profile-link]').filter({ has: page.getByText(label, { exact: true }) })
}
async function privateCall(page: Page, path = '') { return page.evaluate(async path => { const r = await fetch('/bff/v1/me/profile' + path); return { status: r.status, text: await r.text() } }, path) }

test('F09 seis temas legíveis, página inteira e movimento reduzido', async ({ page }, info) => {
  fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const theme of ['Areia', 'Botânico', 'Lavanda', 'Editorial', 'Oceano', 'Pêssego']) {
    await editorSection(page, 'Aparência')
    await page.getByRole('button', { name: theme, exact: true }).click()
    await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
    await expect(page).toHaveTitle('Prévia da sua página | Tem Link Aqui')
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(accessibility.violations.map(item => item.id)).toEqual([])
    await page.getByRole('link', { name: 'Meu site', exact: true }).focus()
    await expect(page.getByRole('link', { name: 'Meu site', exact: true })).toHaveCSS('transition-duration', '0s')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('theme-' + theme + '.png'), fullPage: true, animations: 'disabled' })
    await page.getByRole('link', { name: 'Voltar à edição' }).click()
    await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  }
})

test('F09 aparência personalizada persiste e só chega ao público após publicar', async ({ page }, info) => {
  fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await editorSection(page, 'Aparência')
  await page.getByRole('button', { name: 'Botânico', exact: true }).click()
  await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  await page.getByText('Cor do fundo', { exact: true }).click()
  const color = page.getByLabel('Cor do fundo — código hexadecimal')
  await color.fill('url(x)'); await expect(color).toHaveAttribute('aria-invalid', 'true')
  await color.fill('#173c32'); await expect(color).not.toHaveAttribute('aria-invalid', 'true')
  const slider = page.getByRole('slider', { name: 'Cor do fundo — Vermelho' })
  await slider.focus(); await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue('24')
  await color.fill('#173c32')
  await page.getByRole('tab', { name: 'Botões e texto', exact: true }).click()
  await selectOption(page.getByLabel('Estilo dos botões'), 'shadow')
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeVisible()
  await page.reload(); await editorSection(page, 'Aparência')
  await expect(page.locator('[data-style="shadow"]')).toBeVisible()
  await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  await page.getByText('Cor do fundo', { exact: true }).click()
  await expect(color).toHaveValue('#173c32')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(item => item.id)).toEqual([])
  await page.screenshot({ path: info.outputPath('appearance-editor.png'), fullPage: true })
  if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('appearance-editor.png', { fullPage: true, animations: 'disabled' })
  const originalViewport = page.viewportSize()!
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('details code').first().evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24)
  await page.screenshot({ path: info.outputPath('appearance-320-text-200.png'), fullPage: true })
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.setViewportSize(originalViewport)
  await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  await page.getByRole('link', { name: 'Voltar à edição' }).click()
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  await editorSection(page, 'Aparência')
  await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  await page.goto(A + '/p/ana-estudos')
  await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Gerenciar cookies', exact: true }).click()
  await page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Este site usa cookies' })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('personal-page.png'), fullPage: true })
  if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('personal-page.png', { fullPage: true, animations: 'disabled' })
})
test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  const s = fixture(); await login(page); await base(page)
  await add(page, 1, 1, 'Site principal'); await add(page, 1, 2, 'Material de leitura'); await add(page, 1, 3, 'OcultoSentinela', false)
  await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Redes sociais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  const socialRow = await add(page, 2, 1, 'Vídeos'); await socialRow.getByRole('button', { name: 'Editar link', exact: true }).click(); const social = page.getByRole('dialog'); await selectOption(social.getByLabel('Tipo de link'), 'SOCIAL'); await social.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/videos'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await page.getByText('Escolher botão principal', { exact: true }).click()
  await selectOption(page.getByLabel('Botão principal'), { label: 'Site principal' })
  await step(page, 1)
  for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
    const buffer = mime === 'image/png' ? readFileSync(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png')) : Buffer.from(await page.evaluate(mime => {
      const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16
      const context = canvas.getContext('2d')!; context.fillStyle = '#146dca'; context.fillRect(0, 0, 16, 16)
      return canvas.toDataURL(mime).split(',')[1]
    }, mime), 'base64')
    await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'foto.' + mime.split('/')[1], mimeType: mime, buffer })
    await expect(page.getByRole('status').filter({ hasText: 'Foto recebida.' })).toBeVisible()
  }
  await step(page, 2)
  const socialCard = page.getByRole('listitem').filter({ hasText: 'Redes sociais' }); await socialCard.getByText('Mover', { exact: true }).click(); await socialCard.getByRole('button', { name: 'Subir grupo', exact: true }).click()
  await step(page, 3)
  let releasePreview = () => {}
  const previewHeld = new Promise<void>(resolve => { releasePreview = resolve })
  await page.route('**/bff/v1/me/profile/preview', async route => { await previewHeld; await route.continue() })
  try {
    await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
    await expect(page).toHaveURL(A + '/painel/perfil/previa')
    await expect(page.locator('[data-skeleton]:visible')).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
    await page.screenshot({ path: info.outputPath('private-preview-loading.png'), fullPage: true })
  } finally { releasePreview(); await page.unrouteAll({ behavior: 'wait' }) }
  const preview = page.getByRole('article', { name: 'Perfil público', exact: true })
  await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect(await page.evaluate(async () => (await fetch('/bff/v1/me/profile/preview')).headers.get('cache-control'))).toContain('no-store')
  expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(item => item.id)).toEqual([])
  await expect(preview.getByRole('link', { name: 'Vídeos' })).toBeVisible(); expect(await preview.innerHTML()).not.toContain('OcultoSentinela')
  await preview.scrollIntoViewIfNeeded()
  await expect.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await page.screenshot({ path: info.outputPath('private-preview.png'), fullPage: true })
  const size = page.viewportSize()!
  await page.setViewportSize({ width: size.width, height: 450 })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(async () => (await page.getByRole('region', { name: 'Modo de prévia' }).boundingBox())!.y).toBe(0)
  await page.getByRole('link', { name: 'Voltar à edição', exact: true }).click()
  await page.setViewportSize(size)
  await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  const context = await browser.newContext({ viewport: info.project.use.viewport })
  try {
    const guest = await context.newPage(); await guest.goto(A + '/painel/perfil/previa')
    await expect(guest.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
    expect((await privateCall(guest, '/preview')).status).toBe(401)
    expect(await guest.content()).not.toContain('Ana Estudos')
    await guest.goto(A + '/p/ana-estudos')
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
  await page.reload(); await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
})
test('F09-E04 restrição de idade não entrega conteúdo no HTML/API antes do aceite real', async ({ page, browser }, info) => {
  fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await step(page, 1)
  await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check()
  await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
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
test('F09-E02/T02/T06 sessão real, admin não ganha dono, suspeita/provedor seguem para humano e preservam página anterior', async ({ page, browser }) => {
  fixture(); await page.goto(A + '/painel/perfil'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible(); expect((await privateCall(page)).status).toBe(401)
  await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  for (const text of ['SuspeitoFixture', 'FalhaProvedorFixture']) {
    await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill(text); await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
    await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(text)
    const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(live).not.toContain(text)
  }
  const context = await browser.newContext()
  try { const other = await context.newPage(); await login(other, state().other); await other.goto(A + '/painel/perfil'); await expect(other.getByLabel('Título da sua página')).toHaveValue(''); expect((await privateCall(other)).text).not.toContain('FalhaProvedorFixture'); expect((await privateCall(other, '/preview')).status).toBe(404) } finally { await context.close() }
  await page.getByText('Gerenciar publicação', { exact: true }).click(); await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil retirado do ar.' })).toBeVisible()
  expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
})
test('F09-E03 offline mantém dados, teclado salva, 320px e texto 200%, conflito entre abas não sobrescreve', async ({ page }, info) => {
  fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  await page.context().setOffline(true); await step(page, 3); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  await page.context().setOffline(false); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeFocused()
  const second = await page.context().newPage()
  try {
    await second.goto(A + '/painel/perfil'); await expect(second.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
    await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await step(page, 3); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeVisible()
    await step(second, 0); await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado'); await step(second, 3); await second.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  } finally { await second.close() }
  await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true })
})
