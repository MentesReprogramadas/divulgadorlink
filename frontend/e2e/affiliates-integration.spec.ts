import { test, expect, type Page } from '@playwright/test'
import { createHmac, randomUUID } from 'node:crypto'

// Requires the isolated regression DB/API3352, provider stub4453 and existing dev frontend3016.
// BFF requests proxy real HTTP responses without stubbing. BFF transport itself has separate unit tests.
function accessToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: 'affiliate-browser-admin', tenantId: 'affiliate-browser-tenant', role: 'ADMIN', typ: 'access', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
  const body = `${header}.${payload}`
  return `${body}.${createHmac('sha256', 'affiliate-browser-fixture-secret').update(body).digest('base64url')}`
}
async function area(page: Page, name: string) {
  name=({'Conexões WhatsApp':'WhatsApp','Histórico de envios':'Envios'} as Record<string,string>)[name]??name
  if(page.url().includes('/segmentacoes/')){ if(['Grupos','Ofertas','Envios'].includes(name)){await page.getByRole('tab',{name,exact:true}).click();return};await page.getByRole('button',{name:'Segmentações',exact:true}).click() }
  if(['Grupos','Ofertas','Catálogo Mercado Livre'].includes(name)){await page.getByText('Ferramentas',{exact:true}).click();await page.getByRole('button',{name,exact:true}).click();return}
  if(!await page.getByRole('tab',{name,exact:true}).count()) await page.getByRole('button',{name:'Início',exact:true}).or(page.getByRole('tab',{name:'Início',exact:true})).first().click()
  await page.getByRole('tab',{name,exact:true}).click()
}

async function proxyApi(page: Page) {
  await page.route('https://http2.mlstatic.com/fixture-product.jpg', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPQu3z6PwAFywLMU94+BAAAAABJRU5ErkJggg==', 'base64') }))
  await page.route('**/bff/**', async route => {
    const request = route.request(), url = new URL(request.url())
    const response = await route.fetch({ url: 'http://127.0.0.1:3352/api' + url.pathname.replace('/bff', '') + url.search, headers: { ...request.headers(), host: 'localhost' }, maxRedirects: 0 })
    await route.fulfill({ response })
  })
}


async function expectAutomaticDiscovery(page: Page, segmentId: string) {
  let manualRequests = 0
  const track = (request: import('@playwright/test').Request) => { if(request.method() === 'POST' && /\/discovery\/(refresh|page)$/.test(new URL(request.url()).pathname)) manualRequests++ }
  page.on('request',track)
  try {
    await expect.poll(async()=>page.evaluate(async id=>{
      const response=await fetch('/bff/v1/admin/affiliates/segments/'+id+'/discovery',{headers:{'x-workspace-owner':'self'}})
      const state=await response.json() as {enabled:boolean;checkedAt:string|null;expandedTerms:string[];products:unknown[]}
      return response.ok && state.enabled && state.checkedAt !== null && state.expandedTerms.length > 0 && state.products.length > 0
    },segmentId),{timeout:45000,intervals:[500,1000,2000]}).toBe(true)
    expect(manualRequests).toBe(0)
  } finally { page.off('request',track) }
}

test('admin persiste segmento, expande convite e entrega oferta pela integração local', async ({ page }, testInfo) => {
  await proxyApi(page)
  await page.context().addCookies([
    { name: 'accessToken', value: accessToken(), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
    { name: 'catalogo_role', value: 'ADMIN', domain: 'localhost', path: '/' },
    { name: 'csrf', value: 'a'.repeat(32), domain: 'localhost', path: '/' },
    { name: 'tla_consent', value: 'denied', domain: 'localhost', path: '/' },
  ])
  const suffix = randomUUID().slice(0, 8)
  const segmentName = `Natal ${testInfo.project.name} ${suffix}`
  await page.goto('/admin/afiliados')
  await expect(page.getByRole('heading', { name: 'Continue de onde parou', exact: true })).toBeVisible({ timeout: 30_000 })
  await area(page, 'Segmentações')
  await page.getByRole('button', { name: 'Nova segmentação', exact: true }).click()
  const create = page.getByRole('dialog', { name: 'Nova segmentação' })
  await create.getByLabel('Nome da segmentação').fill(segmentName)
  await create.getByLabel('Nome dos grupos no WhatsApp').fill('Grupos de Natal '+suffix)
  await create.getByLabel('Endereço do convite permanente').fill(`natal-${suffix}`)
  await create.getByLabel('Descrição dos grupos').fill('Segmentação criada pelo navegador na validação local.')
  await create.getByRole('button', { name: 'Continuar para WhatsApp' }).click()
  await create.getByRole('checkbox', { name: /Natal teste/ }).check()
  await create.getByRole('button', { name: 'Conferir conexões e continuar' }).click()
  await create.getByRole('button', { name: 'Criar segmentação', exact: true }).click()
  await expect(create).not.toBeVisible()
  await expect(page).toHaveURL(/\/segmentacoes\/[^/]+$/)
  const createdSegmentPath = new URL(page.url()).pathname
  const createdSegmentId = createdSegmentPath.split('/').at(-1)!
  await expectAutomaticDiscovery(page,createdSegmentId)
  await page.reload()
  await area(page, 'Segmentações')
  await expect(page.getByRole('heading', { name: segmentName, exact: true })).toBeVisible()

  let externalInvite = ''
  const invitePage = await page.context().newPage()
  await proxyApi(invitePage)
  await invitePage.route('https://chat.whatsapp.com/**', async route => { externalInvite = route.request().url(); await route.abort() })
  await invitePage.goto('/ofertas/entrar/natal-browser')
  await expect(invitePage.getByRole('heading', { name: 'Natal integrado' })).toBeVisible()
  await invitePage.getByRole('button', { name: 'Entrar no grupo de WhatsApp' }).click()
  await expect.poll(() => externalInvite, { timeout: 30_000 }).toMatch(/^https:\/\/chat\.whatsapp\.com\/[^/]+/)
  await invitePage.close()
  await page.goto('/admin/afiliados')
  await expect(page.getByRole('heading', { name: 'Continue de onde parou', exact: true })).toBeVisible()
  await area(page, 'Grupos')
  await expect(page.getByRole('table')).toContainText('Natal integrado #2')
  const stored = await page.evaluate(async () => {
    const response = await fetch('/bff/v1/admin/affiliates', { headers: { 'x-workspace-owner': 'self' } })
    return response.json() as Promise<{ groups: Array<{ segmentId: string; jid: string; name: string }> }>
  })
  const destinationGroups = stored.groups.filter(group => group.segmentId === 'affiliate-browser-segment')
  expect(destinationGroups).toHaveLength(2)
  expect(destinationGroups.some(group => group.jid === '123@g.us')).toBe(true)
  expect(destinationGroups.some(group => group.name === 'Natal integrado #2')).toBe(true)

  await page.goto(createdSegmentPath)
  await page.getByRole('button',{name:'Criar primeiro grupo',exact:true}).click()
  const prepare=page.getByRole('dialog',{name:'Criar primeiro grupo'})
  await prepare.getByRole('checkbox').check();await prepare.getByRole('button',{name:'Criar grupo no WhatsApp'}).click()
  await area(page,'Ofertas')
  const suggestions=page.getByRole('region',{name:'Sugestões para '+segmentName})
  await expect(suggestions.getByRole('button',{name:'Revisar e enviar',exact:true}).first()).toBeVisible({timeout:45000})
  const before = await page.evaluate(async id=>{const response=await fetch('/bff/v1/admin/affiliates/segments/'+id,{headers:{'x-workspace-owner':'self'}});return response.json() as Promise<{offers:unknown[];broadcasts:unknown[]}>},createdSegmentId)
  await suggestions.getByRole('button',{name:'Revisar e enviar',exact:true}).first().click()
  const review=page.getByRole('dialog',{name:'Revisar e enviar oferta'})
  await expect(review.getByLabel('Mensagem exata para o WhatsApp')).toContainText('https://meli.la/fixture-generated')
  await expect(review).toContainText('1 grupo')
  const message=await review.getByLabel('Mensagem exata para o WhatsApp').locator('pre').innerText()
  await review.getByRole('button',{name:'Cancelar',exact:true}).click()
  const afterCancel = await page.evaluate(async id=>{const response=await fetch('/bff/v1/admin/affiliates/segments/'+id,{headers:{'x-workspace-owner':'self'}});return response.json() as Promise<{offers:unknown[];broadcasts:unknown[]}>},createdSegmentId)
  expect(afterCancel.offers).toHaveLength(before.offers.length);expect(afterCancel.broadcasts).toHaveLength(before.broadcasts.length)
  await suggestions.getByRole('button',{name:'Revisar e enviar',exact:true}).first().click()
  await review.getByRole('button',{name:'Enviar',exact:true}).click()
  const progress=page.getByRole('dialog',{name:'Acompanhar envio'})
  await expect(progress.getByText('1 enviados · 0 em andamento · 0 falhas · 0 precisam de conferência',{exact:true})).toBeVisible({timeout:15000})
  await progress.getByRole('button',{name:'Fechar e acompanhar no histórico'}).click()
  await area(page,'Envios')
  await expect(page.getByRole('region',{name:'Envios paginados'})).toContainText('1 enviados')
  await page.reload();await area(page,'Envios')
  const history=page.getByRole('region',{name:'Envios paginados'})
  await history.getByText('Detalhes do envio',{exact:true}).first().click()
  await expect(history.locator('pre').first()).toHaveText(message)

})


test('jornada guiada prepara primeiro grupo, gera link e envia somente para a segmentação escolhida', async ({page},testInfo)=>{
  await proxyApi(page)
  let sendRequests=0
  page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.endsWith('/send'))sendRequests++})
  await page.context().addCookies([{name:'accessToken',value:accessToken(),domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'},{name:'catalogo_role',value:'ADMIN',domain:'localhost',path:'/'},{name:'csrf',value:'a'.repeat(32),domain:'localhost',path:'/'},{name:'tla_consent',value:'denied',domain:'localhost',path:'/'}])
  const suffix=randomUUID().slice(0,8),name='Guiada '+testInfo.project.name+' '+suffix,groupName='Ofertas guiadas '+suffix
  await page.goto('/admin/afiliados/segmentacoes');await page.getByRole('button',{name:'Nova segmentação',exact:true}).click()
  const wizard=page.getByRole('dialog',{name:'Nova segmentação'})
  await wizard.getByLabel('Nome da segmentação',{exact:true}).fill(name);await wizard.getByLabel('Nome dos grupos no WhatsApp',{exact:true}).fill(groupName)
  await wizard.getByRole('button',{name:'Continuar para WhatsApp'}).click();await wizard.getByRole('checkbox',{name:/Natal teste/}).check();await wizard.getByRole('button',{name:'Conferir conexões e continuar'}).click();await wizard.getByRole('button',{name:'Criar segmentação',exact:true}).click()
  await expect(page).toHaveURL(/\/segmentacoes\/[^/]+$/)
  const segmentId=new URL(page.url()).pathname.split('/').at(-1)!
  await expectAutomaticDiscovery(page,segmentId)
  await expect(page.getByRole('heading',{name:'Prepare o primeiro grupo'})).toBeVisible()
  await page.getByRole('button',{name:'Criar primeiro grupo',exact:true}).click();const prepare=page.getByRole('dialog',{name:'Criar primeiro grupo'})
  await expect(prepare).toContainText(groupName+' #1');await expect(prepare.getByRole('button',{name:'Criar grupo no WhatsApp'})).toBeDisabled();await prepare.getByRole('checkbox').check();await prepare.getByRole('button',{name:'Criar grupo no WhatsApp'}).click()
  await expect(page.getByRole('heading',{name:'Encontre e envie uma oferta'})).toBeVisible();await expect(page.getByRole('table')).toContainText(groupName+' #1')
  await page.getByRole('button',{name:'Ver ofertas',exact:true}).click()
  const suggestions=page.getByRole('region',{name:'Sugestões para '+name})
  await expect(suggestions.getByRole('button',{name:'Revisar e enviar',exact:true}).first()).toBeVisible({timeout:45000})
  await expect(page.getByRole('searchbox',{name:'Buscar produtos',exact:true})).not.toBeVisible()
  const photo=suggestions.getByRole('img').first()
  await expect(photo).toHaveAttribute('src','https://http2.mlstatic.com/fixture-product.jpg')
  await expect.poll(()=>photo.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBe(1)
  const beforeReview=await page.evaluate(async id=>{const response=await fetch('/bff/v1/admin/affiliates/segments/'+id,{headers:{'x-workspace-owner':'self'}});return response.json() as Promise<{offers:unknown[];deliveries:unknown[]}>},segmentId)
  expect(beforeReview.offers).toHaveLength(0);expect(beforeReview.deliveries).toHaveLength(0)
  await suggestions.getByRole('button',{name:'Revisar e enviar',exact:true}).first().click()
  const review=page.getByRole('dialog',{name:'Revisar e enviar oferta'})
  await expect(review).toContainText(name);await expect(review).toContainText('1 grupo')
  await expect(review.getByLabel('Mensagem exata para o WhatsApp')).toContainText('https://meli.la/fixture-generated')
  await expect(review.getByRole('img')).toHaveAttribute('src','https://http2.mlstatic.com/fixture-product.jpg')
  expect(sendRequests).toBe(0)
  const beforeSend=await page.evaluate(async id=>{const response=await fetch('/bff/v1/admin/affiliates/segments/'+id,{headers:{'x-workspace-owner':'self'}});return response.json() as Promise<{offers:unknown[];deliveries:unknown[]}>},segmentId)
  expect(beforeSend.offers).toHaveLength(0);expect(beforeSend.deliveries).toHaveLength(0)
  await review.getByRole('button',{name:'Enviar',exact:true}).click()
  const progress=page.getByRole('dialog',{name:'Acompanhar envio'})
  await expect(progress.getByText('1 enviados · 0 em andamento · 0 falhas · 0 precisam de conferência',{exact:true})).toBeVisible({timeout:15000})
  expect(sendRequests).toBe(1)
  await progress.getByRole('button',{name:'Fechar e acompanhar no histórico'}).click();await area(page,'Envios')
  await expect(page.getByRole('region',{name:'Envios paginados'})).toContainText('1 enviados')
  const snapshot=await page.evaluate(async id=>{const response=await fetch('/bff/v1/admin/affiliates/segments/'+id,{headers:{'x-workspace-owner':'self'}});return response.json() as Promise<{groups:Array<{name:string}>;offers:Array<{segmentId:string;affiliateUrl:string}>;deliveries:Array<{state:string}>}>},segmentId)
  expect(snapshot.groups.map(group=>group.name)).toEqual([groupName+' #1']);expect(snapshot.offers).toHaveLength(1);expect(snapshot.offers[0]).toMatchObject({segmentId,affiliateUrl:'https://meli.la/fixture-generated'});expect(snapshot.deliveries).toHaveLength(1);expect(snapshot.deliveries[0].state).toBe('SENT')
})
