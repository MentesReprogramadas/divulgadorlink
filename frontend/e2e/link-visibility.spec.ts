import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { sql } from './db'
import { runtime } from './runtime.cjs'
import { selectOption } from './select-control'

const A = runtime.web('tenant-a.localhost')
test('dono oculta e desoculta sem mudar moderação, vaga ou prazo pago; público acompanha a mudança', async ({ page, browser }, info) => {
  await page.setViewportSize(info.project.use.isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
  const seed = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { tenantA: string; submitter: string; password: string; receitas: string }
  const userId = randomUUID(), linkId = randomUUID(), email = 'visibility-' + userId + '@tenant-a.test'
  const name = 'Comunidade de estudos — visibilidade'
  sql(`BEGIN;
    INSERT INTO users (id,"tenantId",name,"passwordHash","updatedAt") SELECT '${userId}','${seed.tenantA}','Publicador de teste',"passwordHash",NOW() FROM users WHERE id=(SELECT "userId" FROM user_identifiers WHERE "tenantId"='${seed.tenantA}' AND "normalizedValue"='${seed.submitter}' AND "replacedAt" IS NULL);
    INSERT INTO user_identifiers (id,"userId","tenantId",kind,"normalizedValue","confirmedAt") VALUES ('${randomUUID()}','${userId}','${seed.tenantA}','EMAIL','${email}',NOW()),('${randomUUID()}','${userId}','${seed.tenantA}','PHONE','55${Date.now()}${Math.floor(Math.random()*10000)}',NOW());
    INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"everPublished","occupiesSlot","updatedAt") SELECT '${linkId}','${seed.tenantA}','${userId}','https://example.com/visibility-${linkId}','${name}','Comunidade de estudos e tecnologia para trocar experiências e compartilhar materiais. Cadastro local isolado para verificar a privacidade e a visibilidade do catálogo.',"networkId","nicheId",'PUBLISHED',true,true,NOW() FROM links WHERE id='${seed.receitas}';
    INSERT INTO orders (id,"tenantId","userId","linkId",status,method,"productCode","durationDays","amountCents","savingsCents","updatedAt") VALUES ('order-${linkId}','${seed.tenantA}','${userId}','${linkId}','PAID','PIX','SEARCH',7,790,0,NOW());
    INSERT INTO promotions (id,"tenantId","linkId",status,surface,"activatedAt","expiresAt","updatedAt") VALUES ('promo-${linkId}','${seed.tenantA}','${linkId}','ACTIVE','SEARCH',NOW(),NOW()+INTERVAL '7 days',NOW());
    COMMIT;`)
  const paidBefore = sql(`SELECT status::text || '|' || "expiresAt"::text FROM promotions WHERE id='promo-${linkId}'`)
  const guest = await browser.newContext({ locale: 'pt-BR' })
  const publicPage = await guest.newPage()
  try {
    await guest.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
    await publicPage.goto(A + '/link/' + linkId)
    await expect(publicPage.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible()
    await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
    await page.goto(A + '/login')
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(seed.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(A + '/painel')
    await page.goto(A + '/painel/links')
    const card = page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
    const hide = card.getByRole('button', { name: 'Ocultar', exact: true })
    await expect(hide).toHaveAttribute('data-variant', 'danger')
    await card.screenshot({ path: info.outputPath('01-ocultar-vermelho.png'), animations: 'disabled' })
    const hidden = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/links/' + linkId + '/visibility'))
    await hide.click()
    expect((await hidden).status()).toBe(200)
    await expect(card.getByRole('button', { name: 'Desocultar', exact: true })).toBeVisible()
    await expect(card.getByText('Oculto por você', { exact: true })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Destacar este link', exact: true })).toHaveCount(0)
    expect(sql(`SELECT "ownerHidden"::text || '|' || status::text || '|' || "occupiesSlot"::text FROM links WHERE id='${linkId}'`)).toBe('true|PUBLISHED|true')
    expect(sql(`SELECT status::text || '|' || "expiresAt"::text FROM promotions WHERE id='promo-${linkId}'`)).toBe(paidBefore)
    await expect.poll(() => publicPage.evaluate(async ({ id, title }) => {
      const response = await fetch('/bff/v1/links/' + id, { cache: 'no-store' })
      const body = await response.json()
      return { status: response.status, available: body.available, leaksPrivateContent: JSON.stringify(body).includes(title) || JSON.stringify(body).includes('example.com/visibility-' + id) }
    }, { id: linkId, title: name })).toEqual({ status: 200, available: false, leaksPrivateContent: false })
    await publicPage.reload()
    await expect(publicPage.getByRole('heading', { name, exact: true, level: 1 })).toHaveCount(0)
    await page.reload()
    await expect(card.getByRole('button', { name: 'Desocultar', exact: true })).toBeVisible()
    await selectOption(page.getByLabel('Situação do link'), 'hidden')
    await expect(card).toBeVisible()
    await card.screenshot({ path: info.outputPath('02-oculto-desocultar.png'), animations: 'disabled' })
    const accessibility = await new AxeBuilder({ page }).include('#link-' + linkId).analyze()
    expect(accessibility.violations.map(row => ({ id: row.id, impact: row.impact }))).toEqual([])
    const restored = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/links/' + linkId + '/visibility'))
    await card.getByRole('button', { name: 'Desocultar', exact: true }).focus()
    await page.keyboard.press('Enter')
    expect((await restored).status()).toBe(200)
    await selectOption(page.getByLabel('Situação do link'), 'all')
    await expect(card.getByRole('button', { name: 'Ocultar', exact: true })).toBeVisible()
    await expect(card.getByText('Oculto por você', { exact: true })).toHaveCount(0)
    expect(sql(`SELECT "ownerHidden"::text || '|' || status::text || '|' || "occupiesSlot"::text FROM links WHERE id='${linkId}'`)).toBe('false|PUBLISHED|true')
    expect(sql(`SELECT status::text || '|' || "expiresAt"::text FROM promotions WHERE id='promo-${linkId}'`)).toBe(paidBefore)
    await expect.poll(() => publicPage.evaluate(async id => {
      const response = await fetch('/bff/v1/links/' + id, { cache: 'no-store' })
      return { status: response.status, available: (await response.json()).available }
    }, linkId)).toEqual({ status: 200, available: true })
    await publicPage.reload()
    await expect(publicPage.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible()
    await page.reload()
    await expect(card.getByRole('button', { name: 'Ocultar', exact: true })).toBeVisible()
    await card.screenshot({ path: info.outputPath('03-desocultado.png'), animations: 'disabled' })
    await page.setViewportSize({ width: 320, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally { await guest.close() }
})
