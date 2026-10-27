import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { selectOption } from './select-control'

const tenant = 'seo-professional'
const host = 'seo-professional.localhost'
const origin = runtime.web(host)
const canonical = `https://${host}`
const updatedAt = '2026-10-20T00:00:00.000Z'
const adultCollection = 'telegram-adulto-revisado'
const bettingCollection = 'telegram-apostas-revisado'
const offersCollection = 'ofertas-whatsapp-revisadas'
const telegramOffersCollection = 'ofertas-telegram-revisadas'
const secretName = 'SEO_RESTRICTED_NAME_SENTINEL'
const secretDescription = 'SEO_RESTRICTED_DESCRIPTION_SENTINEL'
const mediaPath = '/bff/v1/links/seo-adult-01/media/seo-adult-image'
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
type EditorialText = { title: string; description: string; explicit: boolean; approved: boolean }
type Editorial = {
  version: number
  facets: Record<string, EditorialText>
  links: Record<string, EditorialText & { fingerprint: string }>
  collections: Array<EditorialText & { slug: string; networkSlug: string | null; nicheSlug: string | null; linkIds?: string[] }>
}
let editorial: Editorial

function fingerprint(link: { id: string; name: string; description: string; canonicalUrl: string; networkId: string; nicheId: string }) {
  return createHash('sha256').update(JSON.stringify([link.id, tenant, link.name, link.description, link.canonicalUrl, link.networkId, link.nicheId, updatedAt])).digest('hex')
}

function restoreEditorial() {
  sql(`INSERT INTO configs(id,"tenantId",key,value,"updatedAt") VALUES('seo-editorial',${quote(tenant)},'CATALOG_SEO_EDITORIAL',${quote(JSON.stringify(editorial))},${quote(updatedAt)})
    ON CONFLICT("tenantId",key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=EXCLUDED."updatedAt"`)
}

async function stableScreenshot(page: Page, filename: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: filename, fullPage: true, animations: 'disabled' })
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  if (!fits) {
    const metrics = await page.evaluate(() => ({
      url: location.href,
      innerWidth,
      visualViewport: { width: visualViewport?.width, scale: visualViewport?.scale },
      root: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, offsetWidth: document.documentElement.offsetWidth, zoom: getComputedStyle(document.documentElement).zoom, width: getComputedStyle(document.documentElement).width, rect: document.documentElement.getBoundingClientRect().toJSON() },
      body: { scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth, width: getComputedStyle(document.body).width, minWidth: getComputedStyle(document.body).minWidth, zoom: getComputedStyle(document.body).zoom, rect: document.body.getBoundingClientRect().toJSON() },
      outside: Array.from(document.querySelectorAll('body *')).map(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
        return { tag: element.tagName, class: element.getAttribute('class'), text: element.textContent?.trim().slice(0, 70), left: rect.left, right: rect.right, width: rect.width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, cssWidth: style.width, minWidth: style.minWidth, position: style.position, overflow: style.overflow }
      }).filter(element => element.right > innerWidth + 1 || element.left < -1).sort((a, b) => b.right - a.right).slice(0, 25),
    }))
    const probe = await page.context().newPage()
    await probe.setContent('<!doctype html><html><body><main><h1>Blank zoom control</h1><p>Content without application styles.</p></main></body></html>')
    await probe.evaluate(() => { document.documentElement.style.zoom = '2' })
    const blankZoom = await probe.evaluate(() => ({ innerWidth, rootScrollWidth: document.documentElement.scrollWidth, rootClientWidth: document.documentElement.clientWidth, rootWidth: getComputedStyle(document.documentElement).width, bodyWidth: getComputedStyle(document.body).width, visualViewportWidth: visualViewport?.width }))
    await probe.close()
    const diagnostic = JSON.stringify({ metrics, blankZoom }, null, 2)
    console.log('SEO_LAYOUT_OVERFLOW ' + diagnostic)
    await test.info().attach('layout-overflow.json', { body: diagnostic, contentType: 'application/json' })
  }
  expect(fits).toBe(true)
}

async function headForHtmlLimitedBot(page: Page, pathname: string) {
  // Next 15 streams metadata for browsers, but blocks it into head for HTML-limited bots.
  const response = await page.request.get(origin + pathname, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } })
  expect(response.status()).toBe(200)
  const html = await response.text()
  const head = /<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i.exec(html)?.[1]
  expect(head).toBeTruthy()
  return { html, head: head! }
}

test.beforeAll(() => {
  sql(`INSERT INTO tenants(id,host,name,"updatedAt") VALUES(${quote(tenant)},${quote(host)},'SEO Catálogo de teste',${quote(updatedAt)}) ON CONFLICT(id) DO NOTHING;
    INSERT INTO configs(id,"tenantId",key,value,"updatedAt") VALUES
      ('seo-threshold',${quote(tenant)},'SEARCH_RELEVANCE_THRESHOLD','0.35',${quote(updatedAt)}),
      ('seo-text-weight',${quote(tenant)},'SEARCH_TEXT_WEIGHT','0.4',${quote(updatedAt)}),
      ('seo-semantic-weight',${quote(tenant)},'SEARCH_SEMANTIC_WEIGHT','0.6',${quote(updatedAt)}),
      ('seo-impressions',${quote(tenant)},'SHOW_IMPRESSIONS','0',${quote(updatedAt)}),
      ('seo-moderation',${quote(tenant)},'MODERATION_AUTO_APPROVE_THRESHOLD','0.85',${quote(updatedAt)}) ON CONFLICT("tenantId",key) DO NOTHING;
    INSERT INTO networks(id,"tenantId",name,slug,"knownHosts","isPublicFacet","requiresAge","updatedAt") VALUES
      ('seo-telegram',${quote(tenant)},'Telegram','telegram',ARRAY['t.me'],true,false,${quote(updatedAt)}),
      ('seo-whatsapp',${quote(tenant)},'WhatsApp','whatsapp',ARRAY['chat.whatsapp.com'],true,false,${quote(updatedAt)}),
      ('seo-empty-network',${quote(tenant)},'Discord','discord',ARRAY['discord.gg'],true,false,${quote(updatedAt)}) ON CONFLICT(id) DO NOTHING;
    INSERT INTO niches(id,"tenantId",name,slug,"requiresAge","isPublicFacet","updatedAt") VALUES
      ('seo-adult',${quote(tenant)},'Adulto','adulto',true,true,${quote(updatedAt)}),
      ('seo-betting',${quote(tenant)},'Apostas','apostas',true,true,${quote(updatedAt)}),
      ('seo-offers',${quote(tenant)},'Compras, Ofertas & Cupons','compras-ofertas-cupons',false,true,${quote(updatedAt)}),
      ('seo-empty',${quote(tenant)},'Coleção sem conteúdo','sem-conteudo',false,true,${quote(updatedAt)}) ON CONFLICT(id) DO NOTHING;
    INSERT INTO users(id,"tenantId",name,"passwordHash",role,status,"updatedAt")
      SELECT 'seo-admin',${quote(tenant)},'Admin SEO',"passwordHash",'ADMIN'::"UserRole",'ACTIVE'::"UserStatus",${quote(updatedAt)}
      FROM users WHERE role='ADMIN' AND status='ACTIVE' ORDER BY id LIMIT 1 ON CONFLICT(id) DO NOTHING;
    INSERT INTO user_identifiers(id,"userId","tenantId",kind,"normalizedValue","confirmedAt") VALUES
      ('seo-admin-email','seo-admin',${quote(tenant)},'EMAIL','admin@seo-professional.test',${quote(updatedAt)}) ON CONFLICT(id) DO NOTHING;`)

  editorial = { version: 1, facets: {}, links: {}, collections: [
    { slug: telegramOffersCollection, title: 'Grupos de ofertas no Telegram', description: 'Seleção de canais de ofertas e cupons no Telegram.', networkSlug: 'telegram', nicheSlug: 'compras-ofertas-cupons', explicit: false, approved: true },
    { slug: adultCollection, title: 'Grupos adultos revisados no Telegram', description: 'Conheça as apresentações públicas das comunidades para maiores de 18 anos, revisadas para este catálogo de teste.', networkSlug: 'telegram', nicheSlug: 'adulto', explicit: true, approved: true },
    { slug: bettingCollection, title: 'Comunidades de apostas esportivas no Telegram', description: 'Comunidades para discussão de esportes e apostas, com apresentações públicas para maiores de 18 anos.', networkSlug: 'telegram', nicheSlug: 'apostas', explicit: false, approved: true },
    { slug: offersCollection, title: 'Ofertas e achadinhos no WhatsApp', description: 'Encontre comunidades de ofertas, achadinhos e cupons no WhatsApp. Leia a proposta de cada grupo antes de participar.', networkSlug: 'whatsapp', nicheSlug: 'compras-ofertas-cupons', explicit: false, approved: true },
  ] }
  const tuples: string[] = []
  tuples.push(`(${['seo-telegram-offer', tenant, 'https://t.me/seo-public-offers', 'Ofertas no Telegram', 'Canal de promoções e cupons.', 'seo-telegram', 'seo-offers'].map(quote).join(',')},'PUBLISHED','pt',${quote(updatedAt)})`)
  for (let index = 1; index <= 25; index++) {
    const number = String(index).padStart(2, '0')
    const adult = { id: `seo-adult-${number}`, name: `${secretName}_${number}`, description: `${secretDescription}_${number}`, canonicalUrl: `https://t.me/seo-private-invite-${number}`, networkId: 'seo-telegram', nicheId: 'seo-adult' }
    editorial.links[adult.id] = { title: `Comunidade adulta revisada ${number}`, description: `Apresentação pública autorizada da comunidade ${number}, exclusiva para maiores de 18 anos.`, explicit: true, approved: true, fingerprint: fingerprint(adult) }
    tuples.push(`(${[adult.id, tenant, adult.canonicalUrl, adult.name, adult.description, adult.networkId, adult.nicheId].map(quote).join(',')},'PUBLISHED','pt',${quote(updatedAt)})`)
    tuples.push(`(${[`seo-free-${number}`, tenant, `https://chat.whatsapp.com/seo-public-invite-${number}`, `Oferta pública ${number}`, `Comunidade de achadinhos e cupons para a casa ${number}, com uma apresentação de teste própria.`, 'seo-whatsapp', 'seo-offers'].map(quote).join(',')},'PUBLISHED','pt',${quote(updatedAt)})`)
  }
  const betting = { id: 'seo-bet', name: 'SEO_BETTING_RESTRICTED_NAME', description: 'SEO_BETTING_RESTRICTED_BODY', canonicalUrl: 'https://t.me/seo-private-betting', networkId: 'seo-telegram', nicheId: 'seo-betting' }
  editorial.links[betting.id] = { title: 'Debate de apostas esportivas', description: 'Apresentação pública de uma comunidade de discussão de apostas esportivas para maiores de 18 anos.', explicit: false, approved: true, fingerprint: fingerprint(betting) }
  tuples.push(`(${[betting.id, tenant, betting.canonicalUrl, betting.name, betting.description, betting.networkId, betting.nicheId].map(quote).join(',')},'PUBLISHED','pt',${quote(updatedAt)})`)
  sql(`INSERT INTO links(id,"tenantId","canonicalUrl",name,description,"networkId","nicheId",status,"languageTag","updatedAt") VALUES ${tuples.join(',')} ON CONFLICT(id) DO NOTHING`)
  const bytes = readFileSync(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png')).toString('hex')
  sql(`INSERT INTO link_media_assets(id,"tenantId","linkId",kind,status,bytes,alt,revision)
    VALUES('seo-adult-image',${quote(tenant)},'seo-adult-01','IMAGE','APPROVED',decode('${bytes}','hex'),'SEO_RESTRICTED_MEDIA_SENTINEL',1) ON CONFLICT(id) DO NOTHING`)
  restoreEditorial()
})

test.beforeEach(async ({ context }) => {
  restoreEditorial()
  await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: host, path: '/' }])
})

test('Telegram conecta seleções úteis por interesse sem expor conteúdo restrito', async ({ page }, info) => {
  const response = await page.goto(origin + '/rede/telegram')
  expect(response?.status()).toBe(200)
  const html = await response!.text()
  expect(html).toContain('Como encontrar e entrar em grupos do Telegram')
  expect(html).not.toContain(secretDescription)
  expect(html).not.toContain('SEO_BETTING_RESTRICTED_BODY')
  await page.waitForLoadState('networkidle')
  const ageDialog = page.getByRole('dialog', {name:'Conteúdo para maiores de 18 anos'})
  await ageDialog.getByRole('button', {name:'Não tenho', exact:true}).click()
  await expect(ageDialog).toHaveCount(0)
  const section = page.getByRole('region', {name:'Grupos do Telegram por interesse'})
  await expect(section.getByRole('link')).toHaveText([editorial.collections[1].title + ' · +18', editorial.collections[2].title, editorial.collections[0].title])
  await expect(section.getByRole('link', {name:/WhatsApp/})).toHaveCount(0)
  await stableScreenshot(page, info.outputPath('telegram-discovery.png'))
  const offers = section.getByRole('link', {name:'Grupos de ofertas no Telegram'})
  await offers.focus()
  await expect(offers).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(origin + '/descobrir/' + telegramOffersCollection)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index, follow')
  await expect(page.getByRole('link', {name:'Telegram', exact:true})).toHaveAttribute('href','/rede/telegram')
  await page.goto(origin + '/rede/telegram?nicho=compras-ofertas-cupons')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, follow')
  await expect(page.getByRole('heading', {name:'Como encontrar e entrar em grupos do Telegram'})).toHaveCount(0)
})

test('metadados, sitemap e detalhes públicos refletem a mesma política de SEO', async ({ page }, info) => {
  await page.goto(origin + '/rede/whatsapp')
  await expect(page).toHaveTitle(/Grupos e canais de WhatsApp/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical + '/rede/whatsapp')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
  await expect(page.locator('meta[name="rating"]')).toHaveCount(0)
  const bot = await headForHtmlLimitedBot(page, '/rede/whatsapp')
  expect(bot.head).toContain(`rel="canonical" href="${canonical}/rede/whatsapp"`)
  expect(bot.head).toContain('name="robots" content="index, follow"')
  expect(bot.head).not.toContain('name="rating"')
  await expect(page.getByRole('navigation', { name: 'Trilha' })).toBeVisible()
  await stableScreenshot(page, info.outputPath('whatsapp-seo.png'))

  await page.goto(origin + '/link/seo-free-01?surfaceToken=organic.arrival')
  await expect(page).toHaveTitle(/Oferta pública 01/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical + '/link/seo-free-01')
  await expect(page.getByRole('heading', { level: 1, name: 'Oferta pública 01', exact: true })).toBeVisible()
  const graphs = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(graphs.some(text => JSON.parse(text))).toBe(true)

  await page.goto(origin + '/rede/discord')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  const sitemap = await page.request.get(origin + '/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  for (const pathname of ['/divulgar', '/rede/whatsapp', '/nicho/adulto', '/link/seo-free-01', '/link/seo-adult-01', '/descobrir/' + adultCollection]) expect(xml).toContain(canonical + pathname)
  expect(xml).not.toContain(canonical + '/rede/discord')
  expect(xml).not.toContain(canonical + '/nicho/sem-conteudo')
  await page.goto(origin + '/descobrir/' + offersCollection + '?languageTag=en')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical + '/descobrir/' + offersCollection)
})

test('canonical e robots estão no head inicial para navegador, Googlebot e inspeção', async ({ page }) => {
  for (const agent of ['Mozilla/5.0', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Google-InspectionTool/1.0']) {
    for (const pathname of ['/', '/rede/whatsapp', '/nicho/adulto', '/link/seo-free-01', '/descobrir/' + adultCollection, '/login']) {
      const response = await page.request.get(origin + pathname, { headers: { 'User-Agent': agent } })
      expect(response.status()).toBe(200)
      const html = await response.text()
      const head = /<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? ''
      if (pathname === '/login') {
        expect(head).toContain('name="robots" content="noindex, nofollow"')
      } else {
        expect(head).toContain(`rel="canonical" href="${canonical}${pathname}"`)
        expect(head).toContain('name="robots" content="index, follow"')
      }
    }
  }
})

test('prévia adulta é indexável sem expor texto, mídia, convite ou payload restrito', async ({ page }, info) => {
  const response = await page.goto(origin + '/descobrir/' + adultCollection)
  expect(response?.status()).toBe(200)
  const html = await response!.text()
  for (const secret of [secretName, secretDescription, 'seo-private-invite-', 'SEO_RESTRICTED_MEDIA_SENTINEL', 'seo-adult-image']) expect(html).not.toContain(secret)
  await expect(page.locator('meta[name="rating"]')).toHaveAttribute('content', 'adult')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical + '/descobrir/' + adultCollection)
  const bot = await headForHtmlLimitedBot(page, '/descobrir/' + adultCollection)
  expect(bot.head).toContain('name="rating" content="adult"')
  expect(bot.head).toContain('name="robots" content="index, follow"')
  expect(bot.head).toContain(`rel="canonical" href="${canonical}/descobrir/${adultCollection}"`)
  for (const secret of [secretName, secretDescription, 'seo-private-invite-', 'SEO_RESTRICTED_MEDIA_SENTINEL', 'seo-adult-image']) expect(bot.html).not.toContain(secret)
  const dialog = page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Tenho 18 anos ou mais' })).toBeFocused()
  expect((await page.request.get(origin + mediaPath)).status()).toBe(404)
  const api = await page.request.get(origin + '/bff/v1/catalog-collections/' + adultCollection)
  const body = await api.json()
  expect(body.previews).toHaveLength(24)
  expect(body.organic).toEqual([])
  expect(body.sponsored).toEqual([])
  expect(await api.text()).not.toContain(secretName)
  const rsc = await page.request.get(origin + '/descobrir/' + adultCollection, { headers: { RSC: '1' } })
  expect(rsc.status()).toBe(200)
  for (const secret of [secretName, secretDescription, 'seo-private-invite-', 'seo-adult-image']) expect(await rsc.text()).not.toContain(secret)
  await dialog.getByRole('button', { name: 'Não tenho', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 2, name: 'Conheça as comunidades' })).toBeVisible()
  await stableScreenshot(page, info.outputPath('adult-public-preview.png'))

  await page.goto(origin + '/link/seo-adult-01')
  await expect(page.getByRole('heading', { level: 1, name: 'Comunidade adulta revisada 01', exact: true })).toBeVisible()
  expect(await page.content()).not.toContain(secretName)
  await expect(page.locator('meta[name="rating"]')).toHaveAttribute('content', 'adult')
  const detail = await page.request.get(origin + '/bff/v1/links/seo-adult-01')
  expect(detail.headers()['cache-control']).toContain('no-store')
  const detailBody = await detail.json()
  expect(detailBody).not.toHaveProperty('goPath')
  expect(detailBody).not.toHaveProperty('surfaceToken')
  expect(detailBody).not.toHaveProperty('imageUrl')
})

test('confirmação por teclado libera apenas o conteúdo autorizado e mantém SEO público estável', async ({ page }, info) => {
  await page.goto(origin + '/link/seo-adult-01')
  const dialog = page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })
  const confirm = dialog.getByRole('button', { name: 'Tenho 18 anos ou mais' })
  await expect(confirm).toBeFocused()
  await confirm.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: secretName + '_01', exact: true })).toBeVisible()
  await expect(page.locator('meta[name="rating"]')).toHaveAttribute('content', 'adult')
  await expect(page).toHaveTitle(/Comunidade adulta revisada 01/)
  expect((await page.request.get(origin + mediaPath)).status()).toBe(200)
  await stableScreenshot(page, info.outputPath('adult-confirmed-detail.png'))
})

test('apostas têm restrição própria e não recebem marcação sexual por exigirem idade', async ({ page }) => {
  await page.goto(origin + '/descobrir/' + bettingCollection)
  await expect(page.locator('meta[name="rating"]')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.content()).not.toContain('SEO_BETTING_RESTRICTED_BODY')
  await page.getByRole('button', { name: 'Não tenho', exact: true }).click()
  await page.goto(origin + '/link/seo-bet')
  await expect(page.getByRole('heading', { name: 'Debate de apostas esportivas', exact: true })).toBeVisible()
  await expect(page.locator('meta[name="rating"]')).toHaveCount(0)
})

test('mudança no anúncio invalida a prévia e retira o detalhe do sitemap sem expor o novo texto', async ({ page }) => {
  try {
    sql(`UPDATE links SET description='SEO_CHANGED_RESTRICTED_SENTINEL',"updatedAt"='2026-10-21T00:00:00.000Z' WHERE id='seo-adult-01' AND "tenantId"=${quote(tenant)}`)
    const detail = await page.request.get(origin + '/bff/v1/links/seo-adult-01')
    expect((await detail.json()).seo.robots).toBe('noindex,nofollow')
    expect(await detail.text()).not.toContain('SEO_CHANGED_RESTRICTED_SENTINEL')
    expect(await detail.text()).not.toContain('Comunidade adulta revisada 01')
    const xml = await (await page.request.get(origin + '/sitemap.xml')).text()
    expect(xml).not.toContain(canonical + '/link/seo-adult-01</loc>')
  } finally {
    sql(`UPDATE links SET description=${quote(secretDescription + '_01')},"updatedAt"=${quote(updatedAt)} WHERE id='seo-adult-01' AND "tenantId"=${quote(tenant)}`)
  }
})

test('paginação tem links HTML e canonical próprio, e cursor adulto não atravessa mudança de idade', async ({ page }, info) => {
  await page.goto(origin + '/descobrir/' + offersCollection)
  const firstIds = await page.locator('main a[href^="/link/"]').evaluateAll(elements => elements.map(element => new URL((element as HTMLAnchorElement).href).pathname))
  const next = page.getByRole('navigation', { name: 'Paginação' }).getByRole('link', { name: 'Próxima página' })
  const href = await next.getAttribute('href')
  expect(href).toContain('cursor=')
  await page.goto(origin + href)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical + href)
  const secondIds = await page.locator('main a[href^="/link/"]').evaluateAll(elements => elements.map(element => new URL((element as HTMLAnchorElement).href).pathname))
  expect(secondIds.length).toBeGreaterThan(0)
  expect(secondIds.every(id => !firstIds.includes(id))).toBe(true)

  await page.goto(origin + '/rede/whatsapp')
  await expect(page.getByRole('navigation', { name: 'Paginação' }).getByRole('link', { name: 'Próxima página' })).toHaveAttribute('href', /cursor=/)
  await page.goto(origin)
  await expect(page.getByRole('link', { name: 'Abrir próxima página' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Explore por interesse' })).toHaveCount(0)
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toHaveText('Grupos e links por assunto')
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => document.fonts.ready)
    const size = await heading.evaluate(element => ({ height: element.getBoundingClientRect().height, line: parseFloat(getComputedStyle(element).lineHeight) }))
    expect(size.height).toBeLessThanOrEqual(size.line + 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await stableScreenshot(page, info.outputPath(`home-compact-${width}.png`))
  }
  await expect(page.getByRole('button', { name: 'Mostrar mais', exact: true })).toBeVisible()
  const before = await page.locator('main a[href^="/link/"]').count()
  await page.getByRole('button', { name: 'Mostrar mais', exact: true }).focus()
  await expect(page.getByRole('button', { name: 'Mostrar mais', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Mostrar mais', exact: true }).press('Enter')
  await expect.poll(() => page.locator('main a[href^="/link/"]').count()).toBeGreaterThan(before)

  const adultPage = await (await page.request.get(origin + '/bff/v1/catalog-collections/' + adultCollection)).json()
  expect(adultPage.nextCursor).toBeTruthy()
  await page.context().addCookies([{ name: 'age', value: 'yes', domain: host, path: '/' }])
  const invalid = await page.request.get(origin + '/bff/v1/catalog-collections/' + adultCollection + '?cursor=' + encodeURIComponent(adultPage.nextCursor))
  expect(invalid.status()).toBe(400)
})

test('admin publica coleção de dois links e revisa prévia individual pelo painel, com autorização real', async ({ page }, info) => {
  const anonymous = await page.request.get(origin + '/bff/v1/admin/catalog-seo')
  expect([401, 403]).toContain(anonymous.status())
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail').fill('admin@seo-professional.test')
  await page.getByLabel('Senha').fill('Senha-e2e-1')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(origin+'/admin/visao')
  await page.goto(origin + '/admin/configuracoes')
  const section = page.getByRole('region', { name: 'SEO de páginas e coleções' })
  await section.getByRole('button', { name: 'Nova coleção' }).click()
  await section.getByRole('textbox', { name: 'Endereço da coleção' }).fill('novas-ofertas-whatsapp')
  await selectOption(section.getByRole('combobox', { name: 'Rede da coleção' }), { label: 'WhatsApp' })
  await selectOption(section.getByRole('combobox', { name: 'Nicho da coleção' }), { label: 'Compras, Ofertas & Cupons' })
  await section.getByRole('textbox', { name: 'Título público' }).fill('Novas ofertas e cupons no WhatsApp')
  await section.getByRole('textbox', { name: 'Descrição pública' }).fill('Coleção editorial de grupos de ofertas no WhatsApp, com links publicados e descrições próprias para consulta.')
  await section.getByRole('textbox', { name: 'Links selecionados (opcional)' }).fill('seo-free-01\nseo-free-02')
  const approve = section.getByRole('checkbox', { name: 'Prévia pública revisada e aprovada' })
  await approve.focus()
  await expect(approve).toBeFocused()
  await approve.press('Space')
  await expect(approve).toBeChecked()
  await section.getByRole('button', { name: 'Salvar SEO', exact: true }).click()
  await expect(section.getByRole('status')).toContainText('SEO editorial salvo')
  await stableScreenshot(page, info.outputPath('admin-editorial-saved.png'))
  const collection = await page.request.get(origin + '/bff/v1/catalog-collections/novas-ofertas-whatsapp')
  expect(collection.status()).toBe(200)
  const curated = await collection.json()
  expect(curated.seo.robots).toBe('index,follow')
  expect([...curated.sponsored, ...curated.organic].map((row: { id: string }) => row.id).sort()).toEqual(['seo-free-01', 'seo-free-02'])
  expect(curated.nextCursor).toBeNull()
  if (!info.project.use.isMobile) {
    const viewport = page.viewportSize()!
    try {
      await page.evaluate(() => { document.documentElement.style.zoom = '2' })
      await expect(section.getByRole('button', { name: 'Salvar SEO', exact: true })).toBeVisible()
      await stableScreenshot(page, info.outputPath('admin-editorial-zoom200.png'))
      await page.evaluate(() => { document.documentElement.style.zoom = '' })
      await page.setViewportSize({ width: 320, height: 844 })
      await expect(section.getByRole('textbox', { name: 'Título público' })).toBeVisible()
      await stableScreenshot(page, info.outputPath('admin-editorial-320.png'))
    } finally {
      await page.evaluate(() => { document.documentElement.style.zoom = '' })
      await page.setViewportSize(viewport)
    }
  }
  await page.goto(origin + '/descobrir/novas-ofertas-whatsapp')
  await expect(page.getByRole('link', { name: 'Oferta pública 01', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Oferta pública 02', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Oferta pública 03', exact: true })).toHaveCount(0)

  await page.goto(origin + '/admin/moderacao?link=seo-adult-01')
  const preview = page.getByRole('region', { name: 'Prévia pública para buscas' })
  await preview.getByRole('textbox', { name: 'Título da prévia' }).fill('Comunidade adulta com prévia revisada')
  await preview.getByRole('checkbox', { name: 'Prévia pública revisada e aprovada' }).check()
  await preview.getByRole('button', { name: 'Salvar prévia', exact: true }).click()
  await expect(preview.getByRole('status')).toContainText('Prévia salva')
  const publicDetail = await (await page.request.get(origin + '/bff/v1/links/seo-adult-01')).json()
  expect(publicDetail.name).toBe('Comunidade adulta com prévia revisada')
  expect(publicDetail.seo.robots).toBe('index,follow')
  expect(sql(`SELECT COUNT(*) FROM audit_logs WHERE "tenantId"=${quote(tenant)} AND action='catalog.seo.update'`)).not.toBe('0')
  await stableScreenshot(page, info.outputPath('admin-link-preview-saved.png'))
})
