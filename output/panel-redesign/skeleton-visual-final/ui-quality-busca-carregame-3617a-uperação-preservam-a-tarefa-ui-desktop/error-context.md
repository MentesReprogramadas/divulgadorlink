# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-quality.spec.ts >> busca: carregamento, falha e recuperação preservam a tarefa
- Location: e2e\ui-quality.spec.ts:102:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('status', { name: 'Carregando' })
Expected: visible
Error: strict mode violation: getByRole('status', { name: 'Carregando' }) resolved to 2 elements:
    1) <div role="status" data-skeleton="true" aria-label="Carregando" class="skeleton_region__YZljW">…</div> aka getByRole('status', { name: 'Carregando', exact: true })
    2) <div role="status" data-skeleton="true" aria-label="Carregando links" class="skeleton_region__YZljW">…</div> aka getByRole('status', { name: 'Carregando links' })

Call log:
  - Expect "toBeVisible" getByRole('status', { name: 'Carregando' }) with timeout 20000ms
  - waiting for getByRole('status', { name: 'Carregando' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Ir para o conteúdo" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Home" [ref=e5] [cursor=pointer]:
        - /url: /
      - navigation "Navegação principal" [ref=e7]:
        - link "Busca" [ref=e8] [cursor=pointer]:
          - /url: /busca
        - link "Entrar" [ref=e12] [cursor=pointer]:
          - /url: /login
        - link "Criar conta" [ref=e16] [cursor=pointer]:
          - /url: /cadastro
  - main [ref=e21]:
    - status "Carregando" [ref=e22]:
      - heading [level=1] [ref=e27]: Buscar
    - status "Carregando links" [ref=e31]
  - contentinfo [ref=e83]:
    - generic [ref=e84]: Tem Link Aqui
    - navigation "Informações do site" [ref=e85]:
      - link "Termos" [ref=e86] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=e87] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=e88] [cursor=pointer]
  - region [ref=e90]:
    - generic [ref=e91]:
      - generic [ref=e92]:
        - heading "Este site usa cookies" [level=2] [ref=e93]
        - paragraph [ref=e94]:
          - text: Usamos cookies para o site funcionar e, com seu aceite, medir anúncios. Veja a
          - link "Política de Privacidade" [ref=e95] [cursor=pointer]:
            - /url: /privacidade
          - text: .
      - generic [ref=e96]:
        - button "Aceitar" [ref=e97] [cursor=pointer]
        - button "Recusar" [ref=e99] [cursor=pointer]
  - alert [ref=e101]
```

# Test source

```ts
  16  |     const fixture = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as Fixture
  17  |     const errors: string[] = []
  18  |     page.on('pageerror', error => errors.push(error.message))
  19  |     await page.route(/facebook|google(tagmanager|adservices)|doubleclick/, route => route.abort())
  20  |     await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  21  |     if (role !== 'public') {
  22  |       await page.goto(`${origin}/login`)
  23  |       await page.getByLabel('E-mail', { exact: true }).fill(role === 'admin' ? fixture.admin : fixture.bia)
  24  |       await page.getByLabel('Senha', { exact: true }).fill(fixture.password)
  25  |       await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  26  |       await expect(page).toHaveURL(/\/painel/)
  27  |     }
  28  |     const routes = role === 'public' ? [...publicRoutes, `/link/${fixture.receitas}`] : role === 'user'
  29  |       ? ['/painel', '/painel/links', '/painel/links/novo', `/painel/links/${fixture.receitas}/editar`, `/painel/links/${fixture.receitas}/destaque`, `/painel/links/${fixture.receitas}/contestar`, '/painel/pedidos', '/painel/conta']
  30  |       : ['/admin/visao', '/admin/moderacao', '/admin/planos', '/admin/configuracoes', '/admin/integracoes', '/admin/estornos']
  31  |     for (const route of routes) {
  32  |       await test.step(route, async () => {
  33  |         const response = await page.goto(`${origin}${route}`)
  34  |         expect(response?.status()).toBe(200)
  35  |         await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  36  |         await page.waitForLoadState('networkidle')
  37  |         await page.evaluate(() => document.fonts.ready)
  38  |         if (route === '/admin/planos') {
  39  |           const edit = page.getByRole('button', { name: 'Editar', exact: true }).first()
  40  |           await edit.click()
  41  |           await expect(page.getByRole('dialog')).toBeVisible()
  42  |           await page.keyboard.press('Escape')
  43  |           await expect(page.getByRole('dialog')).toHaveCount(0)
  44  |           await expect(edit).toBeFocused()
  45  |         }
  46  |         if (route === '/admin/visao') {
  47  |           const selector = page.getByLabel('Área de gestão', { exact: true })
  48  |           const sections = [{value:'metricas',label:'Métricas'}, {value:'contas',label:'Contas'}, {value:'links',label:'Links'}, {value:'cliques',label:'Cliques'}, {value:'pagadores',label:'Pagadores'}, {value:'trafego',label:'Tráfego'}, {value:'financeiro',label:'Financeiro'}, {value:'retencao',label:'Retenção'}]
  49  |           for (let index = 0; index < sections.length; index += 1) {
  50  |             const sectionLabel = sections[index]!.label
  51  |             await selectOption(selector, sections[index]!.value)
  52  |             await page.waitForLoadState('networkidle')
  53  |             if (role === 'admin' && (sectionLabel === 'Tráfego' || sectionLabel === 'Financeiro')) {
  54  |               await expect(page.locator('[role="tablist"]:not([aria-label="Área de gestão em abas"])')).toBeVisible()
  55  |             }
  56  |             const tabs = page.locator('[role="tab"]:not([id^="office-area-"])')
  57  |             for (let tabIndex = 0; tabIndex < await tabs.count(); tabIndex += 1) {
  58  |               await tabs.nth(tabIndex).click()
  59  |               await expect(tabs.nth(tabIndex)).toHaveAttribute('aria-selected', 'true')
  60  |               await page.waitForLoadState('networkidle')
  61  |               expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${route}: aba ${tabIndex}`).toBe(true)
  62  |               const tabAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  63  |               expect.soft(tabAccessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), `${route}: seção ${index}, aba ${tabIndex}`).toEqual([])
  64  |             }
  65  |             const sectionAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  66  |             expect.soft(sectionAccessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), `${route}: seção ${index}`).toEqual([])
  67  |             await testInfo.attach(`${role}-section-${index}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' })
  68  |           }
  69  |         }
  70  |         await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  71  |         const unnamed = await page.locator('input:not([type="hidden"]), select, textarea').evaluateAll(controls => controls.filter(control => {
  72  |           const input = control as HTMLInputElement
  73  |           if (input.getAttribute('aria-hidden') === 'true') return false
  74  |           return !input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')
  75  |         }).map(control => control.outerHTML.slice(0, 160)))
  76  |         expect(unnamed).toEqual([])
  77  |         const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  78  |         expect.soft(accessibility.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), route).toEqual([])
  79  |         if (['/painel', '/painel/links', '/admin/moderacao', '/painel/links/novo', '/admin/configuracoes'].includes(route)) {
  80  |           await page.screenshot({ path: testInfo.outputPath(route.replaceAll('/', '-').slice(1) + '.png'), fullPage: true, animations: 'disabled', caret: 'hide' })
  81  |         }
  82  |         if (stableScreens.has(route)) {
  83  |           await expect(page).toHaveScreenshot(`${route.replaceAll('/', '-').slice(1)}.png`, { fullPage: true, animations: 'disabled', caret: 'hide' })
  84  |         }
  85  |       })
  86  |     }
  87  |     expect(errors).toEqual([])
  88  |     await testInfo.attach('routes', { body: JSON.stringify({ role, routes }), contentType: 'application/json' })
  89  |   })
  90  | }
  91  | 
  92  | test('landing: foco por teclado e CTA levam ao cadastro', async ({ page }) => {
  93  |   await page.goto(`${origin}/divulgar`)
  94  |   await page.keyboard.press('Tab')
  95  |   await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
  96  |   await page.keyboard.press('Enter')
  97  |   await page.getByRole('link', { name: 'Publicar um link', exact: true }).click()
  98  |   await expect(page).toHaveURL(/\/cadastro/)
  99  |   await expect(page.getByLabel('Nome', { exact: true })).toBeVisible()
  100 | })
  101 | 
  102 | test('busca: carregamento, falha e recuperação preservam a tarefa', async ({ page }) => {
  103 |   let release: () => void = () => undefined
  104 |   const gate = new Promise<void>(resolve => { release = resolve })
  105 |   let attempts = 0
  106 |   await page.route('**/bff/v1/search?**', async route => {
  107 |     attempts += 1
  108 |     if (attempts === 1) {
  109 |       await gate
  110 |       await route.fulfill({ status: 503, json: {} })
  111 |     } else {
  112 |       await route.fulfill({ status: 200, json: { target: { kind: 'results', slug: null }, sponsored: [], organic: [] } })
  113 |     }
  114 |   })
  115 |   await page.goto(`${origin}/busca?q=recuperacao`, { waitUntil: 'domcontentloaded' })
> 116 |   await expect(page.getByRole('status', { name: 'Carregando' })).toBeVisible()
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  117 |   release()
  118 |   await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  119 |   await page.getByRole('button', { name: 'Tentar de novo' }).click()
  120 |   await expect(page.getByText('Nenhum link encontrado', { exact: true })).toBeVisible()
  121 |   await expect(page.getByRole('combobox', { name: 'Busca', exact: true })).toHaveValue('recuperacao')
  122 | })
  123 | 
  124 | test('login: falha de rede libera uma nova tentativa', async ({ page }) => {
  125 |   await page.route('**/bff/v1/auth/login', route => route.abort('failed'))
  126 |   await page.goto(`${origin}/login`)
  127 |   await page.getByLabel('E-mail', { exact: true }).fill('teste@tenant-a.test')
  128 |   await page.getByLabel('Senha', { exact: true }).fill('Senha-e2e-1')
  129 |   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  130 |   await expect(page.getByRole('main').getByRole('alert')).toContainText('Verifique sua conexão')
  131 |   await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled()
  132 | })
  133 | 
```