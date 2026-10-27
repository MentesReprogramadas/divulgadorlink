import { accountLanding } from './account-landing'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect,test,type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { capturePage } from './capture-page'
import {selectOption} from './select-control'
const fixture=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')).profiles as {tenantId:string;ownerId:string;owner:string;other:string;password:string}
const origin=runtime.web('profiles.localhost')
async function login(page:Page,admin=false,email?:string){await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(email??(admin?fixture().other:fixture().owner));await page.getByLabel('Senha').fill(fixture().password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await accountLanding(page);const refuse=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await refuse.count())await refuse.click()}
async function mutate(page:Page,route:string,body:unknown,method='POST'){
  return page.evaluate(async({route,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const result=await fetch('/bff/v1'+route,{method,headers:{'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(body)});return{status:result.status,body:await result.json()}},{route,body,method})
}
function reset(){const tenant=fixture().tenantId;sql(`BEGIN; DELETE FROM profile_billing_events WHERE "tenantId"='${tenant}'; DELETE FROM profile_billing_operations WHERE "tenantId"='${tenant}'; DELETE FROM profile_entitlements WHERE "tenantId"='${tenant}'; DELETE FROM profile_subscriptions WHERE "tenantId"='${tenant}'; DELETE FROM profile_billing_accounts WHERE "tenantId"='${tenant}'; DELETE FROM profile_plan_versions WHERE "tenantId"='${tenant}'; DELETE FROM profile_plans WHERE "tenantId"='${tenant}'; DELETE FROM profile_billing_settings WHERE "tenantId"='${tenant}'; COMMIT;`)}
const base=['profile.page','profile.categories','profile.appearance','profile.history']
async function configure(page:Page){
  expect((await mutate(page,'/admin/profile-billing/settings',{expectedVersion:0,enabled:true,fiscalReviewed:true,publicOrigin:origin},'PUT')).status).toBe(200)
  for(const [tier,amountCents,providerPriceId,extra] of [['PRO',1290,'price_pro_fixture','profile.analytics'],['PREMIUM',2490,'price_premium_fixture','profile.richBlocks']] as const)expect((await mutate(page,'/admin/profile-billing/plans',{expectedVersion:0,tier,amountCents,currency:'BRL',interval:'month',providerPriceId,capabilities:[...base,extra],enabled:true})).status).toBe(200)
}
async function pageDraft(page:Page,slug='pagina-billing'){const current=await page.evaluate(async()=>(await fetch('/bff/v1/me/profile')).json());if(!current.draft)expect((await mutate(page,'/me/profile',{expectedVersion:0,content:{slug,name:'Minha página gratuita',bio:'Conteúdo preservado',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]}},'PATCH')).status).toBe(200)}
async function choosePro(page:Page){await page.goto(origin+'/painel/assinatura');await page.getByRole('article',{name:'Pro',exact:true}).getByRole('button',{name:'Assinar plano'}).click();await page.getByRole('dialog').getByRole('button',{name:'Ir para pagamento'}).click();await expect(page.getByRole('heading',{name:'Checkout seguro fixture'})).toBeVisible()}
async function localCheckout(page:Page){await page.route('https://checkout.contavera.com/c/pay/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><title>Fixture</title><h1>Checkout seguro fixture</h1></html>'}))}
function currentSession(){return sql(`SELECT "providerCheckoutId" FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}' ORDER BY "createdAt" DESC LIMIT 1`)}
async function pay(page:Page){const response=await page.request.post(runtime.stubOrigin+'/billing-fixture/pay',{data:{sessionId:currentSession(),host:'profiles.localhost',eventId:'evt_'+randomUUID().replaceAll('-','')}});expect(response.status()).toBe(200);expect((await response.json()).status).toBe(200);await expect.poll(()=>sql(`SELECT status FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}' ORDER BY "createdAt" DESC LIMIT 1`)).toBe('ACTIVE')}
test.beforeEach(async()=>{reset()})
test('F11-E01 free remains usable, signed confirmation activates, change waits for next cycle and cancellation preserves the paid balance',async({page,browser},info)=>{
  await login(page,true);await configure(page)
  const owner=await browser.newContext(),ownerPage=await owner.newPage()
  try{
    await login(ownerPage);await pageDraft(ownerPage);await localCheckout(ownerPage)
    const before=sql(`SELECT row_to_json(p)::text FROM profiles p WHERE "tenantId"='${fixture().tenantId}' AND "ownerId"='${fixture().ownerId}'`)
    await ownerPage.goto(origin+'/painel/assinatura');await expect(ownerPage.getByRole('article',{name:'Gratuito',exact:true})).toBeVisible()
    await capturePage(ownerPage,info.outputPath('billing-plans.png'))
    await choosePro(ownerPage)
    await ownerPage.goto(origin+'/painel/assinatura?checkout=returned');await expect(ownerPage.getByRole('status').filter({hasText:'retornar não ativa'})).toBeVisible()
    expect(sql(`SELECT count(*) FROM profile_entitlements WHERE "tenantId"='${fixture().tenantId}'`)).toBe('0')
    expect(sql(`SELECT status FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('PENDING')
    await pay(ownerPage);await ownerPage.getByRole('button',{name:'Atualizar situação'}).click();await expect(ownerPage.getByRole('article',{name:'Situação da assinatura'})).toContainText('Ativa')
    await ownerPage.getByRole('article',{name:'Premium',exact:true}).getByRole('button',{name:'Trocar no próximo ciclo'}).click();const change=ownerPage.getByRole('dialog');await expect(change).toContainText('sem cobrança proporcional');await expect(change).toHaveCSS('opacity','1')
    const axe=await new AxeBuilder({page:ownerPage}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(row=>row.id),JSON.stringify(axe.violations.flatMap(row=>row.nodes.map(node=>node.failureSummary)))).toEqual([])
    await capturePage(ownerPage,info.outputPath('billing-confirm-change.png'),false)
    await change.getByRole('button',{name:'Confirmar',exact:true}).focus();await ownerPage.keyboard.press('Enter')
    await expect.poll(()=>sql(`SELECT p.tier||':'||n.tier FROM profile_subscriptions s JOIN profile_plan_versions v ON v.id=s."planVersionId" JOIN profile_plans p ON p.id=v."planId" JOIN profile_plan_versions nv ON nv.id=s."scheduledVersionId" JOIN profile_plans n ON n.id=nv."planId" WHERE s."tenantId"='${fixture().tenantId}'`)).toBe('PRO:PREMIUM')
    const providerId=sql(`SELECT "providerSubscriptionId" FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)
    expect((await ownerPage.request.post(runtime.stubOrigin+'/billing-fixture/advance',{data:{subscriptionId:providerId}})).status()).toBe(200)
    await expect(ownerPage.getByRole('dialog')).toHaveCount(0);expect((await mutate(ownerPage,'/me/subscription/reconcile',{})).status).toBe(202)
    await expect.poll(()=>sql(`SELECT p.tier FROM profile_subscriptions s JOIN profile_plan_versions v ON v.id=s."planVersionId" JOIN profile_plans p ON p.id=v."planId" WHERE s."tenantId"='${fixture().tenantId}'`)).toBe('PREMIUM')
    await ownerPage.getByRole('button',{name:'Atualizar situação'}).click();await expect(ownerPage.getByRole('article',{name:'Situação da assinatura'})).toContainText('Premium')
    const paidUntil=sql(`SELECT "paidThrough"::text FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)
    await ownerPage.getByRole('button',{name:'Cancelar renovação'}).click();await ownerPage.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click()
    await expect.poll(()=>sql(`SELECT "cancelAtPeriodEnd"::text FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('true')
    await expect(ownerPage.getByRole('article',{name:'Situação da assinatura'})).toContainText('Renovação cancelada')
    expect(sql(`SELECT "paidThrough"::text FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe(paidUntil)
    expect(sql(`SELECT row_to_json(p)::text FROM profiles p WHERE "tenantId"='${fixture().tenantId}' AND "ownerId"='${fixture().ownerId}'`)).toBe(before)
    await capturePage(ownerPage,info.outputPath('billing-canceled-renewal.png'))
  }finally{await owner.close()}
})
test('F11-E02 admin forms, fiscal gate, immutable editions, access control and layout-preserving refresh',async({page,browser},info)=>{
  await login(page,true);await page.goto(origin+'/admin/assinaturas');await page.getByRole('button',{name:'Configurar vendas'}).click()
  const settings=page.getByRole('dialog');await settings.getByLabel('Endereço público deste site').fill(origin);await settings.getByText('Permitir novas assinaturas, quando todas as condições estiverem prontas.').click();await settings.getByRole('button',{name:'Salvar configuração'}).click();await expect(settings.getByRole('alert')).toContainText('fiscal');await settings.getByText('A configuração fiscal deste produto foi revisada.').click();await settings.getByRole('button',{name:'Salvar configuração'}).click();await expect(settings).toHaveCount(0)
  await page.getByRole('article',{name:'Configuração PRO'}).getByRole('button',{name:'Configurar plano'}).click();const plan=page.getByRole('dialog');await plan.getByLabel('Valor mensal em reais').fill('12.90');await plan.getByLabel('Código do preço na Stripe').fill('price_pro_fixture');await plan.getByRole('button',{name:'Continuar',exact:true}).click();await plan.getByLabel('Estatísticas dos botões').check();await plan.getByLabel('Liberar este plano para novas assinaturas.').check();await plan.getByRole('button',{name:'Salvar configuração'}).click();await expect(plan).toHaveCount(0)
  await expect(page.getByRole('article',{name:'Configuração PRO'})).toContainText('12,90')
  await page.getByRole('article',{name:'Configuração PRO'}).getByRole('button',{name:'Editar plano'}).click();await page.getByRole('dialog').getByLabel('Código do preço na Stripe').fill('price_pro_fixture_next');await page.getByRole('dialog').getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Salvar configuração'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(sql(`SELECT count(*) FROM profile_plan_versions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('2');expect(sql(`SELECT "providerPriceId" FROM profile_plan_versions WHERE "tenantId"='${fixture().tenantId}' ORDER BY version LIMIT 1`)).toBe('price_pro_fixture')
  const before=await page.getByRole('article',{name:'Configuração PRO'}).boundingBox();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});await page.route('**/bff/v1/admin/profile-billing',async route=>{await gate;await route.continue()});await page.getByRole('button',{name:'Atualizar dados'}).click();await expect(page.getByRole('status',{name:'Atualizando administração das assinaturas'})).toBeVisible();const during=await page.locator('[data-skeleton] article').filter({has:page.locator('h2').filter({hasText:'Pro'})}).boundingBox();expect(Math.abs(during!.height-before!.height)).toBeLessThan(1)
  await capturePage(page,info.outputPath('billing-admin-refresh.png'));release();await expect(page.getByRole('status',{name:'Atualizando administração das assinaturas'})).toHaveCount(0);await page.unroute('**/bff/v1/admin/profile-billing')
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(row=>row.id)).toEqual([])
  await capturePage(page,info.outputPath('billing-admin.png'))
  const owner=await browser.newContext(),stranger=await owner.newPage();try{await login(stranger);const denied=await stranger.evaluate(async()=>(await fetch('/bff/v1/admin/profile-billing')).status);expect(denied).toBe(403);expect((await mutate(stranger,'/me/subscription/cancel',{expectedVersion:0})).status).toBe(404)}finally{await owner.close()}
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);await capturePage(page,info.outputPath('billing-admin-320-zoom.png'))
})
test('F11-E03 provider outage keeps checkout pending, recovers idempotently and never gives premature access',async({page},info)=>{
  await login(page,true);await configure(page);await page.context().clearCookies();await login(page);await pageDraft(page);await localCheckout(page)
  expect((await page.request.post(runtime.stubOrigin+'/billing-fixture/control',{data:{unavailable:true}})).status()).toBe(200)
  try{
    await page.goto(origin+'/painel/assinatura');await page.getByRole('article',{name:'Pro',exact:true}).getByRole('button',{name:'Assinar plano'}).click();await page.getByRole('dialog').getByRole('button',{name:'Ir para pagamento'}).click()
    await expect.poll(()=>sql(`SELECT "lastError" FROM profile_billing_operations WHERE "tenantId"='${fixture().tenantId}' AND kind='CHECKOUT'`)).toBe('UNAVAILABLE')
    expect(sql(`SELECT count(*) FROM profile_entitlements WHERE "tenantId"='${fixture().tenantId}'`)).toBe('0')
    await capturePage(page,info.outputPath('billing-provider-pending.png'))
  }finally{await page.request.post(runtime.stubOrigin+'/billing-fixture/control',{data:{unavailable:false}})}
  await expect(page.getByRole('heading',{name:'Checkout seguro fixture'})).toBeVisible()
  expect(sql(`SELECT count(*) FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('1')
  const sessionId=currentSession();await page.goto(origin+'/painel/assinatura?checkout=canceled');await page.getByRole('button',{name:'Cancelar renovação'}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();await expect.poll(()=>sql(`SELECT status FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('CANCELED')
  const external=await(await page.request.get(runtime.stubOrigin+'/billing-fixture/state')).json();expect(external.sessions.filter((row:{id:string})=>row.id===sessionId)).toHaveLength(1)
})
test('F11-E04 failed renewal removes uncovered paid access, preserves the free page and allows cancellation without another invoice',async({page},info)=>{
  await login(page,true);await configure(page);await page.context().clearCookies();await login(page);await pageDraft(page);await localCheckout(page);await choosePro(page);await pay(page)
  const before=sql(`SELECT row_to_json(p)::text FROM profiles p WHERE "tenantId"='${fixture().tenantId}' AND "ownerId"='${fixture().ownerId}'`),providerId=sql(`SELECT "providerSubscriptionId" FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)
  const failed=await page.request.post(runtime.stubOrigin+'/billing-fixture/renewal-failed',{data:{subscriptionId:providerId,host:'profiles.localhost'}});expect((await failed.json()).status).toBe(200)
  await expect.poll(()=>sql(`SELECT status FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('PAST_DUE')
  await page.goto(origin+'/painel/assinatura');await expect(page.getByRole('article',{name:'Situação da assinatura'})).toContainText('Pagamento pendente')
  const access=await page.evaluate(async()=>(await fetch('/bff/v1/me/subscription')).json());expect(access.subscription.hasPaidAccess).toBe(false);expect(access.capabilities).toEqual(base)
  expect(sql(`SELECT row_to_json(p)::text FROM profiles p WHERE "tenantId"='${fixture().tenantId}' AND "ownerId"='${fixture().ownerId}'`)).toBe(before)
  await capturePage(page,info.outputPath('billing-renewal-failed.png'))
  await page.getByRole('button',{name:'Cancelar renovação'}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();await expect.poll(()=>sql(`SELECT status FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('CANCELED')
  const state=await(await page.request.get(runtime.stubOrigin+'/billing-fixture/state')).json();expect(state.calls.some((row:{method:string;path:string})=>row.method==='DELETE'&&row.path==='/v1/subscriptions/'+providerId)).toBe(true)
})
test('F11-E05 existing account deletion automatically stops a paid renewal and keeps contact data removed',async({page})=>{
  await login(page,true);await configure(page);await page.context().clearCookies()
  const id=randomUUID(),email='delete-'+id+'@fixture.test'
  sql(`INSERT INTO users(id,"tenantId",name,"passwordHash",role,status,"createdAt","updatedAt") SELECT '${id}',"tenantId",'Conta de exclusão',"passwordHash",'USER','ACTIVE',now(),now() FROM users WHERE id='${fixture().ownerId}'; INSERT INTO user_identifiers(id,"userId","tenantId",kind,"normalizedValue","confirmedAt","createdAt") VALUES ('${randomUUID()}','${id}','${fixture().tenantId}','EMAIL','${email}',now(),now());`)
  await login(page,false,email)
  expect((await mutate(page,'/me/profile',{expectedVersion:0,content:{slug:'billing-exclusao-'+id.slice(0,8),name:'Página de exclusão',bio:'Fixture',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]}},'PATCH')).status).toBe(200)
  await localCheckout(page);await choosePro(page);await pay(page)
  await page.goto(origin+'/painel/conta');await page.getByLabel('Senha atual').fill(fixture().password);await page.getByRole('button',{name:'Excluir conta',exact:true}).click()
  await expect.poll(()=>sql(`SELECT count(*) FROM user_identifiers WHERE "userId"='${id}'`)).toBe('0')
  await expect.poll(()=>sql(`SELECT "cancelAtPeriodEnd"::text FROM profile_subscriptions WHERE "ownerId"='${id}'`)).toBe('true')
  expect(sql(`SELECT name||':'||status FROM users WHERE id='${id}'`)).toBe('Conta excluída:ACTIVE')
  expect(sql(`SELECT count(*) FROM profiles WHERE "ownerId"='${id}'`)).toBe('0')
  expect(sql(`SELECT count(*) FROM profile_entitlements WHERE "ownerId"='${id}' AND "revokedAt" IS NULL`)).toBe('0')
})

test('F11-E06 paid navigation opens contextual plans and checkout reflows with keyboard access',async({page},info)=>{
 await login(page,true);await configure(page);await page.context().clearCookies();await login(page);await pageDraft(page)
 await page.goto(origin+'/painel/perfil/metricas')
 await expect(page.getByRole('region',{name:'Recurso com assinatura'})).toBeVisible()
 if(info.project.name.includes('mobile'))await page.getByRole('button',{name:'Menu',exact:true}).click()
 const nav=page.getByRole('navigation',{name:'Áreas do painel'}).filter({visible:true})
 await expect(nav.getByRole('link',{name:/Planos e assinatura/})).toBeVisible()
 const metrics=nav.getByRole('link',{name:/Visitas e cliques/});await expect(metrics).toContainText('Requer assinatura');await metrics.click()
 await expect(page).toHaveURL(/assinatura\?recurso=profile.analytics$/)
 const pro=page.getByRole('article',{name:'Pro',exact:true});await expect(pro).toHaveAttribute('data-highlighted','true')
 await capturePage(page,info.outputPath('billing-paywall.png'))
 await pro.getByRole('button',{name:'Assinar plano'}).focus();await page.keyboard.press('Enter')
 const checkout=page.getByRole('dialog',{name:'Confirmar assinatura'});await expect(checkout.getByRole('region',{name:'Resumo da assinatura'})).toContainText('12,90')
 await expect(checkout).toHaveCSS('opacity','1')
 await expect(checkout).toContainText('mensal e recorrente')
 await expect(checkout.getByRole('button',{name:'Ir para pagamento'})).toBeInViewport({ratio:1})
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(row=>row.id),JSON.stringify(axe.violations.flatMap(row=>row.nodes.map(node=>node.failureSummary)))).toEqual([])
 await capturePage(page,info.outputPath('subscription-checkout.png'),false)
 await page.keyboard.press('Escape');await expect(pro.getByRole('button',{name:'Assinar plano'})).toBeFocused()
 await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
 await pro.getByRole('button',{name:'Assinar plano'}).click();await expect(checkout.getByRole('button',{name:'Ir para pagamento'})).toBeInViewport({ratio:1});await checkout.getByRole('button',{name:'Ir para pagamento'}).focus()
 expect(await checkout.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
 await capturePage(page,info.outputPath('subscription-checkout-zoom.png'),false)
 await page.keyboard.press('Escape');await expect(checkout).toHaveCount(0)
 expect(sql(`SELECT count(*) FROM profile_subscriptions WHERE "tenantId"='${fixture().tenantId}'`)).toBe('0')
})

test('F11-E07 sem página mostra só a criação; catálogo não configurado não exibe planos incompletos',async({page},info)=>{
 const id=randomUUID(),email='onboarding-'+id+'@fixture.test'
 sql(`INSERT INTO users(id,"tenantId",name,"passwordHash",role,status,"createdAt","updatedAt") SELECT '${id}',"tenantId",'Conta sem página',"passwordHash",'USER','ACTIVE',now(),now() FROM users WHERE id='${fixture().ownerId}'; INSERT INTO user_identifiers(id,"userId","tenantId",kind,"normalizedValue","confirmedAt","createdAt") VALUES ('${randomUUID()}','${id}','${fixture().tenantId}','EMAIL','${email}',now(),now());`)
 await login(page,false,email);await page.goto(origin+'/painel/assinatura?recurso=profile.subdomain')
 await expect(page.getByRole('heading',{name:'Primeiro, crie sua página'})).toBeVisible()
 await expect(page.getByRole('article')).toHaveCount(0);await expect(page.getByText(/preparação|Preço ainda não definido|Nenhum plano disponível/)).toHaveCount(0)
 await capturePage(page,info.outputPath('billing-create-page.png'))
 await page.getByRole('link',{name:'Criar minha página',exact:true}).click();await expect(page).toHaveURL(/\/painel\/perfil$/)
 await pageDraft(page,'onboarding-'+id.slice(0,8));await page.goto(origin+'/painel/assinatura')
 await expect(page.getByRole('heading',{name:'Sua página continua gratuita'})).toBeVisible();await expect(page.getByRole('article')).toHaveCount(0)
 await capturePage(page,info.outputPath('billing-no-sales.png'))
})

test('F11-E08 Premium edita texto, imagem e vídeo; publicação, consentimento e expiração preservam a página gratuita',async({page,browser},info)=>{
 await login(page,true);await configure(page)
 const owner=await browser.newContext({locale:'pt-BR',viewport:info.project.use.viewport}),editor=await owner.newPage()
 try{
  await login(editor);await pageDraft(editor);await localCheckout(editor)
  await editor.goto(origin+'/painel/assinatura?recurso=profile.richBlocks')
  await editor.getByRole('article',{name:'Premium',exact:true}).getByRole('button',{name:'Assinar plano'}).click()
  const checkout=editor.getByRole('dialog'),viewport=editor.viewportSize()!
  await expect(checkout).toHaveCSS('opacity','1');await capturePage(editor,info.outputPath('subscription-checkout.png'),false)
  await editor.setViewportSize({width:320,height:844});await editor.evaluate(()=>{document.documentElement.style.fontSize='200%'})
  await expect(checkout.getByRole('button',{name:'Ir para pagamento'})).toBeInViewport({ratio:1});await capturePage(editor,info.outputPath('subscription-checkout-zoom.png'),false)
  await editor.evaluate(()=>{document.documentElement.style.fontSize=''});await editor.setViewportSize(viewport)
  await checkout.getByRole('button',{name:'Ir para pagamento'}).click();await expect(editor.getByRole('heading',{name:'Checkout seguro fixture'})).toBeVisible();await pay(editor)
  await editor.goto(origin+'/painel/perfil/conteudo');await expect(editor.getByRole('heading',{name:'Conteúdo além dos links'})).toBeVisible()
  const previous=await editor.evaluate(async()=>(await fetch('/bff/v1/me/profile')).json()),{version:previousVersion,...clean}=previous.draft
  expect((await mutate(editor,'/me/profile',{expectedVersion:previousVersion,content:{...clean,contentBlocks:[]}},'PATCH')).status).toBe(200);await editor.reload();await expect(editor.getByRole('heading',{name:'Blocos de conteúdo',exact:true})).toBeVisible()
  await editor.getByRole('button',{name:'Adicionar bloco',exact:true}).click();await editor.getByLabel('Título',{exact:true}).fill('Serviços sob medida');await editor.getByLabel('Texto',{exact:true}).fill('Consultoria para tirar seu projeto do papel.');await editor.getByRole('button',{name:'Salvar bloco',exact:true}).click()
  await selectOption(editor.getByRole('combobox',{name:'Adicionar bloco'}),'IMAGE');await editor.getByRole('button',{name:'Adicionar bloco',exact:true}).click();await editor.getByLabel('Título',{exact:true}).fill('Meu portfólio');await editor.getByLabel('Imagem',{exact:true}).setInputFiles(path.join(__dirname,'../../backend/src/domain/profiles/avatar.fixture.png'));await editor.getByLabel('Descrição da imagem',{exact:true}).fill('Projeto de exemplo');await editor.getByLabel('Legenda (opcional)',{exact:true}).fill('Um projeto feito com cuidado.');await expect(editor.getByText('Imagem enviada.',{exact:false})).toBeVisible();await editor.getByRole('button',{name:'Salvar bloco',exact:true}).click()
  await selectOption(editor.getByRole('combobox',{name:'Adicionar bloco'}),'VIDEO');await editor.getByRole('button',{name:'Adicionar bloco',exact:true}).click();await editor.getByLabel('Título',{exact:true}).fill('Conheça meu trabalho');await editor.getByLabel('Endereço do vídeo',{exact:true}).fill('https://youtu.be/dQw4w9WgXcQ');await editor.getByRole('button',{name:'Salvar bloco',exact:true}).click()
  await expect.poll(()=>sql(`SELECT jsonb_array_length(content) FROM profile_content_blocks WHERE "tenantId"='${fixture().tenantId}' AND "ownerId"='${fixture().ownerId}'`)).toBe('3')
  await expect.poll(()=>editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const axe=await new AxeBuilder({page:editor}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(row=>row.id),JSON.stringify(axe.violations.flatMap(row=>row.nodes.map(node=>node.failureSummary)))).toEqual([])
  await capturePage(editor,info.outputPath('premium-content-editor.png'))
  const state=await editor.evaluate(async()=>(await fetch('/bff/v1/me/profile')).json()),{version,...content}=state.draft,group=randomUUID()
  content.categories=[{id:group,name:'Acesse',visible:true}];content.items=[{id:randomUUID(),categoryId:group,type:'URL',label:'Meu site gratuito',destination:'https://example.com/portfolio',visible:true}];content.primaryItemId=null
  const saved=await mutate(editor,'/me/profile',{expectedVersion:version,content},'PATCH');expect(saved.status).toBe(200)
  const published=await mutate(editor,'/me/profile/publish',{expectedVersion:saved.body.draft.version});expect(published.status).toBe(200)
  if(published.body.review)expect((await mutate(page,'/admin/content-reviews/'+published.body.review.id+'/decision',{decision:'APPROVE'})).status).toBe(200)
  const slug=content.slug,assetId=content.contentBlocks.find((block:{type:string})=>block.type==='IMAGE').assetId
  await editor.goto(origin+'/p/'+slug);await expect(editor.getByRole('heading',{name:'Serviços sob medida'})).toBeVisible();await expect(editor.getByAltText('Projeto de exemplo')).toBeVisible();await expect(editor.locator('iframe')).toHaveCount(0)
  await capturePage(editor,info.outputPath('premium-content-public.png'))
  await editor.route('https://www.youtube-nocookie.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Vídeo fixture</title>'}));await editor.getByRole('button',{name:'Carregar vídeo'}).click();await expect(editor.locator('iframe')).toHaveCount(1)
  sql(`UPDATE profile_entitlements SET "revokedAt"=now() WHERE "tenantId"='${fixture().tenantId}';`)
  await editor.reload();await expect(editor.getByRole('heading',{name:'Serviços sob medida'})).toHaveCount(0);await expect(editor.getByRole('link',{name:/Meu site gratuito/})).toBeVisible();expect(await editor.evaluate(async path=>(await fetch(path)).status,'/bff/v1/profiles/'+slug+'/media/'+assetId)).toBe(404)
  await editor.goto(origin+'/painel/perfil/conteudo');await expect(editor.getByRole('region',{name:'Recurso com assinatura'})).toBeVisible();await expect(editor.getByRole('region',{name:'Blocos de conteúdo',exact:true}).getByRole('heading',{name:'Serviços sob medida',exact:true})).toBeVisible()
 }finally{await owner.close()}
})
