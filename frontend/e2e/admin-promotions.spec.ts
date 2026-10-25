import { expectSelected, selectOption } from './select-control'
import { runtime as e2eRuntime } from './runtime.cjs'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { sql } from './db'

const origin = (e2eRuntime.web('tenant-a.localhost'))

test.afterEach(async ({}, info) => {
  // These fixtures share Bia with screenshot journeys: remove only this test's
  // resources so slot counters and catalog contents do not depend on test order.
  const condition = `id='admin-promotion-${info.project.name}' OR id LIKE 'status-${info.project.name}-%'`
  for (let attempt = 0; ; attempt++) {
    try {
      sql(`BEGIN; SELECT id FROM links WHERE ${condition} ORDER BY id FOR UPDATE; DELETE FROM moderation_cases WHERE "linkId" IN (SELECT id FROM links WHERE ${condition}); DELETE FROM promotions WHERE "linkId" IN (SELECT id FROM links WHERE ${condition}); DELETE FROM link_availability WHERE "linkId" IN (SELECT id FROM links WHERE ${condition}); DELETE FROM analytics_events WHERE "linkId" IN (SELECT id FROM links WHERE ${condition}); DELETE FROM audit_logs WHERE "entityId" IN (SELECT id FROM links WHERE ${condition}); DELETE FROM links WHERE ${condition}; COMMIT`)
      break
    } catch (error) {
      if (attempt >= 2 || !String(error).includes('deadlock detected')) throw error
      await delay(150 * (attempt + 1))
    }
  }
})

test('admin define período, prazo indeterminado e remove o destaque sem cobrança', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { admin: string; password: string; receitas: string }
  const id = `admin-promotion-${testInfo.project.name}`
  const name = `Comunidade destaque ${testInfo.project.name}`
  sql(`DELETE FROM promotions WHERE "linkId"='${id}'`)
  sql(`DELETE FROM audit_logs WHERE "entityId"='${id}' AND action='promotion.admin.update'`)
  sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${id}',"tenantId","ownerId",'https://example.com/${id}','${name}','Comunidade para validar destaque',"networkId","nicheId",'PUBLISHED',NOW() FROM links WHERE id='${state.receitas}' ON CONFLICT (id) DO UPDATE SET "updatedAt"=NOW(), status='PUBLISHED'`)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.goto(`${origin}/login`)
  await page.getByLabel('E-mail', { exact: true }).fill(state.admin)
  await page.getByLabel('Senha', { exact: true }).fill(state.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/painel/)
  await page.goto(`${origin}/admin/visao`)
  await selectOption(page.getByLabel('Área de gestão', { exact: true }), 'links')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
  const trigger = card.getByRole('button', { name: 'Gerenciar destaque' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name, exact: true })
  await expect(dialog.getByLabel('Período')).toBeVisible()
  await expect(dialog.getByLabel('Onde destacar')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Período')).toBeFocused()
  await selectOption(dialog.getByLabel('Onde destacar'), 'HOME')
  await selectOption(dialog.getByLabel('Período'), 'custom')
  await dialog.getByLabel('Data e hora de término').fill('10/11/2030 12:00')
  await dialog.getByRole('button', { name: 'Salvar destaque', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(sql(`SELECT COUNT(*) FROM promotions WHERE "linkId"='${id}' AND administrative AND status='ACTIVE' AND "expiresAt" IS NOT NULL`)).toBe('1')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expectSelected(dialog.getByLabel('Período'), 'custom')
  await selectOption(dialog.getByLabel('Período'), 'indefinite')
  await page.evaluate(() => document.fonts.ready)
  const accessibility = await new AxeBuilder({ page }).include('dialog[open]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(row => ({ id: row.id, nodes: row.nodes.map(node => node.target) }))).toEqual([])
  await testInfo.attach('destaque-indeterminado', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' })
  if (!testInfo.project.name.includes('mobile')) {
    // Half the CSS viewport exercises the reflow of 200% browser zoom.
    await page.setViewportSize({ width: 720, height: 500 })
    expect(await dialog.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth + 1 && box.top >= 0 && box.bottom <= innerHeight + 1 })).toBe(true)
    await dialog.getByRole('button', { name: 'Salvar destaque', exact: true }).focus()
    await expect(dialog.getByRole('button', { name: 'Salvar destaque', exact: true })).toBeInViewport()
    await testInfo.attach('destaque-zoom-200', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' })
    await page.setViewportSize({ width: 1440, height: 1000 })
  }
  await dialog.getByRole('button', { name: 'Salvar destaque', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(sql(`SELECT COUNT(*) FROM promotions WHERE "linkId"='${id}' AND administrative AND status='ACTIVE' AND "expiresAt" IS NULL`)).toBe('1')
  expect(sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${id}'`)).toBe('0')
  await page.goto(origin)
  const publicCard = page.getByRole('article').filter({ has: page.getByRole('link', { name, exact: true }) })
  await expect(publicCard.getByText('Patrocinado', { exact: true })).toBeVisible()
  await page.goto(`${origin}/admin/visao`)
  await selectOption(page.getByLabel('Área de gestão', { exact: true }), 'links')
  await trigger.click()
  await expectSelected(dialog.getByLabel('Período'), 'indefinite')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Remover destaque', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(sql(`SELECT COUNT(*) FROM promotions WHERE "linkId"='${id}' AND status='ACTIVE'`)).toBe('0')
  expect(sql(`SELECT COUNT(*) FROM audit_logs WHERE "entityId"='${id}' AND action='promotion.admin.update'`)).toBe('3')
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('gestão filtra todos os status, conta além de 40 cards e oferece ações por estado', async ({ page }, testInfo) => {
  const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { admin: string; password: string; receitas: string }
  const prefix = `status-${testInfo.project.name}`
  const name = `Lote estados ${testInfo.project.name}`
  sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${prefix}-pub-'||seq,"tenantId","ownerId",'https://example.com/${prefix}/'||seq,'${name} Publicado '||seq,'Teste de status',"networkId","nicheId",'PUBLISHED',NOW() FROM links CROSS JOIN generate_series(1,45) seq WHERE id='${state.receitas}' ON CONFLICT (id) DO UPDATE SET status='PUBLISHED'`)
  for (const status of ['DRAFT', 'PENDING_MODERATION', 'PRE_REJECTED', 'UNAVAILABLE']) {
    sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${prefix}-${status}',"tenantId","ownerId",'https://example.com/${prefix}/${status}','${name} ${status}','Teste de status',"networkId","nicheId",'${status}',NOW() FROM links WHERE id='${state.receitas}' ON CONFLICT (id) DO UPDATE SET status='${status}'`)
  }
  sql(`INSERT INTO moderation_cases (id,"tenantId","linkId","updatedAt") SELECT 'case-${prefix}',"tenantId",id,NOW() FROM links WHERE id='${prefix}-PENDING_MODERATION' ON CONFLICT (id) DO NOTHING`)
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.goto(`${origin}/login`)
  await page.getByLabel('E-mail', { exact: true }).fill(state.admin)
  await page.getByLabel('Senha', { exact: true }).fill(state.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/painel/)
  await page.goto(`${origin}/admin/visao`)
  await selectOption(page.getByLabel('Área de gestão', { exact: true }), 'links')
  await page.getByRole('textbox', { name: 'Buscar contas e links' }).fill(name)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const filters = page.getByLabel('Situação dos links', { exact: true })
  const counts = await page.evaluate(async name => (await (await fetch('/bff/v1/admin/office?q=' + encodeURIComponent(name))).json()).linkStatusCounts, name)
  expect(counts.PUBLISHED).toBe(45)
  expect(Object.values(counts).reduce((total: number, value) => total + Number(value), 0)).toBe(49)
  const board = page.getByRole('region', { name: 'Links', exact: true })
  await expect(board.getByRole('article')).toHaveCount(40)
  for (const [filter, status, label] of [
    ['Rascunhos', 'DRAFT', 'Rascunho'], ['Pré-rejeitados', 'PRE_REJECTED', 'Pré-rejeitado'],
    ['Fora do ar', 'UNAVAILABLE', 'Fora do ar'], ['Aguardando revisão', 'PENDING_MODERATION', 'Aguardando revisão'],
  ]) {
    await selectOption(filters, { label: filter })
    await expect(board.getByRole('article')).toHaveCount(1)
    const card = board.getByRole('article', { name: `${name} ${status}` })
    await expect(card.getByLabel(`Status: ${label}`)).toBeVisible()
    if (status === 'DRAFT' || status === 'UNAVAILABLE') await expect(card.getByRole('button')).toHaveCount(0)
    if (status === 'PRE_REJECTED') await expect(card.getByRole('button', { name: 'Retirar envio' })).toBeVisible()
  }
  const accessibility = await new AxeBuilder({ page }).include('section[aria-label="Links"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations.map(row => ({ id: row.id, nodes: row.nodes.map(node => node.target) }))).toEqual([])
  await testInfo.attach('links-filtro-status', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' })
  await board.getByRole('link', { name: 'Revisar envio', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`moderacao\\?link=${prefix}-PENDING_MODERATION`))
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: `${name} PENDING_MODERATION`, exact: true })).toBeVisible()
})
