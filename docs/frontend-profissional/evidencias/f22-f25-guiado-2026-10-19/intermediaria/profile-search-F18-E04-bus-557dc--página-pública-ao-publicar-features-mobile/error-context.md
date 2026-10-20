# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-search.spec.ts >> F18-E04 busca começa desativada, aparece nas duas prévias e só muda a página pública ao publicar
- Location: e2e\profile-search.spec.ts:68:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByRole('complementary', { name: 'Prévia ao vivo da página' }).locator('input[type="search"]')
Expected: visible
Received: hidden
Timeout:  20000ms

Call log:
  - Expect "toBeVisible" getByRole('complementary', { name: 'Prévia ao vivo da página' }).locator('input[type="search"]') with timeout 20000ms
  - waiting for getByRole('complementary', { name: 'Prévia ao vivo da página' }).locator('input[type="search"]')
    43 × locator resolved to <input value="" id="_r_1a_" type="search" maxlength="100" class="field input_control__Nfi04" placeholder="Buscar links ou grupos"/>
       - unexpected value "hidden"

```

```yaml
- link "Ir para o conteúdo":
  - /url: "#main-content"
- banner:
  - link "Home":
    - /url: /
  - button "Menu"
- main:
  - heading "Dados da página" [level=1]
  - region "Editor do perfil":
    - region "Alterações não publicadas":
      - strong: Tem alterações não publicadas
      - button "Descartar"
      - button "Publicar"
    - tablist "Seções da minha página":
      - tab "Visão geral"
      - tab "Grupos e links"
      - tab "Página" [selected]
      - tab "Aparência"
    - button "Ver prévia"
    - button "Atualizar dados"
    - group
    - form "Editar perfil":
      - tabpanel "Página":
        - group "Dados da página":
          - text: Dados da página
          - group "Página":
            - text: Página Nome da página
            - textbox "Nome da página":
              - /placeholder: "Ex.: Receitas da Ana"
              - text: Materiais da Ana
            - text: Endereço da página
            - textbox "Endereço da página":
              - /placeholder: receitas-da-ana
              - text: pagina-f18
            - text: Retire a página do ar para mudar o endereço. Descrição
            - textbox "Descrição": Cursos e projetos
            - text: Foto do perfil
            - strong: Escolher foto
            - text: Toque para escolher ou arraste uma imagem.
            - button "Foto do perfil"
            - paragraph: PNG, JPG ou WebP até 5 MB. Comprimida automaticamente em WebP. Vai ao ar após publicar.
            - checkbox "Conteúdo para maiores de 18 anos"
            - text: Conteúdo para maiores de 18 anos
            - region "Busca da página":
              - heading "Busca e filtros" [level=2]
              - checkbox "Exibir busca na minha página" [checked]
              - text: Exibir busca na minha página
              - paragraph: Ajude visitantes a encontrar links e filtrar por grupo. Publique para aplicar.
    - region "Formulário da minha página":
      - heading "Receba mensagens pela sua página" [level=2]
      - paragraph: Adicione um formulário para pedidos de contato, orçamento ou lista de interesse.
      - group "Ações da página":
        - link "Ver contatos recebidos":
          - /url: /painel/perfil/contatos
        - button "Configurar formulário"
    - complementary "Prévia ao vivo da página":
      - button "Ver prévia ao vivo"
- contentinfo:
  - text: Tem Link Aqui
  - navigation "Informações do site":
    - link "Termos":
      - /url: /termos
    - link "Privacidade":
      - /url: /privacidade
    - button "Gerenciar cookies"
- alert
```

# Test source

```ts
  1   | import {defaultAppearance} from '../src/features/profiles/profile-appearance'
  2   | import {readFileSync} from 'node:fs'
  3   | import {randomUUID} from 'node:crypto'
  4   | import path from 'node:path'
  5   | import {expect,test,type Page} from '@playwright/test'
  6   | import AxeBuilder from '@axe-core/playwright'
  7   | import {runtime} from './runtime.cjs'
  8   | import {sql} from './db'
  9   | import {selectOption} from './select-control'
  10  | import {capturePage} from './capture-page'
  11  | import {resetProfileScheduling,grantProfileScheduling,setProfileTestClock,clearProfileTestClock} from './profile-schedule-fixture'
  12  | const origin=runtime.web('profiles.localhost'),start='2026-10-18T13:00:05.000Z',end='2026-10-18T13:00:10.000Z'
  13  | const fixture=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')).profiles as {tenantId:string;ownerId:string;owner:string;other:string;password:string}
  14  | async function refuse(page:Page){const button=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await button.count())await button.click()}
  15  | async function login(page:Page,other=false){const f=fixture();await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(other?f.other:f.owner);await page.getByLabel('Senha').fill(f.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();await refuse(page)}
  16  | async function mutate(page:Page,route:string,body:unknown,method='POST'){return page.evaluate(async({route,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const response=await fetch('/bff/v1'+route,{method,headers:{'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(body)});return{status:response.status,body:await response.json()}},{route,body,method})}
  17  | async function seed(page:Page,searchEnabled=true){await login(page);const g=randomUUID(),b=randomUUID(),items=Array.from({length:43},(_,i)=>({id:randomUUID(),categoryId:i<23?g:b,type:'URL' as const,label:i<23?'Áudio '+(i+1):'Projeto '+(i+1),destination:'https://example.com/f18-'+i,visible:true}));const content={appearance:{...defaultAppearance,searchEnabled},slug:'pagina-f18',name:'Materiais da Ana',bio:'Cursos e projetos',avatarAssetId:null,requiresAge:false,primaryItemId:items[42].id,categories:[{id:g,name:'Educação',visible:true},{id:b,name:'Projetos',visible:true}],items:[...items,{id:randomUUID(),categoryId:g,type:'URL' as const,label:'F18-HIDDEN-SECRET',destination:'https://example.com/f18-private-hidden',visible:false},{id:randomUUID(),categoryId:g,type:'URL' as const,label:'F18-FUTURE-SECRET',destination:'https://example.com/f18-private-future',visible:true,schedule:{startsAt:start,endsAt:end,timeZone:'UTC',paused:false}}]};expect((await mutate(page,'/me/profile',{expectedVersion:0,content},'PATCH')).status).toBe(200);expect((await mutate(page,'/me/profile/publish',{expectedVersion:1})).status).toBe(200);return content}
  18  | async function browse(page:Page,q=''){await page.goto(origin+'/p/pagina-f18'+(q?'?'+q:''));await expect(page.getByRole('heading',{name:'Materiais da Ana',exact:true})).toBeVisible();await refuse(page)}
  19  | async function search(page:Page,q:string){const input=page.getByRole('searchbox',{name:'Buscar nesta página'});const response=page.waitForResponse(r=>r.url().includes('/bff/v1/profiles/pagina-f18/items')&&r.request().method()==='GET');if(await input.inputValue()===q)await input.press('Enter');else await input.fill(q);await response;await expect(page.getByRole('article',{name:'Perfil público'})).not.toHaveAttribute('aria-busy','true')}
  20  | async function filters(page:Page){const dialog=page.getByRole('dialog',{name:'Filtros da página',exact:true});if(!await dialog.isVisible())await page.getByRole('button',{name:/^Filtros/}).click();await expect(dialog).toHaveCSS('opacity','1');return dialog}
  21  | async function groupFilter(page:Page,value:string){const dialog=await filters(page);await selectOption(dialog.getByLabel('Grupo de links'),value);await expect(results(page)).not.toHaveAttribute('aria-busy','true');await dialog.getByRole('button',{name:'Concluir',exact:true}).click();await expect(page.locator('dialog').filter({hasText:'Filtros da página'})).not.toBeVisible()}
  22  | async function clearFilters(page:Page){const dialog=await filters(page);await dialog.getByRole('button',{name:'Limpar filtros',exact:true}).click();await expect(results(page)).not.toHaveAttribute('aria-busy','true');await dialog.getByRole('button',{name:'Concluir',exact:true}).click();await expect(page.locator('dialog').filter({hasText:'Filtros da página'})).not.toBeVisible()}
  23  | const results=(page:Page)=>page.getByRole('article',{name:'Perfil público',exact:true})
  24  | async function accessible(page:Page){await expect(page).toHaveTitle(/\S/);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(row=>row.id),JSON.stringify(result.violations)).toEqual([])}
  25  | async function controlContrast(page:Page){
  26  |  for(const name of ['text','group']){
  27  |   if(name==='group')await filters(page)
  28  |   const control=name==='text'?page.getByRole('searchbox',{name:'Buscar nesta página'}):page.getByRole('combobox',{name:'Grupo de links'})
  29  |   const ratio=await control.evaluate(element=>{
  30  |    const style=getComputedStyle(element)
  31  |    const channels=(color:string)=>{const values=(color.match(/[\d.]+/g)??[]).map(Number);return color.startsWith('color(srgb')?values.slice(0,3):values.slice(0,3).map(value=>value/255)}
  32  |    const luminance=(color:string)=>channels(color).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0)
  33  |    const values=[luminance(style.borderTopColor),luminance(style.backgroundColor)].sort((a,b)=>a-b)
  34  |    return (values[1]+.05)/(values[0]+.05)
  35  |   })
  36  |   expect(ratio,'actual rendered field outline must contrast at least 3:1').toBeGreaterThanOrEqual(3)
  37  |  }
  38  |  await page.getByRole('dialog',{name:'Filtros da página'}).getByRole('button',{name:'Concluir',exact:true}).click();await expect(page.locator('dialog').filter({hasText:'Filtros da página'})).not.toBeVisible()
  39  | }
  40  | test.beforeEach(()=>{resetProfileScheduling(fixture().tenantId);grantProfileScheduling(fixture());setProfileTestClock('2026-10-18T13:00:00.000Z')})
  41  | test.afterEach(()=>{clearProfileTestClock();resetProfileScheduling(fixture().tenantId)})
  42  | test('F18-E01/T01/T03/T04 SSR, normalized title/group filters, cursor, URL navigation and the existing private preview use real scoped results',async({page,browser},info)=>{
  43  |  const original=await seed(page);await browse(page,'utm_source=fixture');await controlContrast(page);await expect(results(page).getByRole('link')).toHaveCount(20);await expect(results(page).getByRole('link').first()).toHaveText(/Projeto 43/);await accessible(page);await capturePage(page,info.outputPath('search-public.png'))
  44  |  const html=await page.request.get(runtime.web('127.0.0.1')+'/p/pagina-f18?q=audio&categoryId='+original.categories[0].id,{headers:{host:'profiles.localhost:'+runtime.webPort}});expect(html.status()).toBe(200);const text=await html.text();expect(text).toContain('Áudio 1');expect(text).not.toMatch(/F18-HIDDEN-SECRET|F18-FUTURE-SECRET|f18-private-hidden|f18-private-future/)
  45  |  await groupFilter(page,original.categories[0].id);await search(page,'EDUCAÇÃO áudio');await expect(results(page).getByRole('link')).toHaveCount(20);expect(new URL(page.url()).searchParams.get('utm_source')).toBe('fixture');await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/\/p\/pagina-f18$/);await capturePage(page,info.outputPath('search-filtered.png'))
  46  |  await page.reload();await expect(page.getByRole('searchbox',{name:'Buscar nesta página'})).toHaveValue('EDUCAÇÃO áudio');{const modal=await filters(page);await expect(modal.getByRole('combobox',{name:'Grupo de links'})).toContainText('Educação');await modal.getByRole('button',{name:'Concluir',exact:true}).click()}await expect(results(page).getByRole('link')).toHaveCount(20);expect(new URL(page.url()).searchParams.get('utm_source')).toBe('fixture')
  47  |  await page.getByRole('button',{name:'Próximos links'}).click();await expect(results(page).getByRole('link')).toHaveCount(3);await expect(results(page).getByRole('link',{name:'Áudio 21',exact:false})).toBeFocused();expect(new URL(page.url()).searchParams.get('cursor')).toBeTruthy();await page.getByRole('button',{name:'Voltar ao início'}).click();await expect(results(page).getByRole('link')).toHaveCount(20)
  48  |  await groupFilter(page,original.categories[1].id);await search(page,'educacao');await expect(page.getByText('Nenhum link encontrado.',{exact:true})).toBeVisible();await capturePage(page,info.outputPath('search-empty.png'));await clearFilters(page);await expect(results(page).getByRole('link')).toHaveCount(20);expect(new URL(page.url()).searchParams.get('q')).toBeNull()
  49  |  const changed={...original,items:original.items.map((item,index)=>index?item:{...item,label:'Novo curso publicado'})};expect((await mutate(page,'/me/profile',{expectedVersion:1,content:changed},'PATCH')).status).toBe(200);await search(page,'Novo curso');await expect(page.getByText('Nenhum link encontrado.',{exact:true})).toBeVisible();expect((await mutate(page,'/me/profile/publish',{expectedVersion:2})).status).toBe(200);await search(page,'Novo curso');await expect(results(page).getByRole('link',{name:/Novo curso publicado/})).toBeVisible()
  50  |  const draft={...changed,items:changed.items.map((item,index)=>index?item:{...item,label:'Somente rascunho'})};expect((await mutate(page,'/me/profile',{expectedVersion:2,content:draft},'PATCH')).status).toBe(200);await page.goto(origin+'/painel/perfil/previa');await expect(page.getByRole('region',{name:'Modo de prévia'})).toBeVisible();await page.getByRole('searchbox',{name:'Buscar nesta página'}).fill('rascunho');await page.getByRole('searchbox',{name:'Buscar nesta página'}).press('Enter');await expect(results(page).getByRole('link',{name:/Somente rascunho/})).toBeVisible();await accessible(page);await capturePage(page,info.outputPath('search-private-preview.png'))
  51  |  const guest=await browser.newContext(),visitor=await guest.newPage();try{await visitor.goto(origin+'/p/pagina-f18?q=rascunho');await expect(visitor.getByText('Nenhum link encontrado.',{exact:true})).toBeVisible();expect(await visitor.content()).not.toContain('Somente rascunho')}finally{await guest.close()}
  52  | })
  53  | test('F18-E02/T01/T02 server boundaries, foreign tenant, owner-only preview, age and suspension guard both HTML and search metadata',async({page,browser},info)=>{
  54  |  const original=await seed(page);await page.clock.install({time:new Date('2040-01-01Z')});await browse(page,'q=F18-FUTURE');await expect(page.getByText('Nenhum link encontrado.',{exact:true})).toBeVisible();expect(await page.content()).not.toContain('f18-private-future');setProfileTestClock(start);await page.clock.runFor(4100);await expect(results(page).getByRole('link',{name:/F18-FUTURE-SECRET/})).toBeVisible();await capturePage(page,info.outputPath('search-window-active.png'));setProfileTestClock(end);await page.clock.runFor(5000);await expect(results(page).getByRole('link',{name:/F18-FUTURE-SECRET/})).toHaveCount(0);await expect(page.getByText('Nenhum link encontrado.',{exact:true})).toBeVisible();expect(await page.evaluate(async()=>{const r=await fetch('/bff/v1/profiles/pagina-f18/items?q=FUTURE');return JSON.stringify(await r.json())})).not.toContain('f18-private-future')
  55  |  const context=await browser.newContext(),guest=await context.newPage();try{await guest.goto(origin);expect(await guest.evaluate(async()=>(await fetch('/bff/v1/me/profile/preview/items')).status)).toBe(401);await login(guest,true);expect(await guest.evaluate(async()=>(await fetch('/bff/v1/me/profile/preview/items?q=audio')).status)).toBe(404)}finally{await context.close()}
  56  |  const otherHost=await page.request.get(runtime.web('127.0.0.1')+'/bff/v1/profiles/pagina-f18/items?q=audio',{headers:{host:'tenant-b.localhost:'+runtime.webPort}});expect(otherHost.status()).toBe(404);expect(await otherHost.text()).not.toContain('Áudio')
  57  |  expect((await mutate(page,'/me/profile',{expectedVersion:1,content:{...original,requiresAge:true}},'PATCH')).status).toBe(200);expect((await mutate(page,'/me/profile/publish',{expectedVersion:2})).status).toBe(200);await page.goto(origin+'/p/pagina-f18?q=audio');await expect(page.getByRole('button',{name:'Tenho 18 anos ou mais'})).toBeVisible();expect(await page.evaluate(async()=>{const r=await fetch('/bff/v1/profiles/pagina-f18/items?q=audio');return r.json()})).toEqual({restricted:true});expect(await page.content()).not.toContain('f18-private-hidden');await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click();await expect(page.getByRole('searchbox',{name:'Buscar nesta página'})).toBeVisible();await expect(results(page).getByRole('link')).toHaveCount(20);await capturePage(page,info.outputPath('search-age-confirmed.png'))
  58  |  sql(`UPDATE users SET status='BANNED' WHERE id='${fixture().ownerId}'`);try{expect(await page.evaluate(async()=>(await fetch('/bff/v1/profiles/pagina-f18/items?q=audio')).status)).toBe(404)}finally{sql(`UPDATE users SET status='ACTIVE' WHERE id='${fixture().ownerId}'`)}
  59  | })
  60  | test('F18-E03 pending/error geometry, retry, stale-cursor recovery, browser back, invalid URL and 320px keyboard flow remain usable',async({page},info)=>{
  61  |  const original=await seed(page);await browse(page);const first=results(page).getByRole('link').first(),before=await first.boundingBox();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});await page.route('**/bff/v1/profiles/pagina-f18/items?*',async route=>{await gate;await route.abort('failed')});await page.getByRole('searchbox',{name:'Buscar nesta página'}).fill('Áudio 1');await page.getByRole('searchbox',{name:'Buscar nesta página'}).press('Enter');await expect(results(page)).toHaveAttribute('aria-busy','true');await expect(results(page).getByRole('link')).toHaveCount(0);const box=await results(page).locator('[data-pending-link]').first().boundingBox();expect(box?.height).toBe(before?.height);expect(box?.width).toBe(before?.width);await capturePage(page,info.outputPath('search-pending.png'));release();await expect(page.getByRole('main').getByRole('alert')).toContainText('Sem conexão');await capturePage(page,info.outputPath('search-error.png'));await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Tentar de novo'}).click();await expect(results(page).getByRole('link',{name:/Áudio 1/}).first()).toBeVisible();await expect(page.getByRole('searchbox',{name:'Buscar nesta página'})).toHaveValue('Áudio 1')
  62  |  await clearFilters(page);await expect(results(page).getByRole('link')).toHaveCount(20);await page.getByRole('button',{name:'Próximos links'}).click();await expect(page.getByRole('button',{name:'Voltar ao início'})).toBeVisible();expect((await mutate(page,'/me/profile',{expectedVersion:1,content:{...original,bio:'Publicação atualizada'}},'PATCH')).status).toBe(200);expect((await mutate(page,'/me/profile/publish',{expectedVersion:2})).status).toBe(200);await page.getByRole('button',{name:'Próximos links'}).click();await expect(page.getByText('Os resultados mudaram. Mostrando a primeira página.',{exact:true})).toBeVisible();await expect(results(page).getByRole('link').first()).toHaveText(/Projeto 43/);expect(new URL(page.url()).searchParams.get('cursor')).toBeNull();await capturePage(page,info.outputPath('search-cursor-restarted.png'))
  63  |  await search(page,'audio');await page.goBack();await expect(page.getByRole('searchbox',{name:'Buscar nesta página'})).toHaveValue('');await expect(results(page).getByRole('link').first()).toHaveText(/Projeto 43/);await page.goto(origin+'/p/pagina-f18?cursor=forged');await expect(page.getByRole('main').getByRole('alert')).toBeVisible();await page.getByRole('link',{name:'Limpar busca'}).click();await expect(results(page).getByRole('link')).toHaveCount(20)
  64  |  await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});await search(page,'não existe');await accessible(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await filters(page);const clear=page.getByRole('button',{name:'Limpar filtros'});await clear.focus();await expect(clear).toBeFocused();await capturePage(page,info.outputPath('search-zoom.png'),false);await page.keyboard.press('Enter');await expect(results(page).getByRole('link')).toHaveCount(20)
  65  | })
  66  | 
  67  | 
  68  | test('F18-E04 busca começa desativada, aparece nas duas prévias e só muda a página pública ao publicar',async({page,browser},info)=>{
  69  |  const structureErrors:string[]=[];page.on('console',message=>{if(message.type()==='error'&&/hydration|cannot be a descendant|cannot contain/i.test(message.text()))structureErrors.push(message.text())})
  70  |  await seed(page,false);await browse(page,'q=inexistente')
  71  |  await expect(page.getByRole('searchbox')).toHaveCount(0);await expect(page.getByRole('button',{name:'Filtros',exact:true})).toHaveCount(0);await expect(results(page).getByRole('link')).toHaveCount(20)
  72  |  await page.getByRole('button',{name:'Próximos links',exact:true}).click();await expect(results(page).getByRole('link')).toHaveCount(20)
  73  |  await page.goto(origin+'/painel/perfil/dados')
  74  |  const enabled=page.getByRole('checkbox',{name:'Exibir busca na minha página',exact:true}),simulation=page.getByRole('complementary',{name:'Prévia ao vivo da página'})
  75  |  const toggle=simulation.getByRole('button',{name:'Ver prévia ao vivo'});if(await toggle.isVisible())await toggle.click();
  76  |  await expect(enabled).not.toBeChecked();await expect(simulation.locator('input[type="search"]')).toHaveCount(0)
> 77  |  await enabled.check();await expect(simulation.locator('input[type="search"]')).toBeVisible();await expect(page.getByRole('region',{name:'Editor do perfil',exact:true})).toHaveAttribute('data-save-state','saved')
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  78  |  await page.goto(origin+'/painel/perfil/aparencia');await expect(enabled).toHaveCount(0);await page.getByRole('button',{name:'Oceano',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil',exact:true})).toHaveAttribute('data-save-state','saved');await page.goto(origin+'/painel/perfil/dados');await expect(enabled).toBeChecked()
  79  |  await expect(page.getByRole('region',{name:'Editor do perfil',exact:true})).toHaveAttribute('data-save-state','saved')
  80  |  await capturePage(page,info.outputPath('search-option-enabled.png'))
  81  |  const guest=await browser.newContext({viewport:page.viewportSize(),isMobile:info.project.name.includes('mobile'),hasTouch:info.project.name.includes('mobile')}),visitor=await guest.newPage()
  82  |  try{
  83  |   await visitor.goto(origin+'/p/pagina-f18');await refuse(visitor);await expect(visitor.getByRole('searchbox')).toHaveCount(0)
  84  |   await page.getByRole('button',{name:'Ver prévia',exact:true}).click();await expect(page.getByRole('region',{name:'Modo de prévia'})).toBeVisible();await expect(page.getByRole('searchbox',{name:'Buscar nesta página'})).toBeVisible()
  85  |   await expect(page.getByRole('button',{name:'Buscar',exact:true})).toHaveCount(0)
  86  |   await page.getByRole('searchbox',{name:'Buscar nesta página'}).fill('Áudio');await expect.poll(async()=>page.getByRole('article',{name:'Perfil público',exact:true}).getAttribute('aria-busy')).not.toBe('true')
  87  |   await expect(results(page).getByRole('link')).toHaveCount(20)
  88  |   await capturePage(page,info.outputPath('search-private-automatic.png'))
  89  |   await page.getByRole('button',{name:'Limpar texto da busca',exact:true}).click();await expect(page.getByRole('searchbox')).toHaveValue('');await expect(page.getByRole('searchbox')).toBeFocused()
  90  |   const dialog=await filters(page);await selectOption(dialog.getByLabel('Grupo de links'),{label:'Projetos'});await expect(results(page).getByRole('link')).toHaveCount(20)
  91  |   await accessible(page);await capturePage(page,info.outputPath('search-filter-modal.png'),false)
  92  |   await dialog.getByRole('button',{name:'Limpar filtros',exact:true}).click();await expect(dialog.getByRole('combobox',{name:'Grupo de links'})).toContainText('Todos os grupos')
  93  |   await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Filtros',exact:true})).toBeFocused()
  94  |   await page.getByRole('link',{name:'Voltar à edição',exact:true}).click();await page.getByRole('button',{name:'Publicar',exact:true}).click();await expect(page.getByText('Perfil publicado.',{exact:true})).toBeVisible()
  95  |   await visitor.reload();await expect(visitor.getByRole('searchbox')).toBeVisible();await capturePage(visitor,info.outputPath('search-public-compact.png'))
  96  |   await page.goto(origin+'/painel/perfil/dados');await enabled.uncheck();await expect(simulation.locator('input[type="search"]')).toHaveCount(0)
  97  |   await page.getByRole('button',{name:'Ver prévia',exact:true}).click();await expect(page.getByRole('region',{name:'Modo de prévia'})).toBeVisible();await expect(page.getByRole('searchbox')).toHaveCount(0)
  98  |   await visitor.reload();await expect(visitor.getByRole('searchbox')).toBeVisible()
  99  |   await page.getByRole('link',{name:'Voltar à edição',exact:true}).click();await page.getByRole('button',{name:'Publicar',exact:true}).click();await expect(page.getByText('Perfil publicado.',{exact:true})).toBeVisible()
  100 |   await visitor.reload();await expect(visitor.getByRole('searchbox')).toHaveCount(0);expect(structureErrors).toEqual([])
  101 |  }finally{await guest.close()}
  102 | })
  103 | 
```