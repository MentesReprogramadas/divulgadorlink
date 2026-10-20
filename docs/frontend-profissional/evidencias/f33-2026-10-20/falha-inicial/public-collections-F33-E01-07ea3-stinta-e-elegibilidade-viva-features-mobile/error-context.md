# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-collections.spec.ts >> F33-E01/T01/T02/T03/T04/T05/T06 publica seleção e revoga, autoria distinta e elegibilidade viva
- Location: e2e\public-collections.spec.ts:8:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
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
      - heading "Favoritos" [level=1] [ref=f2e15]
      - region "Favoritos e coleções" [ref=f2e17]:
        - status [active] [ref=f2e18]: Alteração salva.
        - generic [ref=f2e19]:
          - generic [ref=f2e20]:
            - button "Voltar" [ref=f2e21] [cursor=pointer]
            - heading "Estudos" [level=2] [ref=f2e25]
          - group "Ações da coleção" [ref=f2e26]:
            - button "Editar" [ref=f2e27] [cursor=pointer]
            - button "Excluir" [ref=f2e31] [cursor=pointer]
        - button "Publicar coleção" [ref=f2e36] [cursor=pointer]
        - search "Filtrar favoritos" [ref=f2e40]:
          - generic [ref=f2e41]:
            - generic [ref=f2e42]: Buscar favoritos
            - searchbox "Buscar favoritos" [ref=f2e44]
        - region "Itens da coleção" [ref=f2e45]:
          - list [ref=f2e46]:
            - listitem [ref=f2e47]:
              - generic [ref=f2e48]:
                - heading "Link indisponível" [level=3] [ref=f2e49]
                - paragraph [ref=f2e50]: O conteúdo está oculto ou exige confirmação de idade. Você pode manter ou remover este favorito.
                - generic [ref=f2e51]:
                  - group [ref=f2e52]:
                    - generic "Mover" [ref=f2e53] [cursor=pointer]
                  - button "Remover" [ref=f2e56] [cursor=pointer]
  - contentinfo [ref=f2e58]:
    - generic [ref=f2e59]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e60]:
      - link "Termos" [ref=f2e61] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e62] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e63] [cursor=pointer]
  - alert [ref=f2e64]
```

# Test source

```ts
  1  | import {expect,test,type Page} from '@playwright/test'
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | import {roadmapLogin,roadmapApi,roadmapOrigin,roadmapFixture} from './roadmap-profile'
  4  | import {sql} from './db'
  5  | import {capturePage} from './capture-page'
  6  | async function prepare(page:Page,suffix:string){await roadmapLogin(page);const f=roadmapFixture(),id=crypto.randomUUID(),link='f33-'+suffix;sql(`DELETE FROM collections WHERE "tenantId"='${f.tenantId}'; INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") SELECT '${link}','${f.tenantId}',(SELECT id FROM users WHERE "tenantId"='${f.tenantId}' AND id<>'${f.ownerId}' LIMIT 1),'https://example.com/${link}','Comunidade pública','Encontros e materiais de estudo',(SELECT id FROM networks WHERE "tenantId"='${f.tenantId}' LIMIT 1),(SELECT id FROM niches WHERE "tenantId"='${f.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,NOW()`);const saved=await roadmapApi(page,'/me/favorites/'+link,'PUT');expect(saved.status).toBe(200);expect((await roadmapApi(page,'/me/collections','POST',{id,name:'Estudos'})).status).toBe(200);expect((await roadmapApi(page,'/me/collections/'+id+'/items/'+saved.body.favoriteId,'PUT',{expectedVersion:0})).status).toBe(200);await page.goto(roadmapOrigin+'/painel/favoritos');await page.getByRole('tab',{name:'Coleções',exact:true}).click();await page.getByRole('region',{name:'Suas coleções'}).getByRole('button',{name:'Estudos',exact:true}).click();return {id,link,slug:'estudos-'+suffix,favorite:saved.body.favoriteId}}
  7  | async function fill(page:Page,slug:string){await page.getByRole('button',{name:'Publicar coleção',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Compartilhar coleção'});await dialog.getByLabel('Nome do curador').fill('Ana Curadora');await dialog.getByLabel('Endereço da coleção').fill(slug);return dialog}
> 8  | test('F33-E01/T01/T02/T03/T04/T05/T06 publica seleção e revoga, autoria distinta e elegibilidade viva',async({page,browser},info)=>{const f=await prepare(page,'journey-'+(info.project.name.includes('mobile')?'m':'d'));const dialog=await fill(page,f.slug);await dialog.getByRole('button',{name:'Publicar seleção'}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole('link',{name:'Ver coleção pública'})).toBeVisible();const context=await browser.newContext(),visitor=await context.newPage();try{await visitor.goto(roadmapOrigin+'/colecoes/'+f.slug);await expect(visitor.getByRole('heading',{name:'Estudos',exact:true})).toBeVisible();await expect(visitor.getByText('Curadoria de Ana Curadora')).toBeVisible();await expect(visitor.getByText('Publicado por outro anunciante')).toBeVisible();await capturePage(visitor,info.outputPath('collection-public.png'));const axe=await new AxeBuilder({page:visitor}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(v=>v.id)).toEqual([]);sql(`UPDATE links SET status='UNAVAILABLE' WHERE id='${f.link}'`);await visitor.reload();await expect(visitor.getByText('Sem links disponíveis no momento.')).toBeVisible();expect(await visitor.content()).not.toContain('Comunidade pública');await page.getByRole('button',{name:'Configurar publicação'}).click();await page.getByRole('button',{name:'Tornar privada',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();const response=await visitor.goto(roadmapOrigin+'/colecoes/'+f.slug);expect(response?.status()).toBe(404)}finally{await context.close()}})
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             ^ Error: expect(received).toBe(expected) // Object.is equality
  9  | test('F33-E02/I02 sem sessão/outro dono e rascunho secreto fora do público',async({page,browser},info)=>{const f=await prepare(page,'isolation-'+(info.project.name.includes('mobile')?'m':'d'));const context=await browser.newContext(),visitor=await context.newPage();try{await visitor.goto(roadmapOrigin);expect((await roadmapApi(visitor,'/me/collections/'+f.id)).status).toBe(401);await roadmapLogin(visitor,true);expect((await roadmapApi(visitor,'/me/collections/'+f.id)).status).toBe(404);const dialog=await fill(page,f.slug);await dialog.getByRole('button',{name:'Publicar seleção'}).click();await expect(dialog).not.toBeVisible();await roadmapApi(page,'/me/collections/'+f.id,'PATCH',{name:'private-title-sentinel',expectedVersion:2});await visitor.goto(roadmapOrigin+'/colecoes/'+f.slug);expect(await visitor.content()).not.toContain('private-title-sentinel');const body=(await roadmapApi(visitor,'/collections/'+f.slug)).body;expect(JSON.stringify(body)).not.toContain(f.favorite);expect(body.items[0]).not.toHaveProperty('ownerId')}finally{await context.close()}})
  10 | test('F33-E03/C01 falha real de rede mantém formulário; teclado, idade e reflow',async({page},info)=>{const f=await prepare(page,'recovery-'+(info.project.name.includes('mobile')?'m':'d'));const dialog=await fill(page,f.slug);await page.route('**/bff/v1/me/collections/*/publish',route=>route.abort('failed'));await dialog.getByRole('button',{name:'Publicar seleção'}).click();await expect(dialog.getByRole('alert')).toContainText('Sem conexão');await expect(dialog.getByLabel('Nome do curador')).toHaveValue('Ana Curadora');await page.unrouteAll({behavior:'wait'});await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Publicar seleção'}).focus();await page.keyboard.press('Enter');await expect(dialog).not.toBeVisible();await page.goto(roadmapOrigin+'/colecoes/'+f.slug);await expect(page.getByRole('button',{name:'Tenho 18 anos ou mais'})).toBeVisible();expect(await page.content()).not.toContain('Comunidade pública');await page.getByRole('button',{name:'Tenho 18 anos ou mais'}).click();await expect(page.getByRole('heading',{name:'Estudos',exact:true})).toBeVisible();await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('collection-reflow.png'))})
  11 | 
```