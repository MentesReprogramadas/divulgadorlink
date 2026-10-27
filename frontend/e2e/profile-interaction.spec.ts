import { accountLanding } from './account-landing'
import {defaultAppearance} from '../src/features/profiles/profile-appearance'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {expect,test,type Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {runtime} from './runtime.cjs'
import {sql} from './db'
import {selectOption} from './select-control'
import {capturePage} from './capture-page'
import {resetProfileScheduling,grantProfileCapability,setProfileTestClock,clearProfileTestClock} from './profile-schedule-fixture'
const origin=runtime.web('interaction.localhost'),ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
const fixture=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')).interaction as {tenantId:string;ownerId:string;owner:string;other:string;password:string}
async function refuse(page:Page){const button=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await button.count())await button.click()}
async function login(page:Page,other=false){const f=fixture();await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(other?f.other:f.owner);await page.getByLabel('Senha').fill(f.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await accountLanding(page);await refuse(page)}
async function mutate(page:Page,route:string,body:unknown,method='POST'){return page.evaluate(async({route,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const response=await fetch('/bff/v1'+route,{method,headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify(body)});return {status:response.status,body:await response.json()}},{route,body,method})}
async function seed(page:Page){await login(page);const group=randomUUID(),items=Array.from({length:8},(_,index)=>({id:randomUUID(),categoryId:group,type:'URL',label:'Projeto '+(index+1),destination:'https://example.com/projeto-'+index,visible:true}));const content={appearance:{...defaultAppearance,searchEnabled:true},slug:'pagina-f31',name:'Projetos da Ana',bio:'Conheça os meus projetos',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Projetos',visible:true}],items:[...items,{id:randomUUID(),categoryId:group,type:'URL',label:'F31-HIDDEN-SECRET',destination:'https://example.com/f31-hidden',visible:false}]};expect((await mutate(page,'/me/profile',{expectedVersion:0,content},'PATCH')).status).toBe(200);expect((await mutate(page,'/me/profile/publish',{expectedVersion:1})).status).toBe(200);return content}
async function accessible(page:Page){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(row=>row.id),JSON.stringify(result.violations)).toEqual([])}
async function metrics(page:Page){await page.goto(origin+'/painel/perfil/metricas');await expect(page.getByRole('heading',{name:'Métricas da minha página',exact:true})).toBeVisible();await expect(page.getByLabel('Métricas da minha página')).not.toHaveAttribute('aria-busy','true')}
test.beforeEach(()=>{resetProfileScheduling(fixture().tenantId);setProfileTestClock('2026-10-18T12:00:00Z');grantProfileCapability(fixture(),'profile.analytics')})
test.afterEach(()=>clearProfileTestClock())
test('F31-E01/T01/T02/T04/T05 real visitor consent, visible button/scroll and owner filtering preserve purpose and publication',async({page,browser,playwright},info)=>{
 const content=await seed(page);await metrics(page);await expect(page.getByText('Ainda não há dados suficientes para este período e filtro.')).toBeVisible();await expect(page.getByText('Indisponível').first()).toBeVisible();await capturePage(page,info.outputPath('interaction-empty.png'))
 await page.getByRole('button',{name:'Ativar medição'}).click();await expect(page.getByRole('button',{name:'Pausar medição'})).toBeVisible()
 const context=await browser.newContext({userAgent:ua,viewport:page.viewportSize()!}),visitor=await context.newPage(),payloads:string[]=[]
 visitor.on('request',request=>{if(request.url().includes('/analytics/profiles/events'))payloads.push(request.postData()??'')})
 try{
  await visitor.goto(origin+'/p/pagina-f31');await expect(visitor.getByRole('heading',{name:'Projetos da Ana',exact:true})).toBeVisible();await visitor.waitForTimeout(1100);expect(payloads).toEqual([])
  await visitor.getByRole('button',{name:'Ajustar preferências'}).click();await visitor.getByLabel('Medição da página visitada').check();await visitor.getByRole('button',{name:'Salvar preferências'}).click()
  await expect.poll(()=>payloads.some(body=>JSON.parse(body).kind==='PAGE')).toBe(true)
  await expect.poll(()=>payloads.some(body=>JSON.parse(body).kind==='IMPRESSION')).toBe(true)
  await visitor.getByRole('searchbox',{name:'Buscar nesta página'}).fill('F31-TYPED-SECRET pessoa@example.org')
  await expect(visitor.getByText('Nenhum link encontrado.',{exact:true})).toBeVisible();await visitor.getByRole('button',{name:'Limpar texto da busca',exact:true}).click();await expect(visitor.getByRole('article',{name:'Perfil público',exact:true}).getByRole('link')).toHaveCount(8)
  await visitor.getByRole('link',{name:/Projeto 8/}).scrollIntoViewIfNeeded();await expect.poll(()=>payloads.some(body=>JSON.parse(body).kind==='SCROLL')).toBe(true)
  await visitor.route('https://example.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Destino externo fixture</h1>'}))
  await visitor.getByRole('link',{name:/Projeto 8/}).click();await expect(visitor.getByRole('heading',{name:'Destino externo fixture'})).toBeVisible()
  // Chromium may detach the response observer during navigation; the committed fact is the oracle.
  await expect.poll(()=>sql(`SELECT count(*) FROM profile_interaction_events WHERE "tenantId"='${fixture().tenantId}' AND "blockId"='${content.items[7].id}' AND kind='CLICK'`)).toBe('1')
  expect(payloads.join(' ')).not.toMatch(/TYPED-SECRET|pessoa@example|example.org|destination|userAgent|referrer/)
  const first=JSON.parse(payloads.find(body=>JSON.parse(body).kind==='PAGE')!) as {profileId:string;revisionId:number;surfaceToken:string;viewportBucket:string}
  for(let index=0;index<9;index++){
   const session=await playwright.request.newContext({userAgent:ua,extraHTTPHeaders:{host:'interaction.localhost:'+runtime.webPort,cookie:'tla_profile_measure=v1_yes; analyticsSession='+randomUUID()}})
   try{for(const body of [{kind:'PAGE',blockId:null},{kind:'IMPRESSION',blockId:content.items[0].id},{kind:'CLICK',blockId:content.items[0].id}]){const r=await session.post(runtime.web('127.0.0.1')+'/bff/v1/analytics/profiles/events',{data:{...first,...body,eventId:randomUUID(),scrollBucket:null}});expect(r.status(),await r.text()).toBe(201)}}finally{await session.dispose()}
  }
  await page.getByRole('button',{name:'Atualizar métricas'}).click();await expect(page.getByLabel('Métricas da minha página')).not.toHaveAttribute('aria-busy','true');await expect(page.getByText('Ainda não há dados suficientes para este período e filtro.')).toHaveCount(0)
  const details=await page.evaluate(async()=>{const r=await fetch('/bff/v1/me/profile/interaction');return r.json()});expect(details.summary.pageViews).toBe(10);expect(details.summary.blocks.find((row:{id:string})=>row.id===content.items[0].id).clicks).toBe(9)
  const more=page.getByRole('button',{name:'Ver mais filtros'});if(await more.isVisible())await more.click();await selectOption(page.getByRole('combobox',{name:'Tela do visitante'}),{label:first.viewportBucket==='MOBILE'?'Computador':'Celular'});await expect(page.getByText('Ainda não há dados suficientes para este período e filtro.')).toBeVisible();const allScreens=page.waitForResponse(response=>response.url().includes('/profile/interaction?')&&response.url().includes('viewport=ALL'));await selectOption(page.getByRole('combobox',{name:'Tela do visitante'}),{label:'Todas'});await allScreens;await expect(page.getByLabel('Métricas da minha página')).not.toHaveAttribute('aria-busy','true')
  await accessible(page);await capturePage(page,info.outputPath('interaction-report.png'));expect(sql(`SELECT count(*) FROM profile_interaction_events WHERE "profileId"='${first.profileId}' AND kind='CLICK'`)).toBe('10')
  await page.getByRole('button',{name:'Pausar medição'}).click();await expect(page.getByRole('button',{name:'Ativar medição'})).toBeVisible();await visitor.goto(origin+'/p/pagina-f31');const muted=await mutate(visitor,'/analytics/profiles/events',{...first,eventId:randomUUID(),kind:'SCROLL',scrollBucket:100,blockId:null});expect(muted.body.counted).toBe(false)
 }finally{await context.close()}
})
test('F31-E02/T03 private report cannot be read anonymously, by another owner or foreign tenant; public draft remains absent',async({page,browser},info)=>{
 await seed(page);await metrics(page);await page.getByRole('button',{name:'Ativar medição'}).click()
 const context=await browser.newContext(),guest=await context.newPage()
 try{await guest.goto(origin);expect(await guest.evaluate(async()=>(await fetch('/bff/v1/me/profile/interaction')).status)).toBe(401);await login(guest,true);expect(await guest.evaluate(async()=>(await fetch('/bff/v1/me/profile/interaction')).status)).toBe(404);await guest.goto(origin+'/painel/perfil/metricas');await expect(guest.getByRole('link',{name:'Criar minha página'})).toBeVisible();await capturePage(guest,info.outputPath('interaction-other-owner.png'))
  await guest.goto(origin+'/p/pagina-f31');expect(await guest.content()).not.toMatch(/F31-HIDDEN-SECRET|f31-hidden/)
  const foreign=await context.request.get(runtime.web('127.0.0.1')+'/bff/v1/profiles/pagina-f31',{headers:{host:'tenant-b.localhost:'+runtime.webPort}});expect(foreign.status()).toBe(404)
 }finally{await context.close()}
 await page.goto(origin+'/painel/perfil/previa');expect(await page.evaluate(async()=>{const r=await fetch('/bff/v1/me/profile/preview');return JSON.stringify(await r.json())})).not.toContain('surfaceToken')
})
test('F31-E03 keyboard, exact refresh skeleton, network failure and retry preserve the report without fake success',async({page},info)=>{
 await seed(page);await metrics(page);const results=page.getByLabel('Alcance de rolagem'),before=await results.boundingBox();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/bff/v1/me/profile/interaction',async route=>{await gate;await route.abort('failed')})
 await page.getByRole('button',{name:'Atualizar métricas'}).focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Carregando métricas')).toBeVisible();const pending=await results.boundingBox();expect(pending?.width).toBe(before?.width);expect(pending?.height).toBe(before?.height);expect(pending?.y).toBe(before?.y);await capturePage(page,info.outputPath('interaction-pending.png'));release();await expect(page.getByRole('main').getByRole('alert')).toBeVisible();await capturePage(page,info.outputPath('interaction-error.png'));await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Tentar de novo'}).click();await expect(page.getByText('Ainda não há dados suficientes para este período e filtro.')).toBeVisible();await accessible(page)
 await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('interaction-zoom.png'),false)
})
test('F31-E04/T03 real BullMQ worker purges expired profile facts and preserves retained facts',async({page})=>{
 await seed(page);const f=fixture(),profileId=sql(`SELECT id FROM profiles WHERE "tenantId"='${f.tenantId}' AND "ownerId"='${f.ownerId}'`),old=randomUUID(),fresh=randomUUID()
 for(const [id,days,dedupe] of [[old,181,'b'],[fresh,179,'c']] as const)sql(`INSERT INTO profile_interaction_events(id,"eventId","tenantId","profileId","ownerId","revisionId",kind,"viewportBucket","sessionKey","dedupeKey",day,"createdAt") VALUES('${id}','${id}','${f.tenantId}','${profileId}','${f.ownerId}',1,'PAGE','MOBILE',repeat('a',64),repeat('${dedupe}',64),CURRENT_DATE-interval '${days} days',NOW()-interval '${days} days')`)
 expect(sql(`SELECT count(*) FROM profile_interaction_events WHERE id='${old}'`)).toBe('1')
 execFileSync('npx',['tsx','scripts/e2e-enqueue-analytics-purge.ts'],{cwd:path.resolve(__dirname,'../../backend'),shell:true,encoding:'utf8',env:{...process.env,NODE_ENV:'dev',DATABASE_URL:runtime.databaseUrl,REDIS_URL:runtime.redisUrl,JWT_SECRET:'local-e2e-purge-only'}})
 await expect.poll(()=>sql(`SELECT count(*) FROM profile_interaction_events WHERE id='${old}'`),{timeout:15000}).toBe('0');expect(sql(`SELECT count(*) FROM profile_interaction_events WHERE id='${fresh}'`)).toBe('1')
})
