# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: share-kit.spec.ts >> F32-E03/C01 falha nativa não gera download, teclado recupera; versão antiga não baixa e 320px reflow
- Location: e2e\share-kit.spec.ts:15:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Não foi possível gerar o arquivo."
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="feedback_error__dEmIm">…</div> aka getByRole('region', { name: 'Kit de divulgação' }).getByRole('alert')
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div> aka locator('[id="__next-route-announcer__"]')

Call log:
  - Expect "toContainText" getByRole('alert') with timeout 20000ms
  - waiting for getByRole('alert')
    2 × locator resolved to <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div>
      - unexpected value ""

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - link "Ir para o conteúdo" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - link "Home" [ref=f2e5] [cursor=pointer]:
        - /url: /
      - navigation "Navegação principal" [ref=f2e7]:
        - link "Busca" [ref=f2e8] [cursor=pointer]:
          - /url: /busca
        - link "Painel" [ref=f2e12] [cursor=pointer]:
          - /url: /painel
        - button "Sair" [ref=f2e17] [cursor=pointer]
  - main [ref=f2e21]:
    - complementary [ref=f2e22]:
      - paragraph [ref=f2e23]:
        - text: Meu espaço
        - generic [ref=f2e24]: Tem Link Aqui
      - navigation "Áreas do painel" [ref=f2e26]:
        - generic [ref=f2e27]:
          - paragraph [ref=f2e28]: Seu espaço
          - link "Visão geral" [ref=f2e29] [cursor=pointer]:
            - /url: /painel
          - link "Convites" [ref=f2e32] [cursor=pointer]:
            - /url: /painel/convites
          - link "Equipe" [ref=f2e35] [cursor=pointer]:
            - /url: /painel/equipe
        - generic [ref=f2e38]:
          - paragraph [ref=f2e39]: Catálogo
          - link "Meus links" [ref=f2e40] [cursor=pointer]:
            - /url: /painel/links
          - link "Criar link" [ref=f2e43] [cursor=pointer]:
            - /url: /painel/links/novo
        - group [ref=f2e47]:
          - generic "Minha página" [ref=f2e48] [cursor=pointer]
          - generic [ref=f2e54]:
            - link "Visão geral" [ref=f2e55] [cursor=pointer]:
              - /url: /painel/perfil
            - group [ref=f2e58]:
              - generic "Edição" [ref=f2e59] [cursor=pointer]
            - group [ref=f2e63]:
              - generic "Ferramentas" [ref=f2e64] [cursor=pointer]
            - group [ref=f2e68]:
              - generic "Resultados e divulgação" [ref=f2e69] [cursor=pointer]
              - generic [ref=f2e73]:
                - link "Métricas" [ref=f2e74] [cursor=pointer]:
                  - /url: /painel/perfil/metricas
                - link "Contatos recebidos" [ref=f2e77] [cursor=pointer]:
                  - /url: /painel/perfil/contatos
                - link "Campanhas" [ref=f2e80] [cursor=pointer]:
                  - /url: /painel/perfil/campanhas
                - link "Apresentação para parceiros" [ref=f2e83] [cursor=pointer]:
                  - /url: /painel/perfil/midia-kit
                - link "Kit de divulgação" [ref=f2e86] [cursor=pointer]:
                  - /url: /painel/perfil/divulgar
        - generic [ref=f2e89]:
          - paragraph [ref=f2e90]: Acompanhar
          - link "Pedidos" [ref=f2e91] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f2e94] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f2e97] [cursor=pointer]:
            - /url: /painel/favoritos
          - link "Categorias seguidas" [ref=f2e100] [cursor=pointer]:
            - /url: /painel/interesses
        - generic [ref=f2e103]:
          - paragraph [ref=f2e104]: Preferências
          - link "Assinatura" [ref=f2e105] [cursor=pointer]:
            - /url: /painel/assinatura
          - link "Conta" [ref=f2e108] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f2e111]:
      - heading "Kit de divulgação" [level=1] [ref=f2e114]
      - region "Kit de divulgação" [ref=f2e116]:
        - group "Ações da página" [ref=f2e117]:
          - button "Gerar prévia" [ref=f2e118] [cursor=pointer]
          - button "Baixar imagem" [disabled] [ref=f2e122]
          - button "Atualizar dados" [ref=f2e126] [cursor=pointer]
        - alert [ref=f2e130]:
          - paragraph [ref=f2e131]: Não foi possível gerar o arquivo. Tente novamente.
        - generic [ref=f2e132]:
          - form "Personalizar arte" [ref=f2e133]:
            - generic [ref=f2e134]:
              - list "Etapas do formulário" [ref=f2e135]:
                - listitem [ref=f2e136]:
                  - button "1 Formato" [ref=f2e137] [cursor=pointer]:
                    - generic [aria-hidden] [ref=f2e138]: "1"
                - listitem [ref=f2e139]:
                  - button "2 Texto" [disabled] [ref=f2e140]:
                    - generic [aria-hidden] [ref=f2e141]: "2"
                    - generic [ref=f2e142]: Texto
                - listitem [ref=f2e143]:
                  - button "3 Cores" [disabled] [ref=f2e144]:
                    - generic [aria-hidden] [ref=f2e145]: "3"
              - paragraph [ref=f2e146]: "Etapa 2 de 3: Texto"
            - group [ref=f2e147]:
              - generic [ref=f2e148]:
                - generic [ref=f2e149]:
                  - generic [ref=f2e150]:
                    - generic [ref=f2e151]: Título na imagem
                    - generic [aria-hidden] [ref=f2e152]: "*"
                  - textbox "Título na imagem" [ref=f2e153]: Arte recuperada
                - generic [ref=f2e154]:
                  - generic [ref=f2e155]: Descrição na imagem
                  - textbox "Descrição na imagem" [ref=f2e157]: Criação e projetos
                - paragraph [ref=f2e158]: Esses ajustes mudam apenas a arte.
            - generic [ref=f2e159]:
              - button "Voltar" [ref=f2e160] [cursor=pointer]
              - button "Personalizar cores" [ref=f2e164] [cursor=pointer]
          - region "Prévia da arte" [ref=f2e168]:
            - heading "Prévia" [level=2] [ref=f2e170]
            - paragraph [ref=f2e175]: Gere a prévia para conferir sua arte.
            - paragraph [ref=f2e176]: 1080 × 1080 · PNG · QR Code da página
  - contentinfo [ref=f2e177]:
    - generic [ref=f2e178]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e179]:
      - link "Termos" [ref=f2e180] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e181] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e182] [cursor=pointer]
  - alert [ref=f2e183]
```

# Test source

```ts
  1  | import {writeFileSync} from 'node:fs'
  2  | import {expect,test} from '@playwright/test'
  3  | import AxeBuilder from '@axe-core/playwright'
  4  | import {roadmapLogin,roadmapProfile,roadmapApi,roadmapOrigin,roadmapFixture} from './roadmap-profile'
  5  | import {selectOption} from './select-control'
  6  | import {decodeQrDownload} from './decode-qr-download'
  7  | import {capturePage} from './capture-page'
  8  | import {sql} from './db'
  9  | test.beforeEach(()=>sql(`DELETE FROM profiles WHERE "tenantId"='${roadmapFixture().tenantId}'`))
  10 | async function prepare(page:import('@playwright/test').Page,publish=true){await roadmapLogin(page);const content=await roadmapProfile(page,'kit-ana',publish);const current=(await roadmapApi(page,'/me/profile')).body.draft;expect((await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:current.version,content:{...content,name:'private-draft-sentinel',bio:'private-contact-sentinel'}})).status).toBe(200);await page.goto(roadmapOrigin+'/painel/perfil/divulgar');await expect(page.getByRole('heading',{name:'Kit de divulgação',exact:true})).toBeVisible()}
  11 | async function generate(page:import('@playwright/test').Page,title='Projetos da Ana'){await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();await expect(page.getByRole('region',{name:'Prévia da arte'})).toHaveAttribute('aria-busy','false');await expect(page.getByRole('img',{name:'Prévia da arte: '+title})).toBeVisible()}
  12 | async function download(page:import('@playwright/test').Page,draft=false){const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:draft?'Baixar prévia':'Baixar imagem',exact:true}).click()]);return decodeQrDownload(page,file)}
  13 | test('F32-E01/T01/T02/T03/T04 duas dimensões reais, texto editável, preview obrigatório e QR decodificado do PNG final',async({page},info)=>{await prepare(page);await expect(page.getByRole('button',{name:'Baixar imagem',exact:true})).toBeDisabled();await generate(page);const post=await download(page);writeFileSync(info.outputPath('share-kit-post-art.png'),post.bytes);expect(post).toMatchObject({width:1080,height:1080,payload:roadmapOrigin+'/p/kit-ana'});await capturePage(page,info.outputPath('share-kit-post.png'));await page.getByRole('button',{name:'Editar texto'}).click();await expect(page.getByLabel('Título na imagem')).toHaveValue('Projetos da Ana');await expect(page.getByLabel('Descrição na imagem')).toHaveValue('Criação e projetos');await page.getByLabel('Título na imagem').fill('Conheça nossos projetos');await expect(page.getByRole('button',{name:'Baixar imagem',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Voltar',exact:true}).click();await selectOption(page.getByLabel('Formato da imagem'),'STORY');await selectOption(page.getByLabel('Modelo da arte'),'spotlight');await generate(page,'Conheça nossos projetos');const story=await download(page);writeFileSync(info.outputPath('share-kit-story-art.png'),story.bytes);expect(story).toMatchObject({width:1080,height:1920,payload:post.payload});await capturePage(page,info.outputPath('share-kit-story.png'));const axe=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(v=>v.id)).toEqual([]);expect((await roadmapApi(page,'/me/profile')).body.draft.name).toBe('private-draft-sentinel')})
  14 | test('F32-E02/T05 rascunho exige escolha explícita e marca de prévia; outro dono não vê conteúdo',async({page,browser},info)=>{await prepare(page,false);await expect(page.getByRole('button',{name:'Gerar prévia',exact:true})).toBeDisabled();await expect(page.getByRole('region',{name:'Prévia da arte'}).getByRole('img')).toHaveCount(0);await selectOption(page.getByLabel('Conteúdo da arte'),'draft');await expect(page.getByText('Prévia do rascunho. Publique a página antes de divulgar o endereço.')).toBeVisible();await generate(page,'private-draft-sentinel');const image=await download(page,true);writeFileSync(info.outputPath('share-kit-draft-art.png'),image.bytes);expect(image.name).toContain('-previa.png');expect(image.payload).toBe(roadmapOrigin+'/p/kit-ana');await capturePage(page,info.outputPath('share-kit-draft.png'));const context=await browser.newContext(),other=await context.newPage();try{await roadmapLogin(other,true);await other.goto(roadmapOrigin+'/painel/perfil/divulgar');await expect(other.getByText('Publique sua página para gerar a arte oficial.')).toBeVisible();expect(await other.content()).not.toContain('private-draft-sentinel');await expect(other.getByRole('button',{name:'Gerar prévia',exact:true})).toBeDisabled()}finally{await context.close()}})
> 15 | test('F32-E03/C01 falha nativa não gera download, teclado recupera; versão antiga não baixa e 320px reflow',async({page},info)=>{await prepare(page);await page.getByRole('button',{name:'Editar texto'}).click();await page.getByLabel('Título na imagem').fill('Arte recuperada');await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){HTMLCanvasElement.prototype.toBlob=original;callback(null)}});await page.getByRole('button',{name:'Gerar prévia',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('alert')).toContainText('Não foi possível gerar o arquivo.');await expect(page.getByLabel('Título na imagem')).toHaveValue('Arte recuperada');await expect(page.getByRole('button',{name:'Baixar imagem',exact:true})).toBeDisabled();await generate(page,'Arte recuperada');const current=(await roadmapApi(page,'/me/profile')).body.draft;const {version,...content}=current;expect((await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:version,content:{...content,name:'Nova publicação'}})).status).toBe(200);await roadmapApi(page,'/me/profile/publish','POST',{expectedVersion:version+1});await page.getByRole('button',{name:'Baixar imagem',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Sua página mudou.');await expect(page.getByRole('button',{name:'Baixar imagem',exact:true})).toBeDisabled();await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('share-kit-zoom.png'))})
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     ^ Error: expect(locator).toContainText(expected) failed
  16 | test('F32-E04 carregamento preserva controles e geometria da prévia sem piscar a tela inicial',async({page},info)=>{await roadmapLogin(page);await roadmapProfile(page,'kit-ana');let release=()=>{},arrived=()=>{};const wait=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>arrived=resolve);await page.route('**/bff/v1/me/profile',async route=>{if(route.request().method()==='GET'){arrived();await wait}await route.continue()});try{await page.goto(roadmapOrigin+'/painel/perfil/divulgar');await seen;const preview=page.getByRole('region',{name:'Prévia da arte'});await expect(preview).toHaveAttribute('aria-busy','true');const before=await preview.boundingBox();await capturePage(page,info.outputPath('share-kit-loading.png'));release();await expect(preview).toHaveAttribute('aria-busy','false');const after=await preview.boundingBox();for(const coordinate of ['x','y','width','height'] as const)expect(Math.abs(before![coordinate]-after![coordinate])).toBeLessThanOrEqual(1);await capturePage(page,info.outputPath('share-kit-ready.png'))}finally{release();await page.unrouteAll({behavior:'wait'})}})
  17 | 
```