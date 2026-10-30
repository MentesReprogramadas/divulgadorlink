import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import QRCode from 'qrcode'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { selectOption } from './select-control'

// Deterministic UI contracts. Provider/API behavior is covered by backend tests, never real accounts.
const instance = { id: 'instance-1', name: 'Natal 01', ownerPhone: '5511999999999', configured: true, enabled: true }
const segment = { id: 'segment-1', name: 'Natal', groupName: 'Ofertas de Natal', instanceIds: [instance.id], slug: 'natal', description: 'Presentes e ofertas para celebrar o Natal.', imageUrl: null, capacity: 1024, instanceId: instance.id, autoExpand: true, enabled: true, provisionState: 'IDLE', inviteMetrics: {views:124,buttonClicks:18,automaticRedirects:70,buttonRedirects:15,createdAt:'2026-10-29T12:00:00Z'} }
const groups = [1, 2, 3].map(sequence => ({ id: `group-${sequence}`, jid: `12036300000000${sequence}@g.us`, name: sequence === 1 ? 'Natal' : `Natal #${sequence}`, segmentId: segment.id, instanceId: instance.id, participantCount: sequence === 1 ? 1024 : sequence === 2 ? 840 : 120, capacity: 1024, enabled: true, syncedAt: '2026-10-28T12:00:00Z', segment, instance }))
const offer = { id: 'offer-1', segmentId: segment.id, segment, title: 'Árvore de Natal 1,80 m', productUrl: 'https://www.mercadolivre.com.br/p/MLB123', affiliateUrl: 'https://meli.la/fixture', priceCents: 12990, oldPriceCents: 15990, imageUrl: null, note: 'Confira as medidas e as opções do anúncio.', status: 'DRAFT', checkedAt: '2026-10-28T12:00:00Z', expiresAt: null }
const broadcast = { id: 'broadcast-1', offerId: offer.id, offer, message: 'Árvore de Natal 1,80 m\nR$ 129,90\nhttps://meli.la/fixture', scheduledAt: '2026-10-28T12:00:00Z', createdAt: '2026-10-28T12:00:00Z', _count: { deliveries: 3 } }
const deliveries = [{ id: 'delivery-1', state: 'SENT', providerMessageId: 'fixture-confirmed', errorCode: null, group: groups[0], broadcast, updatedAt: '2026-10-28T12:01:00Z' }, { id: 'delivery-2', state: 'UNCERTAIN', providerMessageId: null, errorCode: 'provider_timeout', group: groups[1], broadcast, updatedAt: '2026-10-28T12:01:00Z' }]
const snapshot = { instances: [instance], segments: [segment], groups, offers: [offer], broadcasts: [broadcast], deliveries, summary: { instances: 1, segments: 1, groups: 3, offers: 1, pending: 1, sent: 1, uncertain: 2, failed: 0 } }

async function fixtures(page: Page, emptyConnections = false) {
  const data = structuredClone(snapshot)
  if (emptyConnections) { data.instances = []; data.segments = []; data.groups = []; data.offers = []; data.broadcasts = []; data.deliveries = []; data.summary = { instances: 0, segments: 0, groups: 0, offers: 0, pending: 0, sent: 0, uncertain: 0, failed: 0 } }
  const mutations: Array<{ path: string; body: Record<string, unknown> }> = []
  await page.context().addCookies([{ name: 'catalogo_role', value: 'ADMIN', domain: 'localhost', path: '/' }, { name: 'csrf', value: 'a'.repeat(32), domain: 'localhost', path: '/' }, { name: 'tla_consent', value: 'denied', domain: 'localhost', path: '/' }])
  await page.route('**/bff/**', async route => {
    const request = route.request(), url = new URL(request.url()), pathname = url.pathname.replace('/bff', '')
    if (request.method() !== 'GET') {
      const body = request.postDataJSON() ?? {}; mutations.push({ path: pathname, body })
      if (pathname.endsWith('/instances')) { data.instances.push({ ...instance, name: body.name, ownerPhone: body.ownerPhone }); return route.fulfill({ json: { ...instance, name: body.name, ownerPhone: body.ownerPhone } }) }
      if (pathname === '/v1/admin/affiliates/segments') { const created={...segment,...body,id:'segment-new'}; data.segments.push(created); data.summary.segments++; return route.fulfill({json:created}) }
      if (pathname.endsWith('/prepare-group')) { const selected=data.segments.find(item=>item.id===pathname.split('/').at(-2))!; data.groups.push({...groups[0],id:'new-group',name:selected.groupName+' #1',segmentId:selected.id,segment:selected,participantCount:2});data.summary.groups++;return route.fulfill({json:{url:'https://chat.whatsapp.com/fixture'}}) }
      if (pathname.endsWith('/products/preview')) { const selected=data.segments.find(item=>item.id===pathname.split('/').at(-3)) ?? segment; return route.fulfill({json:{previewToken:'fixture-token',expiresAt:'2099-10-28T12:00:00Z',product:offer,title:'Árvore de Natal para decorar sua casa',headline:'Uma árvore de Natal para sua sala 🎄',message:'Uma árvore de Natal para sua sala 🎄\nÁrvore de Natal para decorar sua casa\nR$ 129,90\nhttps://meli.la/fixture',affiliateUrl:offer.affiliateUrl,destinations:{segmentId:selected.id,name:selected.name,groups:data.groups.map(group=>({id:group.id,name:group.name})),count:data.groups.length},titleSource:'OPENAI',priceChanged:false}}) }
      if (pathname.endsWith('/products/preview/title')) return route.fulfill({json:{previewToken:'fixture-regenerated-token',expiresAt:'2099-10-28T12:00:00Z',title:'Decore o Natal com esta árvore de 1,80 m',headline:'Sua sala com uma árvore de Natal 🎄',titleSource:'OPENAI',message:'Sua sala com uma árvore de Natal 🎄\nDecore o Natal com esta árvore de 1,80 m\nR$ 129,90\nhttps://meli.la/fixture'}})
      if (pathname.endsWith('/products/send')) return route.fulfill({json:{broadcastId:'broadcast-1',offerId:'offer-1',groups:data.groups.length}})
      if (pathname.endsWith('/catalog/affiliate')) return route.fulfill({json:{url:'https://meli.la/generated-fixture'}})
      if (pathname === '/v1/admin/affiliates/offers') { const created={...offer,...body,id:'offer-new',segment:data.segments.find(item=>item.id===body.segmentId)!};data.offers.push(created);data.summary.offers++;return route.fulfill({json:created}) }
      if (pathname.endsWith('/send') && emptyConnections) { const selected=data.offers.find(item=>item.id===pathname.split('/').at(-2))!;const approved={...broadcast,id:'broadcast-new',offerId:selected.id,offer:selected};data.broadcasts.push(approved);data.deliveries.push({...deliveries[0],id:'queued-new',state:'PENDING',group:data.groups[0],broadcast:approved});data.summary.pending++;return route.fulfill({json:{queued:true}}) }
      if (pathname.endsWith('/images')) return route.fulfill({ json: { url: 'affiliate-image:fixture-image' } })
      if (pathname.endsWith('/connect')) return route.fulfill({ json: { state: 'connecting', base64: await QRCode.toDataURL('temlink-fixture-only') } })
      return route.fulfill({ json: { saved: true, queued: true, cancelled: 1, url: 'https://outside.example/invalid' } })
    }
    const selectedId=pathname.startsWith('/v1/admin/affiliates/segments/')?pathname.split('/').at(-1):undefined
    const selected=data.segments.find(item=>item.id===selectedId),selectedGroups=data.groups.filter(item=>item.segmentId===selectedId),selectedOffers=data.offers.filter(item=>item.segmentId===selectedId),selectedBroadcasts=data.broadcasts.filter(item=>selectedOffers.some(offer=>offer.id===item.offerId)),selectedDeliveries=data.deliveries.filter(item=>item.group.segmentId===selectedId)
    const body = selected ? {...data,segments:[selected],groups:selectedGroups,offers:selectedOffers,broadcasts:selectedBroadcasts,deliveries:selectedDeliveries,summary:{...data.summary,segments:1,groups:selectedGroups.length,offers:selectedOffers.length},readiness:{activeGroups:selectedGroups.filter(item=>item.enabled).length,currentOffers:selectedOffers.length,approvedDeliveries:selectedDeliveries.length,nextOffer:selectedOffers.find(item=>!selectedBroadcasts.some(batch=>batch.offerId===item.id))??null}}
      : pathname.endsWith('/group-policy') ? {enabled:false,disappearingSeconds:604800,joinApproval:true,autoApproveDelaySeconds:120,groups:data.groups.filter(group=>group.segmentId===pathname.split('/').at(-2)).map(group=>({id:group.id,name:group.name,groupPolicyState:'UNSUPPORTED',groupPolicyErrorCode:'admission_extension_required',groupPolicyNextRunAt:null}))}
      : pathname.endsWith('/auth/session') ? { role: 'ADMIN', status: 'ACTIVE', canSubmit: true }
      : pathname.endsWith('/team/context') ? { ownerId: null, grants: null }
      : pathname === '/v1/admin/affiliates' ? data
      : pathname === '/v1/admin/affiliates/membership' ? {since:'2026-09-30T00:00:00Z',until:'2026-10-30T00:00:00Z',totals:{joins:8,rejoins:2,leaves:3},groups:[{groupId:'group-3',groupName:'Natal #3',segmentId:segment.id,status:'READY',baselineAt:'2026-10-29T22:00:00Z',expiresAt:'2027-01-27T22:00:00Z',lastReceivedAt:'2026-10-29T23:00:00Z',lastErrorCode:null,receivedDuringBaseline:0,joins:8,rejoins:2,leaves:3,staleEvents:0}]}
      : pathname.endsWith('/status') && pathname.includes('/instances/') ? { state: 'open' }
      : pathname === '/v1/admin/affiliates/broadcasts' ? {broadcasts:data.broadcasts.map(item=>({...item,segmentId:segment.id,segment,counts:{pending:1,sending:0,sent:1,failed:0,uncertain:1,cancelled:0}})),nextCursor:null,totalCount:data.broadcasts.length}
      : pathname.includes('/broadcasts/') && pathname.endsWith('/status') ? {id:'broadcast-1',counts:{pending:0,sending:0,sent:2,failed:0,uncertain:1}}
      : pathname === '/v1/admin/affiliates/deliveries' ? url.searchParams.has('cursor') ? { deliveries: [{ ...deliveries[1], id: 'delivery-old', group: { ...groups[2], name: 'Natal legado' }, updatedAt: '2026-10-20T12:00:00Z' }], nextCursor: null } : { deliveries: url.searchParams.get('state') ? deliveries.filter(item => item.state === url.searchParams.get('state')) : deliveries, nextCursor: 'delivery-2' }
      : pathname.endsWith('/discovery') ? { enabled:true, usesSegmentName:true, terms:['Natal'], products:[offer], counts:null, checkedAt:'2026-10-28T12:00:00Z',nextRunAt:'2026-10-28T12:15:00Z',status:'READY',error:null }
      : pathname.endsWith('/catalog/search') ? { products: [offer], warnings: [] }
      : pathname.endsWith('/catalog/status') && emptyConnections ? { configured:true,connected:true,status:'CONNECTED',clientId:'123',redirectUri:'',affiliateConfigured:true }
      : pathname.endsWith('/catalog/status') ? { configured: false, connected: false, status: 'NOT_CONFIGURED', clientId: null, redirectUri: 'http://localhost:3016/bff/v1/admin/affiliates/catalog/callback', affiliateConfigured: false }
      : pathname.startsWith('/v1/public/affiliates/') ? { name: segment.name, description: segment.description, imageUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176"><rect width="176" height="176" fill="%23135e56"/></svg>', available: true, joinMode: 'SCREEN' }
      : {}
    return route.fulfill({ json: body })
  })
  return mutations
}
async function capture(page: Page, name: string, project: string) {
  const folder = path.resolve('../docs/frontend-profissional/evidencias/afiliados-whatsapp-2026-10-28')
  await mkdir(folder, { recursive: true })
  await page.screenshot({ path: path.join(folder, `${project}-${name}.png`), fullPage: true, animations: 'disabled' })
}

async function area(page: Page, name: string) {
  const labels:Record<string,string>={'Conexões WhatsApp':'WhatsApp','Histórico de envios':'Envios','Visão geral':'Início'}
  name=labels[name]??name
  if(page.url().includes('/segmentacoes/')&&['Grupos','Ofertas','Envios'].includes(name)) { await page.getByRole('tab',{name,exact:true}).click();return }
  if(page.url().includes('/segmentacoes/'))await page.getByRole('button',{name:'Segmentações',exact:true}).click()
  if(['Grupos','Ofertas','Catálogo Mercado Livre'].includes(name)){await page.getByText('Ferramentas',{exact:true}).click();await page.getByRole('button',{name,exact:true}).click();return}
  await page.getByRole('tab',{name,exact:true}).click()
}

for (const width of [320, 390, 430]) test(`abas de afiliados cabem por inteiro no celular a ${width}px`, async ({ page }, testInfo) => {
  await fixtures(page)
  const checkLayout = async () => {
    await expect(page.getByRole('region', { name: 'Central de afiliados', exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    for (const list of await page.getByRole('tablist').all()) {
      expect(await list.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
      const frame = await list.boundingBox()
      for (const tab of await list.getByRole('tab').all()) {
        const box = await tab.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(frame!.x - 1)
        expect(box!.x + box!.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1)
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  }
  await page.setViewportSize({ width, height: 844 })
  for (const route of ['', '/segmentacoes', '/conexoes', '/historico', '/catalogo']) {
    await page.goto(`/admin/afiliados${route}`)
    await checkLayout()
    if (route === '/conexoes') {
      const summary = page.locator('summary').filter({ hasText: 'Mais opções' })
      expect((await summary.boundingBox())!.height).toBeLessThanOrEqual(60)
    }
    if (width === 320 && !route) {
      await page.getByRole('tab', { name: 'Início', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: 'Segmentações', exact: true })).toBeFocused()
      await page.screenshot({ path: testInfo.outputPath('navigation-320.png'), fullPage: true })
    }
  }
  await page.goto('/admin/afiliados/segmentacoes/segment-1')
  for (const name of ['Grupos', 'Ofertas', 'Envios']) {
    await area(page, name)
    if (name === 'Ofertas') {
      await expect(page.getByRole('tab', { name: 'Configurações', exact: true })).toBeVisible()
      for (const option of ['Produtos', 'Descartados', 'Configurações']) {
        await page.getByRole('tab', { name: option, exact: true }).click()
        await checkLayout()
        if (width === 320 && option === 'Produtos') await page.screenshot({ path: testInfo.outputPath('products-320.png'), fullPage: true })
      }
    } else await checkLayout()
  }
  await page.goto('/admin/afiliados')
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await checkLayout()
})

test('fotos e link do ML funcionam ao navegar de outra área sem recarregar o documento', async ({page})=>{
  await fixtures(page)
  await page.route('**/bff/v1/admin/office**',route=>route.fulfill({json:{windowDays:30,listCap:100,linkStatusCounts:{},metrics:{users:0,bannedUsers:0,links:0,publishedLinks:0,pendingLinks:0,impressions:0,clicks:0,ctr:0,paidCents:0,paidOrders:0},topLinks:[],topPayers:[],users:[],links:[]}}))
  await page.route('https://http2.mlstatic.com/fixture-product.jpg',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPQu3z6PwAFywLMU94+BAAAAABJRU5ErkJggg==','base64')}))
  await page.route('**/segments/segment-1/discovery**',route=>route.fulfill({json:{enabled:true,usesSegmentName:true,terms:['Natal'],products:[{...offer,imageUrl:'https://http2.mlstatic.com/fixture-product.jpg'}],counts:null,checkedAt:'2026-10-28T12:00:00Z',nextRunAt:null,status:'READY',error:null}}))
  const viewport=page.viewportSize()!
  // The admin sidebar is a desktop entry; validate the retained document policy at both card sizes.
  await page.setViewportSize({width:1440,height:900})
  const response=await page.goto('/admin/visao')
  expect(response?.headers()['content-security-policy']).toContain('https://*.mlstatic.com')
  await page.getByRole('link',{name:'Afiliados e WhatsApp',exact:true}).first().click()
  await page.setViewportSize(viewport)
  await page.getByRole('button',{name:'Abrir Natal',exact:true}).click()
  await area(page,'Ofertas')
  const suggestions=page.getByRole('region',{name:'Sugestões para Natal'})
  await expect.poll(()=>suggestions.getByRole('img').first().evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBe(1)
  await expect(suggestions.getByRole('link',{name:/Ver no Mercado Livre/})).toBeVisible()
  await expect(suggestions.getByRole('link',{name:/Ver no Mercado Livre/})).toHaveAttribute('href',offer.productUrl)
})

test('catálogo separa conta e sessão, limpa segredos e gera oferta por URL exata', async ({ page }, testInfo) => {
  const mutations = await fixtures(page)
  let sessionConfigured = false
  await page.route('**/catalog/status', route => route.fulfill({ json: { mode: 'CENTRAL', connected: true, configured: true, clientId: null, redirectUri: '', affiliateConfigured: true, session: { mode: sessionConfigured ? 'OWN' : 'CENTRAL', configured: true, verified: false, status: 'CONFIGURED', accountLabel: sessionConfigured ? 'Minha conta' : 'Central', tag: 'minha-tag', profile: 'meu-perfil' } } }))
  await page.route('**/catalog/session', async route => { sessionConfigured = true; mutations.push({ path: '/catalog/session', body: route.request().postDataJSON() }); await route.fulfill({ json: { saved: true } }) })
  await page.goto('/admin/afiliados/segmentacoes/segment-1')
  await area(page, 'Ofertas')
  await page.getByRole('tab',{name:'Configurações',exact:true}).click()
  await page.getByText('Buscar outro produto', { exact: true }).click()
  await page.getByText('Contas do Mercado Livre', { exact: false }).click()
  await expect(page.getByRole('button', { name: 'Usar meu aplicativo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conectar Mercado Livre', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Configurar minha sessão' }).click()
  const dialog = page.getByRole('dialog', { name: 'Configurar sessão de afiliados' })
  await dialog.getByLabel('Nome da conta de afiliados').fill('Minha conta')
  await dialog.getByLabel('Etiqueta de afiliado (tag)').fill('minha-tag')
  await dialog.getByLabel('Perfil de afiliado', { exact: true }).fill('meu-perfil')
  await dialog.getByRole('button', { name: 'Continuar para sessão' }).click()
  await dialog.getByLabel('Cookie da sessão').fill('fixture-cookie-only')
  await dialog.getByLabel('Token CSRF (x-csrf-token)').fill('fixture-csrf-only')
  await capture(page, 'ml-session', testInfo.project.name)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Configurar minha sessão' })).toBeFocused()
  await page.getByRole('button', { name: 'Configurar minha sessão' }).click()
  await dialog.getByLabel('Nome da conta de afiliados').fill('Minha conta')
  await dialog.getByLabel('Etiqueta de afiliado (tag)').fill('minha-tag')
  await dialog.getByLabel('Perfil de afiliado', { exact: true }).fill('meu-perfil')
  await dialog.getByRole('button', { name: 'Continuar para sessão' }).click()
  await expect(dialog.getByLabel('Cookie da sessão')).toHaveValue('')
  await expect(dialog.getByLabel('Token CSRF (x-csrf-token)')).toHaveValue('')
  await dialog.getByLabel('Cookie da sessão').fill('fixture-cookie-only')
  await dialog.getByLabel('Token CSRF (x-csrf-token)').fill('fixture-csrf-only')
  await dialog.getByRole('button', { name: 'Salvar sessão de afiliados' }).click()
  await expect(dialog).not.toBeVisible()
  expect(mutations.filter(item => item.path === '/catalog/session')).toHaveLength(1)
  await expect(page.getByText(/Minha conta · configurada; validação pendente/)).toBeVisible()
  const search = page.getByRole('searchbox', { name: 'Buscar produtos' }), searchButton = page.getByRole('button', { name: 'Buscar nas duas lojas' })
  if (!testInfo.project.name.includes('mobile')) {
    const inputBox = await search.boundingBox(), buttonBox = await searchButton.boundingBox()
    expect(Math.abs(inputBox!.y + inputBox!.height - buttonBox!.y - buttonBox!.height)).toBeLessThan(2)
  }
  await page.getByLabel('Endereço do anúncio').fill('https://produto.mercadolivre.com.br/MLB-123456-anuncio')
  await page.getByRole('button', { name: 'Gerar link de afiliado', exact: true }).click()
  await expect(page.getByRole('link', { name: /https:\/\/meli.la\/generated-fixture/ })).toBeVisible()
  await page.getByRole('button', { name: 'Preparar oferta', exact: true }).click()
  const offerDialog = page.getByRole('dialog', { name: 'Nova oferta' })
  await expect(offerDialog.getByLabel('Nome do produto')).toHaveValue('')
  await expect(offerDialog.getByLabel('Preço atual (R$)')).toHaveValue('')
  await expect(offerDialog.getByLabel('Link do produto')).toHaveValue('https://produto.mercadolivre.com.br/MLB-123456-anuncio')
  await expect(offerDialog.getByLabel('Link de afiliado', { exact: true })).toHaveValue('https://meli.la/generated-fixture')
  await expect(offerDialog.getByText('Natal', { exact: true })).toBeVisible()
})

test('admin gerencia segmentos, revisa oferta e confere entrega sem reenvio implícito', async ({ page }, testInfo) => {
  const mutations = await fixtures(page)
  await page.goto('/admin/afiliados')
  await expect(page.getByRole('heading', { name: 'Continue de onde parou' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('tab',{name:'Início',exact:true})).toBeVisible()
  await capture(page, 'overview', testInfo.project.name)
  expect((await new AxeBuilder({ page }).include('[aria-label="Central de afiliados"]').analyze()).violations).toEqual([])
  await page.getByRole('button',{name:'Continuar configuração',exact:true}).click()
  const edit = page.getByRole('button', { name: 'Configurar segmentação', exact: true })
  await expect(edit).toBeVisible()
  await edit.click()
  const segmentDialog = page.getByRole('dialog', { name: 'Editar segmentação' })
  await expect(segmentDialog.getByLabel('Nome da segmentação')).toHaveValue('Natal')
  await expect(segmentDialog.getByRole('radio', { name: 'Mostrar tela de convite' })).toBeVisible()
  await expect(segmentDialog.getByRole('button', { name: 'Salvar política dos grupos', exact: true })).toBeVisible()
  await segmentDialog.getByRole('button', { name: 'Fechar janela' }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(segmentDialog.getByRole('button', { name: 'Salvar política dos grupos', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(segmentDialog.getByRole('button', { name: 'Fechar janela' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(segmentDialog).not.toBeVisible()
  await expect(edit).toBeFocused()
  await area(page, 'Grupos')
  await expect(page.getByRole('table')).toContainText('Natal #3')
  await expect(page.getByRole('region',{name:'Desempenho do convite'})).toBeVisible()
  await expect(page.getByText('70 automáticos · 15 pelo botão')).toBeVisible()
  const membership=page.getByRole('region',{name:'Participação nos grupos'})
  await expect(membership.getByText('Medição ativa')).toBeVisible()
  await expect(membership.getByText('Novas entradas').locator('..')).toContainText('8')
  await expect(membership.getByText('Retornos').locator('..')).toContainText('2')
  await expect(membership.getByText('Saídas do grupo').locator('..')).toContainText('3')
  await membership.getByRole('button',{name:'Atualizar entradas'}).focus()
  await page.keyboard.press('Enter')
  await expect(membership.getByRole('button',{name:'Atualizar entradas'})).toBeEnabled()
  expect((await new AxeBuilder({page}).include('[aria-label="Desempenho do convite"]').analyze()).violations).toEqual([])
  await capture(page, 'groups', testInfo.project.name)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  if (testInfo.project.name === 'affiliates-desktop') {
    await page.evaluate(() => { document.documentElement.style.zoom = '2' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.zoom = '' })
    await expect(page.getByRole('tab', { name: 'Ofertas', exact: true })).toBeVisible()
  }
  await area(page, 'Ofertas')
  await page.getByText('Ofertas cadastradas e ferramentas manuais',{exact:true}).click()
  await page.getByRole('button', { name: 'Editar oferta' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revisar oferta' })
  await dialog.getByLabel('Preço atual (R$)').fill('119,90')
  await dialog.getByRole('checkbox', { name: 'Conferi agora o preço, o anúncio e o link de afiliado.' }).check()
  await dialog.getByRole('button', { name: 'Salvar revisão' }).click()
  await expect(dialog).not.toBeVisible()
  const patch = mutations.find(mutation => mutation.path.endsWith('/offers/offer-1'))
  expect(patch?.body.priceCents).toBe(11990)
  expect(patch?.body).not.toHaveProperty('segmentId')
  expect(patch?.body.checkedAt).toBeTruthy()
  await page.locator('details').filter({has:page.getByText('Ofertas cadastradas e ferramentas manuais',{exact:true})}).getByRole('button', { name: 'Revisar e enviar', exact:true }).click()
  const send = page.getByRole('dialog', { name: 'Revisar envio da oferta' })
  await expect(send).toContainText('3 grupos ativos')
  expect(mutations.filter(mutation => mutation.path.endsWith('/send'))).toHaveLength(0)
  await send.getByRole('checkbox').check()
  await send.getByRole('button', { name: 'Confirmar envio' }).click()
  await expect(send).not.toBeVisible()
  expect(mutations.filter(mutation => mutation.path.endsWith('/send'))).toHaveLength(1)
  expect(mutations.find(mutation => mutation.path.endsWith('/send'))?.body.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/)
  await area(page, 'Histórico de envios')
  await page.getByText('Entregas por grupo e conferência individual', {exact:true}).click()
  await selectOption(page.getByRole('combobox', { name: 'Filtrar entregas por estado' }), { label: 'Conferência necessária' })
  await page.getByRole('button', { name: 'Carregar mais entregas' }).click()
  await expect(page.getByText('Natal legado', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Conferir entrega', exact: true }).first().click()
  const resolve = page.getByRole('dialog', { name: 'Conferir entrega' })
  await expect(resolve.getByRole('button', { name: 'Não chegou; tentar novamente' })).toBeDisabled()
  await capture(page, 'uncertain', testInfo.project.name)
  await resolve.getByRole('checkbox').check()
  await resolve.getByRole('button', { name: 'Já foi enviada' }).click()
  await expect(resolve).not.toBeVisible()
  expect(mutations.find(mutation => mutation.path.includes('/deliveries/'))?.body).toEqual({ resolution: 'SENT', confirmUncertain: true })
  await page.getByText('Envios aprovados e agendamentos (1)', { exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar entregas pendentes' }).click()
  const cancel = page.getByRole('dialog', { name: 'Cancelar entregas pendentes?' })
  await expect(cancel).toBeVisible()
  expect(mutations.filter(mutation => mutation.path.endsWith('/cancel'))).toHaveLength(0)
  await cancel.getByRole('button', { name: 'Confirmar cancelamento' }).click()
  await expect(cancel).not.toBeVisible()
  expect(mutations.filter(mutation => mutation.path.endsWith('/cancel'))).toHaveLength(1)
  await area(page, 'Catálogo Mercado Livre')
  await expect(page.getByText('Contas do Mercado Livre', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buscar nas duas lojas' })).toBeDisabled()
  await capture(page, 'catalog-pending', testInfo.project.name)
})

test('convite padrão abre WhatsApp sem segundo clique', async ({ page }) => {
  await fixtures(page)
  let joins = 0
  await page.route('**/bff/v1/public/affiliates/natal', route => route.fulfill({ json: { name: 'Natal', description: '', available: true, joinMode: 'REDIRECT' } }))
  await page.route('**/bff/v1/public/affiliates/natal/join', route => { joins++; return route.fulfill({ json: { url: 'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf' } }) })
  await page.route('https://chat.whatsapp.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>WhatsApp de teste</h1>' }))
  await page.goto('/ofertas/entrar/natal')
  await expect(page).toHaveURL('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  expect(joins).toBe(1)
})

test('convite público consulta sem criar grupo e exige ação explícita para entrar', async ({ page }, testInfo) => {
  const mutations = await fixtures(page)
  await page.goto('/ofertas/entrar/natal')
  await expect(page.getByRole('heading', { name: 'Natal' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(mutations.filter(mutation => mutation.path.includes('/join'))).toHaveLength(0)
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([])
  await capture(page, 'public-invite', testInfo.project.name)
  await page.getByRole('button', { name: 'Entrar no grupo de WhatsApp' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('convite retornado não é válido')
  expect(mutations.filter(mutation => mutation.path.includes('/join'))).toHaveLength(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('assistente cadastra conexão do zero e preserva identidade antes de criar a segmentação', async ({ page }, testInfo) => {
  const mutations = await fixtures(page, true)
  await page.goto('/admin/afiliados/segmentacoes')
  await expect(page.getByRole('heading', { name: 'Afiliados e WhatsApp', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nova segmentação', exact: true }).click()
  const wizard = page.getByRole('dialog', { name: 'Nova segmentação' })
  await wizard.getByLabel('Nome da segmentação').fill('Presentes de Natal')
  await wizard.getByLabel('Nome dos grupos no WhatsApp').fill('Ofertas natalinas')
  await expect(wizard.getByLabel('Endereço do convite permanente')).toHaveValue('presentes-de-natal')
  await wizard.getByLabel('Descrição dos grupos').fill('Seleção de presentes para o Natal.')
  await capture(page, 'segment-identity', testInfo.project.name)
  const frameBefore = await wizard.boundingBox(), headerBefore = await wizard.locator('header').first().boundingBox()
  await expect(wizard.locator('header').first()).toBeInViewport({ ratio: 1 })
  expect(headerBefore!.y).toBeGreaterThanOrEqual(frameBefore!.y)
  const body = wizard.locator('header + div').first()
  await body.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await wizard.evaluate(element => element.scrollTop)).toBe(0)
  expect((await wizard.boundingBox())?.y).toBe(frameBefore?.y)
  expect((await wizard.locator('header').first().boundingBox())?.y).toBe(headerBefore?.y)
  expect(await wizard.locator(':scope > div').evaluate(element => element.scrollTop)).toBe(0)
  await capture(page, 'segment-modal-scrolled', testInfo.project.name)
  await wizard.getByRole('button', { name: 'Continuar para WhatsApp' }).click()
  const steps = wizard.getByRole('navigation', { name: 'Etapas da segmentação' })
  await expect(steps).toBeInViewport()
  expect(await body.evaluate(element => element.scrollTop)).toBe(0)
  expect(await wizard.locator(':scope > div').evaluate(element => element.scrollTop)).toBe(0)
  await expect(wizard.locator('header').first()).toBeInViewport({ ratio: 1 })
  await expect(wizard.getByText(/Você ainda não tem uma conexão/)).toBeVisible()
  await wizard.getByLabel('Nome para identificar esta conta').fill('natal-principal')
  await wizard.getByLabel('Participante inicial dos grupos').fill('5511999999999')
  await wizard.getByRole('button', { name: 'Salvar e conectar WhatsApp', exact: true }).click()
  await expect(wizard.getByRole('checkbox', { name: /natal-principal/ })).toBeChecked()
  await expect(wizard.getByRole('img', { name: 'QR code de natal-principal' })).toBeVisible()
  await expect(wizard.locator('header').first()).toBeInViewport({ ratio: 1 })
  expect(mutations.filter(item => item.path.endsWith('/connect'))).toHaveLength(1)
  expect(mutations.find(item => item.path.endsWith('/instances'))?.body).toEqual({ name: 'natal-principal', ownerPhone: '5511999999999' })
  await wizard.getByRole('button', { name: 'Já conectei; conferir' }).click()
  await capture(page, 'segment-connections', testInfo.project.name)
  expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([])
  expect(mutations.filter(item => item.path.endsWith('/segments'))).toHaveLength(0)
  await wizard.getByRole('button', { name: 'Conferir conexões e continuar' }).click()
  await expect(wizard.getByRole('heading', { name: 'Confira sua segmentação' })).toBeFocused()
  await wizard.getByRole('button', { name: 'Criar segmentação', exact: true }).click()
  await expect(wizard).not.toBeVisible()
  expect(mutations.find(item => item.path.endsWith('/segments'))?.body).toEqual(expect.objectContaining({ name: 'Presentes de Natal', groupName: 'Ofertas natalinas', instanceIds: ['instance-1'] }))
  await expect(page).toHaveURL(/\/segmentacoes\/segment-new$/)
  await expect(page.getByRole('heading',{name:'Prepare o primeiro grupo'})).toBeVisible()
  expect(mutations.filter(item=>item.path.endsWith('/prepare-group'))).toHaveLength(0)
  await page.getByRole('button',{name:'Criar primeiro grupo',exact:true}).click()
  const prepare=page.getByRole('dialog',{name:'Criar primeiro grupo'})
  await expect(prepare.getByRole('button',{name:'Criar grupo no WhatsApp'})).toBeDisabled()
  await prepare.getByRole('checkbox').check();await prepare.getByRole('button',{name:'Criar grupo no WhatsApp'}).click()
  await expect(page.getByRole('heading',{name:'Encontre e envie uma oferta'})).toBeVisible()
  await capture(page,'guided-group-ready',testInfo.project.name)
  await page.getByRole('button',{name:'Ver ofertas',exact:true}).click()
  await page.getByRole('button',{name:'Revisar e enviar',exact:true}).click()
  const review=page.getByRole('dialog',{name:'Revisar e enviar oferta'})
  await expect(review.getByText('Presentes de Natal',{exact:false})).toBeVisible()
  expect(mutations.filter(item=>item.path.endsWith('/products/send'))).toHaveLength(0)
  expect(mutations.filter(item=>item.path==='/v1/admin/affiliates/offers')).toHaveLength(0)
  await review.getByRole('button',{name:'Enviar',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'Acompanhar envio'})).toBeVisible()
  expect(mutations.filter(item=>item.path.endsWith('/products/send'))).toHaveLength(1)
  await capture(page,'guided-send-approved',testInfo.project.name)

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})



test('Shopee e Mercado Livre aparecem juntos sem escolha de fonte e preservam permissão por produto', async ({page},testInfo) => {
  const mutations=await fixtures(page)
  await page.route('**/catalog/status',route=>route.fulfill({json:{mode:'CENTRAL',connected:true,configured:true,affiliateConfigured:true}}))
  await page.route('**/catalog/shopee',route=>route.fulfill({json:{provider:'SHOPEE',configured:false,connected:false,status:'NOT_CONFIGURED',accountLabel:'',subIds:[],updatedAt:null}}))
  await page.route('**/discovery?*',route=>route.fulfill({json:{enabled:true,usesSegmentName:true,terms:['Natal'],providers:['MERCADO_LIVRE','SHOPEE'],products:[{...offer,id:'MLB123'}, {...offer,id:'SHP123_456',provider:'SHOPEE',title:'Luzes de Natal Shopee',productUrl:'https://shopee.com.br/product/123/456'}],counts:null,checkedAt:'2026-10-30T12:00:00Z',nextRunAt:null,status:'READY',error:null}}))
  await page.goto('/admin/afiliados/segmentacoes/segment-1')
  await area(page,'Ofertas')
  const suggestions=page.getByRole('region',{name:'Sugestões para Natal'})
  await expect(suggestions.getByRole('heading',{name:offer.title})).toBeVisible()
  await expect(suggestions.getByRole('heading',{name:'Luzes de Natal Shopee'})).toBeVisible()
  await expect(suggestions.getByRole('link',{name:/Ver no Mercado Livre/})).toBeVisible()
  await expect(suggestions.getByRole('link',{name:/Ver na Shopee/})).toBeVisible()
  const reviews=suggestions.getByRole('button',{name:'Revisar e enviar'})
  await expect(reviews.nth(0)).toBeEnabled();await expect(reviews.nth(1)).toBeDisabled()
  const evidence=path.resolve('../docs/frontend-profissional/evidencias/afiliados-busca-conjunta-2026-10-30')
  await mkdir(evidence,{recursive:true})
  await page.screenshot({path:path.join(evidence,testInfo.project.name.includes('mobile')?'mobile.png':'desktop.png'),fullPage:true,animations:'disabled'})
  await suggestions.getByRole('tab',{name:'Configurações',exact:true}).focus();await page.keyboard.press('Enter')
  await expect(suggestions.getByText(/Shopee e Mercado Livre são consultados juntos/)).toBeVisible()
  await expect(suggestions.getByRole('combobox',{name:'Fonte dos produtos'})).toHaveCount(0)
  await suggestions.getByRole('button',{name:'Salvar termos',exact:true}).click()
  await expect.poll(()=>mutations.filter(item=>item.path.endsWith('/discovery/config')).length).toBe(1)
  expect(mutations.find(item=>item.path.endsWith('/discovery/config'))?.body).toEqual({enabled:true,terms:['Natal']})
  expect((await new AxeBuilder({page}).include('[aria-label="Central de afiliados"]').analyze()).violations).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  expect(mutations.some(item=>item.path.endsWith('/products/send'))).toBe(false)
})

test('Shopee carrega foto e desconto na lista e prévia e permite tentar outro título sem duplicar erros',async({page},testInfo)=>{
 const mutations=await fixtures(page)
 const product={...offer,id:'SHP123_456',provider:'SHOPEE',title:'Bifinho para Cães Lion Pet 1 Kg – Petisco Canino Saboroso em Carne ou Frango, Ideal para Recompensa, Treinamento Pet.',displayTitle:'Bifinho para Cães Lion Pet 1 Kg',productUrl:'https://shopee.com.br/product/123/456',imageUrl:'https://down-br.img.susercontent.com/file/real-api-shopee',priceCents:2750,oldPriceCents:2835,oldPriceEstimated:true,reportedDiscountPercent:3}
 await page.route(product.imageUrl,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" fill="#24534b"/></svg>'}))
 await page.route('**/catalog/shopee',route=>route.fulfill({json:{provider:'SHOPEE',configured:true,connected:true,status:'CONNECTED',accountLabel:'Fixture',subIds:[]}}))
 await page.route('**/discovery?*',route=>route.fulfill({json:{enabled:true,usesSegmentName:true,terms:['Natal'],products:[product],counts:null,checkedAt:'2026-10-30T12:00:00Z',nextRunAt:null,status:'READY',error:null}}))
 const message='Um petisco saboroso para seu cão 🐾\nBifinho para Cães Lion Pet 1 Kg\nDe (estimado): ~R$ 28,35~\nR$ 27,50\nEconomia estimada R$ 0,85 · 3% OFF\nhttps://s.shopee.com.br/fixture'
 await page.route('**/products/preview',route=>route.fulfill({json:{previewToken:'first-signature',expiresAt:'2099-10-30T12:00:00Z',product,title:product.displayTitle,headline:'Um petisco saboroso para seu cão 🐾',message,affiliateUrl:'https://s.shopee.com.br/fixture',destinations:{segmentId:segment.id,name:segment.name,groups:[{id:'group-1',name:'Natal #1'}],count:1},titleSource:'OPENAI',priceChanged:false}}))
 let attempts=0
 const failure='A IA não conseguiu gerar outra chamada. A prévia anterior foi mantida. Tente novamente.'
 await page.route('**/products/preview/title',route=>++attempts===1?route.fulfill({status:503,json:{message:failure}}):route.fulfill({json:{previewToken:'second-signature',expiresAt:'2099-10-30T12:00:00Z',title:product.displayTitle,headline:'Um petisco ideal para o treinamento do seu cão 🐶',titleSource:'OPENAI',message:message.replace('Um petisco saboroso para seu cão 🐾','Um petisco ideal para o treinamento do seu cão 🐶')}}))
 await page.goto('/admin/afiliados/segmentacoes/segment-1');await area(page,'Ofertas')
 const suggestions=page.getByRole('region',{name:'Sugestões para Natal'})
 await expect(suggestions.getByRole('heading',{name:product.displayTitle})).toBeVisible()
 await expect(suggestions.getByText('3% OFF')).toBeVisible()
 await page.screenshot({path:testInfo.outputPath('shopee-discount-list.png'),fullPage:true})
 const photo=suggestions.getByRole('img',{name:product.title})
 await expect.poll(()=>photo.evaluate((element:HTMLImageElement)=>element.naturalWidth)).toBeGreaterThan(0)
 await suggestions.getByRole('button',{name:'Revisar e enviar'}).click()
 const dialog=page.getByRole('dialog',{name:'Revisar e enviar oferta'})
 await expect(dialog.getByText('3% OFF',{exact:true})).toBeVisible()
 await expect(dialog.getByText(/Preço anterior estimado:/)).toBeVisible()
 await expect(dialog.getByLabel('Mensagem exata para o WhatsApp')).toContainText('Economia estimada R$ 0,85 · 3% OFF')
 await page.screenshot({path:testInfo.outputPath('shopee-discount-preview.png'),fullPage:true})
 await expect.poll(()=>dialog.getByRole('img').first().evaluate((element:HTMLImageElement)=>element.naturalWidth)).toBeGreaterThan(0)
 await dialog.getByRole('button',{name:'Gerar outro título'}).click();await expect(dialog.getByRole('alert')).toHaveText(failure)
 await expect(dialog.getByLabel('Mensagem exata para o WhatsApp')).toContainText('Um petisco saboroso para seu cão')
 await dialog.getByRole('button',{name:'Gerar outro título'}).focus();await page.keyboard.press('Enter')
 await expect(dialog.getByLabel('Mensagem exata para o WhatsApp')).toContainText('Um petisco ideal para o treinamento do seu cão')
 await expect(dialog.getByRole('alert')).toHaveCount(0)
 expect(mutations.some(item=>item.path.endsWith('/products/send'))).toBe(false)
})

test('sugestões aparecem sem busca manual e foto ausente mantém revisão explícita', async ({ page }, testInfo) => {
  const mutations = await fixtures(page)
  await page.route('**/catalog/status', route => route.fulfill({ json: { mode: 'CENTRAL', connected: true, configured: true, affiliateConfigured: true } }))
  await page.goto('/admin/afiliados/segmentacoes/segment-1')
  await area(page, 'Ofertas')
  const suggestions = page.getByRole('region', { name: 'Sugestões para Natal' })
  await expect(suggestions.getByRole('heading', { name: offer.title })).toBeVisible()
  await expect(suggestions.getByText('Imagem indisponível')).toBeVisible()
  await expect(page.getByLabel('Buscar produtos')).not.toBeVisible()
  expect(mutations.filter(item => item.path.endsWith('/catalog/affiliate'))).toHaveLength(0)
  await capture(page, 'automatic-suggestions', testInfo.project.name)
  expect((await new AxeBuilder({ page }).include('[aria-label="Central de afiliados"]').analyze()).violations).toEqual([])
  await suggestions.getByRole('button', { name: 'Revisar e enviar', exact:true }).click()
  const dialog = page.getByRole('dialog', { name: 'Revisar e enviar oferta' })
  await expect(dialog.getByRole('heading', {name:'Árvore de Natal para decorar sua casa'})).toBeVisible()
  await expect(dialog.getByText('Título criado com IA')).toBeVisible()
  await expect(dialog.getByLabel('Mensagem exata para o WhatsApp')).toHaveText('Imagem indisponívelUma árvore de Natal para sua sala 🎄\nÁrvore de Natal para decorar sua casa\nR$ 129,90\nhttps://meli.la/fixture')
  expect(mutations.filter(item => item.path.endsWith('/products/send'))).toHaveLength(0)
  await capture(page,'single-product-preview',testInfo.project.name)
  await page.keyboard.press('Escape')
  await expect(suggestions.getByRole('button',{name:'Revisar e enviar'})).toBeFocused()
  expect(mutations.filter(item => item.path.endsWith('/broadcasts'))).toHaveLength(0)
})

test('reputação fora da faixa verde mantém produto disponível e descarte exige decisão manual',async({page},testInfo)=>{
 const mutations=await fixtures(page)
 await page.clock.setFixedTime(new Date('2026-10-30T12:00:00Z'))
 await page.route('**/catalog/status',route=>route.fulfill({json:{mode:'CENTRAL',configured:true,connected:true,affiliateConfigured:true}}))
 let discarded=false
 await page.route('**/segments/segment-1/discovery**',route=>route.fulfill({json:{enabled:true,usesSegmentName:true,terms:['Pets'],products:[{...offer,id:'MLB6839186178',title:'Ração para Cachorro Billy Dog Ossinho',priceCents:16300,oldPriceCents:null,productUrl:'https://www.mercadolivre.com.br/p/MLB54325401?wid=MLB6839186178',...(discarded?{decision:'DISCARDED'}:{}),evaluation:{status:'REVIEW',rulesVersion:'v2',reasons:['Atenção: reputação do vendedor fora da faixa verde. Confira o anúncio antes de enviar.'],reportedDiscountPercent:null,history:{days:0,medianPriceCents:null,dropPercent:null,verified:false,windowDays:30},reputation:{level:'2_orange',status:'POOR'}}}],counts:null,checkedAt:'2026-10-30T12:00:00Z',nextRunAt:null,status:'READY',error:null}}))
 await page.route('**/products/discard',route=>{discarded=true;return route.fulfill({json:{saved:true}})})
 await page.goto('/admin/afiliados/segmentacoes/segment-1');await area(page,'Ofertas')
 const suggestions=page.getByRole('region',{name:'Sugestões para Natal'})
 await expect(suggestions.getByRole('heading',{name:'Ração para Cachorro Billy Dog Ossinho'})).toBeVisible()
 await expect(suggestions.getByText('Conferir antes de enviar',{exact:true})).toBeVisible()
 await suggestions.getByText('Por que este produto?',{exact:true}).click()
 await expect(suggestions.getByText(/Reputação do vendedor:/)).toBeVisible()
 await expect(suggestions.getByRole('button',{name:'Revisar e enviar'})).toBeEnabled()
 expect(mutations.some(item=>item.path.endsWith('/products/send'))).toBe(false)
 await capture(page,'seller-warning-product-visible',testInfo.project.name)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await suggestions.getByRole('button',{name:'Descartar',exact:true}).click()
 await expect(suggestions.getByRole('heading',{name:'Ração para Cachorro Billy Dog Ossinho'})).toHaveCount(0)
 await suggestions.getByRole('tab',{name:'Descartados',exact:true}).click()
 await expect(suggestions.getByText('Descartado por você',{exact:true})).toBeVisible()
})

test('avaliação explica evidências, pagina a fonte e confirma mensagem única com teclado', async ({ page }, testInfo) => {
  const mutations = await fixtures(page)
  await page.clock.setFixedTime(new Date('2026-10-28T12:00:00Z'))
  await page.route('**/catalog/status', route => route.fulfill({ json: { mode:'CENTRAL',configured:true,connected:true,affiliateConfigured:true } }))
  let sourcePage = 1, discarded = false
  await page.route('**/segments/segment-1/discovery**', async route => {
    const url = new URL(route.request().url())
    if(route.request().method() === 'POST') { const body=route.request().postDataJSON();mutations.push({path:url.pathname,body});if(url.pathname.endsWith('/page'))sourcePage=body.page }
    if(route.request().method()==='GET')sourcePage=Number(url.searchParams.get('page')||1)
    const status=discarded?'DISCARDED':'SELECTED'
    await route.fulfill({json:{enabled:true,usesSegmentName:true,terms:['Natal'],expandedTerms:['Natal','presentes de Natal'],products:[{...offer,id:'MLB123',sourceTerm:'Natal',sourcePage,evaluation:{status,rulesVersion:'v1',reasons:['Desconto informado pelo Mercado Livre; queda histórica ainda não comprovada.'],reportedDiscountPercent:18,history:{days:1,medianPriceCents:null,dropPercent:null,verified:false,windowDays:30},reputation:{level:'5_green',status:'GREEN'}},...(discarded?{decision:'DISCARDED'}:{})}],statusCounts:{SELECTED:discarded?0:1,REVIEW:0,DISCARDED:discarded?1:0},pagination:{term:'Natal',page:sourcePage,pageSize:20,total:120,hasPrevious:sourcePage>1,hasNext:sourcePage<6},cycleIntervalMs:900000,counts:null,checkedAt:'2026-10-28T12:00:00Z',nextRunAt:'2026-10-28T12:15:00Z',status:'READY',error:null}})
  })
  await page.route('**/products/discard',async route=>{discarded=true;mutations.push({path: new URL(route.request().url()).pathname,body:route.request().postDataJSON()});await route.fulfill({json:{saved:true}})})
  await page.goto('/admin/afiliados/segmentacoes/segment-1');await area(page,'Ofertas')
  const suggestions=page.getByRole('region',{name:'Sugestões para Natal'})
  await expect(suggestions.getByText('15:00',{exact:true})).toBeVisible()
  await page.clock.setFixedTime(new Date('2026-10-28T12:00:01Z'));await expect(suggestions.getByText('14:59',{exact:true})).toBeVisible()
  await suggestions.getByText('Por que este produto?',{exact:true}).click()
  await expect(suggestions.getByText(/Histórico insuficiente para comprovar queda/)).toBeVisible()
  await suggestions.getByRole('button',{name:'Próxima',exact:true}).click()
  await expect(suggestions.getByText('Página 2 · 120 produtos')).toBeVisible()
  await expect(suggestions.getByRole('combobox')).toHaveCount(0); expect(mutations.some(item=>item.path.endsWith('/discovery/page'))).toBe(false)
  await suggestions.getByRole('tab',{name:'Configurações',exact:true}).click()
  await suggestions.getByRole('button',{name:'Forçar atualização'}).click()
  await suggestions.getByRole('tab',{name:'Produtos',exact:true}).click()
  expect(mutations.some(item=>item.path.endsWith('/refresh')&&item.body.force===true)).toBe(true)
  await suggestions.getByRole('button',{name:'Revisar e enviar',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Revisar e enviar oferta'})
  await expect(dialog.getByLabel('Mensagem exata para o WhatsApp')).toContainText('Árvore de Natal para decorar sua casa\nR$ 129,90\nhttps://meli.la/fixture')
  expect(mutations.filter(item=>item.path.endsWith('/products/send'))).toHaveLength(0)
  await capture(page,'evaluated-product-preview',testInfo.project.name)
  await page.keyboard.press('Escape');await expect(suggestions.getByRole('button',{name:'Revisar e enviar',exact:true})).toBeFocused()
  if (!await suggestions.locator('details').first().evaluate(element=>element.hasAttribute('open'))) await suggestions.getByText('Por que este produto?',{exact:true}).click()
  await suggestions.getByRole('button',{name:'Descartar',exact:true}).click()
  await suggestions.getByRole('tab',{name:/Descartados/}).click()
  await expect(suggestions.getByText('Descartado por você',{exact:true})).toBeVisible()
  await suggestions.getByText('Por que este produto?',{exact:true}).click()
  await expect(suggestions.getByRole('button',{name:'Restaurar'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('regenera título com teclado e confirma a mensagem da nova prévia', async ({ page }, testInfo) => {
  const mutations = await fixtures(page)
  await page.route('**/catalog/status', route => route.fulfill({json:{mode:'CENTRAL',configured:true,connected:true,affiliateConfigured:true}}))
  await page.goto('/admin/afiliados/segmentacoes/segment-1')
  await area(page, 'Ofertas')
  await page.getByRole('button', {name:'Revisar e enviar',exact:true}).click()
  const dialog = page.getByRole('dialog', {name:'Revisar e enviar oferta'})
  await expect(dialog.getByRole('heading',{name:'Árvore de Natal para decorar sua casa'})).toBeVisible()
  const refresh = dialog.getByRole('button',{name:'Gerar outro título'})
  await refresh.focus(); await page.keyboard.press('Enter')
  await expect(dialog.getByRole('heading',{name:'Decore o Natal com esta árvore de 1,80 m'})).toBeVisible()
  await expect(dialog.getByLabel('Mensagem exata para o WhatsApp')).toContainText('Sua sala com uma árvore de Natal 🎄\nDecore o Natal com esta árvore de 1,80 m\nR$ 129,90\nhttps://meli.la/fixture')
  expect(mutations.filter(item=>item.path.endsWith('/preview/title'))).toEqual([{path:'/v1/admin/affiliates/segments/segment-1/products/preview/title',body:{previewToken:'fixture-token'}}])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect((await new AxeBuilder({page}).include('dialog').analyze()).violations).toEqual([])
  await capture(page,'regenerated-product-preview',testInfo.project.name)
  await dialog.getByRole('button',{name:'Enviar',exact:true}).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog',{name:'Acompanhar envio'})).toBeVisible()
  expect(mutations.filter(item=>item.path.endsWith('/products/send'))).toEqual([{path:'/v1/admin/affiliates/segments/segment-1/products/send',body:{previewToken:'fixture-regenerated-token',confirm:true}}])
})
