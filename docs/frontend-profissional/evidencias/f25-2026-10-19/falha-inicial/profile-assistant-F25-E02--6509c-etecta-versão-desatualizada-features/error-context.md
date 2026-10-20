# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-assistant.spec.ts >> F25-E02 sem página geração não salva; outro dono não acessa e aplicação detecta versão desatualizada
- Location: e2e\profile-assistant.spec.ts:20:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('region', { name: 'Revisar sugestões' }).getByRole('alert')
Expected substring: "Sua página mudou"
Received string:    "O perfil mudou em outra aba. Recarregue os dados antes de salvar."
Timeout: 20000ms

Call log:
  - Expect "toContainText" getByRole('region', { name: 'Revisar sugestões' }).getByRole('alert') with timeout 20000ms
  - waiting for getByRole('region', { name: 'Revisar sugestões' }).getByRole('alert')
    42 × locator resolved to <p role="alert">O perfil mudou em outra aba. Recarregue os dados …</p>
       - unexpected value "O perfil mudou em outra aba. Recarregue os dados antes de salvar."

```

```yaml
- alert: O perfil mudou em outra aba. Recarregue os dados antes de salvar.
```

# Test source

```ts
  1  | import {expect,test} from '@playwright/test'
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | import {sql} from './db'
  4  | import {capturePage} from './capture-page'
  5  | import {runtime} from './runtime.cjs'
  6  | import {roadmapFixture,roadmapOrigin,roadmapLogin,roadmapApi,roadmapProfile} from './roadmap-profile'
  7  | 
  8  | test.beforeEach(()=>sql(`DELETE FROM profiles WHERE "tenantId"='${roadmapFixture().tenantId}'; DELETE FROM profile_suggestions WHERE "tenantId"='${roadmapFixture().tenantId}'; DELETE FROM profile_suggestion_usage WHERE "tenantId"='${roadmapFixture().tenantId}'`))
  9  | async function begin(page:import('@playwright/test').Page){await page.goto(roadmapOrigin+'/painel/perfil/assistente');await page.getByLabel('O que você faz?',{exact:true}).fill('Design de interiores');await page.getByLabel('O que mais quer contar?',{exact:true}).fill('Trabalho com projetos residenciais');await page.getByRole('button',{name:'Escolher links',exact:true}).click()}
  10 | 
  11 | test('F25-E01 revisão seletiva e prévia reutilizada alteram só o rascunho; descarte preserva publicação',async({page,request},info)=>{
  12 |  await roadmapLogin(page);await roadmapProfile(page,'assistente-f25');await begin(page);await page.getByLabel('Links para incluir',{exact:true}).fill('https://example.com/new-project');await capturePage(page,info.outputPath('assistant-input.png'));await page.getByRole('button',{name:'Gerar sugestões',exact:true}).click();await expect(page.getByRole('heading',{name:'Escolha o que quer aplicar'})).toBeVisible();await expect(page.getByLabel('Descrição sugerida')).toHaveValue('Design de interiores. Trabalho com projetos residenciais');await capturePage(page,info.outputPath('assistant-review.png'))
  13 |  const axe=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(v=>v.id)).toEqual([])
  14 |  await page.getByLabel('Grupos e novos links',{exact:true}).uncheck();await page.getByLabel('Ordem dos botões',{exact:true}).uncheck();await page.getByLabel('Aparência do modelo',{exact:true}).uncheck();await page.getByLabel('Descrição sugerida').fill('Meu texto revisado');await expect(page.getByRole('button',{name:'Aplicar ao rascunho'})).toBeDisabled();await page.getByRole('button',{name:'Atualizar prévia'}).click();await expect(page.getByRole('button',{name:'Aplicar ao rascunho'})).toBeEnabled();await page.getByRole('button',{name:'Aplicar ao rascunho'}).click();await expect(page.getByText('Sugestões aplicadas ao rascunho. Sua página publicada não foi alterada.')).toBeVisible()
  15 |  const state=(await roadmapApi(page,'/me/profile')).body;expect(state.draft.bio).toBe('Meu texto revisado');expect(state.draft.items).toHaveLength(1);expect(state.draft.version).toBe(2);expect(state.publishedVersion).toBe(1);expect((await roadmapApi(page,'/profiles/assistente-f25')).body.bio).toBe('Criação e projetos')
  16 |  const provider=await(await request.get(runtime.stubOrigin+'/profile-suggestions/state')).json();expect(JSON.stringify(provider.last)).not.toContain('https://example.com/new-project');expect(provider.last.store).toBe(false)
  17 |  await begin(page);await page.getByRole('button',{name:'Gerar sugestões',exact:true}).click();await expect(page.getByRole('heading',{name:'Escolha o que quer aplicar'})).toBeVisible();await page.getByRole('button',{name:'Descartar sugestão'}).click();await expect(page.getByText('Sugestão descartada. Seu rascunho foi mantido.')).toBeVisible();expect((await roadmapApi(page,'/me/profile')).body.draft.version).toBe(2)
  18 | })
  19 | 
  20 | test('F25-E02 sem página geração não salva; outro dono não acessa e aplicação detecta versão desatualizada',async({page,browser},info)=>{
  21 |  await roadmapLogin(page);await page.goto(roadmapOrigin+'/painel/perfil/assistente');await page.getByLabel('Nome da página',{exact:true}).fill('Minha arte');await page.getByLabel('Link da sua página',{exact:true}).fill('arte-f25');await page.getByLabel('O que você faz?',{exact:true}).fill('Arte e desenho');await page.getByRole('button',{name:'Escolher links'}).click();await page.getByLabel('Links para incluir',{exact:true}).fill('https://example.com/art');await page.getByRole('button',{name:'Gerar sugestões',exact:true}).click();await expect(page.getByRole('heading',{name:'Escolha o que quer aplicar'})).toBeVisible();expect((await roadmapApi(page,'/me/profile')).body.draft).toBeNull();const list=(await roadmapApi(page,'/me/profile/suggestions')).body,id=list.items[0].id
  22 |  const ctx=await browser.newContext(),other=await ctx.newPage();try{await other.goto(roadmapOrigin);expect((await roadmapApi(other,'/me/profile/suggestions/'+id)).status).toBe(401);await roadmapLogin(other,true);expect((await roadmapApi(other,'/me/profile/suggestions/'+id)).status).toBe(404)}finally{await ctx.close()}
> 23 |  await roadmapProfile(page,'changed-f25',false);await page.getByRole('button',{name:'Aplicar ao rascunho'}).click();await expect(page.getByRole('region',{name:'Revisar sugestões'}).getByRole('alert')).toContainText('Sua página mudou');await capturePage(page,info.outputPath('assistant-conflict.png'));expect((await roadmapApi(page,'/me/profile')).body.draft.slug).toBe('changed-f25')
     |                                                                                                                                                                                                          ^ Error: expect(locator).toContainText(expected) failed
  24 | })
  25 | 
  26 | test('F25-E03 erro recuperável mantém entrada e teclado; limite diário e 320px com zoom',async({page},info)=>{
  27 |  await roadmapLogin(page);await roadmapProfile(page,'assistente-f25',false);await begin(page);await page.route('**/bff/v1/me/profile/suggestions',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());await page.getByRole('button',{name:'Gerar sugestões',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('form',{name:'Dados para o assistente'}).getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'Voltar',exact:true}).click();await expect(page.getByLabel('O que você faz?',{exact:true})).toHaveValue('Design de interiores');await page.unrouteAll({behavior:'wait'});await page.getByLabel('O que você faz?',{exact:true}).fill('InvalidSuggestionFixture');await page.getByRole('button',{name:'Escolher links'}).click();await page.getByRole('button',{name:'Gerar sugestões',exact:true}).click();await expect(page.getByRole('form',{name:'Dados para o assistente'}).getByRole('alert')).toContainText('válida');expect((await roadmapApi(page,'/me/profile')).body.draft.version).toBe(1);await capturePage(page,info.outputPath('assistant-error.png'))
  28 |  const draft=(await roadmapApi(page,'/me/profile')).body.draft;for(let n=0;n<4;n++)expect((await roadmapApi(page,'/me/profile/suggestions','POST',{name:draft.name,slug:draft.slug,activity:'Design',providedFacts:[],linkIds:[draft.items[0].id],linksText:'',expectedVersion:1,requestKey:crypto.randomUUID()})).status).toBe(200);await page.reload();await expect(page.getByText('0 de 5 tentativas disponíveis hoje')).toBeVisible();await page.getByLabel('O que você faz?',{exact:true}).fill('Design');await page.getByRole('button',{name:'Escolher links'}).click();await expect(page.getByRole('button',{name:'Gerar sugestões',exact:true})).toBeDisabled();await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('assistant-zoom.png'),false)
  29 | })
  30 | 
```