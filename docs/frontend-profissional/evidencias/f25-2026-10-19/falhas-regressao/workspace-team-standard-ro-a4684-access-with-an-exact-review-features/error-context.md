# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-team.spec.ts >> standard roles expose daily, financial and administrative access with an exact review
- Location: e2e\workspace-team.spec.ts:73:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('region', { name: 'Resumo das permissões' })
Expected substring: "11 de 12 seções com acesso"
Received string:    "Operador13 de 14 seções com acessoLinks do catálogoVer e editarContatos recebidos e formulárioVer e editarMinha páginaVer e editarCampanhasVer e editarApresentação para parceirosVer e editarConvites permanentesVer e editarAssistente: ler e alterar o rascunhoVer e editarHistórico de publicaçõesVer e editarImportação e exportaçãoVer e editarMétricas e resultadosVer e editarFavoritos e coleçõesVer e editarCategorias e resumosVer e editarLembretesVer e editarSeções que não aparecem nesta lista ficam sem acesso. Editar inclui visualizar e realizar as ações disponíveis na seção. Configurações da conta e gestão da equipe continuam exclusivas do titular."
Timeout: 20000ms

Call log:
  - Expect "toContainText" getByRole('region', { name: 'Resumo das permissões' }) with timeout 20000ms
  - waiting for getByRole('region', { name: 'Resumo das permissões' })
    43 × locator resolved to <section aria-label="Resumo das permissões" class="workspace-team_accessSummary__HaL2H">…</section>
       - unexpected value "Operador13 de 14 seções com acessoLinks do catálogoVer e editarContatos recebidos e formulárioVer e editarMinha páginaVer e editarCampanhasVer e editarApresentação para parceirosVer e editarConvites permanentesVer e editarAssistente: ler e alterar o rascunhoVer e editarHistórico de publicaçõesVer e editarImportação e exportaçãoVer e editarMétricas e resultadosVer e editarFavoritos e coleçõesVer e editarCategorias e resumosVer e editarLembretesVer e editarSeções que não aparecem nesta lista ficam sem acesso. Editar inclui visualizar e realizar as ações disponíveis na seção. Configurações da conta e gestão da equipe continuam exclusivas do titular."

```

```yaml
- region "Resumo das permissões":
  - strong: Operador
  - text: 13 de 14 seções com acesso
  - list:
    - listitem:
      - text: Links do catálogo
      - strong: Ver e editar
    - listitem:
      - text: Contatos recebidos e formulário
      - strong: Ver e editar
    - listitem:
      - text: Minha página
      - strong: Ver e editar
    - listitem:
      - text: Campanhas
      - strong: Ver e editar
    - listitem:
      - text: Apresentação para parceiros
      - strong: Ver e editar
    - listitem:
      - text: Convites permanentes
      - strong: Ver e editar
    - listitem:
      - text: "Assistente: ler e alterar o rascunho"
      - strong: Ver e editar
    - listitem:
      - text: Histórico de publicações
      - strong: Ver e editar
    - listitem:
      - text: Importação e exportação
      - strong: Ver e editar
    - listitem:
      - text: Métricas e resultados
      - strong: Ver e editar
    - listitem:
      - text: Favoritos e coleções
      - strong: Ver e editar
    - listitem:
      - text: Categorias e resumos
      - strong: Ver e editar
    - listitem:
      - text: Lembretes
      - strong: Ver e editar
  - paragraph: Seções que não aparecem nesta lista ficam sem acesso. Editar inclui visualizar e realizar as ações disponíveis na seção. Configurações da conta e gestão da equipe continuam exclusivas do titular.
```

# Test source

```ts
  1   | import {readFileSync} from 'node:fs'
  2   | import path from 'node:path'
  3   | import {expect,test,type Page} from '@playwright/test'
  4   | import AxeBuilder from '@axe-core/playwright'
  5   | import {runtime} from './runtime.cjs'
  6   | import {sql} from './db'
  7   | import {capturePage} from './capture-page'
  8   | const origin=runtime.web('teams.localhost')
  9   | const fixture=()=>JSON.parse(readFileSync(path.join(__dirname,'state.json'),'utf8')).team as {tenantId:string;ownerId:string;owner:string;other:string;password:string}
  10  | async function login(page:Page,other=false){await page.goto(origin+'/login');await page.getByLabel('E-mail').fill(other?fixture().other:fixture().owner);await page.getByLabel('Senha').fill(fixture().password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Painel',exact:true})).toBeVisible();const refuse=page.getByRole('region',{name:'Este site usa cookies'}).getByRole('button',{name:'Recusar',exact:true});if(await refuse.count())await refuse.click()}
  11  | async function api(page:Page,url:string,body?:unknown,method='GET'){return page.evaluate(async({url,body,method})=>{const csrf=decodeURIComponent(document.cookie.split('; ').find(row=>row.startsWith('csrf='))?.slice(5)??'');const response=await fetch('/bff/v1'+url,{method,headers:{'content-type':'application/json','x-csrf-token':csrf},...(body?{body:JSON.stringify(body)}:{})});const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null}},{url,body,method})}
  12  | test.beforeEach(()=>{const t=fixture().tenantId;sql(`DELETE FROM workspace_invitations WHERE "tenantId"='${t}';DELETE FROM workspace_memberships WHERE "tenantId"='${t}';DELETE FROM profiles WHERE "tenantId"='${t}'`)})
  13  | test('global team configures granular access, shares an account space, enforces API/UI and revokes a live session',async({page,browser},info)=>{
  14  |  await login(page);await page.goto(origin+'/painel/equipe');await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click();await page.getByLabel('E-mail da pessoa',{exact:true}).fill(fixture().other);await page.getByRole('button',{name:'Escolher permissões'}).click();await page.getByRole('radio',{name:/Personalizado/}).check();await page.getByLabel('Escrever Minha página',{exact:true}).check();await expect(page.getByLabel('Ler Minha página',{exact:true})).toBeChecked();await expect(page.getByLabel('Ler Minha página',{exact:true})).toBeDisabled();await page.getByLabel('Ler Campanhas',{exact:true}).check();await capturePage(page,info.outputPath('granular-permissions.png'));await page.getByRole('button',{name:'Revisar acesso',exact:true}).click();await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('Minha página');await page.getByRole('button',{name:'Criar convite',exact:true}).click();const url=await page.getByLabel('Link do convite').inputValue();await page.getByRole('button',{name:'Concluir',exact:true}).click();expect(sql(`SELECT count(*) FROM profiles WHERE "tenantId"='${fixture().tenantId}'`)).toBe('0')
  15  |  const context=await browser.newContext({viewport:page.viewportSize()!,isMobile:info.project.name==='features-mobile',hasTouch:info.project.name==='features-mobile'}),member=await context.newPage()
  16  |  try{await login(member,true);await member.goto(url);await member.getByRole('button',{name:'Aceitar convite',exact:true}).click();await expect(member.getByRole('region',{name:'Espaço compartilhado'})).toBeVisible();await member.goto(origin+'/painel/perfil/dados');await member.getByLabel('Nome da página',{exact:true}).fill('Página da equipe');await member.getByLabel('Endereço da página',{exact:true}).fill('pagina-global');await expect.poll(()=>sql(`SELECT name FROM profiles WHERE "tenantId"='${fixture().tenantId}'`)).toBe('Página da equipe');await capturePage(member,info.outputPath('workspace-editor.png'))
  17  |  expect((await api(member,'/me/profile/export?revision=draft')).status).toBe(403);expect((await api(member,'/links/mine')).status).toBe(403);expect((await api(member,'/me/profile/campaigns',{},'POST')).status).toBe(403)
  18  |  await member.goto(origin+'/painel/pedidos');await expect(member.getByRole('heading',{name:'Sem acesso a esta seção'})).toBeVisible();await member.goto(origin+'/painel/perfil');const menu=member.getByRole('button',{name:'Menu',exact:true});if(await menu.isVisible())await menu.click();const navigation=member.getByRole('navigation',{name:'Áreas do painel'}).filter({visible:true});await expect(navigation.getByRole('link',{name:'Pedidos',exact:true})).toHaveCount(0);await navigation.locator('summary').filter({hasText:'Resultados e divulgação'}).click();await expect(navigation.getByRole('link',{name:'Campanhas',exact:true})).toHaveCount(1);if(await menu.isVisible())await member.getByRole('button',{name:'Fechar menu'}).click()
  19  |  await page.reload();await page.getByRole('button',{name:'Permissões',exact:true}).click();await page.getByLabel('Escrever Minha página',{exact:true}).uncheck();await page.getByRole('button',{name:'Revisar acesso'}).click();await page.getByRole('button',{name:'Salvar permissões'}).click();await expect(page.getByText('Permissões atualizadas.',{exact:true})).toBeVisible();expect((await api(member,'/me/profile/publish',{expectedVersion:1},'POST')).status).toBe(403)
  20  |  await member.goto(origin+'/painel/perfil/dados');await expect(member.getByRole('heading',{name:'Acesso somente de leitura'})).toBeVisible();await page.getByRole('button',{name:'Revogar',exact:true}).click();await page.getByRole('button',{name:'Confirmar revogação'}).click();await expect(page.getByText('Acesso revogado.',{exact:true})).toBeVisible();expect((await api(member,'/me/profile')).status).toBe(403);await member.reload();await expect(member.getByRole('main').getByRole('alert')).toContainText('acesso');await member.getByRole('button',{name:'Voltar ao meu espaço'}).click();await expect(member.getByRole('heading',{name:'Equipe e permissões'})).toBeVisible()
  21  |  }finally{await context.close()}
  22  | })
  23  | test('team dialog supports keyboard, empty state and mobile layout without profile prerequisite',async({page},info)=>{
  24  |  await login(page);await page.goto(origin+'/painel/equipe');const invite=page.getByRole('button',{name:'Convidar colaborador',exact:true});await expect(invite).toBeEnabled();await invite.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'Convidar para minha equipe'})).toBeVisible();await page.keyboard.press('Escape');await expect(invite).toBeFocused();await capturePage(page,info.outputPath('global-team-empty.png'));expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);await page.setViewportSize({width:320,height:700});await page.addStyleTag({content:'html{font-size:125%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capturePage(page,info.outputPath('global-team-320.png'))
  25  | })
  26  | 
  27  | test('administrative delegation is granular and never changes the collaborator global role',async({page,browser},info)=>{
  28  |  const f=fixture();sql(`UPDATE users SET role='ADMIN' WHERE id='${f.ownerId}';UPDATE users SET role='USER' WHERE id=(SELECT "userId" FROM user_identifiers WHERE "tenantId"='${f.tenantId}' AND "normalizedValue"='${f.other}')`);const context=await browser.newContext({viewport:page.viewportSize()!,isMobile:info.project.name==='features-mobile',hasTouch:info.project.name==='features-mobile'});try{
  29  |  await login(page);const invitation=await api(page,'/team/invitations',{email:f.other,grants:{adminBilling:{read:true,write:false},adminHighlights:{read:true,write:false}},requestKey:crypto.randomUUID()},'POST');expect(invitation.status,JSON.stringify(invitation.body)).toBe(200);const member=await context.newPage();await login(member,true);await member.goto(origin+'/equipe/convite?scope=workspace&token='+invitation.body.token);await member.getByRole('button',{name:'Aceitar convite'}).click();await expect(member.getByRole('region',{name:'Espaço compartilhado'})).toBeVisible();expect((await api(member,'/analytics/consent',{choice:'denied'},'POST')).status).toBe(204);await member.goto(origin+'/admin/assinaturas');await expect(member.getByRole('heading',{name:'Assinaturas de páginas',exact:true})).toBeVisible();await expect(member.getByRole('heading',{name:'Condições para vender',exact:true})).toBeVisible();expect((await api(member,'/admin/profile-billing')).status).toBe(200);expect((await api(member,'/admin/settings/impressions')).status).toBe(403);expect((await api(member,'/admin/profile-billing/events/00000000-0000-4000-8000-000000000001/retry',{},'POST')).status).toBe(403);await capturePage(member,info.outputPath('delegated-admin-readonly.png'));expect((await api(member,'/auth/session')).body.role).toBe('USER');await member.goto(origin+'/admin/destaques');await expect(member.getByRole('heading',{name:'Destaques administrativos',exact:true})).toBeVisible();await expect(member.getByRole('button',{name:'Consultar link',exact:true})).toBeEnabled();await member.getByRole('button',{name:'Voltar ao meu espaço'}).click();await expect(member.getByRole('heading',{name:'Equipe e permissões',exact:true})).toBeVisible();expect((await api(member,'/admin/profile-billing')).status).toBe(403)
  30  |  }finally{await context.close();sql(`UPDATE users SET role='USER' WHERE id='${f.ownerId}';UPDATE users SET role='ADMIN' WHERE id=(SELECT "userId" FROM user_identifiers WHERE "tenantId"='${f.tenantId}' AND "normalizedValue"='${f.other}')`)}
  31  | })
  32  | 
  33  | test('guided profiles, category customization and review are clear across team tabs',async({page},info)=>{
  34  |  const errors:string[]=[]
  35  |  page.on('pageerror',error=>errors.push(error.message))
  36  |  await login(page);await page.goto(origin+'/painel/equipe')
  37  |  await page.getByRole('tab',{name:'Compartilhados comigo',exact:true}).click()
  38  |  await expect(page.getByRole('heading',{name:'Acessos que você recebeu'})).toBeVisible()
  39  |  await page.getByRole('tab',{name:'Minha equipe',exact:true}).focus()
  40  |  await page.keyboard.press('Enter')
  41  |  await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click()
  42  |  await page.getByLabel('E-mail da pessoa',{exact:true}).fill(fixture().other)
  43  |  await page.getByRole('button',{name:'Escolher permissões'}).click()
  44  |  await expect(page.getByRole('heading',{name:'Defina o acesso'})).toBeFocused()
  45  |  await capturePage(page,info.outputPath('guided-profiles.png'))
  46  |  await page.getByRole('radio',{name:/Editor de conteúdo/}).check()
  47  |  await page.getByRole('button',{name:'Revisar acesso'}).click()
  48  |  const summary=page.getByRole('region',{name:'Resumo das permissões'})
  49  |  await expect(summary).toContainText('6 de 14 seções com acesso')
  50  |  await expect(summary).not.toContainText('Pedidos e assinatura')
  51  |  await capturePage(page,info.outputPath('guided-review.png'))
  52  |  await page.getByRole('button',{name:'Voltar',exact:true}).click()
  53  |  await page.getByRole('radio',{name:/Personalizado/}).check()
  54  |  await expect(page.getByLabel('Escrever Minha página',{exact:true})).toBeChecked()
  55  |  await page.locator('summary').filter({hasText:'Financeiro'}).click()
  56  |  await page.getByLabel('Ler Pedidos e assinatura',{exact:true}).check()
  57  |  await expect(page.getByLabel('Escrever Pedidos e assinatura',{exact:true})).not.toBeChecked()
  58  |  await capturePage(page,info.outputPath('guided-advanced.png'))
  59  |  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
  60  |  await page.getByRole('button',{name:'Revisar acesso'}).click()
  61  |  await expect(summary).toContainText('7 de 14 seções com acesso')
  62  |  await expect(summary).toContainText('Só visualizar')
  63  |  await page.setViewportSize({width:320,height:700})
  64  |  await page.addStyleTag({content:'html{font-size:125%}'})
  65  |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  66  |  expect(await page.getByRole('dialog').filter({visible:true}).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
  67  |  await capturePage(page,info.outputPath('guided-review-zoom.png'))
  68  |  await page.keyboard.press('Escape')
  69  |  await expect(page.getByRole('button',{name:'Convidar colaborador',exact:true})).toBeFocused()
  70  |  expect(errors).toEqual([])
  71  | })
  72  | 
  73  | test('standard roles expose daily, financial and administrative access with an exact review',async({page},info)=>{
  74  |  await login(page);await page.goto(origin+'/painel/equipe')
  75  |  await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click()
  76  |  await page.getByLabel('E-mail da pessoa',{exact:true}).fill(fixture().other)
  77  |  await page.getByRole('button',{name:'Escolher permissões'}).click()
  78  |  for(const name of [/^Administrador /,/^Operador /,/^Editor de conteúdo /,/^Analista /,/^Financeiro /,/^Leitor /,/^Personalizado /])await expect(page.getByRole('radio',{name})).toHaveCount(1)
  79  |  await page.getByRole('radio',{name:/^Operador /}).check()
  80  |  await page.getByRole('button',{name:'Revisar acesso'}).click()
> 81  |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('11 de 12 seções com acesso')
      |                                                                        ^ Error: expect(locator).toContainText(expected) failed
  82  |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).not.toContainText('Pedidos e assinatura')
  83  |  await page.getByRole('button',{name:'Voltar',exact:true}).click()
  84  |  await page.getByRole('radio',{name:/^Financeiro /}).check()
  85  |  await page.getByRole('button',{name:'Revisar acesso'}).click()
  86  |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('1 de 12 seções com acesso')
  87  |  await capturePage(page,info.outputPath('finance-profile-review.png'))
  88  |  await page.getByRole('button',{name:'Voltar',exact:true}).click()
  89  |  await page.getByRole('radio',{name:/^Administrador /}).check()
  90  |  await page.getByRole('button',{name:'Revisar acesso'}).click()
  91  |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('12 de 12 seções com acesso')
  92  |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).not.toContainText('Configurações e categorias')
  93  |  await page.keyboard.press('Escape')
  94  |  const f=fixture()
  95  |  sql(`UPDATE users SET role='ADMIN' WHERE id='${f.ownerId}'`)
  96  |  try{
  97  |  await page.reload();await page.getByRole('button',{name:'Convidar colaborador',exact:true}).click()
  98  |  await page.getByLabel('E-mail da pessoa',{exact:true}).fill(f.other)
  99  |  await page.getByRole('button',{name:'Escolher permissões'}).click()
  100 |  await page.getByRole('radio',{name:/^Administrador /}).check()
  101 |  await page.getByRole('button',{name:'Revisar acesso'}).click()
  102 |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('21 de 21 seções com acesso')
  103 |  await expect(page.getByRole('region',{name:'Resumo das permissões'})).toContainText('Configurações e categorias')
  104 |  await page.getByRole('button',{name:'Voltar',exact:true}).click()
  105 |  await page.getByRole('radio',{name:/Personalizado/}).check()
  106 |  await page.locator('summary').filter({hasText:'Admin: sistema'}).click()
  107 |  const category=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Admin: sistema'})})
  108 |  await category.getByRole('button',{name:'Visualizar categoria',exact:true}).click()
  109 |  await expect(page.getByLabel('Ler Configurações e categorias',{exact:true})).toBeChecked()
  110 |  await expect(page.getByLabel('Escrever Configurações e categorias',{exact:true})).not.toBeChecked()
  111 |  await capturePage(page,info.outputPath('admin-categories-filled-actions.png'))
  112 |  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
  113 |  }finally{sql(`UPDATE users SET role='USER' WHERE id='${f.ownerId}'`)}
  114 | })
  115 | 
  116 | test('team and page access headings share a row with actions on desktop and explain their scope',async({page},info)=>{
  117 |  await login(page);await page.goto(origin+'/painel/equipe')
  118 |  for(const [tab,title,file] of [
  119 |  ['Minha equipe','Pessoas que colaboram com você','account-team-header.png'],
  120 |  ['Acessos por página','Acesso somente à minha página','page-team-header.png'],
  121 |  ]){
  122 |  await page.getByRole('tab',{name:tab,exact:true}).click()
  123 |  const heading=page.getByRole('heading',{name:title,exact:true})
  124 |  await expect(heading).toBeVisible()
  125 |  const header=heading.locator('..').locator('..')
  126 |  const invite=header.getByRole('button',{name:'Convidar colaborador',exact:true})
  127 |  await expect(invite).toBeVisible()
  128 |  if(info.project.name==='features'){
  129 |  const [text,action]=await Promise.all([heading.boundingBox(),invite.boundingBox()])
  130 |  expect(text).not.toBeNull();expect(action).not.toBeNull()
  131 |  expect(Math.abs(text!.y-action!.y)).toBeLessThan(4)
  132 |  expect(text!.x+text!.width).toBeLessThanOrEqual(action!.x)
  133 |  }
  134 |  if(tab==='Acessos por página'){
  135 |  await expect(page.getByRole('region',{name:'Equipe e páginas compartilhadas'})).toHaveAttribute('aria-busy','false')
  136 |  await expect(header).toContainText('sem liberar as outras áreas da conta')
  137 |  await expect(page.getByRole('heading',{name:'Colaboradores desta página',exact:true})).toBeVisible()
  138 |  }else{
  139 |  await expect(page.getByRole('region',{name:'Equipe da plataforma'})).toHaveAttribute('aria-busy','false')
  140 |  await expect(header).toContainText('conteúdo, métricas, financeiro')
  141 |  }
  142 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  143 |  await capturePage(page,info.outputPath(file))
  144 |  }
  145 |  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
  146 |  await page.setViewportSize({width:320,height:700})
  147 |  await page.addStyleTag({content:'html{font-size:125%}'})
  148 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  149 |  await capturePage(page,info.outputPath('page-team-header-zoom.png'))
  150 | })
  151 | 
```