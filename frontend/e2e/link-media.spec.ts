import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {expect,test,type Page} from '@playwright/test'
import {runtime} from './runtime.cjs'
import {sql} from './db'
import {selectOption} from './select-control'
import {capturePage} from './capture-page'

const origin=runtime.web('tenant-a.localhost')
const raster=readFileSync(path.resolve(__dirname,'../../backend/src/domain/profiles/avatar.fixture.png'))
type State={tenantA:string;submitter:string;admin:string;password:string}
const state=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')) as State
async function login(page:Page,email:string){
 await page.context().addCookies([{name:'tla_consent',value:'denied',domain:'tenant-a.localhost',path:'/'}])
 await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(email);await page.getByLabel('Senha').fill(state().password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/(painel|admin)/)
}
async function publicState(page:Page,id:string){return page.evaluate(async id=>{const response=await fetch('/bff/v1/links/'+id);return response.json()},id)}
async function moderationTab(page:Page,label:'Links'|'Anexos'){
 await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0,{timeout:60_000})
 const tab=page.getByRole('tab',{name:label,exact:true})
 const select=page.getByRole('combobox',{name:/Análise de moderação|Tipo de publicação/})
 await expect(tab.or(select).first()).toBeVisible()
 if(await tab.isVisible())await tab.click()
 else await selectOption(select,{label})
}

test('limiar global em zero também aprova os anexos enviados, com bytes públicos só após aprovação',async({page,browser},info)=>{
 const s=state(),id='global-media-'+randomUUID(),adminContext=await browser.newContext({viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch,locale:'pt-BR'})
 const previousThreshold=sql(`SELECT value FROM configs WHERE "tenantId"='${s.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)
 sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${id}',l."tenantId",i."userId",'https://example.com/${id}','Anexo global','Projeto público',l."networkId",l."nicheId",'PUBLISHED',NOW() FROM links l JOIN networks r ON r.id=l."networkId" JOIN niches n ON n.id=l."nicheId" JOIN user_identifiers i ON i."tenantId"=l."tenantId" AND i."normalizedValue"='${s.submitter}' AND i."replacedAt" IS NULL WHERE l."tenantId"='${s.tenantA}' AND r."requiresAge"=false AND n."requiresAge"=false LIMIT 1`)
 try{
  const admin=await adminContext.newPage();await login(admin,s.admin);await admin.goto(origin+'/admin/configuracoes');const slider=admin.getByRole('slider',{name:'Limiar de aprovação da IA'});await slider.focus();await slider.press('Home');await admin.getByRole('button',{name:'Salvar limiar'}).click();await expect(admin.getByText(/Limiar salvo/)).toBeVisible();await capturePage(admin,info.outputPath('global-approval-zero.png'))
  await login(page,s.submitter);await page.goto(origin+'/painel/links/'+id+'/editar');await expect(page.getByLabel('Imagem do link (opcional)')).toBeEnabled();await page.getByLabel('Imagem do link (opcional)').setInputFiles({name:'imagem.png',mimeType:'image/png',buffer:raster});await expect(page.getByRole('img',{name:'Prévia da imagem escolhida'})).toBeVisible();await page.getByLabel('Descrição da imagem').fill('Projeto público');await page.getByRole('button',{name:'Enviar anexos para análise'}).click();await expect(page.getByText('Imagem · Aprovado',{exact:true})).toBeVisible();expect(sql(`SELECT status FROM link_media_assets WHERE "linkId"='${id}' AND kind='IMAGE'`)).toBe('APPROVED');const state=await publicState(page,id);expect(state.imageUrl).toBeTruthy();const image=await page.request.get(origin+String(state.imageUrl).replace(/^\/api\//,'/bff/'));expect(image.status()).toBe(200);await capturePage(page,info.outputPath('global-approved-image.png'))
 }finally{
  try{
   sql(`UPDATE configs SET value='${previousThreshold}' WHERE "tenantId"='${s.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)
   sql(`BEGIN;SELECT id FROM links WHERE id='${id}' FOR UPDATE;DELETE FROM link_availability WHERE "linkId"='${id}';DELETE FROM links WHERE id='${id}';COMMIT`)
  }finally{await adminContext.close()}
 }
})

test('link attachments: submit, independent human review, approved replacement, rejection and removal',async({page,browser},info)=>{
 const s=state(),suffix=info.project.name.replace(/[^a-z0-9]/g,'-')+'-'+randomUUID().slice(0,8),ownerId='ondas-media-'+suffix,email=ownerId+'@fixture.test',title='Comunidade Ondas '+suffix
 sql(`INSERT INTO users(id,"tenantId",name,"passwordHash","updatedAt") SELECT '${ownerId}','${s.tenantA}','Autora de anexos',u."passwordHash",NOW() FROM users u JOIN user_identifiers i ON i."userId"=u.id WHERE i."normalizedValue"='${s.submitter}' LIMIT 1 ON CONFLICT(id) DO NOTHING;
 INSERT INTO user_identifiers(id,"tenantId","userId",kind,"normalizedValue","confirmedAt") VALUES('${ownerId}-email','${s.tenantA}','${ownerId}','EMAIL','${email}',NOW()) ON CONFLICT(id) DO NOTHING;`)
 await login(page,email);await page.goto(origin+'/painel/links/novo')
 await page.getByLabel('Título do link').fill(title);await page.getByLabel('Link de acesso').fill('https://t.me/ondas-media-'+suffix);await page.getByRole('button',{name:'Continuar',exact:true}).click()
 await page.getByLabel('Descrição',{exact:true}).fill('Conversas, encontros e projetos da comunidade.')
 await selectOption(page.getByRole('combobox',{name:'Rede do link'}),{label:'Telegram'});await selectOption(page.getByRole('combobox',{name:'Assunto do link'}),{label:'Jogos'})
 await page.getByLabel('Ícone do link (opcional)').setInputFiles({name:'icone.png',mimeType:'image/png',buffer:raster})
 await expect(page.getByRole('img',{name:'Prévia do ícone escolhido'})).toBeVisible()
 await page.getByLabel('Imagem do link (opcional)').setInputFiles({name:'comunidade.png',mimeType:'image/png',buffer:raster})
 await expect(page.getByRole('img',{name:'Prévia da imagem escolhida'})).toBeVisible();await page.getByLabel('Descrição da imagem').fill('Comunidade reunida')
 await page.getByRole('button',{name:'Continuar',exact:true}).click();const submission=page.waitForResponse(response=>response.url().endsWith('/bff/v1/links')&&response.request().method()==='POST')
 await page.getByRole('button',{name:'Enviar',exact:true}).click();const submitted=await submission;expect(submitted.status()).toBe(201);const {id}=await submitted.json()
 expect(sql(`SELECT count(*) FROM link_media_assets WHERE "linkId"='${id}' AND status='PENDING'`)).toBe('2')
 expect((await publicState(page,id)).imageUrl).toBeUndefined()
 expect(await page.evaluate(()=>localStorage.getItem('tla-link-draft'))).toBeNull()
 const adminContext=await browser.newContext({locale:'pt-BR',viewport:info.project.use.viewport,isMobile:info.project.use.isMobile,hasTouch:info.project.use.hasTouch})
 try{
  const admin=await adminContext.newPage();await login(admin,s.admin);await admin.goto(origin+'/admin/moderacao?link='+id);await moderationTab(admin,'Anexos')
  const queue=admin.getByRole('region',{name:'Análise de anexos'})
  await expect(queue.getByRole('button',{name:'Aprovar anexo'})).toHaveCount(2)
  await expect.poll(()=>queue.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true)
  await capturePage(admin,info.outputPath('attachment-queue.png'))
  await queue.getByRole('button',{name:'Aprovar anexo'}).first().click();await expect(queue.getByRole('button',{name:'Aprovar anexo'})).toHaveCount(1)
  await queue.getByRole('button',{name:'Aprovar anexo'}).click();await expect(queue.getByRole('button',{name:'Aprovar anexo'})).toHaveCount(0)
  if(sql(`SELECT status FROM links WHERE id='${id}'`)==='PENDING_MODERATION'){
   await moderationTab(admin,'Links')
   const text=admin.getByRole('article').filter({has:admin.getByRole('heading',{name:title,exact:true})});await text.getByRole('button',{name:'Aprovar',exact:true}).click()
  }
  await expect.poll(()=>sql(`SELECT status FROM links WHERE id='${id}'`)).toBe('PUBLISHED')
  const published=await publicState(page,id);expect(published.imageUrl).toBeTruthy();expect(published.iconUrl).toBeTruthy()
  const publicUrl=published.imageUrl.replace('/api/','/bff/'),bytes=await page.request.get(origin+publicUrl);expect(bytes.status()).toBe(200);expect(bytes.headers()['x-content-type-options']).toBe('nosniff');expect(bytes.headers()['cache-control']).toContain('no-store')
  await page.goto(origin+'/link/'+id);const detail=page.getByRole('region',{name:title,exact:true});await expect(detail.getByRole('img',{name:'Comunidade reunida',exact:true})).toBeVisible();await expect(detail.getByRole('link',{name:'Acessar',exact:true})).toHaveAttribute('href',new RegExp('/go/'+id+'\\?surfaceToken='));await page.screenshot({path:info.outputPath('link-approved.png'),fullPage:true,animations:'disabled'})
  const hero=detail.getByRole('img',{name:'Comunidade reunida',exact:true});await expect(hero).toHaveAttribute('loading','eager');await expect(hero).toHaveAttribute('fetchpriority','high')
  await expect.poll(()=>hero.evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true)
  const selected=await hero.evaluate((image:HTMLImageElement)=>image.currentSrc);expect(selected).toContain('?width=');const variant=await page.request.get(selected);expect(variant.status()).toBe(200);expect(variant.headers()['cache-control']).toContain('no-store');expect(variant.headers()['x-content-type-options']).toBe('nosniff')
  await page.goto(origin+'/');const card=page.getByRole('article').filter({has:page.getByRole('link',{name:title,exact:true})});await expect(card.getByRole('img',{name:'Comunidade reunida'})).toBeVisible();await expect(card.getByRole('img',{name:'Comunidade reunida'})).toHaveAttribute('loading','lazy')
  await page.goto(origin+'/painel/links/'+id+'/editar');const editor=page.getByRole('region',{name:'Anexos do link'})
  await expect(editor.getByLabel('Imagem do link (opcional)')).toBeEnabled();await editor.getByLabel('Imagem do link (opcional)').setInputFiles({name:'nova.png',mimeType:'image/png',buffer:raster});await expect(editor.getByRole('img',{name:'Prévia da imagem escolhida'})).toBeVisible();await editor.getByLabel('Descrição da imagem').fill('Nova imagem pendente');await editor.getByRole('button',{name:'Enviar anexos para análise'}).click();await expect(editor.getByText('Anexos enviados para análise.')).toBeVisible()
  expect((await publicState(page,id)).imageUrl).toBe(published.imageUrl)
  await admin.reload();await moderationTab(admin,'Anexos');const pending=queue.getByRole('article').filter({has:admin.getByRole('heading',{name:title+' · Imagem',exact:true})});await pending.getByRole('button',{name:'Rejeitar anexo'}).click();const rejection=admin.getByRole('dialog',{name:'Rejeitar anexo'});await expect(rejection).toBeVisible();await rejection.getByLabel('Motivo da recusa').fill('Imagem inadequada para este link');await capturePage(admin,info.outputPath('attachment-rejection.png'),false);await rejection.getByRole('button',{name:'Confirmar rejeição'}).click();await expect(queue.getByText('Nenhum anexo aguardando análise.')).toBeVisible()
  expect((await publicState(page,id)).imageUrl).toBe(published.imageUrl)
  await editor.getByRole('button',{name:'Atualizar anexos'}).click();await expect(editor.getByText(/Imagem rejeitada: Imagem inadequada para este link/)).toBeVisible();await expect(editor.getByRole('button',{name:'Remover imagem e propostas'})).toBeEnabled();await editor.getByRole('button',{name:'Remover imagem e propostas'}).click();await expect(editor.getByText('Anexo removido.')).toBeVisible()
  expect((await publicState(page,id)).imageUrl).toBeUndefined();expect((await page.request.get(origin+publicUrl)).status()).toBe(404);expect((await page.request.get(selected)).status()).toBe(404)
  await page.goto(origin+'/link/'+id);await expect(detail.getByRole('img',{name:'Comunidade reunida',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Sobre o link'}).getByText('Conversas, encontros e projetos da comunidade.',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath('link-no-cover.png'),fullPage:true,animations:'disabled'})
 }finally{await adminContext.close()}
})
