# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09 aparência personalizada persiste e só chega ao público após publicar
- Location: e2e\profiles.spec.ts:195:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('[data-style="shadow"]')
Expected: visible
Received: hidden
Timeout:  20000ms

Call log:
  - Expect "toBeVisible" locator('[data-style="shadow"]') with timeout 20000ms
  - waiting for locator('[data-style="shadow"]')
    43 × locator resolved to <div data-ink="light" data-style="shadow" data-align="center" data-background="solid" class="personal-page_page__gpUQV personal-page_embedded__CoB6t">…</div>
       - unexpected value "hidden"

```

```yaml
- link "Ir para o conteúdo":
  - /url: "#main-content"
- banner:
  - link "Home":
    - /url: /
  - button "Menu"
- main:
  - heading "Aparência da página" [level=1]
  - region "Editor do perfil":
    - region "Alterações não publicadas":
      - strong: Tem alterações não publicadas
      - button "Descartar" [disabled]
      - button "Publicar"
    - tablist "Seções da minha página":
      - tab "Visão geral"
      - tab "Grupos e links"
      - tab "Página"
      - tab "Aparência" [selected]
    - button "Ver prévia"
    - button "Atualizar dados"
    - group
    - form "Editar perfil":
      - tabpanel "Aparência":
        - group "Aparência da página":
          - text: Aparência da página
          - tablist "Personalizar aparência":
            - tab "Temas" [selected]
            - tab "Cores"
            - tab "Botões e texto"
          - tabpanel "Temas":
            - heading "Comece com um tema" [level=2]
            - button "Areia":
              - strong: Areia
            - button "Botânico":
              - strong: Botânico
            - button "Lavanda":
              - strong: Lavanda
            - button "Editorial":
              - strong: Editorial
            - button "Oceano":
              - strong: Oceano
            - button "Pêssego":
              - strong: Pêssego
    - complementary "Prévia ao vivo da página":
      - button "Ver prévia ao vivo"
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
  112 |     await editorSection(page, 'Aparência'); await page.getByRole('button', { name: 'Botânico', exact: true }).click()
  113 |     await publish.click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  114 |     await expect(page.getByRole('region', { name: 'Situação da revisão' })).toHaveCount(0)
  115 |     await editorSection(page, 'Página'); await page.getByLabel('Nome da página', { exact: true }).fill('ANA ESTUDOS')
  116 |     await publish.click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  117 |     expect((await (await page.request.get(runtime.stubOrigin + '/profile-validation/state')).json()).count).toBe(baseline.count)
  118 |     await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => document.fonts.ready)
  119 |     await page.screenshot({ path: info.outputPath('published-header.png'), fullPage: true, animations: 'disabled' })
  120 |     expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  121 |   } finally { await page.request.post(runtime.stubOrigin + '/profile-validation/control', { data: { unavailable: false } }) }
  122 |   await page.getByLabel('Nome da página', { exact: true }).fill('Ana — meus estudos')
  123 |   await publish.click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  124 |   const validation = await (await page.request.get(runtime.stubOrigin + '/profile-validation/state')).json()
  125 |   expect(validation.count).toBe(baseline.count + 1)
  126 |   expect(validation.last.profileContext).toMatchObject({ approved: { name: 'ANA ESTUDOS' }, changedFields: ['nome'] })
  127 |   await editorSection(page, 'Grupos e links')
  128 |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  129 |   await page.getByRole('button', { name: 'Editar link', exact: true }).click()
  130 |   await page.getByLabel('Título do link', { exact: true }).fill('SuspeitoFixture')
  131 |   await page.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/novo-destino')
  132 |   await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  133 |   await publish.click(); await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
  134 |   const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())
  135 |   expect(live.items[0].destination).toBe('https://example.com/f09-1-1')
  136 | })
  137 | 
  138 | async function stableModalSelect(page: Page, label: string, info: TestInfo, shot: string) {
  139 |   const dialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: label, exact: true }) })
  140 |   const control = dialog.getByRole('combobox', { name: label, exact: true })
  141 |   const geometry = () => dialog.evaluate(element => {
  142 |     const rect = element.getBoundingClientRect()
  143 |     return { width: rect.width, height: rect.height, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }
  144 |   })
  145 |   const before = await geometry()
  146 |   await control.click(); await expect(page.getByRole('listbox')).toBeVisible()
  147 |   await page.screenshot({ path: info.outputPath(shot + '.png'), animations: 'disabled' })
  148 |   const after = await geometry()
  149 |   expect(after.width, JSON.stringify({ before, after })).toBeCloseTo(before.width, 0)
  150 |   expect(after.height, JSON.stringify({ before, after })).toBeCloseTo(before.height, 0)
  151 |   expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth + 1)
  152 |   expect(after.scrollHeight - after.clientHeight).toBeLessThanOrEqual(Math.max(0, before.scrollHeight - before.clientHeight) + 1)
  153 |   const popup = await page.getByRole('listbox').boundingBox()
  154 |   expect(popup).not.toBeNull()
  155 |   expect(popup!.x).toBeGreaterThanOrEqual(0)
  156 |   expect(popup!.x + popup!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  157 |   await page.keyboard.press('Escape'); await expect(page.getByRole('listbox')).toHaveCount(0)
  158 |   await expect(dialog).toBeVisible(); await expect(control).toBeFocused()
  159 | }
  160 | 
  161 | test('F09-E07 selects nos modais não alteram dimensões nem acrescentam scroll', async ({ page }, info) => {
  162 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page)
  163 |   await add(page, 1, 1, 'Meu site com nome longo para conferir a largura do seletor e do modal sem esticar o conteúdo')
  164 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  165 |   await profileEditorTool(page, 'Botão principal')
  166 |   await stableModalSelect(page, 'Botão principal', info, 'primary-select-open')
  167 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  168 |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  169 |   await page.getByRole('button', { name: 'Editar link', exact: true }).click()
  170 |   await page.getByRole('dialog').getByRole('tab',{name:'Meus links',exact:true}).click()
  171 |   await stableModalSelect(page, 'Link do catálogo', info, 'catalog-select-open')
  172 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  173 | })
  174 | 
  175 | test('F09 seis temas legíveis, página inteira e movimento reduzido', async ({ page }, info) => {
  176 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  177 |   await page.emulateMedia({ reducedMotion: 'reduce' })
  178 |   for (const theme of ['Areia', 'Botânico', 'Lavanda', 'Editorial', 'Oceano', 'Pêssego']) {
  179 |     await editorSection(page, 'Aparência')
  180 |     await page.getByRole('button', { name: theme, exact: true }).click()
  181 |     await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  182 |     await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  183 |     await expect(page).toHaveTitle('Prévia da sua página | Tem Link Aqui')
  184 |     const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  185 |     expect(accessibility.violations.map(item => item.id)).toEqual([])
  186 |     await page.getByRole('link', { name: 'Meu site', exact: true }).focus()
  187 |     await expect(page.getByRole('link', { name: 'Meu site', exact: true })).toHaveCSS('transition-duration', '0s')
  188 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  189 |     await page.screenshot({ path: info.outputPath('theme-' + theme + '.png'), fullPage: true, animations: 'disabled' })
  190 |     await page.getByRole('link', { name: 'Voltar à edição' }).click()
  191 |     await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  192 |   }
  193 | })
  194 | 
  195 | test('F09 aparência personalizada persiste e só chega ao público após publicar', async ({ page }, info) => {
  196 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  197 |   await editorSection(page, 'Aparência')
  198 |   await page.getByRole('button', { name: 'Botânico', exact: true }).click()
  199 |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  200 |   await page.getByText('Cor do fundo', { exact: true }).click()
  201 |   const color = page.getByLabel('Cor do fundo — código hexadecimal')
  202 |   await color.fill('url(x)'); await expect(color).toHaveAttribute('aria-invalid', 'true')
  203 |   await color.fill('#173c32'); await expect(color).not.toHaveAttribute('aria-invalid', 'true')
  204 |   const slider = page.getByRole('slider', { name: 'Cor do fundo — Vermelho' })
  205 |   await slider.focus(); await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue('24')
  206 |   await color.fill('#173c32')
  207 |   await page.getByRole('tab', { name: 'Botões e texto', exact: true }).click()
  208 |   await selectOption(page.getByLabel('Estilo dos botões'), 'shadow')
  209 |   await autosaved(page)
  210 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  211 |   await page.reload(); await editorSection(page, 'Aparência')
> 212 |   const inlinePreview=page.getByRole('button',{name:'Ver prévia ao vivo',exact:true});if(await inlinePreview.isVisible())await inlinePreview.click()
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  213 |   await expect(page.locator('[data-style="shadow"]')).toBeVisible()
  214 |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  215 |   await page.getByText('Cor do fundo', { exact: true }).click()
  216 |   await expect(color).toHaveValue('#173c32')
  217 |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  218 |   expect(accessibility.violations.map(item => item.id)).toEqual([])
  219 |   await page.screenshot({ path: info.outputPath('appearance-editor.png'), fullPage: true })
  220 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('appearance-editor.png', { fullPage: true, animations: 'disabled' })
  221 |   const originalViewport = page.viewportSize()!
  222 |   await page.setViewportSize({ width: 320, height: 844 })
  223 |   await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  224 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  225 |   expect(await page.locator('details code').first().evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24)
  226 |   await page.screenshot({ path: info.outputPath('appearance-320-text-200.png'), fullPage: true })
  227 |   await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  228 |   await page.setViewportSize(originalViewport)
  229 |   await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  230 |   await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  231 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  232 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  233 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  234 |   await page.getByRole('link', { name: 'Voltar à edição' }).click()
  235 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  236 |   await editorSection(page, 'Aparência')
  237 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  238 |   await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  239 |   await page.goto(A + '/p/ana-estudos')
  240 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  241 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  242 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  243 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  244 |   await page.getByRole('button', { name: 'Gerenciar cookies', exact: true }).click()
  245 |   await page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  246 |   await expect(page.getByRole('region', { name: 'Este site usa cookies' })).toHaveCount(0)
  247 |   await page.screenshot({ path: info.outputPath('personal-page.png'), fullPage: true })
  248 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('personal-page.png', { fullPage: true, animations: 'disabled' })
  249 | })
  250 | test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  251 |   const s = fixture(); await login(page); await base(page)
  252 |   await add(page, 1, 1, 'Site principal'); await add(page, 1, 2, 'Material de leitura'); await add(page, 1, 3, 'OcultoSentinela', false)
  253 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Redes sociais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  254 |   const socialRow = await add(page, 2, 1, 'Vídeos'); await socialRow.getByRole('button', { name: 'Editar link', exact: true }).click(); const social = page.getByRole('dialog'); await expect(social.getByRole('tab',{name:'Novo',exact:true})).toHaveAttribute('aria-selected','true');await expect(social.getByRole('option',{name:'Rede social',exact:true})).toHaveCount(0); await social.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/videos'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  255 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await profileEditorTool(page, 'Botão principal')
  256 |   await selectOption(page.getByRole('combobox', { name: 'Botão principal', exact: true }), { label: 'Site principal' })
  257 |   await page.screenshot({ path: info.outputPath('primary-button-modal.png'), fullPage: true, animations: 'disabled' })
  258 |   await page.getByRole('dialog').getByRole('button', { name: 'Concluir', exact: true }).click()
  259 |   await expect(page.getByLabel('Mais opções da página', { exact: true })).toBeFocused()
  260 |   await step(page, 1)
  261 |   for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
  262 |     const buffer = mime === 'image/png' ? readFileSync(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png')) : Buffer.from(await page.evaluate(mime => {
  263 |       const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16
  264 |       const context = canvas.getContext('2d')!; context.fillStyle = '#146dca'; context.fillRect(0, 0, 16, 16)
  265 |       return canvas.toDataURL(mime).split(',')[1]
  266 |     }, mime), 'base64')
  267 |     await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'foto.' + mime.split('/')[1], mimeType: mime, buffer })
  268 |     await expect(page.getByLabel('Foto do perfil', { exact: true })).toBeEnabled(); await expect(page.getByRole('img', { name: 'Foto atual do perfil' })).toBeVisible(); await autosaved(page)
  269 |   }
  270 |   await step(page, 2)
  271 |   const socialCard = page.getByRole('listitem').filter({ hasText: 'Redes sociais' }); await socialCard.getByText('Mover', { exact: true }).click(); await socialCard.getByRole('button', { name: 'Subir grupo', exact: true }).click()
  272 |   await step(page, 3)
  273 |   let releasePreview = () => {}
  274 |   const previewHeld = new Promise<void>(resolve => { releasePreview = resolve })
  275 |   await page.route('**/bff/v1/me/profile/preview/items', async route => { await previewHeld; await route.continue() })
  276 |   try {
  277 |     await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  278 |     await expect(page).toHaveURL(A + '/painel/perfil/previa')
  279 |     await expect(page.locator('[data-skeleton]:visible')).toHaveCount(1)
  280 |     await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  281 |     await page.screenshot({ path: info.outputPath('private-preview-loading.png'), fullPage: true })
  282 |   } finally { releasePreview(); await page.unrouteAll({ behavior: 'wait' }) }
  283 |   const preview = page.getByRole('article', { name: 'Perfil público', exact: true })
  284 |   await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  285 |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  286 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/me/profile/preview')).headers.get('cache-control'))).toContain('no-store')
  287 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  288 |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  289 |   expect(accessibility.violations.map(item => item.id)).toEqual([])
  290 |   await expect(preview.getByRole('link', { name: 'Vídeos' })).toBeVisible(); expect(await preview.innerHTML()).not.toContain('OcultoSentinela')
  291 |   await preview.scrollIntoViewIfNeeded()
  292 |   await expect.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  293 |   await page.screenshot({ path: info.outputPath('private-preview.png'), fullPage: true })
  294 |   const size = page.viewportSize()!
  295 |   await page.setViewportSize({ width: size.width, height: 450 })
  296 |   await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  297 |   await expect.poll(async () => (await page.getByRole('region', { name: 'Modo de prévia' }).boundingBox())!.y).toBe(0)
  298 |   await page.getByRole('link', { name: 'Voltar à edição', exact: true }).click()
  299 |   await editorSection(page, 'Página')
  300 |   await page.setViewportSize(size)
  301 |   await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  302 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  303 |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  304 |   try {
  305 |     const guest = await context.newPage(); await guest.goto(A + '/painel/perfil/previa')
  306 |     await expect(guest.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  307 |     expect((await privateCall(guest, '/preview')).status).toBe(401)
  308 |     expect(await guest.content()).not.toContain('Ana Estudos')
  309 |     await guest.goto(A + '/p/ana-estudos')
  310 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  311 |     const profile = guest.getByRole('article', { name: 'Perfil público' })
  312 |     await expect(profile.getByRole('heading', { level: 2 })).toHaveText(['Redes sociais', 'Materiais'])
```