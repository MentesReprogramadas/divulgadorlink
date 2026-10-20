# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-channels.spec.ts >> F37-E07 compact link tabs, inline invitation refresh and quick visibility and pause actions persist
- Location: e2e\profile-channels.spec.ts:73:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('dialog', { name: 'Adicionar link', exact: true }).getByRole('tablist', { name: 'Tipo de conteúdo' }).getByRole('tab')
Timeout: 20000ms
- Expected  - 0
+ Received  + 1

  Array [
    "Link",
+   "Evento",
    "Convite",
  ]

Call log:
  - Expect "toHaveText" getByRole('dialog', { name: 'Adicionar link', exact: true }).getByRole('tablist', { name: 'Tipo de conteúdo' }).getByRole('tab') with timeout 20000ms
  - waiting for getByRole('dialog', { name: 'Adicionar link', exact: true }).getByRole('tablist', { name: 'Tipo de conteúdo' }).getByRole('tab')
    43 × locator resolved to 3 elements

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - link "Ir para o conteúdo" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - link "Home" [ref=f2e5] [cursor=pointer]:
        - /url: /
      - button "Menu" [ref=f2e7] [cursor=pointer]
  - main [ref=f2e11]:
    - generic [ref=f2e12]:
      - heading "Minha página de links" [level=1] [ref=f2e15]
      - region "Editor do perfil" [ref=f2e17]:
        - region "Alterações não publicadas" [ref=f2e18]:
          - strong [ref=f2e19]: Tem alterações não publicadas
          - generic [ref=f2e20]:
            - generic "Disponível depois da primeira publicação" [ref=f2e21]:
              - button "Descartar" [disabled] [ref=f2e22]
            - button "Publicar" [ref=f2e26] [cursor=pointer]
        - generic "Navegação e ações da minha página" [ref=f2e30]:
          - tablist "Seções da minha página" [ref=f2e33]:
            - tab "Visão geral" [ref=f2e34] [cursor=pointer]
            - tab "Grupos e links" [selected] [ref=f2e35] [cursor=pointer]:
              - generic [aria-hidden] [ref=f2e36]: Links
            - tab "Página" [ref=f2e37] [cursor=pointer]
            - tab "Aparência" [ref=f2e38] [cursor=pointer]
          - generic [ref=f2e39]:
            - button "Importar links" [ref=f2e40] [cursor=pointer]
            - generic [ref=f2e44]:
              - button "Ver prévia" [ref=f2e45] [cursor=pointer]:
                - generic [ref=f2e46]: Prévia
              - button "Atualizar dados" [ref=f2e49] [cursor=pointer]
              - group [ref=f2e53]:
                - generic "Mais opções da página" [ref=f2e54] [cursor=pointer]
        - generic [ref=f2e59]:
          - form "Editar perfil" [ref=f2e61]:
            - tabpanel "Grupos e links" [ref=f2e62]:
              - group "Dados da página" [ref=f2e63]:
                - region "Grupos e links da página" [ref=f2e65]:
                  - generic [ref=f2e66]:
                    - button "Voltar aos grupos" [ref=f2e67] [cursor=pointer]
                    - generic [ref=f2e71]:
                      - heading "Links e convites" [level=2] [ref=f2e72]
                      - generic [ref=f2e73]: 0 links
                  - group "Ações do grupo" [ref=f2e75]:
                    - button "Editar grupo" [ref=f2e76] [cursor=pointer]
                    - button "Remover grupo" [ref=f2e80] [cursor=pointer]
                    - button "Adicionar link" [ref=f2e84] [cursor=pointer]
                    - button "Ocultar grupo" [ref=f2e88] [cursor=pointer]
                  - generic [ref=f2e90]:
                    - heading "Adicione o primeiro link" [level=3] [ref=f2e91]
                    - paragraph [ref=f2e92]: Seu grupo está criado. Agora adicione os links deste grupo.
          - complementary "Prévia ao vivo da página" [ref=f2e93]:
            - button "Ver prévia ao vivo" [ref=f2e94] [cursor=pointer]
  - contentinfo [ref=f2e99]:
    - generic [ref=f2e100]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e101]:
      - link "Termos" [ref=f2e102] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e103] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e104] [cursor=pointer]
  - alert [ref=f2e105]
  - dialog [ref=f2e106]:
    - generic [ref=f2e107]:
      - banner [ref=f2e108]:
        - heading "Adicionar link" [level=2] [ref=f2e109]
        - button "Fechar janela" [active] [ref=f2e110] [cursor=pointer]
      - generic [ref=f2e114]:
        - tablist "Tipo de conteúdo" [ref=f2e116]:
          - tab "Link" [selected] [ref=f2e117] [cursor=pointer]
          - tab "Evento" [ref=f2e118] [cursor=pointer]
          - tab "Convite" [ref=f2e119] [cursor=pointer]
        - tabpanel "Link" [ref=f2e120]:
          - generic [ref=f2e121]:
            - generic "Alteração não publicada" [ref=f2e122]:
              - generic [ref=f2e123]:
                - generic [ref=f2e124]:
                  - generic [ref=f2e125]: Título do link
                  - generic [aria-hidden] [ref=f2e126]: "*"
                - textbox "Título do link" [ref=f2e127]
            - generic "Alteração não publicada" [ref=f2e128]:
              - tablist "Tipo de link" [ref=f2e130]:
                - tab "Novo" [selected] [ref=f2e131] [cursor=pointer]
                - tab "Meus links" [ref=f2e132] [cursor=pointer]
            - tabpanel "Novo" [ref=f2e133]:
              - generic [ref=f2e134]:
                - generic [ref=f2e135]:
                  - generic [ref=f2e136]: Link de acesso
                  - generic [aria-hidden] [ref=f2e137]: "*"
                - textbox "Link de acesso" [ref=f2e138]
                - generic [ref=f2e139]: Cole o endereço completo, começando com https://.
            - generic [ref=f2e140]:
              - button "Cancelar" [ref=f2e141] [cursor=pointer]
              - button "Concluir link" [ref=f2e143] [cursor=pointer]
```

# Test source

```ts
  1  | import {readFileSync} from 'node:fs'
  2  | import path from 'node:path'
  3  | import {randomUUID} from 'node:crypto'
  4  | import {expect,test,type Page} from '@playwright/test'
  5  | import AxeBuilder from '@axe-core/playwright'
  6  | import {runtime} from './runtime.cjs'
  7  | import {sql} from './db'
  8  | import {capturePage} from './capture-page'
  9  | import {selectOption} from './select-control'
  10 | const origin=runtime.web('channels.localhost')
  11 | const fixture=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')).channels as {tenantId:string;ownerId:string;owner:string;other:string;password:string}
  12 | async function refuse(page:Page){const button=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await button.count())await button.click()}
  13 | async function login(page:Page,other=false){const f=fixture();await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(other?f.other:f.owner);await page.getByLabel('Senha').fill(f.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();await refuse(page)}
  14 | async function mutate(page:Page,route:string,body:unknown,method='POST'){return page.evaluate(async({route,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const r=await fetch('/bff/v1/'+route,{method,headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify(body)});return{status:r.status,body:await r.json()}},{route,body,method})}
  15 | async function read(page:Page,route='me/profile/channel-groups'){return page.evaluate(async route=>{const r=await fetch('/bff/v1/'+route);return{status:r.status,body:await r.json()}},route)}
  16 | async function prepare(page:Page,withSources=true){await login(page);const content={slug:'pagina-f37',name:'Comunidade da Ana',bio:'Escolha onde participar',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]};expect((await mutate(page,'me/profile',{expectedVersion:0,content},'PATCH')).status).toBe(200);const sources:Array<{id:string;version:number;destinationRevision:{id:string;status:string};label:string;destinationUrl:string}>=[];if(!withSources)return sources;for(const [label,destinationUrl] of [['Telegram oficial','https://t.me/comunidade-f37'],['WhatsApp oficial','https://chat.whatsapp.com/comunidade-f37'],['Site oficial','https://example.com/comunidade-f37']]){const r=await mutate(page,'me/redirects',{label,destinationUrl,requiresAge:false,expectedRevision:0,requestKey:randomUUID()});expect(r.status,JSON.stringify(r.body)).toBe(200);expect(r.body.destinationRevision.status).toBe('APPROVED');sources.push({...r.body,label,destinationUrl})}return sources}
  17 | async function list(page:Page){await page.goto(origin+'/painel/perfil/canais');await expect(page.getByLabel('Canais da minha página')).not.toHaveAttribute('aria-busy','true')}
  18 | async function publish(page:Page){await page.goto(origin+'/painel/perfil/checklist');await page.getByRole('button',{name:'Publicar página',exact:true}).click();await expect(page.getByText('Publicação concluída.',{exact:true})).toBeVisible()}
  19 | async function accessible(page:Page){const dialog=page.locator('dialog[open]');if(await dialog.count())await expect(dialog).toHaveCSS('opacity','1');const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(row=>row.id),JSON.stringify(result.violations.flatMap(row=>row.nodes.map(node=>node.failureSummary)))).toEqual([])}
  20 | async function seededGroup(page:Page,hidden=false){const sources=await prepare(page),networks=(await read(page)).body.networks,telegram=networks.find((row:{slug:string})=>row.slug==='telegram');const group={id:randomUUID(),name:'Onde você quer participar?',visible:true,channels:[{id:randomUUID(),label:'Abrir site',networkId:null,destinationRevisionId:sources[2].destinationRevision.id,paused:false},{id:randomUUID(),label:hidden?'F37-HIDDEN-SECRET':'Entrar no Telegram',networkId:telegram.id,destinationRevisionId:sources[0].destinationRevision.id,paused:hidden}]};const {id,...body}=group;expect((await mutate(page,'me/profile/channel-groups/'+id,{...body,expectedVersion:1},'PUT')).status).toBe(200);await publish(page);return{group,sources}}
  21 | test.beforeEach(()=>{const f=fixture();sql(`DELETE FROM operational_messages WHERE "tenantId"='${f.tenantId}'; DELETE FROM content_reviews WHERE "tenantId"='${f.tenantId}'; DELETE FROM profiles WHERE "tenantId"='${f.tenantId}'; DELETE FROM redirect_handles WHERE "tenantId"='${f.tenantId}'; DELETE FROM audit_logs WHERE "tenantId"='${f.tenantId}'`)})
  22 | 
  23 | test('F37-E01/T01/T02/T03/T04/T06 create labelled choices, private preview, keyboard choice, pause and unavailable recovery',async({page,browser},info)=>{
  24 |  const sources=await prepare(page);await list(page);await page.getByRole('link',{name:'Novo grupo',exact:true}).click();await page.getByLabel('Título do grupo de canais').fill('Onde você quer participar?');await page.getByRole('button',{name:'Avançar',exact:true}).click()
  25 |  for(const [label,source] of [['Entrar no Telegram',sources[0]],['Entrar no WhatsApp',sources[1]],['Abrir site',sources[2]]] as const){await page.getByRole('button',{name:'Adicionar canal',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Adicionar convite',exact:true});await dialog.getByRole('switch',{name:'Mostrar título'}).check();await dialog.getByLabel('Título',{exact:true}).fill(label);await dialog.getByRole('tab',{name:'Existente',exact:true}).click();await selectOption(dialog.getByLabel('Convite',{exact:true}),{label:source.label+' · '+source.destinationUrl});await expect(dialog.getByLabel('Rede')).toContainText(label.includes('Telegram')?'Telegram':label.includes('WhatsApp')?'WhatsApp':'Site');await accessible(page);if(label==='Entrar no Telegram')await capturePage(page,info.outputPath('channels-dialog.png'),false);await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(page.getByRole('button',{name:'Adicionar canal'})).toBeFocused()}
  26 |  await page.getByRole('button',{name:'Avançar',exact:true}).click();await capturePage(page,info.outputPath('channels-review.png'));await page.getByRole('button',{name:'Salvar grupo'}).click();await expect(page).toHaveURL(/\/painel\/perfil\/canais$/);await expect(page.getByRole('article')).toHaveCount(1);await capturePage(page,info.outputPath('channels-list.png'));await accessible(page)
  27 |  await page.getByRole('link',{name:'Revisar página'}).click();await page.getByRole('button',{name:'Ver prévia',exact:true}).click();await expect(page.getByRole('region',{name:'Modo de prévia'})).toBeVisible();await expect(page.getByRole('link',{name:'Telegram: Entrar no Telegram',exact:true})).toHaveAttribute('href','https://t.me/comunidade-f37');await capturePage(page,info.outputPath('channels-preview.png'));await publish(page)
  28 |  const guest=await browser.newContext({viewport:page.viewportSize(),isMobile:info.project.name.includes('mobile'),hasTouch:info.project.name.includes('mobile')}),visitor=await guest.newPage();try{await visitor.goto(origin+'/p/pagina-f37');await refuse(visitor);const telegram=visitor.getByRole('link',{name:'Telegram: Entrar no Telegram',exact:true}),oldHref=await telegram.getAttribute('href');await expect(telegram).toBeVisible();await expect(visitor.getByText('Canais indicados pelo responsável. Conteúdo e participantes podem variar.')).toHaveCount(0);await accessible(visitor);await capturePage(visitor,info.outputPath('channels-public.png'));let chosen!:(value:{status:number;location:string|null})=>void;const choice=new Promise<{status:number;location:string|null}>(resolve=>{chosen=resolve});await visitor.route('**/p/pagina-f37/canais/*',async route=>{const response=await route.fetch({url:runtime.web('127.0.0.1')+new URL(route.request().url()).pathname+new URL(route.request().url()).search,headers:{...route.request().headers(),host:'channels.localhost:'+runtime.webPort},maxRedirects:0});chosen({status:response.status(),location:response.headers()['location']??null});await route.abort()});await telegram.focus();await visitor.keyboard.press('Enter');expect(await choice).toEqual({status:302,location:'https://t.me/comunidade-f37'});await visitor.unrouteAll({behavior:'wait'})
  29 |   await list(page);await page.getByRole('link',{name:'Editar',exact:true}).click();await page.getByRole('button',{name:'Avançar',exact:true}).click();await page.getByRole('button',{name:'Editar canal Entrar no Telegram',exact:true}).click();await page.getByRole('dialog').getByLabel('Pausar convite').check();await page.getByRole('button',{name:'Salvar convite'}).click();await page.getByRole('button',{name:'Avançar',exact:true}).click();await page.getByRole('button',{name:'Salvar grupo'}).click();await expect(page).toHaveURL(/\/painel\/perfil\/canais$/);await visitor.goto(origin+'/p/pagina-f37');await expect(visitor.getByRole('link',{name:'Telegram: Entrar no Telegram',exact:true})).toBeVisible();await publish(page);await visitor.goto(origin+oldHref);await expect(visitor.getByRole('heading',{name:'Canal indisponível',exact:true})).toBeVisible();await expect(visitor.getByRole('banner')).toHaveCount(0);await expect(visitor.getByRole('contentinfo')).toHaveCount(0);await capturePage(visitor,info.outputPath('channels-unavailable.png'));await visitor.getByRole('link',{name:'Voltar à página'}).click();await expect(visitor.getByRole('link',{name:'Telegram: Entrar no Telegram',exact:true})).toHaveCount(0)
  30 |   for(const source of sources.slice(1))expect((await mutate(page,'me/redirects/'+source.id+'/disable',{expectedRevision:source.version})).status).toBe(200);await visitor.reload();await expect(visitor.getByText('Não há canais disponíveis agora.',{exact:true})).toBeVisible();expect(await visitor.content()).not.toContain('https://chat.whatsapp.com/comunidade-f37');await capturePage(visitor,info.outputPath('channels-empty-public.png'))
  31 |  }finally{await guest.close()}
  32 | })
  33 | 
  34 | test('F37-E02 hidden choices and private groups never leak to anonymous, another admin or tenant; forged choices fail',async({page,browser},info)=>{
  35 |  const {group}=await seededGroup(page,true),guest=await browser.newContext({viewport:page.viewportSize(),isMobile:info.project.name.includes('mobile'),hasTouch:info.project.name.includes('mobile')}),visitor=await guest.newPage();try{await visitor.goto(origin+'/p/pagina-f37');await refuse(visitor);expect(await visitor.content()).not.toMatch(/F37-HIDDEN-SECRET|https:\/\/t.me\/comunidade-f37/);expect((await read(visitor)).status).toBe(401);const value=await read(visitor,'profiles/pagina-f37');expect(JSON.stringify(value.body)).not.toMatch(/F37-HIDDEN-SECRET|destinationRevisionId|ownerId|tenantId/);const href=await visitor.getByRole('link',{name:'Site: Abrir site',exact:true}).getAttribute('href');const token=new URL(href!,origin).searchParams.get('token')!;expect((await read(visitor,'profiles/pagina-f37/channels/'+group.channels[1].id+'/resolve?token='+encodeURIComponent(token))).status).toBe(422);await login(visitor,true);await list(visitor);await expect(visitor.getByRole('link',{name:'Criar minha página'})).toBeVisible();expect(await visitor.content()).not.toContain(group.name);await visitor.goto(origin+'/painel/perfil/canais/'+group.id);await expect(visitor.getByRole('link',{name:'Criar minha página'})).toBeVisible();expect(await visitor.content()).not.toContain('F37-HIDDEN-SECRET');await capturePage(visitor,info.outputPath('channels-other-owner.png'));const foreign=await guest.request.get(runtime.web('127.0.0.1')+'/bff/v1/profiles/pagina-f37',{headers:{host:'tenant-b.localhost:'+runtime.webPort}});expect(foreign.status()).toBe(404)}finally{await guest.close()}
  36 | })
  37 | 
  38 | test('F37-E03 exact refresh skeleton, recoverable error, keyboard, mobile filters, conflict and 200% text',async({page},info)=>{
  39 |  await seededGroup(page);await list(page);const card=page.locator('[data-channel-group]'),before=await card.boundingBox();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});await page.route('**/bff/v1/me/profile/channel-groups',async route=>{await gate;await route.abort('failed')});await page.getByRole('button',{name:'Atualizar canais'}).focus();await page.keyboard.press('Enter');try{await expect(page.getByLabel('Carregando canais')).toBeVisible();expect(await card.boundingBox()).toEqual(before);await capturePage(page,info.outputPath('channels-pending.png'))}finally{release()};await expect(page.getByRole('main').getByRole('alert')).toBeVisible();await capturePage(page,info.outputPath('channels-error.png'));await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Tentar de novo'}).click();await expect(page.getByLabel('Canais da minha página')).not.toHaveAttribute('aria-busy','true');await selectOption(page.getByLabel('Situação dos convites'),'READY');await expect(card).toHaveCount(1);await accessible(page)
  40 |  await page.getByRole('link',{name:'Editar',exact:true}).click();await page.getByLabel('Título do grupo de canais').fill('Título local preservado');await page.getByRole('button',{name:'Avançar',exact:true}).click();await page.getByRole('button',{name:'Avançar',exact:true}).click();const current=(await read(page,'me/profile')).body.draft,{version,...content}=current;content.bio='Alteração concorrente';expect((await mutate(page,'me/profile',{expectedVersion:version,content},'PATCH')).status).toBe(200);await page.getByRole('button',{name:'Salvar grupo'}).click();await expect(page.getByRole('form',{name:'Editar grupo de canais'}).getByRole('alert')).toBeVisible();await expect(page.getByRole('form',{name:'Editar grupo de canais'})).toContainText('Título local preservado');await capturePage(page,info.outputPath('channels-conflict.png'));await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('channels-zoom.png'),false)
  41 | })
  42 | 
  43 | 
  44 | test('F37-E04 metadata-only changes appear in F19 comparison, restore stays draft and preview reuses the personal page',async({page},info)=>{
  45 |  const {group}=await seededGroup(page);await list(page);await page.getByRole('link',{name:'Editar',exact:true}).click();await page.getByRole('button',{name:'Avançar',exact:true}).click();await page.getByRole('button',{name:'Editar canal Entrar no Telegram',exact:true}).click();await selectOption(page.getByRole('dialog').getByLabel('Rede'),'SITE');await page.getByRole('button',{name:'Salvar convite'}).click();await page.getByRole('button',{name:'Avançar',exact:true}).click();await page.getByRole('button',{name:'Salvar grupo'}).click();await expect(page).toHaveURL(/\/painel\/perfil\/canais$/)
  46 |  await page.goto(origin+'/painel/perfil/historico');await page.getByRole('article',{name:'Versão 2',exact:true}).getByRole('button',{name:'Ver diferenças'}).click();const dialog=page.getByRole('dialog',{name:'Versão 2',exact:true});await expect(dialog).toHaveCSS('opacity','1');await expect(dialog).toContainText('Alternativas de acesso · Alterado');await expect(dialog).toContainText('Telegram: Entrar no Telegram');await expect(dialog).toContainText('Site: Entrar no Telegram');expect(await dialog.textContent()).not.toContain(group.channels[1].destinationRevisionId);await accessible(page);await capturePage(page,info.outputPath('channels-history.png'),false);await dialog.getByRole('button',{name:'Restaurar no rascunho'}).click();await dialog.getByRole('button',{name:'Confirmar restauração'}).click();await expect(dialog).toHaveCount(0);await page.getByRole('link',{name:'Ver prévia',exact:true}).click();await expect(page.getByRole('region',{name:'Modo de prévia'})).toBeVisible();await expect(page.getByRole('link',{name:'Telegram: Entrar no Telegram',exact:true})).toHaveAttribute('href','https://t.me/comunidade-f37');expect((await read(page,'profiles/pagina-f37')).body.publishedRevisionId).toBe(2)
  47 | })
  48 | 
  49 | test('F37-E05 unified group creates direct access without prior invitation, retries safely and toggles only channel titles',async({page,browser},info)=>{
  50 |  await prepare(page,false);await page.goto(origin+'/painel/perfil?secao=links')
  51 |  await expect(page.getByRole('button',{name:'Canais de acesso',exact:true})).toHaveCount(0)
  52 |  await page.getByRole('button',{name:'Adicionar grupo',exact:true}).click();await page.getByLabel('Nome do grupo',{exact:true}).fill('Nossa comunidade');await page.getByRole('button',{name:'Concluir grupo',exact:true}).click()
  53 |  await page.getByRole('button',{name:'Adicionar link',exact:true}).click();const link=page.getByRole('dialog',{name:'Adicionar link'});await link.getByLabel('Título do link').fill('Guia da comunidade');await expect(link.getByRole('switch')).toHaveCount(0);await link.getByLabel('Link de acesso').fill('https://example.com/guia');await link.getByRole('button',{name:'Concluir link'}).click()
  54 |  const add=page.getByRole('button',{name:'Adicionar link',exact:true});await add.click();await page.getByRole('tab',{name:'Convite',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Adicionar link',exact:true});await expect(dialog.getByRole('switch',{name:'Mostrar título'})).not.toBeChecked();await expect(dialog.getByLabel('Título',{exact:true})).toHaveCount(0);await expect(dialog.getByLabel('Pausar convite')).toHaveCount(0);await dialog.getByRole('switch',{name:'Mostrar título'}).check();await dialog.getByLabel('Título',{exact:true}).fill('Receber avisos');await dialog.getByRole('switch',{name:'Mostrar título'}).uncheck();await dialog.getByRole('textbox',{name:'Link',exact:true}).fill('https://t.me/unified-community')
  55 |  let created=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/bff/v1/me/redirects'))created++})
  56 |  await page.route('**/bff/v1/me/profile/channel-groups/*',route=>route.abort('failed'));await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Link',exact:true})).toHaveValue('https://t.me/unified-community');await capturePage(page,info.outputPath('unified-access-retry.png'),false);await page.unrouteAll({behavior:'wait'});await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog).toHaveCount(0);expect(created).toBe(1);await expect(add).toBeFocused();await expect(page.getByText('Guia da comunidade',{exact:true})).toBeVisible();await expect(page.getByText('Receber avisos',{exact:true})).toBeVisible();await expect(page.getByText('Validado',{exact:true})).toBeVisible();await accessible(page);await capturePage(page,info.outputPath('unified-group-desktop-mobile.png'))
  57 |  const groups=(await read(page)).body;expect(groups.groups[0].channels[0].showLabel).toBe(false);const stableId=groups.groups[0].channels[0].id
  58 |  await publish(page);const guest=await browser.newContext({viewport:page.viewportSize(),isMobile:info.project.name.includes('mobile'),hasTouch:info.project.name.includes('mobile')}),visitor=await guest.newPage()
  59 |  try{
  60 |   await visitor.goto(origin+'/p/pagina-f37');await refuse(visitor);await expect(visitor.getByRole('link',{name:'Telegram',exact:true})).toBeVisible();await expect(visitor.getByText('Receber avisos',{exact:true})).toHaveCount(0);await expect(visitor.getByRole('link',{name:'Guia da comunidade',exact:true})).toBeVisible();await expect(visitor.getByText(/Canais indicados pelo responsável/)).toHaveCount(0);await accessible(visitor);await capturePage(visitor,info.outputPath('unified-public-title-off.png'))
  61 |   await page.goto(origin+'/painel/perfil?secao=links');await page.getByRole('button',{name:'Nossa comunidade Abrir grupo',exact:true}).click();const card=page.locator('[data-profile-link]').filter({has:page.getByText('Receber avisos',{exact:true})});await card.getByRole('button',{name:'Editar link',exact:true}).click();dialog=page.getByRole('dialog',{name:'Editar link',exact:true});await expect(dialog.getByRole('textbox',{name:'Link',exact:true})).toHaveValue('https://t.me/unified-community');await dialog.getByRole('switch',{name:'Mostrar título'}).focus();await page.keyboard.press('Space');await expect(dialog.getByRole('switch')).toBeChecked();await expect(dialog.getByLabel('Título',{exact:true})).toHaveValue('Receber avisos');await accessible(page);await capturePage(page,info.outputPath('unified-access-title-on.png'),false)
  62 |   await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('unified-access-zoom.png'),false)
  63 |   await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog).toHaveCount(0);expect((await read(page)).body.groups[0].channels[0]).toMatchObject({id:stableId,showLabel:true});await publish(page);await visitor.reload();await expect(visitor.getByRole('link',{name:'Telegram: Receber avisos',exact:true})).toBeVisible();await expect(visitor.getByRole('link',{name:'Guia da comunidade',exact:true})).toBeVisible();await capturePage(visitor,info.outputPath('unified-public-title-on.png'))
  64 |   await page.goto(origin+'/painel/perfil?secao=links');await page.getByRole('button',{name:'Nossa comunidade Abrir grupo',exact:true}).click();await page.locator('[data-profile-link]').filter({has:page.getByText('Receber avisos',{exact:true})}).getByRole('button',{name:'Editar link',exact:true}).click();dialog=page.getByRole('dialog',{name:'Editar link',exact:true});await dialog.getByRole('textbox',{name:'Link',exact:true}).fill('https://chat.whatsapp.com/unified-updated');await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog).toHaveCount(0);expect((await read(page)).body.groups[0].channels[0]).toMatchObject({id:stableId,network:{name:'WhatsApp'}});await publish(page);await visitor.reload();await expect(visitor.getByRole('link',{name:'WhatsApp: Receber avisos',exact:true})).toBeVisible();await expect(visitor.getByRole('link',{name:'Guia da comunidade',exact:true})).toBeVisible()
  65 |   await page.goto(origin+'/painel/perfil?secao=links');await page.getByRole('button',{name:'Nossa comunidade Abrir grupo',exact:true}).click();await page.getByRole('button',{name:'Pausar convite Receber avisos',exact:true}).click();await expect(page.getByRole('button',{name:'Retomar convite Receber avisos',exact:true})).toBeEnabled();await expect(page.getByRole('dialog')).toHaveCount(0);await visitor.reload();await expect(visitor.getByRole('link',{name:'WhatsApp: Receber avisos',exact:true})).toBeVisible();await publish(page);await visitor.reload();await expect(visitor.getByRole('link',{name:'WhatsApp: Receber avisos',exact:true})).toHaveCount(0);await expect(visitor.getByRole('link',{name:'Guia da comunidade',exact:true})).toBeVisible()
  66 |  }finally{await guest.close()}
  67 | })
  68 | 
  69 | test('F37-E06 pending direct destinations stay in the group draft after reload and cannot be published',async({page},info)=>{
  70 |  await prepare(page,false);await page.goto(origin+'/painel/perfil?secao=links');await page.getByRole('button',{name:'Adicionar grupo',exact:true}).click();await page.getByLabel('Nome do grupo',{exact:true}).fill('Em preparação');await page.getByRole('button',{name:'Concluir grupo',exact:true}).click();await page.getByRole('button',{name:'Adicionar link',exact:true}).click();await page.getByRole('tab',{name:'Convite',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Adicionar link',exact:true});await dialog.getByRole('switch',{name:'Mostrar título'}).check();await dialog.getByLabel('Título',{exact:true}).fill('SuspeitoFixture');await dialog.getByRole('textbox',{name:'Link',exact:true}).fill('https://t.me/pending-unified');await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('Em análise',{exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Em preparação Abrir grupo',exact:true}).click();await expect(page.getByText('Em análise',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Publicar',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'}).getByRole('alert')).toContainText('convite próprio e aprovado');expect((await read(page,'me/profile')).body.publishedVersion).toBeNull();await accessible(page);await capturePage(page,info.outputPath('unified-pending-draft.png'))
  71 | })
  72 | 
  73 | test('F37-E07 compact link tabs, inline invitation refresh and quick visibility and pause actions persist',async({page},info)=>{
  74 |  await prepare(page,false);await page.goto(origin+'/painel/perfil?secao=links');await page.getByRole('button',{name:'Adicionar grupo',exact:true}).click();await expect(page.getByLabel('Grupo visível',{exact:true})).toHaveCount(0);await page.getByLabel('Nome do grupo').fill('Links e convites');await page.getByRole('button',{name:'Concluir grupo'}).click()
> 75 |  await page.getByRole('button',{name:'Adicionar link',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Adicionar link',exact:true});await expect(dialog.getByRole('tablist',{name:'Tipo de conteúdo'}).getByRole('tab')).toHaveText(['Link','Convite']);await expect(dialog.getByLabel('Link visível',{exact:true})).toHaveCount(0);await expect(dialog.getByRole('tablist',{name:'Tipo de link'}).getByRole('tab')).toHaveText(['Novo','Meus links']);await dialog.getByLabel('Título do link').fill('Meu site');await dialog.getByLabel('Link de acesso',{exact:true}).fill('https://example.com/site');await dialog.getByRole('button',{name:'Concluir link'}).click()
     |                                                                                                                                                                                                                                        ^ Error: expect(locator).toHaveText(expected) failed
  76 |  await page.getByRole('button',{name:'Ocultar link Meu site',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');await page.getByRole('button',{name:'Editar link',exact:true}).click();dialog=page.getByRole('dialog',{name:'Editar link',exact:true});await expect(dialog.getByRole('tablist',{name:'Tipo de conteúdo'}).getByRole('tab')).toHaveText(['Link']);await expect(dialog.getByLabel('Link visível',{exact:true})).not.toBeChecked();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('button',{name:'Mostrar link Meu site',exact:true}).click()
  77 |  await page.getByRole('button',{name:'Adicionar link',exact:true}).click();dialog=page.getByRole('dialog',{name:'Adicionar link',exact:true});await dialog.getByRole('tab',{name:'Convite',exact:true}).click();await expect(dialog.getByRole('switch',{name:'Mostrar título'})).not.toBeChecked();await expect(dialog.getByLabel('Título',{exact:true})).toHaveCount(0);await expect(dialog.getByLabel('Pausar convite',{exact:true})).toHaveCount(0);await expect(dialog.getByRole('form',{name:'Configurar convite'}).locator('p')).toHaveCount(0);await dialog.getByRole('textbox',{name:'Link',exact:true}).fill('https://t.me/compact-invite');await accessible(page);await capturePage(page,info.outputPath('compact-new-invite.png'),false);await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog).toHaveCount(0)
  78 |  const first=(await read(page)).body.groups[0].channels[0];expect(first).toMatchObject({label:'Telegram',showLabel:false});await page.getByRole('button',{name:'Pausar convite Telegram',exact:true}).click();await expect(page.getByRole('button',{name:'Retomar convite Telegram',exact:true})).toBeEnabled();expect((await read(page)).body.groups[0].channels[0].paused).toBe(true);await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Retomar convite Telegram',exact:true}).click();await expect(page.getByRole('button',{name:'Pausar convite Telegram',exact:true})).toBeEnabled();expect((await read(page)).body.groups[0].channels[0]).toMatchObject({id:first.id,paused:false})
  79 |  const inviteCard=page.locator('[data-profile-link]').filter({has:page.getByRole('button',{name:'Pausar convite Telegram',exact:true})});await inviteCard.getByRole('button',{name:'Editar link',exact:true}).click();dialog=page.getByRole('dialog',{name:'Editar link',exact:true});await expect(dialog.getByRole('tablist',{name:'Tipo de conteúdo'}).getByRole('tab')).toHaveText(['Convite']);await expect(dialog.getByLabel('Pausar convite',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
  80 |  await page.getByRole('button',{name:'Adicionar link',exact:true}).click();dialog=page.getByRole('dialog',{name:'Adicionar link',exact:true});await dialog.getByRole('tab',{name:'Convite',exact:true}).click();await dialog.getByRole('tab',{name:'Existente',exact:true}).click();const select=dialog.getByRole('combobox',{name:'Convite',exact:true}),refresh=dialog.getByRole('button',{name:'Atualizar convites',exact:true});await expect(select).toBeVisible();await expect(refresh).toBeVisible();const [a,b]=await Promise.all([select.boundingBox(),refresh.boundingBox()]);expect(Math.abs((a!.y+a!.height/2)-(b!.y+b!.height/2))).toBeLessThan(8);expect(b!.x).toBeGreaterThanOrEqual(a!.x+a!.width);await refresh.click();await expect(refresh).toBeEnabled();await accessible(page);await capturePage(page,info.outputPath('compact-existing-invite.png'),false);await selectOption(select,first.destinationRevisionId);await dialog.getByRole('button',{name:'Salvar convite'}).click();await expect(dialog).toHaveCount(0);expect((await read(page)).body.groups[0].channels).toHaveLength(2)
  81 |  await page.getByRole('button',{name:'Voltar aos grupos',exact:true}).click();await page.getByRole('button',{name:'Ocultar grupo Links e convites',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');await page.reload();await expect(page.getByRole('button',{name:'Mostrar grupo Links e convites',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mostrar grupo Links e convites',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');await page.getByRole('button',{name:'Links e convites Abrir grupo',exact:true}).click();await expect(page.getByRole('button',{name:'Ocultar link Meu site',exact:true})).toBeVisible();await accessible(page);await capturePage(page,info.outputPath('quick-card-actions.png'))
  82 | })
  83 | 
```