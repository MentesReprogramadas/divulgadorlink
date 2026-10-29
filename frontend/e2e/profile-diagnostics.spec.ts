import {randomUUID} from 'node:crypto'
import {expect,test} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {roadmapLogin,roadmapProfile,roadmapApi,roadmapOrigin,roadmapFixture} from './roadmap-profile'
import {resetProfileScheduling} from './profile-schedule-fixture'
import {selectOption} from './select-control'
import {capturePage} from './capture-page'
test.beforeEach(()=>resetProfileScheduling(roadmapFixture().tenantId))
test('F40-E01 motivo e ação, descarte persistido e mudança de versão sem editar automaticamente',async({page,browser},info)=>{
 await roadmapLogin(page);const draft=await roadmapProfile(page,'diagnostico-ana',false);const duplicated={...draft,items:[...draft.items,{...draft.items[0],id:randomUUID(),destination:'https://example.com/outro'}]};expect((await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:1,content:duplicated})).status).toBe(200)
 await page.goto(roadmapOrigin+'/painel/perfil/diagnostico');const finding=page.getByRole('article').filter({hasText:'Títulos repetidos'});await expect(finding).toBeVisible();await expect(finding.getByRole('link',{name:'Revisar grupos e links'})).toHaveAttribute('href','/painel/perfil/links');await capturePage(page,info.outputPath('diagnostics.png'));expect((await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id)).toEqual([])
 await finding.getByRole('button',{name:'Ignorar sugestão'}).click();await expect(page.getByRole('status').filter({hasText:'Sua página não foi alterada'})).toBeVisible();await expect(finding).toHaveCount(0);await page.reload();await expect(finding).toHaveCount(0);expect((await roadmapApi(page,'/me/profile')).body.draft.version).toBe(2)
 const context=await browser.newContext();try{const other=await context.newPage();await roadmapLogin(other,true);const result=await roadmapApi(other,'/me/profile/diagnostics');expect(result.status).toBe(200);expect(JSON.stringify(result.body)).not.toContain('Projetos da Ana')}finally{await context.close()}
 expect((await roadmapApi(page,'/me/profile','PATCH',{expectedVersion:2,content:{...duplicated,bio:'Nova versão salva'}})).status).toBe(200);await page.reload();await expect(finding).toBeVisible()
})
test('F40-E02 filtros sem buscar, erro preserva seleção, teclado e 320px',async({page},info)=>{
 await roadmapLogin(page);await roadmapProfile(page,'diagnostico-mobile',false);await page.goto(roadmapOrigin+'/painel/perfil/diagnostico');const period=page.getByLabel('Período da interação').and(page.locator(':not([data-skeleton] *)'));await expect(period).toBeVisible();await expect(period).toBeEnabled();await page.route('**/bff/v1/me/profile/diagnostics?**',route=>route.abort('failed'));await selectOption(page.getByLabel('Período da interação'),{label:'Últimos 7 dias'});await expect(page.getByRole('main').getByRole('alert')).toContainText('Sem conexão');await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Tentar de novo'}).click();await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);await expect(page.getByRole('button',{name:'Buscar',exact:true})).toHaveCount(0);await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('diagnostics-320.png'))
})
