import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
const A = runtime.web('favorites.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).favorites as { tenantId: string; ownerId: string; networkId: string; nicheId: string; owner: string; other: string; password: string } }
function fixture(suffix: string) {
  const s = state(), prefix = 'f04-' + suffix
  sql(`DELETE FROM collections WHERE "tenantId"='${s.tenantId}'; DELETE FROM favorites WHERE "tenantId"='${s.tenantId}'; UPDATE links SET status='UNAVAILABLE' WHERE "tenantId"='${s.tenantId}';`)
  for (const [id, name] of [[prefix + '-one', 'Clube de leitura'], [prefix + '-two', 'Comunidade de estudos']]) sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES ('${id}','${s.tenantId}','${s.ownerId}','https://example.com/${id}','${name}','Encontros, materiais e conversas da comunidade','${s.networkId}','${s.nicheId}','PUBLISHED',false,true,NOW())`)
  return { ...s, prefix, one: prefix + '-one', two: prefix + '-two' }
}
async function login(page: Page, email = state().owner) {
  await page.goto(A + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
}
async function create(page: Page, name: string) {
  const form = page.getByRole('form', { name: 'Nova coleção', exact: true })
  await form.getByLabel('Nome da coleção').fill(name); await form.getByRole('button', { name: 'Criar coleção', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Suas coleções' }).getByRole('button', { name, exact: true })).toBeVisible()
}
async function privateCall(page: Page, path: string) { return page.evaluate(async path => { const r = await fetch('/bff/v1/me/' + path); return { status: r.status, text: await r.text() } }, path) }

test('F04-E01/T01/T03/T05 catálogo, persistência, duas coleções, ordenação e exclusão preservam favoritos', async ({ page }, info) => {
  const s = fixture('journey-' + info.project.name)
  await login(page); await page.goto(A + '/')
  for (const name of ['Clube de leitura', 'Comunidade de estudos']) {
    const card = page.getByRole('article').filter({ has: page.getByRole('link', { name, exact: true }) })
    await card.getByRole('button', { name: 'Salvar favorito', exact: true }).dblclick()
    await expect(card.getByRole('button', { name: 'Remover favorito' })).toHaveAttribute('aria-pressed', 'true')
  }
  expect(sql(`SELECT COUNT(*) FROM favorites WHERE "tenantId"='${s.tenantId}'`)).toBe('2')
  await page.goto(A + '/painel/favoritos'); await page.reload()
  const links = page.getByRole('region', { name: 'Links salvos' })
  await expect(links.getByRole('link', { name: 'Clube de leitura', exact: true })).toBeVisible()
  await create(page, 'Estudos'); await create(page, 'Leituras')
  const list = () => page.getByRole('region', { name: 'Links salvos' }).getByRole('listitem')
  await page.getByLabel('Organizar na coleção').selectOption({ label: 'Estudos' })
  for (const name of ['Clube de leitura', 'Comunidade de estudos']) await list().filter({ hasText: name }).getByRole('button', { name: 'Adicionar à coleção', exact: true }).click()
  await page.getByLabel('Organizar na coleção').selectOption({ label: 'Leituras' })
  await list().filter({ hasText: 'Clube de leitura' }).getByRole('button', { name: 'Adicionar à coleção', exact: true }).click()
  const collections = page.getByRole('region', { name: 'Suas coleções' })
  await collections.getByRole('button', { name: 'Estudos', exact: true }).click()
  const items = page.getByRole('region', { name: 'Itens da coleção' }).getByRole('listitem')
  await expect(items).toHaveCount(2); await items.nth(1).getByRole('button', { name: 'Subir', exact: true }).click()
  await expect(items.first()).toContainText('Comunidade de estudos')
  const rename = page.getByRole('form', { name: 'Renomear coleção' }); await rename.getByLabel('Nome da coleção').fill('Estudos juntos'); await rename.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(collections.getByRole('button', { name: 'Estudos juntos', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('collection.png'), fullPage: true })
  await page.getByRole('button', { name: 'Excluir coleção', exact: true }).click(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(items).toHaveCount(2)
  await page.getByRole('button', { name: 'Excluir coleção', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click()
  await expect(collections.getByRole('button', { name: 'Estudos juntos', exact: true })).toHaveCount(0)
  await collections.getByRole('button', { name: 'Leituras', exact: true }).click(); await expect(page.getByRole('region', { name: 'Itens da coleção' })).toContainText('Clube de leitura')
  expect(sql(`SELECT COUNT(*) FROM favorites WHERE "tenantId"='${s.tenantId}'`)).toBe('2')
  expect(sql(`SELECT COUNT(*) FROM links WHERE id IN ('${s.one}','${s.two}') AND status='PUBLISHED'`)).toBe('2')
  await page.context().clearCookies(); await login(page); await page.goto(A + '/painel/favoritos'); await expect(links.getByRole('link')).toHaveCount(2)
})

test('F04-E02/T02/T04 anônimo pede login, outra conta não recebe coleções e indisponível não vaza destino', async ({ page, browser }, info) => {
  const s = fixture('privacy-' + info.project.name)
  await page.goto(A + '/link/' + s.one); await page.getByRole('button', { name: 'Salvar favorito', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  await login(page); await page.goto(A + '/link/' + s.one); await page.getByRole('button', { name: 'Salvar favorito', exact: true }).click(); await expect(page.getByRole('button', { name: 'Remover favorito', exact: true })).toBeVisible()
  await page.goto(A + '/painel/favoritos'); await create(page, 'ColecaoSentinelaPrivada')
  const id = sql(`SELECT id FROM collections WHERE "tenantId"='${s.tenantId}' AND name='ColecaoSentinelaPrivada'`)
  const context = await browser.newContext()
  try {
    const otherPage = await context.newPage(); await otherPage.goto(A + '/painel/favoritos'); await expect(otherPage.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
    expect((await privateCall(otherPage, 'collections/' + id)).status).toBe(401)
    await login(otherPage, state().other); await otherPage.goto(A + '/painel/favoritos')
    const denied = await privateCall(otherPage, 'collections/' + id); expect(denied.status).toBe(404); expect(denied.text).not.toContain('ColecaoSentinelaPrivada')
    expect(await otherPage.locator('body').innerText()).not.toContain('ColecaoSentinelaPrivada')
  } finally { await context.close() }
  sql(`UPDATE links SET status='UNAVAILABLE' WHERE id='${s.one}'`)
  await page.reload(); const region = page.getByRole('region', { name: 'Links salvos' }); await expect(region.getByRole('heading', { name: 'Link indisponível' })).toBeVisible()
  expect(await region.innerHTML()).not.toContain(s.one + '?'); await expect(region.getByRole('link')).toHaveCount(0); expect((await privateCall(page, 'favorites')).text).not.toContain('Clube de leitura')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('F04-E03 offline preserva nome, teclado confirma, reload e reflow 320px', async ({ page }, info) => {
  fixture('offline-' + info.project.name); await login(page); await page.goto(A + '/painel/favoritos')
  const form = page.getByRole('form', { name: 'Nova coleção', exact: true }), input = form.getByLabel('Nome da coleção')
  await input.fill('Materiais de estudo'); await page.context().setOffline(true); await form.getByRole('button', { name: 'Criar coleção', exact: true }).click()
  await expect(form.getByRole('alert')).toContainText('Sem conexão.'); await expect(input).toHaveValue('Materiais de estudo')
  await page.context().setOffline(false); await input.focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Alteração salva.' })).toBeFocused()
  await page.reload(); await expect(page.getByRole('button', { name: 'Materiais de estudo', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('favorites.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; window.scrollTo(0, 0) })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('favorites-320-text200.png'), fullPage: true })
})
