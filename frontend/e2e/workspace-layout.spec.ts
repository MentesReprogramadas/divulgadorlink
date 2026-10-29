import { selectOption } from './select-control'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'

const origin = runtime.web('tenant-a.localhost')
function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { bia: string; admin: string; password: string } }
async function login(page: Page, admin = false) {
  const s = state()
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail', { exact: true }).fill(admin ? s.admin : s.bia)
  await page.getByLabel('Senha', { exact: true }).fill(s.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(origin+(admin?'/admin/visao':'/painel')); if(admin)await page.goto(origin+'/painel')
}
async function choosePanelArea(page:Page,area:'Minha página'|'Meus links'|'Outras páginas'){
 const nav=page.getByRole('navigation',{name:'Áreas do painel',exact:true}).filter({visible:true})
 await nav.getByRole('group',{name:'Atalhos do painel'}).getByRole('button',{name:area,exact:true}).click()
 await expect(page).toHaveURL(new RegExp(area==='Minha página'?'\\/painel\\/perfil$':area==='Outras páginas'?'\\/painel\\/clientes$':'\\/painel$'));await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0);await expect(page).toHaveTitle(/\S/)
}
async function checkLayout(page: Page) {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined))) })
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('main *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1 && !element.closest('[inert]')).slice(-24).map(element => ({
      tag: element.tagName, className: element.getAttribute('class'), right: element.getBoundingClientRect().right,
      width: element.getBoundingClientRect().width, visibility: getComputedStyle(element).visibility,
    })),
  }))
  expect(layout.scrollWidth, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(layout.width + 1)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([])
}

test('três áreas sem seletor e apresentação mantém apenas o card externo',async({page},info)=>{
 await login(page)
 const mobile=info.project.name.includes('mobile')
 const nav=page.getByRole('navigation',{name:'Áreas do painel',exact:true}).filter({visible:true})
 for(const [label,route] of [['Minha página','/painel/perfil'],['Outras páginas','/painel/clientes'],['Meus links','/painel']]){
  if(mobile)await page.getByRole('button',{name:'Menu',exact:true}).click()
  const shortcuts=nav.getByRole('group',{name:'Atalhos do painel'})
  const button=shortcuts.getByRole('button',{name:label,exact:true})
  await button.focus();await page.keyboard.press('Enter')
  await expect(page).toHaveURL(origin+route);await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  if(mobile)await page.getByRole('button',{name:'Menu',exact:true}).click()
  await expect(nav.getByRole('combobox',{name:'Área do painel'})).toHaveCount(0);await expect(shortcuts.getByRole('button')).toHaveText(['Meus links','Minha página','Outras páginas']);await expect(shortcuts.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true')
  await checkLayout(page)
  await page.screenshot({path:info.outputPath('shortcut-'+route.split('/').at(-1)+'.png'),fullPage:true,animations:'disabled'})
  if(mobile)await page.keyboard.press('Escape')
 }
 await page.goto(origin+'/painel/perfil/dados')
 const name=page.getByLabel('Nome da página',{exact:true})
 await expect(name).toBeEnabled();await name.fill('Página de teste')
 const fields=page.locator('fieldset').filter({has:page.locator(':scope > legend',{hasText:'Apresentação'})})
 await expect(fields.locator(':scope > [data-optics]')).toHaveCount(0)
 await expect(fields.locator(':scope > [data-unpublished] > [data-optics]')).toHaveCount(0)
 await expect(fields).toHaveCSS('background-color','rgba(0, 0, 0, 0)')
 await checkLayout(page);await page.screenshot({path:info.outputPath('identity-flat.png'),fullPage:true,animations:'disabled'})
})

test('login de admin abre administração e mantém as três áreas do painel disponíveis',async({page},info)=>{
 const s=state();await page.context().addCookies([{name:'tla_consent',value:'denied',domain:'tenant-a.localhost',path:'/'}])
 await page.goto(origin+'/login');await page.getByLabel('E-mail',{exact:true}).fill(s.admin);await page.getByLabel('Senha',{exact:true}).fill(s.password);await page.getByRole('button',{name:'Entrar',exact:true}).click()
 await expect(page).toHaveURL(origin+'/admin/visao');await page.goto(origin+'/login');await expect(page).toHaveURL(origin+'/admin/visao')
 if(info.project.name.includes('mobile'))await page.getByRole('button',{name:'Menu',exact:true}).click()
 const nav=page.getByRole('navigation',{name:'Admin',exact:true}).filter({visible:true})
 await expect(nav.getByRole('link',{name:'Administração',exact:true})).toHaveAttribute('data-active','true')
 await expect(nav.getByRole('group',{name:'Atalhos do painel'}).getByRole('button')).toHaveText(['Meus links','Minha página','Outras páginas'])
 await nav.getByRole('button',{name:'Meus links',exact:true}).click();await expect(page).toHaveURL(origin+'/painel')
 if(info.project.name.includes('mobile'))await page.getByRole('button',{name:'Menu',exact:true}).click()
 await expect(page.getByRole('navigation',{name:'Áreas do painel',exact:true}).filter({visible:true}).getByRole('button',{name:'Meus links',exact:true})).toHaveAttribute('aria-pressed','true')
 await checkLayout(page)
})

test('W14 gestão mantém abas ao mudar ações e não mostra filtros vazios',async({page},info)=>{
 await login(page,true);await page.setViewportSize({width:1920,height:1000});await page.goto(origin+'/admin/visao')
 await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
 const tabs=page.getByRole('tablist',{name:'Área de gestão em abas'})
 await expect(tabs).toBeVisible();await expect(page.getByRole('form',{name:'Filtrar gestão'})).toHaveCount(0)
 await expect(page.locator('main > aside > p')).toHaveCount(0)
 for(const section of ['Contas','Links','Métricas']){
  await tabs.getByRole('tab',{name:section,exact:true}).click();await expect(tabs).toBeVisible()
  await expect(page.getByRole('form',{name:'Filtrar gestão'})).toHaveCount(section==='Métricas'?0:1)
 }
 await checkLayout(page);await page.screenshot({path:info.outputPath('office-stable-tabs.png'),fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('combobox',{name:'Área de gestão',exact:true})).toBeVisible()
 await selectOption(page.getByRole('combobox',{name:'Área de gestão',exact:true}),{label:'Contas'});await expect(page.getByRole('form',{name:'Filtrar gestão'})).toBeVisible()
 await selectOption(page.getByRole('combobox',{name:'Área de gestão',exact:true}),{label:'Métricas'});await expect(page.getByRole('form',{name:'Filtrar gestão'})).toHaveCount(0)
 await checkLayout(page)
})

test('W09 painel e admin aproveitam a largura da tela como o catálogo', async ({ page }, info) => {
  await login(page, true)
  for (const width of [320, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/painel', '/admin/visao']) {
      await page.goto(origin + route)
      await expect(page.locator('main > aside')).toHaveCount(1)
      await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
      const main = await page.locator('main').boundingBox()
      const available = await page.locator('#main-content').evaluate(element => element.getBoundingClientRect().width)
      expect(main!.x).toBe(0)
      expect(Math.round(main!.width)).toBe(available)
      const logo = await page.getByRole('link', { name: 'Home', exact: true }).boundingBox()
      expect(logo!.x).toBeCloseTo(width < 1024 ? 16 : Math.min(width * .025, 48), 0)
      await checkLayout(page)
      if ([320, 1440, 1920].includes(width)) await page.screenshot({ path: info.outputPath(route.slice(1).replace('/', '-') + '-' + width + '.png'), fullPage: true, animations: 'disabled' })
    }
  }
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await checkLayout(page)
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
})

test('W10 sidebar separa contextos, mantém conta e não aninha menus',async({page},info)=>{
 await login(page)
 for(const width of [1024,1440,1920,390,320]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/painel');if(width<1024)await page.getByRole('button',{name:'Menu',exact:true}).click()
  const nav=page.getByRole('navigation',{name:'Áreas do painel',exact:true}).filter({visible:true})
  await expect(nav.getByRole('link',{name:'Links permanentes',exact:true})).toBeVisible();await expect(nav.getByText('Editar página',{exact:true})).toHaveCount(0)
  await choosePanelArea(page,'Minha página');await expect(page).toHaveURL(/\/painel\/perfil$/);if(width<1024)await page.getByRole('button',{name:'Menu',exact:true}).click()
  await expect(nav.getByRole('link',{name:'Links permanentes',exact:true})).toHaveCount(0)
  for(const [section,label] of [['Editar página','Apresentação'],['Recursos da página','Busca e filtros'],['Resultados','Visitas e cliques'],['Divulgar','Apresentação para parceiros'],['Ferramentas','Importar e exportar página']]){
   const group=nav.locator('details').filter({has:page.locator('summary > span',{hasText:new RegExp('^'+section+'$')})});await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');await expect(group).toHaveAttribute('open','');await expect(nav.locator('details[open]')).toHaveCount(1);await expect(nav.locator('details details')).toHaveCount(0)
   const link=group.getByRole('link',{name:new RegExp('^'+label)});await link.scrollIntoViewIfNeeded();await expect(link).toBeVisible();expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  }
  await checkLayout(page);await page.screenshot({path:info.outputPath('sidebar-page-'+width+'.png'),animations:'disabled',fullPage:true})
  await choosePanelArea(page,'Outras páginas');await expect(page).toHaveURL(/\/painel\/clientes$/);if(width<1024)await page.getByRole('button',{name:'Menu',exact:true}).click()
  await expect(nav.getByRole('link',{name:'Páginas que gerencio'})).toBeVisible();await expect(nav.getByText('Editar página',{exact:true})).toHaveCount(0);await expect(nav.getByRole('link',{name:'Equipe e permissões'})).toBeVisible();await nav.getByRole('button',{name:'Ajuda',exact:true}).click();const help=page.getByRole('dialog',{name:'Como usar o painel',exact:true});await expect(help).toBeVisible();await page.keyboard.press('Escape');await expect(help).toHaveCount(0);await expect(nav.getByRole('button',{name:'Ajuda',exact:true})).toBeFocused();await checkLayout(page);await page.screenshot({path:info.outputPath('sidebar-clients-'+width+'.png'),animations:'disabled',fullPage:true})
 }
})

test('W05 ícones distinguem destinos e grupos no painel e admin', async ({ page }, info) => {
  await login(page, true)
  for (const area of ['panel', 'admin'] as const) {
    await page.goto(origin + (area === 'panel' ? '/painel' : '/admin/visao'))
    if (info.project.name.includes('mobile')) await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const nav = page.getByRole('navigation', { name: area === 'panel' ? 'Áreas do painel' : 'Admin', exact: true })
    for (const group of await nav.locator('details').all()) {
      if (!await group.evaluate(element => (element as HTMLDetailsElement).open)) await group.locator(':scope > summary').click()
    }
    // Nested section arrows all mean expand/collapse; destination and category icons must remain unique.
    const symbols = await nav.locator('a:has(svg), summary:not([data-navigation-section])').evaluateAll(items => items.map(item => ({
      label: item.textContent, drawing: item.querySelector('svg path')?.getAttribute('d'),
    })))
    expect(symbols.every(symbol => symbol.drawing)).toBe(true)
    expect(new Set(symbols.map(symbol => symbol.drawing)).size).toBe(symbols.length)
    await checkLayout(page)
    await page.screenshot({ path: info.outputPath(area + '-icons.png'), animations: 'disabled', fullPage: true })
    if (info.project.name.includes('mobile')) {
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused()
    }
  }
})

test('W04 saída fica no cabeçalho ou no final da sidebar e encerra a sessão', async ({ page }, info) => {
  await login(page)
  const main = page.locator('#main-content')
  await expect(main.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0)
  if (info.project.name.includes('mobile')) {
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeHidden()
    const menu = page.getByRole('button', { name: 'Menu', exact: true })
    const logo = page.getByRole('link', { name: 'Home', exact: true })
    const logoBox = await logo.boundingBox(), menuBox = await menu.boundingBox()
    expect(logoBox!.x).toBe(16)
    expect(Math.round(menuBox!.x + menuBox!.width)).toBe(page.viewportSize()!.width - 16)
    await menu.click()
    const drawer = page.getByRole('dialog')
    const logout = drawer.getByRole('button', { name: 'Sair', exact: true })
    await expect(logout).toBeVisible()
    const last = await drawer.locator('a, button').last().textContent()
    expect(last).toBe('Sair')
    expect(await logout.evaluate(el => {
      const sample = document.createElement('span')
      sample.style.color = 'var(--color-error-text)'
      el.append(sample)
      const expected = getComputedStyle(sample).color
      sample.remove()
      return getComputedStyle(el).color === expected
    })).toBe(true)
  } else {
    await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
    const sidebar = page.getByRole('region', { name: 'Menu lateral', exact: true })
    await expect(sidebar.getByRole('button', { name: 'Ajuda', exact: true })).toBeVisible()
    await sidebar.focus()
    await expect(sidebar).toBeFocused()
  }
  await checkLayout(page)
  await page.screenshot({ path: info.outputPath('logout-location.png'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  expect((await page.context().cookies()).find(cookie => cookie.name === 'refreshToken')).toBeUndefined()
  expect(await page.evaluate(() => sessionStorage.getItem('catalogo.session'))).toBeNull()
  expect(await page.evaluate(async () => (await fetch('/bff/v1/links/mine')).status)).toBe(401)
})
test('W01 painel: resumo sem abas, menu acessível e filtros combinados recuperáveis', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await login(page)
  await expect(page.getByRole('heading', { name: 'Seu resumo' })).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Ações da página' }).getByRole('link', { name: 'Novo link', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Precisa de atenção' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Links mais clicados' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Operação', exact: true })).toHaveCount(0)
  await checkLayout(page)
  await page.screenshot({ path: info.outputPath('panel-overview.png'), fullPage: true })
  if (info.project.name.includes('mobile')) {
    const menu = page.getByRole('button', { name: 'Menu', exact: true })
    await menu.focus(); await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: 'Meu espaço', exact: true })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Fechar menu' }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(drawer.getByRole('button', { name: 'Sair', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(drawer.getByRole('button', { name: 'Fechar menu' })).toBeFocused()
    await expect(page.getByText('Menu do painel', { exact: true })).toHaveCount(0)
    await expect(drawer.getByRole('link', { name: 'Grupos e botões', exact: true })).toHaveCount(0)
    await choosePanelArea(page,'Minha página');await expect(page).toHaveURL(/\/painel\/perfil$/);await menu.click()
    const profile = drawer.locator('details').filter({ has: page.locator('summary > span', { hasText: /^Editar página$/ }) })
    await profile.locator(':scope > summary').focus()
    await page.keyboard.press('Enter')
    await expect(drawer.getByRole('link', { name: 'Grupos e botões', exact: true })).toBeVisible()
    await checkLayout(page)
    await page.screenshot({ path: info.outputPath('panel-sidebar.png'), animations: 'disabled' })
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible(); await expect(menu).toBeFocused()
    await menu.click()
  }
  const nav = page.getByRole('navigation', { name: 'Áreas do painel', exact: true })
  if(info.project.name.includes('mobile')){await choosePanelArea(page,'Meus links');await expect(page).toHaveURL(/\/painel$/);await page.getByRole('button',{name:'Menu',exact:true}).click()}
  await nav.getByRole('link', { name: 'Links no catálogo', exact: true }).click()
  await expect(page.getByLabel('Buscar nos meus links')).toBeVisible()
  if (info.project.name.includes('mobile')) {
    await expect(page.getByLabel('Rede', { exact: true })).toBeHidden()
    await page.getByRole('button', { name: 'Ver mais filtros', exact: true }).click()
    await expect(page.getByLabel('Rede', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Ver menos filtros', exact: true }).click()
    await expect(page.getByLabel('Rede', { exact: true })).toBeHidden()
  }
  await page.getByLabel('Buscar nos meus links').fill('SemResultadoSentinelaLayout')
  await expect(page.getByText('Nenhum link neste filtro')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(page.getByRole('article').first()).toBeVisible()
  const card = page.getByRole('article').first()
  await card.getByText('Mais opções', { exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(card.getByRole('link', { name: 'Acessar', exact: true })).toBeVisible()
  await expect(card.getByRole('link', { name: 'Disponibilidade', exact: true })).toBeVisible()
  await page.keyboard.press('Enter')
  await selectOption(page.getByLabel('Situação do link'), 'published')
  await selectOption(page.getByLabel('Ordenar por'), 'clicks')
  await checkLayout(page)
  await page.screenshot({ path: info.outputPath('panel-links.png'), fullPage: true })
  for (const route of ['pedidos', 'conta', 'perfil', 'convites', 'favoritos', 'lembretes']) {
    await page.goto(origin + '/painel/' + route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await checkLayout(page)
    await page.screenshot({ path: info.outputPath('panel-' + route + '.png'), fullPage: true, animations: 'disabled' })
  }
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  expect(errors).toEqual([])
})

test('W03 formulário em etapas valida antes de avançar e mantém os campos ao voltar', async ({ page }, info) => {
  await login(page)
  let submissions = 0
  page.on('request', request => { if (request.method() === 'POST' && /\/bff\/v1\/links$/.test(request.url())) submissions++ })
  await page.goto(origin + '/painel/links/novo')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Novo link')
  await page.screenshot({ path: info.outputPath('submission-first-step.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText('Etapa 1 de 3: Título e acesso')).toBeVisible()
  await expect(page.getByLabel('Título do link', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  const errors = page.getByRole('region', { name: 'Confira os campos desta etapa' })
  await expect(errors).toBeFocused()
  await errors.getByRole('link', { name: 'Título do link', exact: true }).click()
  await expect(page.getByLabel('Título do link', { exact: true })).toBeFocused()
  await page.getByLabel('Título do link', { exact: true }).fill('Comunidade de leitura')
  await page.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/leitura')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText('Etapa 2 de 3: Assunto e descrição')).toBeFocused()
  await page.getByLabel('Descrição', { exact: true }).fill('Encontros para conversar sobre livros.')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText('Etapa 2 de 3: Assunto e descrição')).toBeAttached()
  const network = page.getByLabel('Rede do link', { exact: true })
  await expect(network.locator('svg:not([width="0"])')).toHaveCount(2)
  await expect(page.getByLabel('Assunto do link', { exact: true }).locator('svg:not([width="0"])')).toHaveCount(2)
  await network.focus(); await page.keyboard.press('Space')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.screenshot({ path: info.outputPath('select-options.png'), animations: 'disabled' })
  await page.keyboard.press('Escape'); await expect(network).toBeFocused()
  await selectOption(network, { label: 'Site' })
  await selectOption(page.getByLabel('Assunto do link', { exact: true }), { label: 'Jogos' })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText('Etapa 3 de 3: Conferir e enviar')).toBeAttached()
  await checkLayout(page)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByLabel('Título do link', { exact: true })).toHaveValue('Comunidade de leitura')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Encontros para conversar sobre livros.')
  expect(submissions).toBe(0)
  await checkLayout(page)
  await page.screenshot({ path: info.outputPath('submission-step.png'), fullPage: true })
})
test('W02 admin: áreas separadas, filtros de fila e navegação em todas as jornadas', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await login(page, true); await page.goto(origin + '/admin/visao')
  await expect(page.getByRole('heading', { name: 'Publicação no catálogo' })).toBeVisible()
  await checkLayout(page)
  await page.screenshot({ path: info.outputPath('admin-overview.png'), fullPage: true })
  for (const area of ['contas', 'links', 'cliques', 'pagadores', 'trafego', 'financeiro', 'retencao']) {
    await selectOption(page.getByLabel('Área de gestão', { exact: true }), area)
    await page.waitForLoadState('networkidle')
    await checkLayout(page)
  }
  for (const route of ['moderacao', 'denuncias', 'disponibilidade', 'planos', 'estornos', 'integracoes', 'configuracoes']) {
    await page.goto(origin + '/admin/' + route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    if (route === 'moderacao') {
      await expect(page.getByRole('article').first()).toBeVisible()
      await page.getByLabel('Buscar na fila').fill('SemResultadoSentinelaLayout')
      await expect(page.getByText('Nenhum caso corresponde aos filtros.')).toBeVisible()
      await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
      await expect(page.getByRole('article').first()).toBeVisible()
      await page.screenshot({ path: info.outputPath('admin-moderation.png'), fullPage: true })
    }
    if (route === 'configuracoes') await page.screenshot({ path: info.outputPath('admin-configurations.png'), fullPage: true, animations: 'disabled' })
    await checkLayout(page)
  }
  if (info.project.name.includes('mobile')) { await page.getByRole('button', { name: 'Menu', exact: true }).click(); await expect(page.getByRole('navigation', { name: 'Admin', exact: true })).toBeVisible(); await checkLayout(page); await page.screenshot({ path: info.outputPath('admin-sidebar.png'), animations: 'disabled' }); await page.keyboard.press('Escape') }
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  expect(errors).toEqual([])
})

test('W06 menu só aceita interação quando a hidratação está pronta', async ({ page, browser }) => {
  await login(page)
  const context = await browser.newContext({ storageState: await page.context().storageState(), viewport: { width: 390, height: 844 } })
  const slow = await context.newPage()
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await slow.route('**/_next/static/**/*.js', async route => { await held; await route.continue() })
  try {
    await slow.goto(origin + '/painel', { waitUntil: 'commit' })
    const menu = slow.getByRole('button', { name: 'Menu', exact: true })
    await expect(menu).toBeVisible(); await expect(menu).toBeDisabled()
    release(); await expect(menu).toBeEnabled(); await menu.click()
    await expect(slow.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  } finally { release(); await slow.unrouteAll({ behavior: 'wait' }); await context.close() }
})

test('W07 métricas do admin: linha temporal, tabelas paginadas e filtros automáticos', async ({ page }, info) => {
  await login(page, true)
  await page.goto(origin + '/admin/visao')
  const finance = await page.evaluate(async () => (await fetch('/bff/v1/admin/finance')).json())
  const daily = Array.from({ length: 15 }, (_, index) => ({ day: `2026-10-${String(index+1).padStart(2,'0')}`, orders: index+1, revenueCents: (index+1)*1000 }))
  await page.route('**/bff/v1/admin/finance?*', route => route.fulfill({json:{...finance,daily}}))
  await selectOption(page.getByLabel('Área de gestão',{exact:true}), 'financeiro')
  const panel = page.getByRole('region',{name:'Financeiro',exact:true})
  const revenue = panel.getByRole('region',{name:'Receita por dia',exact:true}).first()
  await expect(revenue.locator('.recharts-line-curve')).toHaveAttribute('d',/M/)
  await revenue.locator('.recharts-surface').focus();await page.keyboard.press('ArrowRight')
  await expect(revenue.locator('.recharts-tooltip-wrapper')).toBeVisible()
  await revenue.getByRole('tab',{name:'Tabela',exact:true}).click()
  await expect(revenue.locator('tbody tr')).toHaveCount(7)
  await revenue.getByRole('button',{name:'Próxima',exact:true}).click()
  await expect(revenue).toContainText('08/10/2026')
  await revenue.getByRole('button',{name:'Próxima',exact:true}).click()
  await expect(revenue.locator('tbody tr')).toHaveCount(1)
  await expect(revenue.getByRole('button',{name:'Próxima',exact:true})).toBeDisabled()
  if (info.project.name.includes('mobile')) await panel.getByRole('button',{name:'Ver mais filtros',exact:true}).click()
  const filtered = page.waitForRequest(request=>request.url().includes('/admin/finance?')&&request.url().includes('method=PIX'))
  await selectOption(panel.getByLabel('Método',{exact:true}), 'PIX');await filtered
  await expect(panel.getByRole('button',{name:'Aplicar',exact:true})).toHaveCount(0)
  await revenue.getByRole('tab',{name:'Gráficos',exact:true}).click()
  await checkLayout(page)
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('admin-finance-charts.png'),fullPage:true,animations:'disabled'})
  const traffic = {windowDays:30,from:'2026-10-01',views:240,entries:120,daily:daily.map(row=>({day:row.day,views:row.orders*2,entries:row.orders})),paths:[],campaigns:[],consent:{marketing:12,denied:8},funnel:[{name:'CompleteRegistration',count:12}],consentedRegistrations:[]}
  await page.route('**/bff/v1/admin/traffic?*',route=>route.fulfill({json:traffic}))
  await selectOption(page.getByLabel('Área de gestão',{exact:true}),'trafego')
  const trafficPanel=page.getByRole('region',{name:'Tráfego interno',exact:true})
  const entries=trafficPanel.getByRole('region',{name:'Entradas por dia',exact:true}).first()
  await expect(entries.locator('.recharts-line-curve')).toHaveAttribute('d',/M/)
  await entries.getByRole('tab',{name:'Tabela',exact:true}).click();await expect(entries.locator('tbody tr')).toHaveCount(7)
  await entries.getByRole('button',{name:'Próxima',exact:true}).click();await expect(entries).toContainText('08/10/2026')
  await entries.getByRole('tab',{name:'Gráficos',exact:true}).click()
  await checkLayout(page);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('admin-traffic-charts.png'),fullPage:true,animations:'disabled'})
  await page.setViewportSize({width:320,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})

test('W08 Meu Painel apresenta comparação de links com gráfico e tabela', async ({ page }, info) => {
  await login(page)
  await page.route('**/bff/v1/analytics/links/*',route=>route.fulfill({json:{impressions:100,clicks:12,ctr:12}}))
  await page.goto(origin+'/painel')
  const report=page.getByRole('region',{name:'Links mais clicados',exact:true}).first()
  await expect(report.locator('.recharts-bar-rectangle').first()).toBeVisible()
  await checkLayout(page)
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('panel-metrics-charts.png'),fullPage:true,animations:'disabled'})
  await report.getByRole('tab',{name:'Tabela',exact:true}).click()
  await expect(report.getByRole('table')).toBeVisible()
  expect(await report.locator('tbody tr').count()).toBeGreaterThan(0)
  await checkLayout(page)
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath('panel-metrics-table.png'),fullPage:true,animations:'disabled'})
})
