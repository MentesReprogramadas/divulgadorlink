# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-events.spec.ts >> F29-E01/T01/T02/T04 cria evento em etapas, publica, baixa ICS e mantém UID ao remarcar/cancelar
- Location: e2e\profile-events.spec.ts:11:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Evento: Encontro da comunidade' }).getByRole('link', { name: 'Ver inscrição' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('region', { name: 'Evento: Encontro da comunidade' }).getByRole('link', { name: 'Ver inscrição' }) with timeout 20000ms
  - waiting for getByRole('region', { name: 'Evento: Encontro da comunidade' }).getByRole('link', { name: 'Ver inscrição' })

```

```yaml
- main:
  - heading "Não encontrado" [level=1]
  - paragraph: Esta página não está disponível. Você pode voltar ao catálogo ou buscar outro conteúdo.
  - link "Voltar ao catálogo":
    - /url: /
  - link "Buscar links":
    - /url: /busca
- alert
```

# Test source

```ts
  1  | import {readFileSync} from 'node:fs'
  2  | import {expect,test} from '@playwright/test'
  3  | import AxeBuilder from '@axe-core/playwright'
  4  | import {roadmapLogin,roadmapApi,roadmapOrigin,roadmapProfile,roadmapFixture} from './roadmap-profile'
  5  | import {sql} from './db'
  6  | import {capturePage} from './capture-page'
  7  | import {selectOption} from './select-control'
  8  | test.beforeEach(()=>sql(`DELETE FROM profiles WHERE "tenantId"='${roadmapFixture().tenantId}'`))
  9  | async function editor(page:import('@playwright/test').Page){await roadmapLogin(page);await roadmapProfile(page,'agenda-eventos',false);await page.goto(roadmapOrigin+'/painel/perfil/links');await page.locator('[data-open-group]').filter({hasText:'Projetos'}).click();await page.getByRole('button',{name:'Adicionar link',exact:true}).click();await page.getByRole('tab',{name:'Evento',exact:true}).click();return page.getByRole('dialog',{name:'Adicionar evento'})}
  10 | async function fill(page:import('@playwright/test').Page){const dialog=await editor(page);await dialog.getByLabel('Título do evento',{exact:true}).fill('Encontro da comunidade');await dialog.getByLabel('Descrição do evento',{exact:true}).fill('Conversa sobre nossos projetos');await dialog.getByLabel('Local ou endereço da transmissão',{exact:true}).fill('Auditório central');await dialog.getByRole('button',{name:'Definir data'}).click();await dialog.getByLabel('Início do evento',{exact:true}).fill('20/11/2030 12:00');await dialog.getByLabel('Fim do evento',{exact:true}).fill('20/11/2030 14:00');await dialog.getByRole('button',{name:'Configurar inscrição'}).click();await dialog.getByLabel('Link de inscrição ou detalhes',{exact:true}).fill('https://example.com/evento');return dialog}
> 11 | test('F29-E01/T01/T02/T04 cria evento em etapas, publica, baixa ICS e mantém UID ao remarcar/cancelar',async({page},info)=>{const dialog=await fill(page);await capturePage(page,info.outputPath('event-editor.png'),false);await dialog.getByRole('button',{name:'Concluir evento'}).click();await expect(dialog).not.toBeVisible();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');const state=(await roadmapApi(page,'/me/profile')).body;expect(state.draft.items.find((item:{event?:unknown})=>item.event).event.startsAt).toBe('2030-11-20T15:00:00.000Z');await page.getByRole('button',{name:'Publicar',exact:true}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');await page.goto(roadmapOrigin+'/p/agenda-eventos');const event=page.getByRole('region',{name:'Evento: Encontro da comunidade'});await expect(event.getByRole('link',{name:'Ver inscrição'})).toBeVisible();const [download]=await Promise.all([page.waitForEvent('download'),event.getByRole('link',{name:'Adicionar ao calendário'}).click()]);const ics=readFileSync((await download.path())!,'utf8');expect(ics).toContain('DTSTART:20301120T150000Z');expect(ics).toContain('SUMMARY:Encontro da comunidade');expect(ics).not.toContain('ATTENDEE');const uid=ics.match(/UID:([^\r]+)/)![1];await capturePage(page,info.outputPath('event-public.png'));const axe=await new AxeBuilder({page}).include('article').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(v=>v.id)).toEqual([]);
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ^ Error: expect(locator).toBeVisible() failed
  12 |  const current=(await roadmapApi(page,'/me/profile')).body.draft;const changed=structuredClone(current);delete changed.version;const item=changed.items.find((item:{event?:unknown})=>item.event);item.event.startsAt='2030-11-21T15:00:00.000Z';item.event.endsAt='2030-11-21T17:00:00.000Z';let saved=await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:current.version,content:changed});expect(saved.status).toBe(200);await roadmapApi(page,'/me/profile/publish','POST',{expectedVersion:saved.body.draft.version});await page.reload();await expect(event.getByText('Data atualizada',{exact:true})).toBeVisible();item.event.state='CANCELLED';saved=await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:saved.body.draft.version,content:changed});await roadmapApi(page,'/me/profile/publish','POST',{expectedVersion:saved.body.draft.version});await page.reload();await expect(event.getByText('Cancelado',{exact:true})).toBeVisible();await expect(event.getByRole('link',{name:'Ver inscrição'})).toHaveCount(0);const [cancelDownload]=await Promise.all([page.waitForEvent('download'),event.getByRole('link',{name:'Adicionar ao calendário'}).click()]);const cancelled=readFileSync((await cancelDownload.path())!,'utf8');expect(cancelled).toContain('UID:'+uid);expect(cancelled).toContain('STATUS:CANCELLED');await capturePage(page,info.outputPath('event-cancelled.png'))})
  13 | test('F29-E02 rascunho e evento oculto não fornecem ICS; visitante e outro dono não alteram agenda',async({page,browser})=>{const dialog=await fill(page);await dialog.getByRole('button',{name:'Concluir evento'}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');const current=(await roadmapApi(page,'/me/profile')).body.draft,item=current.items.find((item:{event?:unknown})=>item.event);const context=await browser.newContext(),visitor=await context.newPage();try{await visitor.goto(roadmapOrigin);expect((await roadmapApi(visitor,'/profiles/agenda-eventos/events/'+item.id+'/calendar.ics')).status).toBe(404);expect((await roadmapApi(visitor,'/me/profile','PATCH',{content:current,expectedVersion:current.version})).status).toBe(401);await roadmapLogin(visitor,true);const {version,...content}=current;expect((await roadmapApi(visitor,'/me/profile','PATCH',{content,expectedVersion:version})).status).toBe(409)}finally{await context.close()}})
  14 | test('F29-E03/C01 teclado valida datas, erro de autosave mantém evento e prévia; 320px não transborda',async({page},info)=>{const dialog=await fill(page);await dialog.getByRole('button',{name:'Voltar',exact:true}).click();await dialog.getByLabel('Fim do evento',{exact:true}).fill('20/11/2030 11:00');await dialog.getByRole('button',{name:'Configurar inscrição'}).focus();await page.keyboard.press('Enter');await expect(dialog.getByRole('alert')).toContainText('O fim precisa ser depois');await dialog.getByLabel('Fim do evento',{exact:true}).fill('20/11/2030 14:00');await dialog.getByRole('button',{name:'Configurar inscrição'}).click();await selectOption(dialog.getByLabel('Situação do evento',{exact:true}),'SCHEDULED');await page.route('**/bff/v1/me/profile',route=>route.request().method()==='PATCH'?route.abort('failed'):route.continue());await dialog.getByRole('button',{name:'Concluir evento'}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','error');await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.getByRole('region',{name:'Editor do perfil'})).toHaveAttribute('data-save-state','saved');await page.setViewportSize({width:320,height:844});await page.addStyleTag({content:'html{font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('event-zoom.png'))})
  15 | 
```