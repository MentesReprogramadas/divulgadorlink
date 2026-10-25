import { runtime as e2eRuntime } from './runtime.cjs'
import { expect, test } from '@playwright/test'
import { sql } from './db'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const A = (e2eRuntime.web('tenant-a.localhost'))

for (const width of [1440, 390]) {
  test(`aceite no cadastro preserva campanha e descarta opcionais inválidos (${width}px)`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.route(/facebook|google(tagmanager|adservices)|doubleclick/, route => route.abort())
    const campaign = `late-${width}`
    await page.goto(`${A}/divulgar?utm_source=ig&utm_medium=paid&utm_campaign=${campaign}&utm_content=Video+Instagram&utm_term=Publico+aberto`)
    expect((await page.context().cookies()).some(row => row.name === 'tla_touch')).toBe(false)
    await page.getByRole('link', { name: 'Publicar um link', exact: true }).click()
    await expect(page).toHaveURL(/\/cadastro\?tla_landing=/)
    expect((await page.context().cookies()).some(row => row.name === 'tla_touch')).toBe(false)
    await expect(page.getByRole('button', { name: 'Aceitar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aceitar', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Aceitar', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await page.context().cookies()).some(row => row.name === 'tla_touch')).toBe(true)
    await page.getByLabel('Nome').fill('Cadastro campanha')
    const email = `late-${width}@tenant-a.test`
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill('Senha-e2e-1')
    await page.screenshot({ path: info.outputPath(`cadastro-${width}.png`), animations: 'disabled', fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/painel\/verificar/)
    expect(sql(`SELECT source || '|' || campaign || '|' || content || '|' || term FROM acquisition_touches WHERE "userId" = (SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL)`)).toBe(`ig|${campaign}||`)
  })
}

test('campanha com muitas entradas mantém cadastro mesmo fora do ranking de conversões', async ({ page }) => {
  const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { tenantA: string; admin: string; password: string }
  const prefix = 'traffic-ranking-'
  try {
    sql(`INSERT INTO users (id,"tenantId",name,"passwordHash","updatedAt") SELECT '${prefix}' || n, '${state.tenantA}', 'Fixture', 'not-a-login', NOW() FROM generate_series(1,25) n;
      INSERT INTO acquisition_touches (id,"tenantId","userId",source,medium,campaign,content,term,"landingPath") SELECT '${prefix}' || n, '${state.tenantA}', '${prefix}' || n,'ig','paid',CASE WHEN n=25 THEN '${prefix}target' ELSE '${prefix}' || ((n-1)/2)::int END,'','','/divulgar' FROM generate_series(1,25) n;
      INSERT INTO site_traffic_daily (id,"tenantId",day,path,source,medium,campaign,views,entries) VALUES ('${prefix}entry','${state.tenantA}',CURRENT_DATE,'/divulgar','ig','paid','${prefix}target',10000,10000);`)
    await page.goto(`${A}/login`)
    await page.getByLabel('E-mail').fill(state.admin)
    await page.getByLabel('Senha').fill(state.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/(painel|admin)/)
    const result = await page.evaluate(async () => {
      const response = await fetch('/bff/v1/admin/traffic?days=30')
      return { status: response.status, body: await response.json() }
    })
    expect(result.status).toBe(200)
    const body = result.body
    expect(body.consentedRegistrations).toContainEqual({ source: 'ig', medium: 'paid', campaign: `${prefix}target`, registrations: 1 })
  } finally {
    sql(`DELETE FROM site_traffic_daily WHERE id='${prefix}entry'; DELETE FROM users WHERE id LIKE '${prefix}%';`)
  }
})

test('sem aceite não guarda campanha nem chama a Meta', async ({ page }) => {
  let facebook = 0
  await page.route('**/*facebook*', async (route) => {
    facebook += 1
    await route.abort()
  })
  const email = `funil-${Date.now()}@tenant-a.test`
  await page.goto(`${A}/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=outubro&utm_content=a&utm_term=b`)
  await page.goto(`${A}/cadastro`)
  await page.getByLabel('Nome').fill('Funil')
  await page.getByLabel('E-mail').fill(email)
  if (await page.getByLabel('Telefone').count()) {
    await page.getByLabel('Telefone').fill('11988887777')
  }
  await page.getByLabel('Senha').fill('Senha-e2e-1')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/painel/)
  const campaign = sql(`SELECT campaign FROM acquisition_touches WHERE "userId" = (SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL)`)
  expect(campaign).toBe('')
  await page.goto(`${A}/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=novembro&utm_content=a&utm_term=b`)
  const again = sql(`SELECT campaign FROM acquisition_touches WHERE "userId" = (SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL)`)
  expect(again).toBe('')
  expect(facebook).toBe(0)
})

test('com consentimento o primeiro anúncio permanece na conta', async ({ page }) => {
  await page.route(/facebook|google(tagmanager|adservices)|doubleclick/, route => route.abort())
  const email = `funil-consentido-${Date.now()}@tenant-a.test`
  await page.goto(`${A}/divulgar`)
  await page.getByRole('button', { name: 'Aceitar', exact: true }).click()
  await page.goto(`${A}/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=outubro&utm_content=a&utm_term=b`)
  await page.goto(`${A}/cadastro`)
  await page.getByLabel('Nome').fill('Funil consentido')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('Senha-e2e-1')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/painel\/verificar/)
  const query = `SELECT campaign FROM acquisition_touches WHERE "userId" = (SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL)`
  expect(sql(query)).toBe('outubro')
  await page.goto(`${A}/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=novembro`)
  expect(sql(query)).toBe('outubro')
})
