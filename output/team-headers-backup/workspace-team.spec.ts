import {readFileSync} from 'node:fs'
import path from 'node:path'
import {expect,test,type Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {runtime} from './runtime.cjs'
import {sql} from './db'
import {capturePage} from './capture-page'
const origin=runtime.web('teams.localhost')
const fixture=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')).team as {tenantId:string;ownerId:string;owner:string;other:string;password:string}
async function login(page:Page,other=false){await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(other?fixture().other:fixture().owner);await page.getByLabel('Senha').fill(fixture().password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();const refuse=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await refuse.count())await refuse.click()}
async function api(page:Page,url:string,body?:unknown,method='GET'){return page.evaluate(async({url,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const response=await fetch('/bff/v1'+url,{method,headers:{'content-type':'application/json','x-csrf-token':csrf},...(body?{body:JSON.stringify(body)}:{})});const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null}},{url,body,method})}
test.beforeEach(()=>{const t=fixture().tenantId;sql(`DELETE FROM workspace_invitations WHERE "tenantId"='${t}';DELETE FROM workspace_memberships WHERE "tenantId"='${t}';DELETE FROM profiles WHERE "tenantId"='${t}'`)})
test('global team configures granular access, shares an account space, enforces API/UI and revokes a live session',async({page,browser},info)=>{
 await login(page);await page.goto(origin+'/painel/equipe');await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click();await page.getByLabel('E-mail da pessoa',{exact:true}).fill(fixture().other);await page.getByRole('button',{name:'Escolher permissões'}).click();await page.getByRole('radio',{name:/Personalizado/}).check();await page.getByLabel('Escrever Minha página',{exact:true}).check();await expect(page.getByLabel('Ler Minha página',{exact:true})).toBeChecked();await expect(page.getByLabel('Ler Minha página',{exact:true})).toBeDisabled();await page.getByLabel('Ler Campanhas',{exact:true}).check();await capturePage(page,info.outputPath('granular-permissions.png'));await page.getByRole('button',{name:'Revisar acesso',exact:true}).click();await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('Minha página');await page.getByRole('button',{name:'Criar convite',exact:true}).click();const url=await page.getByLabel('Link do convite').inputValue();await page.getByRole('button',{name:'Concluir',exact:true}).click();expect(sql(`SELECT count(*) FROM profiles WHERE "tenantId"='${fixture().tenantId}'`)).toBe('0')
 const context=await browser.newContext({viewport:page.viewportSize()!,isMobile:info.project.name==='features-mobile',hasTouch:info.project.name==='features-mobile'}),member=await context.newPage()
 try{await login(member,true);await member.goto(url);await member.getByRole('button',{name:'Aceitar convite',exact:true}).click();await expect(member.getByRole('region',{name:'Espaço compartilhado'})).toBeVisible();await member.goto(origin+'/painel/perfil/dados');await member.getByLabel('Nome da página',{exact:true}).fill('Página da equipe');await member.getByLabel('Endereço da página',{exact:true}).fill('pagina-global');await expect.poll(()=>sql(`SELECT name FROM profiles WHERE "tenantId"='${fixture().tenantId}'`)).toBe('Página da equipe');await capturePage(member,info.outputPath('workspace-editor.png'))
 expect((await api(member,'/me/profile/export?revision=draft')).status).toBe(403);expect((await api(member,'/links/mine')).status).toBe(403);expect((await api(member,'/me/profile/campaigns',{},'POST')).status).toBe(403)
 await member.goto(origin+'/painel/pedidos');await expect(member.getByRole('heading',{name:'Sem acesso a esta seção'})).toBeVisible();await member.goto(origin+'/painel/perfil');const menu=member.getByRole('button',{name:'Menu',exact:true});if(await menu.isVisible())await menu.click();const navigation=member.getByRole('navigation',{name:'Áreas do painel'}).filter({visible:true});await expect(navigation.getByRole('link',{name:'Pedidos',exact:true})).toHaveCount(0);await navigation.locator('summary').filter({hasText:'Resultados e divulgação'}).click();await expect(navigation.getByRole('link',{name:'Campanhas',exact:true})).toHaveCount(1);if(await menu.isVisible())await member.getByRole('button',{name:'Fechar menu'}).click()
 await page.reload();await page.getByRole('button',{name:'Permissões',exact:true}).click();await page.getByLabel('Escrever Minha página',{exact:true}).uncheck();await page.getByRole('button',{name:'Revisar acesso'}).click();await page.getByRole('button',{name:'Salvar permissões'}).click();await expect(page.getByText('Permissões atualizadas.',{exact:true})).toBeVisible();expect((await api(member,'/me/profile/publish',{expectedVersion:1},'POST')).status).toBe(403)
 await member.goto(origin+'/painel/perfil/dados');await expect(member.getByRole('heading',{name:'Acesso somente de leitura'})).toBeVisible();await page.getByRole('button',{name:'Revogar',exact:true}).click();await page.getByRole('button',{name:'Confirmar revogação'}).click();await expect(page.getByText('Acesso revogado.',{exact:true})).toBeVisible();expect((await api(member,'/me/profile')).status).toBe(403);await member.reload();await expect(member.getByRole('main').getByRole('alert')).toContainText('acesso');await member.getByRole('button',{name:'Voltar ao meu espaço'}).click();await expect(member.getByRole('heading',{name:'Equipe e permissões'})).toBeVisible()
 }finally{await context.close()}
})
test('team dialog supports keyboard, empty state and mobile layout without profile prerequisite',async({page},info)=>{
 await login(page);await page.goto(origin+'/painel/equipe');const invite=page.getByRole('button',{name:'Convidar colaborador',exact:true});await expect(invite).toBeEnabled();await invite.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'Convidar para minha equipe'})).toBeVisible();await page.keyboard.press('Escape');await expect(invite).toBeFocused();await capturePage(page,info.outputPath('global-team-empty.png'));expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);await page.setViewportSize({width:320,height:700});await page.addStyleTag({content:'html{font-size:125%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('global-team-320.png'))
})

test('administrative delegation is granular and never changes the collaborator global role',async({page,browser},info)=>{
 const f=fixture();sql(`UPDATE users SET role='ADMIN' WHERE id='${f.ownerId}';UPDATE users SET role='USER' WHERE id=(SELECT "userId" FROM user_identifiers WHERE "tenantId"='${f.tenantId}' AND "normalizedValue"='${f.other}')`);const context=await browser.newContext({viewport:page.viewportSize()!,isMobile:info.project.name==='features-mobile',hasTouch:info.project.name==='features-mobile'});try{
 await login(page);const invitation=await api(page,'/team/invitations',{email:f.other,grants:{adminBilling:{read:true,write:false},adminHighlights:{read:true,write:false}},requestKey:crypto.randomUUID()},'POST');expect(invitation.status,JSON.stringify(invitation.body)).toBe(200);const member=await context.newPage();await login(member,true);await member.goto(origin+'/equipe/convite?scope=workspace&token='+invitation.body.token);await member.getByRole('button',{name:'Aceitar convite'}).click();await expect(member.getByRole('region',{name:'Espaço compartilhado'})).toBeVisible();expect((await api(member,'/analytics/consent',{choice:'denied'},'POST')).status).toBe(204);await member.goto(origin+'/admin/assinaturas');await expect(member.getByRole('heading',{name:'Assinaturas de páginas',exact:true})).toBeVisible();await expect(member.getByRole('heading',{name:'Condições para vender',exact:true})).toBeVisible();expect((await api(member,'/admin/profile-billing')).status).toBe(200);expect((await api(member,'/admin/settings/impressions')).status).toBe(403);expect((await api(member,'/admin/profile-billing/events/00000000-0000-4000-8000-000000000001/retry',{},'POST')).status).toBe(403);await capturePage(member,info.outputPath('delegated-admin-readonly.png'));expect((await api(member,'/auth/session')).body.role).toBe('USER');await member.goto(origin+'/admin/destaques');await expect(member.getByRole('heading',{name:'Destaques administrativos',exact:true})).toBeVisible();await expect(member.getByRole('button',{name:'Consultar link',exact:true})).toBeEnabled();await member.getByRole('button',{name:'Voltar ao meu espaço'}).click();await expect(member.getByRole('heading',{name:'Equipe e permissões',exact:true})).toBeVisible();expect((await api(member,'/admin/profile-billing')).status).toBe(403)
 }finally{await context.close();sql(`UPDATE users SET role='USER' WHERE id='${f.ownerId}';UPDATE users SET role='ADMIN' WHERE id=(SELECT "userId" FROM user_identifiers WHERE "tenantId"='${f.tenantId}' AND "normalizedValue"='${f.other}')`)}
})

test('guided profiles, category customization and review are clear across team tabs',async({page},info)=>{
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 await login(page);await page.goto(origin+'/painel/equipe')
 await page.getByRole('tab',{name:'Compartilhados comigo',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Acessos que você recebeu'})).toBeVisible()
 await page.getByRole('tab',{name:'Minha equipe',exact:true}).focus()
 await page.keyboard.press('Enter')
 await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click()
 await page.getByLabel('E-mail da pessoa',{exact:true}).fill(fixture().other)
 await page.getByRole('button',{name:'Escolher permissões'}).click()
 await expect(page.getByRole('heading',{name:'Defina o acesso'})).toBeFocused()
 await capturePage(page,info.outputPath('guided-profiles.png'))
 await page.getByRole('radio',{name:/Editor de conteúdo/}).check()
 await page.getByRole('button',{name:'Revisar acesso'}).click()
 const summary=page.getByRole('region',{name:'Resumo das permissões'})
 await expect(summary).toContainText('5 de 12 seções com acesso')
 await expect(summary).not.toContainText('Pedidos e assinatura')
 await capturePage(page,info.outputPath('guided-review.png'))
 await page.getByRole('button',{name:'Voltar',exact:true}).click()
 await page.getByRole('radio',{name:/Personalizado/}).check()
 await expect(page.getByLabel('Escrever Minha página',{exact:true})).toBeChecked()
 await page.locator('summary').filter({hasText:'Financeiro'}).click()
 await page.getByLabel('Ler Pedidos e assinatura',{exact:true}).check()
 await expect(page.getByLabel('Escrever Pedidos e assinatura',{exact:true})).not.toBeChecked()
 await capturePage(page,info.outputPath('guided-advanced.png'))
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 await page.getByRole('button',{name:'Revisar acesso'}).click()
 await expect(summary).toContainText('6 de 12 seções com acesso')
 await expect(summary).toContainText('Só visualizar')
 await page.setViewportSize({width:320,height:700})
 await page.addStyleTag({content:'html{font-size:125%}'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(await page.getByRole('dialog').filter({visible:true}).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
 await capturePage(page,info.outputPath('guided-review-zoom.png'))
 await page.keyboard.press('Escape')
 await expect(page.getByRole('button',{name:'Convidar colaborador',exact:true})).toBeFocused()
 expect(errors).toEqual([])
})

test('standard roles expose daily, financial and administrative access with an exact review',async({page},info)=>{
 await login(page);await page.goto(origin+'/painel/equipe')
 await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click()
 await page.getByLabel('E-mail da pessoa',{exact:true}).fill(fixture().other)
 await page.getByRole('button',{name:'Escolher permissões'}).click()
 for(const name of [/^Administrador /,/^Operador /,/^Editor de conteúdo /,/^Analista /,/^Financeiro /,/^Leitor /,/^Personalizado /])await expect(page.getByRole('radio',{name})).toHaveCount(1)
 await page.getByRole('radio',{name:/^Operador /}).check()
 await page.getByRole('button',{name:'Revisar acesso'}).click()
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('11 de 12 seções com acesso')
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).not.toContainText('Pedidos e assinatura')
 await page.getByRole('button',{name:'Voltar',exact:true}).click()
 await page.getByRole('radio',{name:/^Financeiro /}).check()
 await page.getByRole('button',{name:'Revisar acesso'}).click()
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('1 de 12 seções com acesso')
 await capturePage(page,info.outputPath('finance-profile-review.png'))
 await page.getByRole('button',{name:'Voltar',exact:true}).click()
 await page.getByRole('radio',{name:/^Administrador /}).check()
 await page.getByRole('button',{name:'Revisar acesso'}).click()
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('12 de 12 seções com acesso')
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).not.toContainText('Configurações e categorias')
 await page.keyboard.press('Escape')
 const f=fixture()
 sql(`UPDATE users SET role='ADMIN' WHERE id='${f.ownerId}'`)
 try{
 await page.reload();await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click()
 await page.getByLabel('E-mail da pessoa',{exact:true}).fill(f.other)
 await page.getByRole('button',{name:'Escolher permissões'}).click()
 await page.getByRole('radio',{name:/^Administrador /}).check()
 await page.getByRole('button',{name:'Revisar acesso'}).click()
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('21 de 21 seções com acesso')
 await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('Configurações e categorias')
 await page.getByRole('button',{name:'Voltar',exact:true}).click()
 await page.getByRole('radio',{name:/Personalizado/}).check()
 await page.locator('summary').filter({hasText:'Admin: sistema'}).click()
 const category=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Admin: sistema'})})
 await category.getByRole('button',{name:'Visualizar categoria',exact:true}).click()
 await expect(page.getByLabel('Ler Configurações e categorias',{exact:true})).toBeChecked()
 await expect(page.getByLabel('Escrever Configurações e categorias',{exact:true})).not.toBeChecked()
 await capturePage(page,info.outputPath('admin-categories-filled-actions.png'))
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
 }finally{sql(`UPDATE users SET role='USER' WHERE id='${f.ownerId}'`)}
})
