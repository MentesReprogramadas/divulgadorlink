# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-hosts.spec.ts >> F10-E03/T03/T04/T05 rede/HTTPS pendente recupera sem perder nome, idade, formulário e 320px
- Location: e2e\profile-hosts.spec.ts:19:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('HTTPS verificado. Endereço ativado.', { exact: true })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('HTTPS verificado. Endereço ativado.', { exact: true }) with timeout 20000ms
  - waiting for getByText('HTTPS verificado. Endereço ativado.', { exact: true })

```

```yaml
- link "Ir para o conteúdo":
  - /url: "#main-content"
- banner:
  - link "Home":
    - /url: /
  - navigation "Navegação principal":
    - link "Busca":
      - /url: /busca
    - link "Painel":
      - /url: /painel
    - button "Sair"
- main:
  - complementary:
    - paragraph: Meu espaço Tem Link Aqui
    - navigation "Áreas do painel":
      - paragraph: Seu espaço
      - link "Visão geral":
        - /url: /painel
      - link "Convites":
        - /url: /painel/convites
      - link "Equipe":
        - /url: /painel/equipe
      - paragraph: Catálogo
      - link "Meus links":
        - /url: /painel/links
      - link "Criar link":
        - /url: /painel/links/novo
      - group:
        - text: Minha página
        - link "Visão geral":
          - /url: /painel/perfil
        - group:
          - text: Edição
          - link "Dados da página":
            - /url: /painel/perfil/dados
          - link "Grupos e links":
            - /url: /painel/perfil/links
          - link "Aparência":
            - /url: /painel/perfil/aparencia
          - link "Modelos":
            - /url: /painel/perfil/modelos
          - link "Endereço próprio":
            - /url: /painel/perfil/endereco
        - group: Ferramentas
        - group: Resultados e divulgação
      - paragraph: Acompanhar
      - link "Pedidos":
        - /url: /painel/pedidos
      - link "Lembretes":
        - /url: /painel/lembretes
      - link "Favoritos":
        - /url: /painel/favoritos
      - link "Categorias seguidas":
        - /url: /painel/interesses
      - paragraph: Preferências
      - link "Assinatura":
        - /url: /painel/assinatura
      - link "Conta":
        - /url: /painel/conta
  - heading "Endereço próprio" [level=1]
  - region "Endereço próprio":
    - group "Ações da página":
      - link "Ver prévia da página":
        - /url: /painel/perfil/previa
      - button "Escolher outro endereço"
      - button "Atualizar dados"
    - alert:
      - paragraph: DNS ou HTTPS ainda não está pronto. Seu endereço continua reservado; tente verificar novamente.
      - button "Tentar de novo"
    - article "Seu endereço":
      - heading "Seu endereço" [level=2]
      - text: Incluído no seu plano
      - strong: retry-d.pages.localhost
      - text: Aguardando HTTPS
      - paragraph: Seu nome está reservado. A ativação depende de publicação e HTTPS válido.
      - button "Verificar HTTPS"
      - button "Desativar"
    - article:
      - heading "Personalize sua página" [level=2]
      - paragraph: Capa, cores, botões e fontes ficam na aparência. Organize serviços e links nos seus grupos.
      - link "Editar aparência":
        - /url: /painel/perfil/aparencia
      - link "Editar grupos e links":
        - /url: /painel/perfil/links
    - article:
      - heading "Prévia e publicação" [level=2]
      - paragraph: O endereço mostra só o que você publicou. Rascunhos continuam privados.
      - link "Gerenciar publicação":
        - /url: /painel/perfil
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
  1  | import {mkdirSync,writeFileSync,rmSync} from 'node:fs'
  2  | import path from 'node:path'
  3  | import {expect,test,type Page} from '@playwright/test'
  4  | import AxeBuilder from '@axe-core/playwright'
  5  | import {roadmapApi,roadmapLogin,roadmapProfile,roadmapOrigin,roadmapFixture} from './roadmap-profile'
  6  | import {appearanceThemes} from '../src/features/profiles/profile-appearance'
  7  | import {sql} from './db'
  8  | import {runtime} from './runtime.cjs'
  9  | import {capturePage} from './capture-page'
  10 | const control=path.join(__dirname,'.runtime/profile-host-probe.json')
  11 | test.beforeEach(()=>{rmSync(control,{force:true});rmSync(path.join(__dirname,'.runtime/profile-clock.json'),{force:true});sql(`DELETE FROM profiles WHERE "tenantId"='${roadmapFixture().tenantId}'`)})
  12 | test.afterEach(()=>rmSync(control,{force:true}))
  13 | function paid(){const {tenantId,ownerId}=roadmapFixture(),plan='f10-plan',version='f10-plan-v1',account='f10-account',subscription='f10-sub';sql(`INSERT INTO profile_plans(id,"tenantId",tier,title,"updatedAt") VALUES('${plan}','${tenantId}','PREMIUM','Fixture Premium',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents","providerPriceId","providerProductId",capabilities) VALUES('${version}','${tenantId}','${plan}',1,1000,'price_f10_fixture','prod_f10_fixture',ARRAY['profile.page','profile.categories','profile.appearance','profile.history','profile.subdomain']) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","updatedAt") VALUES('${account}','${tenantId}','${ownerId}',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","updatedAt") VALUES('${subscription}','${tenantId}','${ownerId}','${account}','${version}','ACTIVE',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',NOW()+INTERVAL '30 days',NOW()) ON CONFLICT(id) DO UPDATE SET status='ACTIVE',"paidThrough"=NOW()+INTERVAL '30 days',"periodEnd"=NOW()+INTERVAL '30 days'; INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil") VALUES('f10-entitlement','${tenantId}','${ownerId}','${subscription}','profile.subdomain',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days') ON CONFLICT(id) DO UPDATE SET "revokedAt"=NULL,"validUntil"=NOW()+INTERVAL '30 days'`)}
  14 | async function prepare(page:Page){await roadmapLogin(page);const content=await roadmapProfile(page,'premium-ana',false);const styled={...content,appearance:{...appearanceThemes[1].appearance,coverStyle:'banner' as const}};expect((await roadmapApi(page,'/me/profile','PATCH',{content:styled,expectedVersion:1})).status).toBe(200);expect((await roadmapApi(page,'/me/profile/publish','POST',{expectedVersion:2})).status).toBe(200);paid();return styled}
  15 | async function reserve(page:Page,name:string){await page.goto(roadmapOrigin+'/painel/perfil/endereco');await page.getByRole('button',{name:/Escolher (outro )?endereço/,exact:true}).click();const dialog=page.getByRole('dialog',{name:'Escolher endereço'});await dialog.getByLabel('Nome do seu endereço').fill(name);await dialog.getByRole('button',{name:'Reservar endereço'}).click();await expect(dialog).not.toBeVisible();await expect(page.getByText('Endereço reservado. Verifique o HTTPS para ativar.',{exact:true})).toBeVisible()}
> 16 | async function activate(page:Page){await page.getByRole('button',{name:'Verificar HTTPS',exact:true}).click();await expect(page.getByText('HTTPS verificado. Endereço ativado.',{exact:true})).toBeVisible()}
     |                                                                                                                                                                                                ^ Error: expect(locator).toBeVisible() failed
  17 | test('F10-E01/T01/T02/T04/T05/T06 endereço público isolado, prévia existente, publicação e perda de cobertura',async({page,browser},info)=>{const content=await prepare(page),name='ana-'+(info.project.name.includes('mobile')?'m':'d'),host=name+'.pages.localhost',origin=runtime.web(host);await reserve(page,name);await capturePage(page,info.outputPath('host-pending.png'));const context=await browser.newContext({viewport:page.viewportSize()!,isMobile:info.project.name.includes('mobile'),hasTouch:info.project.name.includes('mobile')}),visitor=await context.newPage();try{expect((await visitor.goto(origin))?.status()).toBe(404);await activate(page);await capturePage(page,info.outputPath('host-active.png'));await page.getByRole('link',{name:'Ver prévia da página'}).click();await expect(page.getByRole('region',{name:'Modo de prévia'})).toBeVisible();await expect(page.getByRole('heading',{name:'Projetos da Ana'})).toBeVisible();await visitor.goto(origin);await expect(visitor.getByRole('heading',{name:'Projetos da Ana'})).toBeVisible();await expect(visitor.getByRole('navigation',{name:'Navegação principal'})).toHaveCount(0);await expect(visitor.getByRole('link',{name:'Criado por Tem Link Aqui'})).toBeVisible();await expect(visitor).toHaveURL(origin+'/');await expect(visitor.locator('link[rel="canonical"]')).toHaveAttribute('href','https://'+host+'/');const publicCookies=await context.cookies(origin);expect(publicCookies.map(row=>row.name)).not.toContain('accessToken');expect(publicCookies.map(row=>row.name)).not.toContain('refreshToken');await capturePage(visitor,info.outputPath('host-personal-page.png'));const axe=await new AxeBuilder({page:visitor}).include('article').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(v=>v.id)).toEqual([]);const current=(await roadmapApi(page,'/me/profile')).body.draft;expect((await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:current.version,content:{...content,name:'Private-Draft-Sentinel'}})).status).toBe(200);await visitor.reload();expect(await visitor.content()).not.toContain('Private-Draft-Sentinel');expect((await roadmapApi(page,'/me/profile/publish','POST',{expectedVersion:current.version+1})).status).toBe(200);await visitor.reload();await expect(visitor.getByRole('heading',{name:'Private-Draft-Sentinel'})).toBeVisible();sql(`UPDATE profile_subscriptions SET status='PAST_DUE',"cancelAtPeriodEnd"=true WHERE id='f10-sub'`);await visitor.reload();await expect(visitor).toHaveURL(origin+'/');sql(`UPDATE profile_subscriptions SET "paidThrough"=NOW()-INTERVAL '1 minute' WHERE id='f10-sub'`);await visitor.reload();await expect(visitor).toHaveURL(roadmapOrigin+'/p/premium-ana');await expect(visitor.getByRole('heading',{name:'Private-Draft-Sentinel'})).toBeVisible();expect((await visitor.goto(runtime.web('unknown.pages.localhost')))?.status()).toBe(404)}finally{await context.close()}})
  18 | test('F10-E02/I02/T02 cookies host-only, auth bloqueada, outra página/dono e dados privados ausentes',async({page,browser},info)=>{await prepare(page);const name='isolated-'+(info.project.name.includes('mobile')?'m':'d'),origin=runtime.web(name+'.pages.localhost');await reserve(page,name);await activate(page);const context=await browser.newContext(),visitor=await context.newPage();try{await visitor.goto(origin);expect((await roadmapApi(visitor,'/me/profile')).status).toBe(404);expect((await roadmapApi(visitor,'/profiles/other-profile/items')).status).toBe(404);expect((await visitor.goto(origin+'/login'))?.status()).toBe(404);expect((await visitor.goto(origin+'/painel'))?.status()).toBe(404);expect((await visitor.goto(origin+'/p/other-profile'))?.status()).toBe(404);await roadmapLogin(visitor,true);expect((await roadmapApi(visitor,'/me/profile/hosts')).body.hosts).toEqual([]);expect((await roadmapApi(visitor,'/me/profile/hosts/verify','POST',{hostname:name+'.pages.localhost',expectedVersion:2})).status).toBe(400);const cookies=await page.context().cookies(roadmapOrigin);expect(cookies.filter(c=>['accessToken','refreshToken','csrf'].includes(c.name)).every(c=>!c.domain.startsWith('.'))).toBe(true);await context.addCookies(cookies.filter(c=>c.name==='accessToken').map(c=>({...c,domain:name+'.pages.localhost'})));await visitor.goto(origin);expect((await roadmapApi(visitor,'/me/profile')).status).toBe(404);expect((await roadmapApi(visitor,'/auth/refresh','POST',{})).status).toBe(404);expect(JSON.stringify((await roadmapApi(visitor,'/profiles/premium-ana/items')).body)).not.toMatch(/passwordHash|identifiers|emailDigest/)}finally{await context.close()}})
  19 | test('F10-E03/T03/T04/T05 rede/HTTPS pendente recupera sem perder nome, idade, formulário e 320px',async({page},info)=>{const content=await prepare(page),name='retry-'+(info.project.name.includes('mobile')?'m':'d'),origin=runtime.web(name+'.pages.localhost');await page.goto(roadmapOrigin+'/painel/perfil/endereco');await page.getByRole('button',{name:'Escolher endereço',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Escolher endereço'});await dialog.getByLabel('Nome do seu endereço').fill(name);await page.route('**/bff/v1/me/profile/hosts',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());await dialog.getByRole('button',{name:'Reservar endereço'}).click();await expect(dialog.getByRole('alert')).toContainText('Sem conexão');await expect(dialog.getByLabel('Nome do seu endereço')).toHaveValue(name);await page.unrouteAll({behavior:'wait'});await dialog.getByRole('button',{name:'Reservar endereço'}).focus();await page.keyboard.press('Enter');await expect(dialog).not.toBeVisible();mkdirSync(path.dirname(control),{recursive:true});writeFileSync(control,JSON.stringify({fail:true}));await page.getByRole('button',{name:'Verificar HTTPS',exact:true}).click();await expect(page.getByRole('region',{name:'Endereço próprio'}).getByRole('alert')).toContainText('DNS ou HTTPS ainda não está pronto');await expect(page.getByText(name+'.pages.localhost',{exact:true})).toBeVisible();rmSync(control,{force:true});await activate(page);expect((await roadmapApi(page,'/me/forms','PUT',{definition:{enabled:true,purpose:'contact',marketingAllowed:true,fields:[{key:'email',required:true},{key:'message',required:false}]},expectedVersion:0})).status).toBe(200);const current=(await roadmapApi(page,'/me/profile')).body.draft;expect((await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:current.version,content:{...content,requiresAge:true}})).status).toBe(200);expect((await roadmapApi(page,'/me/profile/publish','POST',{expectedVersion:current.version+1})).status).toBe(200);await page.goto(origin);await expect(page.getByRole('button',{name:'Tenho 18 anos ou mais'})).toBeVisible();expect(await page.content()).not.toContain('Projetos da Ana');await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click();await expect(page.getByRole('heading',{name:'Projetos da Ana'})).toBeVisible();const form=page.getByRole('region',{name:'Formulário de contato'});await form.getByLabel('E-mail',{exact:true}).fill('contact-host-sentinel@example.test');await form.getByRole('button',{name:'Enviar contato'}).click();await expect(form.getByText('Sua mensagem foi recebida.')).toBeVisible();expect(JSON.stringify((await roadmapApi(page,'/profiles/premium-ana/items')).body)).not.toContain('contact-host-sentinel');await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('host-reflow.png'))})
  20 | 
```