import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { signWooviTestBody } from '../../backend/src/adapters/payments/woovi-test-signing'
import { postRaw, sql } from './db'
import { runtime } from './runtime.cjs'
import { selectOption } from './select-control'

const A = runtime.web('tenant-a.localhost')
type Seed = { tenantA: string; password: string; submitter: string; dora: string }
type Offer = { id: string; linkId: string; expiresAt: string; discountPercent: number }
function state(): Seed { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as Seed }
let previousThreshold: string | null = null

test.beforeEach(async ({ page }, info) => {
  // Keep the acceptance viewports identical in the standalone run and CI feature shards.
  await page.setViewportSize(info.project.use.isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
  previousThreshold = sql(`SELECT value FROM configs WHERE "tenantId"='${state().tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)
})

test.afterEach(() => {
  if (previousThreshold !== null) {
    const escaped = previousThreshold.replaceAll("'", "''")
    sql(`UPDATE configs SET value='${escaped}', "updatedAt"=NOW() WHERE "tenantId"='${state().tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)
  }
  previousThreshold = null
})

async function loginFixture(page: Page, info: TestInfo) {
  const seed = state(), id = randomUUID()
  const email = `launch-${info.project.name}-${id}@tenant-a.test`
  sql(`UPDATE configs SET value='0', "updatedAt"=NOW() WHERE "tenantId"='${seed.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD';
    INSERT INTO users (id,"tenantId",name,"passwordHash","updatedAt") SELECT '${id}','${seed.tenantA}','Comunidade de tecnologia',"passwordHash",NOW() FROM users WHERE id=(SELECT "userId" FROM user_identifiers WHERE "tenantId"='${seed.tenantA}' AND "normalizedValue"='${seed.submitter}' AND "replacedAt" IS NULL);
    INSERT INTO user_identifiers (id,"userId","tenantId",kind,"normalizedValue","confirmedAt") VALUES ('${randomUUID()}','${id}','${seed.tenantA}','EMAIL','${email}',NOW()),('${randomUUID()}','${id}','${seed.tenantA}','PHONE','55${Date.now()}${Math.floor(Math.random() * 10000)}',NOW());`)
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.goto(A + '/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(seed.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  return { id, email }
}

async function submit(page: Page, niche = 'Jogos') {
  await page.goto(A + '/painel/links/novo')
  await page.getByLabel('Título do link').fill('Achados de tecnologia')
  await page.getByLabel('Link de acesso').fill(`https://example.com/launch-${randomUUID()}`)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Descrição', { exact: true }).fill('Novidades, conversas e achados de tecnologia para a comunidade.')
  await selectOption(page.getByLabel('Rede do link'), { label: 'Site' })
  await selectOption(page.getByLabel('Assunto do link'), { label: niche })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const created = page.waitForResponse(response => response.request().method() === 'POST' && /\/bff\/v1\/links$/.test(response.url()))
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  const response = await created
  expect(response.status()).toBe(201)
  const link = await response.json() as { id: string }
  await expect(page.getByRole('heading', { name: /Destaque seu link com 20% OFF/ })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Etapas do formulário' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Comprar por R$ 14,32', exact: true })).toBeVisible()
  return link.id
}

async function currentOffer(page: Page): Promise<Offer> {
  const response = await readApi(page, '/bff/v1/promotions/launch-offer')
  expect(response.status).toBe(200)
  return (response.body as { offer: Offer }).offer
}

async function readApi(page: Page, url: string) {
  // Chromium resolves *.localhost; Node's APIRequestContext does not on Windows.
  return page.evaluate(async endpoint => {
    const response = await fetch(endpoint)
    return { status: response.status, body: await response.json() as unknown }
  }, url)
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  await page.screenshot({ path: info.outputPath(name + '.png'), fullPage: true, animations: 'disabled' })
}

test('pós-cadastro sem modal: Home reversível e Comprar gera Pix na mesma página', async ({ page }, info) => {
  const fixture = await loginFixture(page, info)
  const linkId = await submit(page)
  expect(sql(`SELECT status FROM links WHERE id='${linkId}'`)).toBe('PUBLISHED')
  const originalUrl = page.url()
  const home = page.getByRole('checkbox', { name: 'Adicionar a Home ao destaque' })
  await expect(home).not.toBeChecked()
  await capture(page, info, '01-oferta-na-pagina')
  const initialBuy = await page.getByRole('button', { name: 'Comprar por R$ 14,32', exact: true }).boundingBox()
  expect(initialBuy && initialBuy.y + initialBuy.height <= page.viewportSize()!.height).toBe(true)
  await home.locator('..').getByText(/Home/).first().click()
  await expect(home).toBeChecked()
  await expect(page.getByRole('button', { name: 'Comprar por R$ 26,32' })).toBeVisible()
  await capture(page, info, '02-home-adicionada-removivel')
  await page.getByText('Remover', { exact: true }).click()
  await expect(home).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Comprar por R$ 14,32' })).toBeVisible()
  await home.focus(); await page.keyboard.press('Space')
  await expect(home).toBeChecked()
  const audit = await new AxeBuilder({ page }).include('[aria-label="Oferta para destacar o link cadastrado"]').analyze()
  expect(audit.violations.map(row => ({ id: row.id, impact: row.impact }))).toEqual([])
  expect(sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${linkId}'`)).toBe('0')
  await page.getByRole('button', { name: 'Comprar por R$ 26,32' }).click()
  await expect(page.getByLabel('Pix copia e cola')).toHaveText('00020126580014BR.GOV.BCB.PIX')
  expect(page.url()).toBe(originalUrl)
  const orderId = (await page.getByLabel('Pedido', { exact: true }).textContent())!.trim()
  expect(sql(`SELECT status || '|' || "amountCents" FROM orders WHERE id='${orderId}'`)).toBe('PENDING_PAYMENT|2632')
  await capture(page, info, '03-pix-na-mesma-pagina')
  const body = JSON.stringify({ event: 'OPENPIX:CHARGE_COMPLETED', charge: { correlationID: orderId } })
  const paid = await postRaw({ path: '/api/v1/payments/woovi/webhook', host: 'tenant-a.localhost', headers: { 'x-webhook-signature': signWooviTestBody(body) }, body })
  expect(paid.status).toBe(200)
  await expect(page.getByText('Pagamento confirmado', { exact: true })).toBeVisible()
  await expect(page.getByRole('timer')).toHaveCount(0)
  await expect(page.getByText('Destaque seu link com 20% OFF')).toHaveCount(0)
  await expect(page.getByText('Link cadastrado. Aproveite para destacá-lo.')).toHaveCount(0)
  expect(sql(`SELECT COUNT(*) FROM promotions WHERE "linkId"='${linkId}' AND status='ACTIVE'`)).toBe('3')
  expect(sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${linkId}' AND "userId"='${fixture.id}'`)).toBe('1')
  await postRaw({ path: '/api/v1/payments/woovi/webhook', host: 'tenant-a.localhost', headers: { 'x-webhook-signature': signWooviTestBody(body) }, body })
  expect(sql(`SELECT COUNT(*) FROM promotions WHERE "linkId"='${linkId}' AND status='ACTIVE'`)).toBe('3')
  await capture(page, info, '04-destaque-confirmado')
})

test('dispensa inicial sem segundo modal; faixa global pode ocultar e persiste no painel', async ({ page }, info) => {
  await loginFixture(page, info)
  await submit(page)
  const before = await currentOffer(page)
  await page.getByRole('button', { name: 'Agora não', exact: true }).click()
  await expect(page).toHaveURL(A + '/painel/links')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const reminder = page.getByRole('complementary', { name: 'Oferta de destaque disponível' })
  await expect(reminder).toBeVisible()
  await expect(reminder.getByRole('button', { name: /Ocultar/ })).toHaveCount(0)
  await capture(page, info, '05-painel-banner-e-acoes')
  await expect(page.getByText('Mais opções', { exact: true })).toHaveCount(0)
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Achados de tecnologia', exact: true }) })
  for (const name of ['Destacar este link', 'Ver resultado', 'Editar', 'Disponibilidade', 'Acessar']) await expect(card.getByRole('link', { name, exact: true })).toBeVisible()
  await page.goto(A + '/')
  await expect(reminder).toBeVisible()
  await reminder.getByRole('button', { name: /Expandir/ }).click()
  await capture(page, info, '06-faixa-global-expandida')
  await reminder.getByRole('button', { name: /Ocultar/ }).click()
  await expect(reminder).toHaveCount(0)
  await page.reload()
  await expect(reminder).toHaveCount(0)
  await page.goto(A + '/painel/links')
  await expect(reminder).toBeVisible()
  await expect(reminder.getByRole('button', { name: /Ocultar/ })).toHaveCount(0)
  const after = await currentOffer(page)
  expect(after.id).toBe(before.id)
  expect(after.expiresAt).toBe(before.expiresAt)
  await capture(page, info, '07-painel-oferta-persistente')
})

test('saída manual oferece 20% no pacote escolhido de link antigo e compra dentro do modal', async ({ page }, info) => {
  const fixture = await loginFixture(page, info), seed = state(), linkId = randomUUID()
  sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"createdAt","updatedAt") SELECT '${linkId}','${seed.tenantA}','${fixture.id}','https://example.com/manual-${linkId}','Comunidade de jogos','Comunidade com novidades de jogos',n.id,c.id,'PUBLISHED',NOW()-INTERVAL '8 days',NOW() FROM networks n JOIN niches c ON c."tenantId"=n."tenantId" WHERE n."tenantId"='${seed.tenantA}' AND n.slug='site' AND c.slug='jogos' LIMIT 1`)
  await page.goto(A + '/painel/links')
  await page.goto(A + '/painel/links/' + linkId + '/destaque')
  await page.getByRole('radio', { name: 'Busca', exact: true }).check()
  await page.getByRole('radio', { name: '7 dias', exact: true }).check()
  await capture(page, info, '08-escolha-manual')
  await page.getByRole('button', { name: 'Voltar para Meus links', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Comprar por R$ 6,32', exact: true })).toBeVisible()
  await expect(dialog).toContainText('Busca')
  await expect(dialog.getByRole('heading', { name: 'Seu destaque com 20% OFF', exact: true })).toBeVisible()
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Fechar janela' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  const buyBounds = await dialog.getByRole('button', { name: 'Comprar por R$ 6,32', exact: true }).boundingBox()
  expect(buyBounds && buyBounds.y + buyBounds.height <= page.viewportSize()!.height).toBe(true)
  const audit = await new AxeBuilder({ page }).include('dialog[open]').analyze()
  expect(audit.violations.map(row => ({ id: row.id, impact: row.impact, nodes: row.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) }))).toEqual([])
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
  await capture(page, info, '09-modal-saida-pacote-selecionado')
  await dialog.getByRole('button', { name: 'Comprar por R$ 6,32', exact: true }).click()
  await expect(page.getByLabel('Pix copia e cola')).toBeVisible()
  expect(page.url()).toContain('/painel/links/' + linkId + '/destaque')
  expect(sql(`SELECT "amountCents" FROM orders WHERE "linkId"='${linkId}'`)).toBe('632')
  await capture(page, info, '10-pix-recuperacao')
  await page.goBack()
  await expect(page).toHaveURL(A + '/painel/links')
})

test('prazo absoluto expira sem reiniciar em 320px e zoom', async ({ page }, info) => {
  await loginFixture(page, info)
  const linkId = await submit(page), offer = await currentOffer(page)
  sql(`UPDATE promotion_launch_offers SET "expiresAt"=NOW()-INTERVAL '1 second' WHERE id='${offer.id}'`)
  await page.goto(A + '/painel/links/' + linkId + '/destaque?launch=1')
  await page.setViewportSize({ width: 320, height: 900 })
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect(page.getByText(/20% OFF/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Comprar/ })).toBeVisible()
  expect(sql(`SELECT COUNT(*) FROM promotion_launch_offers WHERE "userId"=(SELECT "ownerId" FROM links WHERE id='${linkId}')`)).toBe('1')
  await capture(page, info, '11-expirada-320-zoom')
})

test('+18 nunca oferece Home e API recusa combinações adulteradas; tenant isolado', async ({ page }, info) => {
  await loginFixture(page, info)
  const seed = state(), nicheId = randomUUID(), nicheName = 'Conteúdo adulto ' + nicheId.slice(0, 8)
  sql(`INSERT INTO niches (id,"tenantId",name,slug,"requiresAge","isPublicFacet","updatedAt") VALUES ('${nicheId}','${seed.tenantA}','${nicheName}','adult-launch-${nicheId}',TRUE,TRUE,NOW())`)
  const linkId = await submit(page, nicheName)
  await expect(page.getByRole('checkbox', { name: /Home/ })).toHaveCount(0)
  await capture(page, info, '12-mais18-oferta-sem-home')
  await page.getByRole('button', { name: 'Agora não', exact: true }).click()
  await page.goto(A + '/painel/links/' + linkId + '/destaque')
  await expect(page.getByRole('radio', { name: 'Completo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Home', exact: true })).toHaveCount(0)
  const catalog = await readApi(page, '/bff/v1/promotions/offers?linkId=' + linkId)
  expect((catalog.body as { offers: Array<{ surfaces: string[] }> }).offers.every(offer => !offer.surfaces.includes('HOME'))).toBe(true)
  for (const endpoint of ['checkout', 'renew']) {
    for (const surfaces of [['HOME'], ['SEARCH', 'NICHE', 'HOME']]) {
      const rejected = await page.evaluate(async ({ endpoint, surfaces, linkId }) => {
        const csrf = document.cookie.split('; ').find(value => value.startsWith('csrf='))?.slice(5) ?? ''
        const response = await fetch('/bff/v1/promotions/' + endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf), 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ linkId, surfaces, durationDays: 7, method: 'PIX' }) })
        return response.status
      }, { endpoint, surfaces, linkId })
      expect(rejected).toBe(409)
    }
  }
  expect(sql(`SELECT COUNT(*) FROM orders WHERE "linkId"='${linkId}'`)).toBe('0')
  await page.goto(runtime.web('tenant-b.localhost') + '/login')
  await page.getByLabel('E-mail').fill(seed.dora)
  await page.getByLabel('Senha').fill(seed.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const denied = await readApi(page, '/bff/v1/promotions/offers?linkId=' + linkId)
  expect(denied.status).toBe(404)
  expect(JSON.stringify(denied.body)).not.toContain('Achados de tecnologia')
})

test('primeira criação de Minha página coloca ajuda antes de criação manual', async ({ page }, info) => {
  await loginFixture(page, info)
  await page.goto(A + '/painel/perfil')
  const help = page.getByRole('link', { name: /Criar com ajuda/ }), manual = page.getByRole('link', { name: /Criar do meu jeito/ })
  await expect(help).toBeVisible(); await expect(manual).toBeVisible()
  const order = await help.evaluate((node, text) => {
    const other = Array.from(document.querySelectorAll('a')).find(link => link.textContent?.includes(text))
    return Boolean(other && node.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING)
  }, 'Criar do meu jeito')
  expect(order).toBe(true)
  await capture(page, info, '13-minha-pagina-ajuda-primeiro')
})
