import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import jsQR from 'jsqr'
import { expect,test,type Download,type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import { selectOption } from './select-control'
import { capturePage } from './capture-page'
type Fixture={tenantId:string;ownerId:string;owner:string;other:string;password:string}
const fixture=(area:'profiles'|'redirects')=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8'))[area] as Fixture
async function login(page:Page,area:'profiles'|'redirects',other=false){const data=fixture(area);await page.goto(runtime.web(area+'.localhost')+'/login');await page.getByLabel('E-mail').fill(other?data.other:data.owner);await page.getByLabel('Senha').fill(data.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();const refuse=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await refuse.count())await refuse.click()}
async function mutate(page:Page,route:string,body:unknown,method='POST'){
  return page.evaluate(async({route,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const response=await fetch('/bff/v1'+route,{method,headers:{'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(body)});return{status:response.status,body:await response.json()}},{route,body,method})
}
async function decode(page:Page,download:Download){
  const local=await download.path();if(!local)throw new Error('Download file missing')
  const bytes=readFileSync(local),mime=download.suggestedFilename().endsWith('.svg')?'image/svg+xml':'image/png'
  if(mime==='image/svg+xml'){expect(bytes.toString('utf8')).toContain('<svg');expect(bytes.toString('utf8')).not.toMatch(/<script|foreignObject|onload=/)}else expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10])
  // Rasterize the actual downloaded file, then use an independent decoder. No image mocks.
  const pixels=await page.evaluate(async({base64,mime})=>{
    const image=new Image();image.src='data:'+mime+';base64,'+base64;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
    const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable')
    context.drawImage(image,0,0);return{width:canvas.width,height:canvas.height,data:Array.from(context.getImageData(0,0,canvas.width,canvas.height).data)}
  },{base64:bytes.toString('base64'),mime})
  const result=jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height,{inversionAttempts:'dontInvert'})
  expect(result,'Exported QR must be readable').not.toBeNull()
  return{payload:result!.data,width:pixels.width,height:pixels.height,bytes,mime,name:download.suggestedFilename()}
}
async function download(page:Page){const dialog=page.getByRole('dialog',{name:'QR Code'});await expect(dialog.getByRole('group',{name:'Prévia do QR Code'})).toHaveAttribute('aria-busy','false');const next=page.waitForEvent('download');await dialog.getByRole('button',{name:'Baixar QR Code'}).focus();await page.keyboard.press('Enter');return decode(page,await next)}

test('F13-E01/T01/T03 published page exports real readable PNG/SVG; loading, keyboard, revalidation and private data stay safe',async({page,browser},info)=>{
  const data=fixture('profiles'),origin=runtime.web('profiles.localhost')
  sql(`DELETE FROM profiles WHERE "tenantId"='${data.tenantId}'`);await login(page,'profiles')
  const group=randomUUID(),hidden=randomUUID()
  const content={slug:'pagina-impressa',name:'Página para compartilhar',bio:'Materiais educativos',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Materiais',visible:true},{id:hidden,name:'F13-PRIVATE-SENTINEL',visible:false}],items:[{id:randomUUID(),categoryId:group,type:'URL',label:'Aulas abertas',destination:'https://example.com/aulas-f13',visible:true},{id:randomUUID(),categoryId:hidden,type:'URL',label:'F13-PRIVATE-SENTINEL',destination:'https://example.com/segredo-f13',visible:false}]}
  expect((await mutate(page,'/me/profile',{expectedVersion:0,content},'PATCH')).status).toBe(200)
  await page.goto(origin+'/painel/perfil');await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');expect(await page.getByRole('button',{name:'QR Code',exact:true}).count()).toBe(0)
  await page.getByRole('button',{name:'Publicar',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Perfil publicado.'})).toBeVisible()
  const before=sql(`SELECT row_to_json(p)::text FROM profiles p WHERE "tenantId"='${data.tenantId}'`)
  await page.route('**/bff/v1/me/profile',route=>route.abort(),{times:1})
  await page.getByRole('button',{name:'QR Code',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'}).getByRole('alert')).toContainText('Sem conexão');expect(await page.getByRole('dialog',{name:'QR Code'}).count()).toBe(0)
  await capturePage(page,info.outputPath('qr-profile-offline.png'))
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/_next/static/chunks/*.js',async route=>{await gate;await route.continue()})
  await page.getByRole('region',{name:'Editor do perfil'}).getByRole('button',{name:'Tentar novamente',exact:true}).click();const dialog=page.getByRole('dialog',{name:'QR Code'});await expect(dialog).toHaveCSS('opacity','1');await expect(dialog.getByRole('status',{name:'Gerando QR Code'})).toBeVisible()
  const skeleton=await dialog.getByRole('group',{name:'Prévia do QR Code'}).boundingBox();await expect(dialog.getByRole('button',{name:'Baixar QR Code'})).toBeDisabled();await capturePage(page,info.outputPath('qr-profile-loading.png'),false)
  release();await expect(dialog.getByRole('img',{name:'QR Code da página publicada'})).toBeVisible();await page.unroute('**/_next/static/chunks/*.js')
  const ready=await dialog.getByRole('group',{name:'Prévia do QR Code'}).boundingBox();expect(Math.abs(ready!.height-skeleton!.height)).toBeLessThan(1);expect(Math.abs(ready!.width-skeleton!.width)).toBeLessThan(1)
  expect(await dialog.textContent()).not.toMatch(/F13-PRIVATE|segredo-f13/)
  const png=await download(page);expect(png).toMatchObject({payload:origin+'/p/pagina-impressa',width:512,height:512,mime:'image/png'})
  await selectOption(dialog.getByLabel('Formato do arquivo'),'svg');await selectOption(dialog.getByLabel('Tamanho da imagem'),'1024');const svg=await download(page);expect(svg).toMatchObject({payload:png.payload,width:1024,height:1024,mime:'image/svg+xml'})
  await selectOption(dialog.getByLabel('Formato do arquivo'),'png');await selectOption(dialog.getByLabel('Tamanho da imagem'),'256');expect((await download(page)).width).toBe(256)
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(row=>row.id),JSON.stringify(axe.violations.flatMap(row=>row.nodes.map(node=>node.failureSummary)))).toEqual([])
  const actionBox=await dialog.getByRole('button',{name:'Baixar QR Code'}).boundingBox();expect(actionBox!.y+actionBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  expect(await dialog.evaluate(element=>element.scrollHeight-element.clientHeight)).toBeLessThanOrEqual(1)
  await capturePage(page,info.outputPath('qr-profile-ready.png'),false);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'QR Code',exact:true})).toBeFocused()
  expect(sql(`SELECT row_to_json(p)::text FROM profiles p WHERE "tenantId"='${data.tenantId}'`)).toBe(before)
  const stranger=await browser.newContext(),other=await stranger.newPage()
  try{await other.goto(origin+'/painel/perfil');expect(await other.getByRole('button',{name:'QR Code',exact:true}).count()).toBe(0);expect((await other.request.get(runtime.web('127.0.0.1')+'/bff/v1/me/profile',{headers:{host:'profiles.localhost:'+runtime.webPort}})).status()).toBe(401);await login(other,'profiles',true);await other.goto(origin+'/painel/perfil');await expect(other.getByRole('region',{name:'Editor do perfil'})).toBeVisible();expect(await other.getByRole('button',{name:'QR Code',exact:true}).count()).toBe(0)}finally{await stranger.close()}
  const version=sql(`SELECT version FROM profiles WHERE "tenantId"='${data.tenantId}'`);expect((await mutate(page,'/me/profile/unpublish',{expectedVersion:Number(version)})).status).toBe(200)
  await page.getByRole('button',{name:'QR Code',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'}).getByRole('alert')).toContainText('Publique sua página');expect(await page.getByRole('dialog',{name:'QR Code'}).count()).toBe(0)
})

test('F13-E02/T02/T04 replacing a destination preserves the actual decoded QR, owner isolation and unavailable-handle restrictions',async({page,browser},info)=>{
  const data=fixture('redirects'),origin=runtime.web('redirects.localhost');sql(`DELETE FROM redirect_handles WHERE "tenantId"='${data.tenantId}'`);await login(page,'redirects');await page.goto(origin+'/painel/convites')
  await page.getByRole('button',{name:'Novo link permanente'}).click();await page.getByLabel('Título do convite',{exact:true}).fill('Encontros de leitura');await page.getByLabel('Destino do convite',{exact:true}).fill('https://example.com/f13-primeiro');await page.getByRole('button',{name:'Validar e salvar destino'}).click();await expect(page.getByRole('status').filter({hasText:'Destino validado.'})).toBeVisible()
  const id=sql(`SELECT id FROM redirect_handles WHERE "tenantId"='${data.tenantId}'`)
  await page.getByRole('button',{name:'QR Code',exact:true}).click();const dialog=page.getByRole('dialog',{name:'QR Code'});await expect(dialog.getByRole('img')).toBeVisible();const first=await download(page);expect(first.payload).toBe(origin+'/r/'+id);await expect(dialog).toContainText('Atualizar o destino mantém este QR');await expect(dialog).toContainText('plataforma disponíveis');expect(await dialog.textContent()).not.toContain('f13-primeiro');await capturePage(page,info.outputPath('qr-redirect.png'),false);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'QR Code',exact:true})).toBeFocused()
  await page.getByRole('button',{name:'Editar destino',exact:true}).click();await page.getByLabel('Destino do convite',{exact:true}).fill('https://example.com/f13-segundo');await page.getByRole('button',{name:'Validar e salvar destino'}).click();await expect(page.getByRole('status').filter({hasText:'Destino validado.'})).toBeVisible()
  await page.getByRole('button',{name:'QR Code',exact:true}).click();await expect(dialog.getByRole('img')).toBeVisible();const second=await download(page);expect(second.payload).toBe(first.payload);expect(second.bytes.equals(first.bytes)).toBe(true)
  const redirect=await page.request.get(runtime.web('127.0.0.1')+'/r/'+id,{headers:{host:'redirects.localhost:'+runtime.webPort},maxRedirects:0});expect(redirect.headers().location).toBe('https://example.com/f13-segundo')
  const otherContext=await browser.newContext(),other=await otherContext.newPage();try{await login(other,'redirects',true);const result=await other.evaluate(async id=>{const response=await fetch('/bff/v1/me/redirects/'+id);return{status:response.status,text:await response.text()}},id);expect(result.status).toBe(404);expect(result.text).not.toMatch(/f13-primeiro|f13-segundo|stablePath/)}finally{await otherContext.close()}
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);await dialog.getByRole('button',{name:'Fechar janela'}).focus();await capturePage(page,info.outputPath('qr-320-zoom.png'),false);await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Baixar QR Code'})).toBeFocused();const zoomAction=await dialog.getByRole('button',{name:'Baixar QR Code'}).boundingBox();expect(zoomAction!.y+zoomAction!.height).toBeLessThanOrEqual(844);await capturePage(page,info.outputPath('qr-320-zoom-actions.png'),false);await page.keyboard.press('Escape')
  await page.evaluate(()=>{document.documentElement.style.fontSize=''});await page.getByText('Gerenciar endereço',{exact:true}).click();await page.getByRole('button',{name:'Desativar endereço',exact:true}).click();await page.getByRole('button',{name:'Confirmar desativação'}).click();await expect(page.getByRole('status').filter({hasText:'Endereço desativado.'})).toBeVisible();await expect(page.getByRole('button',{name:'QR Code',exact:true})).toBeDisabled()
})
