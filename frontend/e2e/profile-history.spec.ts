import { accountLanding } from './account-landing'
import {profileEditorTool} from './profile-editor'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'
const fixture = () => JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; owner: string; other: string; password: string }
const origin = runtime.web('profiles.localhost')
async function login(page: Page, other = false) {
  const data = fixture(); await page.goto(origin + '/login'); await page.getByLabel('E-mail').fill(other ? data.other : data.owner); await page.getByLabel('Senha').fill(data.password); await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await accountLanding(page)
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
}
async function mutate(page: Page, route: string, body: unknown, method = 'POST') {
  return page.evaluate(async ({ route, body, method }) => { const csrf = document.cookie.split('; ').find(value => value.startsWith('csrf='))?.slice(5) ?? ''; const response = await fetch('/bff/v1/me/profile' + route, { method, headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf) }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() } }, { route, body, method })
}
async function editorAction(page: Page, name: string) {
  await profileEditorTool(page, name)
}
async function prepare(page: Page) {
  sql(`DELETE FROM profiles WHERE "tenantId"='${fixture().tenantId}'`)
  await login(page)
  const group = randomUUID(), hidden = randomUUID()
  const content = { slug: 'pagina-historico', name: 'Página inicial', bio: 'Materiais para estudantes', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [{ id: group, name: 'Materiais', visible: true }, { id: hidden, name: 'HistoricoSegredoSentinela', visible: false }], items: [{ id: randomUUID(), categoryId: group, type: 'URL', label: 'Aulas', destination: 'https://example.com/aulas', visible: true }] }
  const saved = await mutate(page, '', { content, expectedVersion: 0 }, 'PATCH'); expect(saved.status).toBe(200)
  const published = await mutate(page, '/publish', { expectedVersion: 1 }); expect(published.status).toBe(200)
  return content
}
function deterministicDates() {
  const day = new Date().toISOString().slice(0, 10)
  sql(`BEGIN; CREATE TEMP TABLE f19_dates AS SELECT * FROM profile_revisions WHERE "tenantId"='${fixture().tenantId}'; DELETE FROM profile_revisions WHERE "tenantId"='${fixture().tenantId}'; INSERT INTO profile_revisions(id,"profileId","tenantId","ownerId",version,snapshot,"avatarAssetId",imported,"createdAt") SELECT id,"profileId","tenantId","ownerId",version,snapshot,"avatarAssetId",imported,TIMESTAMP '${day} 00:00:00' FROM f19_dates; COMMIT;`)
}
test('F19-E01/E03 compare, explicit restore, existing preview and republish preserve public content until publication', async ({ page, browser }, info) => {
  await prepare(page)
  await page.goto(origin + '/painel/perfil'); await page.getByRole('region',{name:'Editor do perfil'}).getAttribute('data-save-state');await page.goto(new URL('/painel/perfil/dados',page.url()).href); await page.getByLabel('Nome da página').fill('Página atualizada')
  await expect(page.getByRole('region', { name: 'Editor do perfil' })).toHaveAttribute('data-save-state', 'saved')
  await editorAction(page, 'Publicar'); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  const guest = await browser.newContext(), publicPage = await guest.newPage()
  try {
    await publicPage.goto(origin + '/p/pagina-historico'); await expect(publicPage.getByRole('heading', { name: 'Página atualizada' })).toBeVisible()
    expect(await publicPage.locator('body').textContent()).not.toContain('HistoricoSegredoSentinela')
    deterministicDates()
    await editorAction(page, 'Histórico'); await expect(page.getByRole('heading', { name: 'Histórico da minha página', exact: true })).toBeVisible()
    const first = page.getByRole('article', { name: 'Versão 1', exact: true }); await expect(first).toBeVisible()
    expect(await first.evaluate(element => parseFloat(getComputedStyle(element).paddingTop))).toBeGreaterThanOrEqual(16)
    const cards = await page.getByRole('article').evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }))
    expect(cards[1].top - cards[0].bottom).toBeGreaterThanOrEqual(16)
    await page.screenshot({ path: info.outputPath('profile-history-list.png'), fullPage: true, animations: 'disabled' })
    await first.getByRole('button', { name: 'Ver diferenças', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Versão 1', exact: true }); await expect(dialog).toContainText('Página inicial'); await expect(dialog).toContainText('Página atualizada')
    const oldPreview = dialog.getByRole('region', { name: 'Prévia da versão antiga', exact: true })
    const currentPreview = dialog.getByRole('region', { name: 'Prévia do rascunho atual', exact: true })
    await expect(oldPreview).toContainText('Página inicial'); await expect(currentPreview).toContainText('Página atualizada')
    await expect(oldPreview.locator('[inert]')).toHaveCount(1); await expect(currentPreview.locator('[inert]')).toHaveCount(1)
    await page.evaluate(() => document.fonts.ready)
    await expect(dialog).toHaveCSS('opacity', '1')
    const oldBounds = await oldPreview.boundingBox(), currentBounds = await currentPreview.boundingBox()
    if (info.project.name.includes('mobile')) expect(currentBounds!.y).toBeGreaterThan(oldBounds!.y + oldBounds!.height)
    else expect(Math.abs(currentBounds!.y - oldBounds!.y)).toBeLessThan(2)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    await expect(dialog).toHaveCSS('opacity', '1')
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(accessibility.violations.map(row => row.id), JSON.stringify(accessibility.violations.flatMap(row => row.nodes.map(node => ({ target: node.target, summary: node.failureSummary }))))).toEqual([])
    await page.screenshot({ path: info.outputPath('profile-history-comparison.png'), fullPage: true, animations: 'disabled' })
    const originalViewport = page.viewportSize()!
    await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('profile-history-comparison-320-zoom.png'), fullPage: true, animations: 'disabled' })
    await page.evaluate(() => { document.documentElement.style.fontSize = '' }); await page.setViewportSize(originalViewport)
    await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Página atualizada' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Restaurar no rascunho' }).focus(); await page.keyboard.press('Enter')
    const restore = dialog.getByRole('button', { name: 'Confirmar restauração' }); await restore.focus(); await page.keyboard.press('Enter')
    await expect(dialog).toHaveCount(0); await expect(page.getByRole('status').filter({ hasText: 'Versão restaurada' })).toBeVisible()
    await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Página atualizada' })).toBeVisible()
    await page.getByRole('link', { name: 'Ver prévia', exact: true }).click(); await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Página inicial', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar à edição' }).click(); await editorAction(page, 'Publicar'); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
    await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Página inicial' })).toBeVisible()
    deterministicDates()
    await editorAction(page, 'Histórico'); await expect(page.getByRole('article')).toHaveCount(3)
    await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
    await page.screenshot({ path: info.outputPath('profile-history-320-zoom.png'), fullPage: true, animations: 'disabled' })
  } finally { await guest.close() }
})
test('F19-E02 private history rejects other owners, handles offline retry, and protects a concurrently updated draft', async ({ page, browser }, info) => {
  const content = await prepare(page)
  await page.goto(origin + '/painel/perfil/historico')
  await expect(page.getByRole('article')).toHaveCount(1)
  const id = sql(`SELECT id FROM profile_revisions WHERE "tenantId"='${fixture().tenantId}'`)
  const other = await browser.newContext(), guest = await browser.newContext()
  try {
    const stranger = await other.newPage(); await login(stranger, true)
    const rejected = await stranger.evaluate(async id => (await fetch('/bff/v1/me/profile/revisions/' + id)).status, id); expect(rejected).toBe(404)
    const unauthenticated = await guest.request.get(runtime.web('127.0.0.1') + '/bff/v1/me/profile/revisions', { headers: { host: 'profiles.localhost:' + runtime.webPort } }); expect(unauthenticated.status()).toBe(401)
    await page.route('**/bff/v1/me/profile/revisions', route => route.abort())
    await page.getByRole('button', { name: 'Atualizar dados' }).click(); await expect(page.getByRole('region', { name: 'Histórico da minha página' }).getByRole('alert')).toContainText('Sem conexão')
    await page.unroute('**/bff/v1/me/profile/revisions'); await page.getByRole('button', { name: 'Tentar de novo' }).click(); await expect(page.getByRole('region', { name: 'Histórico da minha página' }).getByRole('alert')).toHaveCount(0)
    await page.getByRole('button', { name: 'Ver diferenças' }).click(); await page.getByRole('button', { name: 'Restaurar no rascunho' }).click()
    expect((await mutate(page, '', { content: { ...content, name: 'Outra aba preservada' }, expectedVersion: 1 }, 'PATCH')).status).toBe(200)
    await page.getByRole('button', { name: 'Confirmar restauração' }).click(); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('outra aba')
    const persisted = await page.evaluate(async () => (await fetch('/bff/v1/me/profile')).json()); expect(persisted.draft.name).toBe('Outra aba preservada')
    await page.screenshot({ path: info.outputPath('profile-history-conflict.png'), fullPage: true, animations: 'disabled' })
  } finally { await other.close(); await guest.close() }
})
