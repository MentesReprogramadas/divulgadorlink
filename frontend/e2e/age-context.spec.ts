import {readFileSync} from 'node:fs'
import path from 'node:path'
import {expect,test} from '@playwright/test'
import {runtime} from './runtime.cjs'
import {sql} from './db'

const origin=runtime.web('age-context.localhost')
const adultName='Comunidade restrita de teste'
const freeName='Comunidade livre de teste'
const mediaPath='/bff/v1/links/age-context-adult/media/age-context-image'

test.beforeAll(()=>{
  const bytes=readFileSync(path.join(__dirname,'../../backend/src/domain/profiles/avatar.fixture.png')).toString('hex')
  sql(`INSERT INTO tenants(id,host,name,"updatedAt") VALUES('age-context','age-context.localhost','Catálogo de teste',NOW()) ON CONFLICT(id) DO NOTHING;
    INSERT INTO configs(id,"tenantId",key,value,"updatedAt") VALUES
      ('age-context-threshold','age-context','SEARCH_RELEVANCE_THRESHOLD','0.35',NOW()),
      ('age-context-text-weight','age-context','SEARCH_TEXT_WEIGHT','0.4',NOW()),
      ('age-context-semantic-weight','age-context','SEARCH_SEMANTIC_WEIGHT','0.6',NOW()),
      ('age-context-impressions','age-context','SHOW_IMPRESSIONS','1',NOW()) ON CONFLICT("tenantId",key) DO NOTHING;
    INSERT INTO networks(id,"tenantId",name,slug,"knownHosts","isPublicFacet","requiresAge","updatedAt") VALUES
      ('age-context-telegram','age-context','Telegram','telegram',ARRAY['t.me'],true,false,NOW()),
      ('age-context-whatsapp','age-context','WhatsApp','whatsapp',ARRAY['chat.whatsapp.com'],true,false,NOW()),
      ('age-context-restricted','age-context','Rede restrita','restricted',ARRAY['example.com'],true,true,NOW()) ON CONFLICT(id) DO NOTHING;
    INSERT INTO niches(id,"tenantId",name,slug,"requiresAge","isPublicFacet","updatedAt") VALUES
      ('age-context-games','age-context','Jogos','jogos',false,true,NOW()),
      ('age-context-shopping','age-context','Oportunidades para casa','oportunidades-casa',false,true,NOW()),
      ('age-context-adults','age-context','Adulto','adulto',true,true,NOW()),
      ('age-context-tech','age-context','Tecnologia & Internet','tecnologia-internet',false,true,NOW()) ON CONFLICT(id) DO NOTHING;
    INSERT INTO links(id,"tenantId","canonicalUrl",name,description,"networkId","nicheId",status,"languageTag","updatedAt") VALUES
      ('age-context-free','age-context','https://t.me/age-free','${freeName}','Conversas da comunidade.','age-context-telegram','age-context-games','PUBLISHED','pt',NOW()),
      ('age-context-deals','age-context','https://chat.whatsapp.com/age-deals','Comunidade de oportunidades','Compras da casa.','age-context-whatsapp','age-context-shopping','PUBLISHED','pt',NOW()),
      ('age-context-tech-other','age-context','https://t.me/age-tech-other','Outro assunto de tecnologia','Redes e infraestrutura.','age-context-telegram','age-context-tech','PUBLISHED','pt',NOW()),
      ('age-context-free-en','age-context','https://t.me/age-free-en','Comunidade em inglês','Conversas em inglês.','age-context-telegram','age-context-games','PUBLISHED','en',NOW()),
      ('age-context-adult','age-context','https://t.me/age-adult','${adultName}','Somente para adultos.','age-context-telegram','age-context-adults','PUBLISHED','pt',NOW()),
      ('age-context-other','age-context','https://example.com/adult','Comunidade de outra rede','Somente para adultos.','age-context-restricted','age-context-adults','PUBLISHED','en',NOW()),
      ('age-context-network','age-context','https://example.com/network','Link de rede restrita','Comunidade da rede.','age-context-restricted','age-context-games','PUBLISHED','en',NOW()),
      ('age-context-programming','age-context','https://t.me/age-tech','Comunidade de programação','Tecnologia e estudos.','age-context-telegram','age-context-tech','PUBLISHED','pt',NOW()) ON CONFLICT(id) DO NOTHING;
    INSERT INTO link_media_assets(id,"tenantId","linkId",kind,status,bytes,alt,revision) VALUES('age-context-image','age-context','age-context-adult','IMAGE','APPROVED',decode('${bytes}','hex'),'Imagem neutra de teste',1) ON CONFLICT(id) DO NOTHING;`)
  const vector=Array.from({length:1536},(_,index)=>index===0?1:0)
  sql(`UPDATE links SET embedding='[${vector.join(',')}]'::vector,"embeddingState"='READY' WHERE id='age-context-programming'`)
  sql(`UPDATE links SET embedding='[${vector.map(value=>-value).join(',')}]'::vector,"embeddingState"='READY' WHERE id='age-context-tech-other'`)
})

test.beforeEach(async({page})=>{
  await page.context().addCookies([{name:'tla_consent',value:'denied',domain:'age-context.localhost',path:'/'}])
  await page.emulateMedia({reducedMotion:'reduce'})
})

test('IA interpreta frase livre em uma categoria nova e combina com a rede no autocomplete e nos resultados',async({page},info)=>{
  await page.goto(origin+'/busca')
  await page.getByRole('combobox',{name:'Busca',exact:true}).fill('quero garimpar precinhos para minha casa nos grupos do zap')
  await expect(page.getByRole('option',{name:/Comunidade de oportunidades/})).toBeVisible()
  await expect(page.getByRole('group',{name:'Nichos e redes'}).getByRole('option',{name:/Oportunidades para casa/})).toBeVisible()
  await page.getByRole('link',{name:'Ver todos os resultados'}).click()
  await expect(page.getByRole('link',{name:'Comunidade de oportunidades',exact:true})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Nichos e redes relacionados'}).getByRole('link',{name:'Explorar WhatsApp'})).toBeVisible()
  await expect(page.getByRole('link',{name:freeName,exact:true})).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({path:info.outputPath('ai-context-shopping.png'),fullPage:true,animations:'disabled'})
})

test('IA mantém assunto específico dentro do nicho e da rede',async({page})=>{
  await page.goto(origin+'/busca?q='+encodeURIComponent('quero aprender funções puras no mensageiro azul'))
  await expect(page.getByRole('link',{name:'Comunidade de programação',exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:'Outro assunto de tecnologia',exact:true})).toHaveCount(0)
})

test('contexto adulto interpretado pela IA continua pedindo maioridade',async({page})=>{
  await page.goto(origin+'/busca?q='+encodeURIComponent('busco entretenimento reservado para maiores no mensageiro azul'))
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.content()).not.toContain(adultName)
  await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click()
  await expect(page.getByRole('link',{name:adultName,exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:'Comunidade de outra rede',exact:true})).toHaveCount(0)
})

test('rede mista confirma maioridade na própria tela, recupera falha e só depois revela link e imagem',async({page},info)=>{
  const response=await page.goto(origin+'/rede/telegram')
  expect(await response!.text()).not.toContain(adultName)
  const before=await page.request.get(origin+'/bff/v1/networks/telegram')
  expect((await before.json()).ageRequired).toBe(true)
  expect(await before.text()).not.toContain(adultName)
  expect((await page.request.get(origin+mediaPath)).status()).toBe(404)
  const dialog=page.getByRole('dialog',{name:'Conteúdo para maiores de 18 anos'})
  const yes=dialog.getByRole('button',{name:'Tenho 18 anos ou mais'})
  await expect(yes).toBeFocused()
  await page.route('**/bff/v1/age',route=>route.abort())
  await yes.click()
  await expect(dialog.getByRole('alert')).toHaveText('Não foi possível confirmar sua idade. Tente novamente.')
  await expect(yes).toBeEnabled()
  await page.unroute('**/bff/v1/age')
  await yes.focus();await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page).toHaveURL(origin+'/rede/telegram')
  await expect(page.getByRole('link',{name:adultName,exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:freeName,exact:true})).toBeVisible()
  expect((await page.request.get(origin+mediaPath)).status()).toBe(200)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath('mixed-network-approved.png'),fullPage:true,animations:'disabled'})
})

test('recusa mantém os links livres e não volta a perguntar na mesma sessão',async({page})=>{
  await page.goto(origin+'/rede/telegram')
  await page.getByRole('button',{name:'Não tenho',exact:true}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(origin+'/rede/telegram')
  await expect(page.getByRole('link',{name:freeName,exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:adultName,exact:true})).toHaveCount(0)
  expect((await page.request.get(origin+mediaPath)).status()).toBe(404)
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('link',{name:freeName,exact:true})).toBeVisible()
})

test('nicho livre também confirma quando contém link de uma rede restrita',async({page})=>{
  const response=await page.goto(origin+'/nicho/jogos')
  expect(await response!.text()).not.toContain('Link de rede restrita')
  await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Link de rede restrita',exact:true})).toBeVisible()
})

test('só pergunta se o conteúdo restrito fizer parte dos filtros atuais',async({page})=>{
  await page.goto(origin+'/rede/telegram?languageTag=en')
  await expect(page.getByRole('link',{name:'Comunidade em inglês',exact:true})).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('link',{name:adultName,exact:true})).toHaveCount(0)
})

test('aceite numa listagem paginada descarta o cursor da idade anterior e mantém filtros',async({page})=>{
  const first=await page.request.get(origin+'/bff/v1/networks/telegram?limit=1&languageTag=pt')
  const cursor=(await first.json()).nextCursor
  expect(cursor).toBeTruthy()
  await page.goto(origin+'/rede/telegram?limit=1&languageTag=pt&cursor='+encodeURIComponent(cursor))
  await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(origin+'/rede/telegram?limit=1&languageTag=pt')
  await expect(page.getByRole('heading',{name:'Telegram',level:1})).toBeVisible()
  const open=await page.request.get(origin+'/bff/v1/networks/telegram?languageTag=pt')
  expect(open.status()).toBe(200)
  expect((await open.json()).organic.some((row:{id:string})=>row.id==='age-context-adult')).toBe(true)
})

for(const term of ['putaria','corno','pornô'])test(`busca contextual de ${term} oferece a categoria e revela links somente após aceite`,async({page},info)=>{
  await page.goto(origin+'/busca?q='+encodeURIComponent(term))
  const dialog=page.getByRole('dialog',{name:'Conteúdo para maiores de 18 anos'})
  await expect(dialog).toBeVisible()
  expect(await page.content()).not.toContain(adultName)
  await dialog.getByRole('button',{name:'Tenho 18 anos ou mais'}).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('link',{name:adultName,exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:freeName,exact:true})).toHaveCount(0)
  const categories=page.getByRole('navigation',{name:'Nichos e redes relacionados'})
  await expect(categories.getByRole('link',{name:'Explorar Adulto · +18'})).toHaveAttribute('href','/nicho/adulto')
  await expect(categories.getByRole('link',{name:'Explorar Telegram'})).toHaveAttribute('href','/rede/telegram')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath('adult-search-approved.png'),fullPage:true,animations:'disabled'})
})

test('autocomplete e busca reconhecem contexto comum e mantêm tema mais rede',async({page},info)=>{
  await page.goto(origin+'/busca')
  const search=page.getByRole('combobox',{name:'Busca',exact:true})
  await search.fill('programação')
  await expect(page.getByRole('group',{name:'Nichos e redes'}).getByRole('option',{name:/Tecnologia & Internet/})).toBeVisible()
  await expect(page.getByRole('option',{name:/Comunidade de programação/})).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link',{name:'Ver todos os resultados'}).click()
  await expect(page.getByRole('link',{name:'Comunidade de programação',exact:true})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Nichos e redes relacionados'}).getByRole('link',{name:'Explorar Tecnologia & Internet'})).toBeVisible()
  await search.fill('corno telegram')
  await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('option',{name:/Comunidade restrita de teste/})).toBeVisible()
  await expect(page.getByRole('option',{name:/Comunidade de outra rede/})).toHaveCount(0)
  await page.getByRole('link',{name:'Ver todos os resultados'}).click()
  await expect(page.getByRole('link',{name:adultName,exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:'Comunidade de outra rede',exact:true})).toHaveCount(0)
  await page.evaluate(()=>{document.body.style.zoom='1.25'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath('context-search-zoom.png'),fullPage:true,animations:'disabled'})
})
