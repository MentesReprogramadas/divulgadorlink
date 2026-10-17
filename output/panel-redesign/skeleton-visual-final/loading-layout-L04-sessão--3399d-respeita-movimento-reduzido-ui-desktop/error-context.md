# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: loading-layout.spec.ts >> L04 sessão lenta preserva a geometria do formulário de publicar e respeita movimento reduzido
- Location: e2e\loading-layout.spec.ts:111:5

# Error details

```
Error: route.continue: Route is already handled!
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-skeleton]:visible').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-skeleton]:visible').first() with timeout 20000ms
  - waiting for locator('[data-skeleton]:visible').first()

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
      - group:
        - text: Publicação
        - link "Links":
          - /url: /painel/links
        - link "Criar link":
          - /url: /painel/links/novo
        - link "Minha página":
          - /url: /painel/perfil
        - link "Convites":
          - /url: /painel/convites
      - paragraph: Acompanhar
      - link "Pedidos":
        - /url: /painel/pedidos
      - link "Lembretes":
        - /url: /painel/lembretes
      - link "Favoritos":
        - /url: /painel/favoritos
      - paragraph: Preferências
      - link "Conta":
        - /url: /painel/conta
  - heading "Novo link" [level=1]
  - list "Etapas do formulário":
    - listitem:
      - button "1 Título e acesso" [disabled]: Título e acesso
    - listitem:
      - button "2 Assunto e descrição" [disabled]
    - listitem:
      - button "3 Conferir e enviar" [disabled]
  - paragraph: "Etapa 1 de 3: Título e acesso"
  - group "Título e acesso":
    - text: "Título e acesso Publicação grátis Vagas em uso: 2 de 4. Título do link"
    - textbox "Título do link":
      - /placeholder: "Ex.: Receitas da Ana"
    - text: "Nome do grupo, canal ou página. Ex.: Receitas da Ana. Não coloque seu nome pessoal. Link de acesso"
    - textbox "Link de acesso":
      - /placeholder: https://
    - text: Cole o endereço completo, começando com https://.
  - button "Continuar"
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
  20  |   test(`L01 ${admin ? 'admin' : 'painel'}: skeletons durante rede lenta preservam cabeçalho, largura e controles`, async ({ page }, info) => {
  21  |     test.setTimeout(180_000)
  22  |     await login(page, admin)
  23  |     const id = fixture().receitas
  24  |     const routes: Array<[string, string]> = admin ? [
  25  |       ['/admin/visao', '/v1/admin/office'], ['/admin/moderacao', '/v1/admin/moderation'], ['/admin/denuncias', '/v1/admin/reports'], ['/admin/disponibilidade', '/v1/admin/url-proposals'], ['/admin/planos', '/v1/promotions/offers'], ['/admin/estornos', '/v1/admin/refunds'], ['/admin/integracoes', '/v1/admin/integrations/evolution/status'], ['/admin/configuracoes', '/v1/admin/facets'],
  26  |     ] : [
  27  |       ['/painel', '/v1/links/mine'], ['/painel/links', '/v1/links/mine'], ['/painel/pedidos', '/v1/orders/mine'], ['/painel/perfil', '/v1/me/profile'], ['/painel/favoritos', '/v1/me/favorites'], ['/painel/convites', '/v1/me/redirects'], ['/painel/lembretes', '/v1/promotions/mine/reminders'], [`/painel/links/${id}/editar`, '/v1/links/mine'], [`/painel/links/${id}/disponibilidade`, `/v1/links/${id}/availability`], [`/painel/links/${id}/resultado`, `/v1/analytics/links/${id}/performance`], [`/painel/links/${id}/destaque`, '/v1/promotions/offers'], [`/painel/denunciar/${id}`, `/v1/links/${id}`], ['/busca?q=Receitas', '/v1/search'],
  28  |     ]
  29  |     for (const [url, endpoint] of routes) await test.step(url, async () => {
  30  |       let release = () => {}; let intercepted = 0
  31  |       const held = new Promise<void>(resolve => { release = resolve })
  32  |       await page.route('**/bff/v1/**', async route => {
  33  |         if (new URL(route.request().url()).pathname === '/bff' + endpoint) { intercepted++; await held }
  34  |         await route.continue()
  35  |       })
  36  |       try {
  37  |         await page.goto(origin + url, { waitUntil: 'domcontentloaded' })
  38  |         await expect.poll(() => intercepted).toBeGreaterThan(0)
  39  |         await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
  40  |         const header = page.locator('header').first()
  41  |         const before = await header.boundingBox()
  42  |         const formBefore = url.endsWith('/perfil') ? await page.locator('[data-layout="profile-form"]').boundingBox() : null
  43  |         if (formBefore) {
  44  |           const color = await page.locator('[data-skeleton] input:disabled').first().evaluate(el => getComputedStyle(el).backgroundColor)
  45  |           const placeholder = await page.locator('[data-skeleton] [data-skeleton-block]').first().evaluate(el => getComputedStyle(el).backgroundColor)
  46  |           expect(color).toBe(placeholder)
  47  |         }
  48  |         expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  49  |         const name = url.split('?')[0].replaceAll('/', '-').replace(id, 'link').slice(1)
  50  |         await page.screenshot({ path: info.outputPath(name + '-loading.png'), fullPage: true, animations: 'disabled' })
  51  |         if (url.endsWith('/perfil') || url.endsWith('/configuracoes')) {
  52  |           const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  53  |           expect(result.violations.map(v => v.id)).toEqual([])
  54  |         }
  55  |         release()
  56  |         await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  57  |         const after = await header.boundingBox()
  58  |         expect(after).toEqual(before)
  59  |         if (formBefore) {
  60  |           const formAfter = await page.locator('[data-layout="profile-form"]').boundingBox()
  61  |           expect(formAfter!.x).toBe(formBefore.x)
  62  |           expect(formAfter!.y).toBe(formBefore.y)
  63  |           expect(formAfter!.width).toBe(formBefore.width)
  64  |           expect(Math.abs(formAfter!.height - formBefore.height)).toBeLessThanOrEqual(2)
  65  |         }
  66  |         await page.screenshot({ path: info.outputPath(name + '-ready.png'), fullPage: true, animations: 'disabled' })
  67  |       } finally { release(); await page.unroute('**/bff/v1/**') }
  68  |     })
  69  |   })
  70  | }
  71  | 
  72  | test('L02 atualização da disponibilidade mantém o conteúdo e bloqueia atualização duplicada', async ({ page }) => {
  73  |   await login(page, false)
  74  |   await page.goto(origin + `/painel/links/${fixture().receitas}/disponibilidade`)
  75  |   await expect(page.getByText('Histórico de correções', { exact: true })).toBeVisible()
  76  |   let release = () => {}; let received = false
  77  |   const held = new Promise<void>(resolve => { release = resolve })
  78  |   await page.route('**/bff/v1/links/*/availability', async route => { received = true; await held; await route.continue() })
  79  |   try {
  80  |     const refresh = page.getByRole('button', { name: 'Atualizar dados', exact: true })
  81  |     await refresh.click()
  82  |     await expect.poll(() => received).toBe(true)
  83  |     await expect(refresh).toBeDisabled()
  84  |     await expect(page.getByText('Histórico de correções', { exact: true })).toBeVisible()
  85  |     await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  86  |     release()
  87  |     await expect(refresh).toBeEnabled()
  88  |   } finally { release(); await page.unroute('**/bff/v1/links/*/availability') }
  89  | })
  90  | 
  91  | test('L03 envio mantém a dimensão do botão e os campos enquanto aguarda a resposta', async ({ page }) => {
  92  |   await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  93  |   await page.goto(origin + '/login')
  94  |   await page.getByLabel('E-mail', { exact: true }).fill(fixture().bia)
  95  |   await page.getByLabel('Senha', { exact: true }).fill(fixture().password)
  96  |   let release = () => {}; let received = false
  97  |   const held = new Promise<void>(resolve => { release = resolve })
  98  |   await page.route('**/bff/v1/auth/login', async route => { received = true; await held; await route.continue() })
  99  |   try {
  100 |     const button = page.getByRole('button', { name: 'Entrar', exact: true })
  101 |     const before = await button.boundingBox()
  102 |     await button.click(); await expect.poll(() => received).toBe(true)
  103 |     await expect(button).toBeDisabled()
  104 |     expect(await button.boundingBox()).toEqual(before)
  105 |     await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(fixture().bia)
  106 |     release()
  107 |     await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  108 |   } finally { release(); await page.unroute('**/bff/v1/auth/login') }
  109 | })
  110 | 
  111 | test('L04 sessão lenta preserva a geometria do formulário de publicar e respeita movimento reduzido', async ({ page }, info) => {
  112 |   await login(page, false)
  113 |   await page.evaluate(() => sessionStorage.removeItem('catalogo.session'))
  114 |   let release = () => {}; let received = false
  115 |   const held = new Promise<void>(resolve => { release = resolve })
  116 |   await page.route('**/bff/v1/auth/session', async route => { received = true; await held; await route.continue() })
  117 |   try {
  118 |     await page.goto(origin + '/painel/links/novo', { waitUntil: 'domcontentloaded' })
  119 |     await expect.poll(() => received).toBe(true)
> 120 |     await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
      |                                                                   ^ Error: expect(locator).toBeVisible() failed
  121 |     await page.evaluate(() => document.fonts.ready)
  122 |     const before = await page.locator('[data-layout="submission-form"]').boundingBox()
  123 |     await page.emulateMedia({ reducedMotion: 'reduce' })
  124 |     expect(await page.locator('[data-skeleton-block]').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  125 |     await page.screenshot({ path: info.outputPath('submission-session-loading.png'), fullPage: true, animations: 'disabled' })
  126 |     release()
  127 |     await expect(page.getByLabel('Título do link', { exact: true })).toBeVisible()
  128 |     await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  129 |     const after = await page.locator('[data-layout="submission-form"]').boundingBox()
  130 |     expect(after!.x).toBe(before!.x)
  131 |     expect(after!.y).toBe(before!.y)
  132 |     expect(after!.width).toBe(before!.width)
  133 |     expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(2)
  134 |     await page.screenshot({ path: info.outputPath('submission-session-ready.png'), fullPage: true, animations: 'disabled' })
  135 |   } finally { release(); await page.unroute('**/bff/v1/auth/session') }
  136 | })
  137 | 
  138 | 
  139 | test('L05 navegação entre abas mostra somente o skeleton de destino, sem a visão geral', async ({ page }, info) => {
  140 |   await login(page, false)
  141 |   await expect(page.getByRole('heading', { name: 'O que você quer fazer?', exact: true })).toBeVisible()
  142 |   let release = () => {}; let received = false
  143 |   const held = new Promise<void>(resolve => { release = resolve })
  144 |   await page.route('**/bff/v1/orders/mine', async route => { received = true; await held; await route.continue() })
  145 |   await page.evaluate(() => {
  146 |     const samples: string[] = []
  147 |     Object.assign(window, { navigationSamples: samples })
  148 |     new MutationObserver(() => {
  149 |       const main = document.querySelector('main')
  150 |       if (main?.querySelector('h1')?.textContent === 'Meus pedidos') samples.push(main.textContent ?? '')
  151 |     }).observe(document.body, { childList: true, subtree: true, characterData: true })
  152 |   })
  153 |   try {
  154 |     if (info.project.name.includes('mobile')) await page.getByRole('button', { name: 'Menu', exact: true }).click()
  155 |     await page.locator('nav[aria-label="Áreas do painel"]:visible').getByRole('link', { name: 'Pedidos', exact: true }).click()
  156 |     await expect.poll(() => received).toBe(true)
  157 |     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meus pedidos')
  158 |     await expect(page.locator('[data-skeleton]:visible').first()).toBeVisible()
  159 |     const samples = await page.evaluate(() => (window as Window & { navigationSamples?: string[] }).navigationSamples ?? [])
  160 |     expect(samples.length).toBeGreaterThan(0)
  161 |     expect(samples.join(' ')).not.toMatch(/O que você quer fazer|Precisa de atenção/)
  162 |     release()
  163 |     await expect(page.locator('[data-skeleton]:visible')).toHaveCount(0)
  164 |   } finally { release(); await page.unroute('**/bff/v1/orders/mine') }
  165 | })
  166 | 
  167 | test('L06 menu do site usa uma coluna no catálogo e busca e duas no painel e admin', async ({ page }, info) => {
  168 |   await page.setViewportSize({ width: 390, height: 844 })
  169 |   await login(page, true)
  170 |   for (const [url, columns] of [['/', 1], ['/busca', 1], ['/painel', 2], ['/admin/visao', 2]] as const) {
  171 |     await page.goto(origin + url)
  172 |     await page.getByRole('button', { name: 'Menu', exact: true }).click()
  173 |     const nav = page.getByRole('navigation', { name: 'Navegação do site', exact: true })
  174 |     await expect(nav).toHaveAttribute('data-columns', String(columns))
  175 |     expect(await nav.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns)
  176 |     await page.screenshot({ path: info.outputPath('sidebar-' + (url.replaceAll('/', '-') || 'catalog') + '.png'), animations: 'disabled' })
  177 |     await page.keyboard.press('Escape')
  178 |   }
  179 | })
  180 | 
```