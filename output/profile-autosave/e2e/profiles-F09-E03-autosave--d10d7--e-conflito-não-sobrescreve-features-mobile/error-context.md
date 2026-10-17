# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E03 autosave offline mantém dados, retoma online, 320px e conflito não sobrescreve
- Location: e2e\profiles.spec.ts:214:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Sem conexão."
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="profiles_error__wjhI8">…</div> aka getByText('Sem conexão. Seus dados foram mantidos; tente novamente.Tentar novamente')
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div> aka locator('[id="__next-route-announcer__"]')

Call log:
  - Expect "toContainText" getByRole('alert') with timeout 20000ms
  - waiting for getByRole('alert')
    5 × locator resolved to <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div>
      - unexpected value ""

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - link "Ir para o conteúdo" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - link "Home" [ref=f2e5] [cursor=pointer]:
        - /url: /
      - button "Menu" [ref=f2e7] [cursor=pointer]
  - main [ref=f2e11]:
    - generic [ref=f2e12]:
      - heading "Minha página de links" [level=1] [ref=f2e15]
      - region "Editor do perfil" [ref=f2e17]:
        - alert [ref=f2e18]:
          - generic [ref=f2e19]: Sem conexão. Seus dados foram mantidos; tente novamente.
          - button "Tentar novamente" [ref=f2e20] [cursor=pointer]
        - region "Alterações não publicadas" [ref=f2e22]:
          - strong [ref=f2e23]: Tem alterações não publicadas
          - generic [ref=f2e24]:
            - generic "Disponível depois da primeira publicação" [ref=f2e25]:
              - button "Descartar" [disabled] [ref=f2e26]
            - button "Publicar" [ref=f2e28] [cursor=pointer]
        - generic [ref=f2e30]:
          - status [ref=f2e31]: Não foi possível salvar
          - generic [ref=f2e32]:
            - button "Ver prévia" [ref=f2e33] [cursor=pointer]
            - group [ref=f2e35]:
              - generic "Mais opções da página" [ref=f2e36] [cursor=pointer]: ⋯
        - generic [ref=f2e38]:
          - generic [ref=f2e39]: Editar minha página
          - generic [ref=f2e41]:
            - combobox "Editar minha página" [ref=f2e42] [cursor=pointer]:
              - generic [ref=f2e43]: Página
            - textbox [aria-hidden] [ref=f2e47]: identity
        - form "Editar perfil" [ref=f2e48]:
          - tabpanel "Página" [ref=f2e49]:
            - group "Dados da página" [ref=f2e50]:
              - group "Página" [ref=f2e52]:
                - generic "Alteração não publicada" [ref=f2e54]:
                  - generic [ref=f2e55]:
                    - generic [ref=f2e56]:
                      - generic [ref=f2e57]: Nome da página
                      - generic [aria-hidden] [ref=f2e58]: "*"
                    - textbox "Nome da página" [ref=f2e59]:
                      - /placeholder: "Ex.: Receitas da Ana"
                      - text: Ana Estudos
                - generic "Alteração não publicada" [ref=f2e60]:
                  - generic [ref=f2e61]:
                    - generic [ref=f2e62]:
                      - generic [ref=f2e63]: Endereço da página
                      - generic [aria-hidden] [ref=f2e64]: "*"
                    - textbox "Endereço da página" [ref=f2e65]:
                      - /placeholder: receitas-da-ana
                      - text: ana-estudos
                    - generic [ref=f2e66]: /p/ana-estudos
                - generic "Alteração não publicada" [ref=f2e67]:
                  - generic [ref=f2e68]:
                    - generic [ref=f2e69]: Descrição
                    - textbox "Descrição" [active] [ref=f2e71]: Texto offline preservado
                - generic [ref=f2e73]:
                  - generic [ref=f2e74]: Foto do perfil
                  - generic [ref=f2e75] [cursor=pointer]:
                    - generic [ref=f2e79]:
                      - strong [ref=f2e80]: Escolher foto
                      - generic [ref=f2e81]: Toque para escolher ou arraste uma imagem.
                    - button "Foto do perfil" [ref=f2e82]
                  - paragraph [ref=f2e83]: PNG, JPG ou WebP até 5 MB. Comprimida automaticamente em WebP. Vai ao ar após publicar.
                - generic [ref=f2e85]:
                  - checkbox "Conteúdo para maiores de 18 anos" [ref=f2e86]
                  - text: Conteúdo para maiores de 18 anos
  - contentinfo [ref=f2e87]:
    - generic [ref=f2e88]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e89]:
      - link "Termos" [ref=f2e90] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e91] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e92] [cursor=pointer]
  - alert [ref=f2e93]
```

# Test source

```ts
  117 |   const socialRow = await add(page, 2, 1, 'Vídeos'); await socialRow.getByRole('button', { name: 'Editar link', exact: true }).click(); const social = page.getByRole('dialog'); await selectOption(social.getByLabel('Tipo de link'), 'SOCIAL'); await social.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/videos'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  118 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await page.getByText('Escolher botão principal', { exact: true }).click()
  119 |   await selectOption(page.getByLabel('Botão principal'), { label: 'Site principal' })
  120 |   await step(page, 1)
  121 |   for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
  122 |     const buffer = mime === 'image/png' ? readFileSync(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png')) : Buffer.from(await page.evaluate(mime => {
  123 |       const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16
  124 |       const context = canvas.getContext('2d')!; context.fillStyle = '#146dca'; context.fillRect(0, 0, 16, 16)
  125 |       return canvas.toDataURL(mime).split(',')[1]
  126 |     }, mime), 'base64')
  127 |     await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'foto.' + mime.split('/')[1], mimeType: mime, buffer })
  128 |     await expect(page.getByLabel('Foto do perfil', { exact: true })).toBeEnabled(); await expect(page.getByRole('img', { name: 'Foto atual do perfil' })).toBeVisible(); await autosaved(page)
  129 |   }
  130 |   await step(page, 2)
  131 |   const socialCard = page.getByRole('listitem').filter({ hasText: 'Redes sociais' }); await socialCard.getByText('Mover', { exact: true }).click(); await socialCard.getByRole('button', { name: 'Subir grupo', exact: true }).click()
  132 |   await step(page, 3)
  133 |   let releasePreview = () => {}
  134 |   const previewHeld = new Promise<void>(resolve => { releasePreview = resolve })
  135 |   await page.route('**/bff/v1/me/profile/preview', async route => { await previewHeld; await route.continue() })
  136 |   try {
  137 |     await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  138 |     await expect(page).toHaveURL(A + '/painel/perfil/previa')
  139 |     await expect(page.locator('[data-skeleton]:visible')).toHaveCount(1)
  140 |     await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  141 |     await page.screenshot({ path: info.outputPath('private-preview-loading.png'), fullPage: true })
  142 |   } finally { releasePreview(); await page.unrouteAll({ behavior: 'wait' }) }
  143 |   const preview = page.getByRole('article', { name: 'Perfil público', exact: true })
  144 |   await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  145 |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  146 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/me/profile/preview')).headers.get('cache-control'))).toContain('no-store')
  147 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  148 |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  149 |   expect(accessibility.violations.map(item => item.id)).toEqual([])
  150 |   await expect(preview.getByRole('link', { name: 'Vídeos' })).toBeVisible(); expect(await preview.innerHTML()).not.toContain('OcultoSentinela')
  151 |   await preview.scrollIntoViewIfNeeded()
  152 |   await expect.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  153 |   await page.screenshot({ path: info.outputPath('private-preview.png'), fullPage: true })
  154 |   const size = page.viewportSize()!
  155 |   await page.setViewportSize({ width: size.width, height: 450 })
  156 |   await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  157 |   await expect.poll(async () => (await page.getByRole('region', { name: 'Modo de prévia' }).boundingBox())!.y).toBe(0)
  158 |   await page.getByRole('link', { name: 'Voltar à edição', exact: true }).click()
  159 |   await page.setViewportSize(size)
  160 |   await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  161 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  162 |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  163 |   try {
  164 |     const guest = await context.newPage(); await guest.goto(A + '/painel/perfil/previa')
  165 |     await expect(guest.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  166 |     expect((await privateCall(guest, '/preview')).status).toBe(401)
  167 |     expect(await guest.content()).not.toContain('Ana Estudos')
  168 |     await guest.goto(A + '/p/ana-estudos')
  169 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  170 |     const profile = guest.getByRole('article', { name: 'Perfil público' })
  171 |     await expect(profile.getByRole('heading', { level: 2 })).toHaveText(['Redes sociais', 'Materiais'])
  172 |     await expect(profile.getByRole('link')).toHaveCount(3)
  173 |     expect(await guest.content()).not.toMatch(/OcultoSentinela|owner@profiles.test|passwordHash/)
  174 |     const response = await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(response).not.toContain('OcultoSentinela')
  175 |     expect(await profile.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  176 |     await guest.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  177 |     await guest.screenshot({ path: info.outputPath('public-profile.png'), fullPage: true })
  178 |     await expect(guest.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://profiles.localhost/p/ana-estudos')
  179 |     await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  180 |   } finally { await context.close() }
  181 |   expect(sql(`SELECT COUNT(*) FROM links WHERE "tenantId"='${s.tenantId}'`)).toBe('1')
  182 |   await page.reload(); await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  183 | })
  184 | test('F09-E04 restrição de idade não entrega conteúdo no HTML/API antes do aceite real', async ({ page, browser }, info) => {
  185 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  186 |   await step(page, 1)
  187 |   await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check()
  188 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  189 |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  190 |   try {
  191 |     const guest = await context.newPage(); await guest.goto(A + '/p/ana-estudos')
  192 |     await expect(guest.getByRole('dialog')).toBeVisible(); expect(await guest.content()).not.toContain('Ana Estudos')
  193 |     expect(await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).toEqual({ restricted: true })
  194 |     await guest.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click()
  195 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  196 |     await expect(guest.getByRole('dialog')).toHaveCount(0)
  197 |   } finally { await context.close() }
  198 | })
  199 | test('F09-E02/T02/T06 sessão real, admin não ganha dono, suspeita/provedor seguem para humano e preservam página anterior', async ({ page, browser }) => {
  200 |   fixture(); await page.goto(A + '/painel/perfil'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible(); expect((await privateCall(page)).status).toBe(401)
  201 |   await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  202 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  203 |   for (const text of ['SuspeitoFixture', 'FalhaProvedorFixture']) {
  204 |     await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill(text); await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  205 |     await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
  206 |     await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(text)
  207 |     const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(live).not.toContain(text)
  208 |   }
  209 |   const context = await browser.newContext()
  210 |   try { const other = await context.newPage(); await login(other, state().other); await other.goto(A + '/painel/perfil'); await expect(other.getByLabel('Nome da página')).toHaveValue(''); expect((await privateCall(other)).text).not.toContain('FalhaProvedorFixture'); expect((await privateCall(other, '/preview')).status).toBe(404) } finally { await context.close() }
  211 |   await page.getByLabel('Mais opções da página', { exact: true }).click(); await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil retirado do ar.' })).toBeVisible()
  212 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  213 | })
  214 | test('F09-E03 autosave offline mantém dados, retoma online, 320px e conflito não sobrescreve', async ({ page }, info) => {
  215 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site'); await autosaved(page)
  216 |   await step(page, 0); await page.context().setOffline(true); await page.getByLabel('Descrição', { exact: true }).fill('Texto offline preservado')
> 217 |   await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Texto offline preservado')
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  218 |   await page.context().setOffline(false); await autosaved(page)
  219 |   const second = await page.context().newPage()
  220 |   try {
  221 |     await second.goto(A + '/painel/perfil'); await expect(second.getByRole('button', { name: 'Ver prévia', exact: true })).toBeVisible()
  222 |     await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await autosaved(page)
  223 |     await step(second, 0); await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado')
  224 |     await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  225 |   } finally { await second.close() }
  226 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  227 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  228 |   await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true, animations: 'disabled' })
  229 | })
  230 | 
  231 | async function dragOrder(page: Page, source: Locator, target: Locator, touch: boolean) {
  232 |   await source.evaluate(element => element.closest('li')!.scrollIntoView({ block: 'start' }))
  233 |   const from = (await source.boundingBox())!, to = (await target.boundingBox())!
  234 |   if (touch) {
  235 |     const session = await page.context().newCDPSession(page)
  236 |     await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  237 |     await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  238 |     await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach()
  239 |   } else {
  240 |     await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 }); await page.mouse.up()
  241 |   }
  242 | }
  243 | 
  244 | test('F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência', async ({ page }, info) => {
  245 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page, info)
  246 |   await add(page, 1, 1, 'Primeiro link'); await add(page, 1, 2, 'Segundo link')
  247 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  248 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  249 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Descartado')
  250 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  251 |   await expect(page.getByRole('button', { name: 'Descartado Abrir grupo', exact: true })).toHaveCount(0)
  252 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  253 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Projetos'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  254 |   await add(page, 2, 1, 'Projeto novo')
  255 |   await step(page, 3); await autosaved(page)
  256 |   await expect(page.getByRole('status').filter({ hasText: 'Salvo automaticamente' })).toBeVisible()
  257 |   await page.reload()
  258 |   await expect(page.getByRole('list', { name: 'Etapas do formulário' })).toHaveCount(0)
  259 |   await expect(page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true })).toBeVisible()
  260 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  261 |   await page.evaluate(() => document.fonts.ready)
  262 |   await page.screenshot({ path: info.outputPath('groups-overview.png'), fullPage: true, animations: 'disabled' })
  263 |   const handles = page.getByRole('button', { name: /^Arrastar grupo / })
  264 |   await dragOrder(page, page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }), page.getByRole('button', { name: 'Arrastar grupo Projetos', exact: true }), Boolean(info.project.use.isMobile))
  265 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Projetos')
  266 |   await page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }).focus(); await page.keyboard.press('ArrowUp')
  267 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Materiais')
  268 |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  269 |   await expect(page.getByRole('heading', { name: 'Materiais', exact: true })).toBeFocused()
  270 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  271 |   const linkHandles = page.getByRole('button', { name: /^Arrastar link / })
  272 |   const linkFrom = page.getByRole('button', { name: 'Arrastar link Primeiro link', exact: true })
  273 |   await dragOrder(page, linkFrom, page.getByRole('button', { name: 'Arrastar link Segundo link', exact: true }), Boolean(info.project.use.isMobile))
  274 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Segundo link')
  275 |   await linkFrom.focus(); await page.keyboard.press('ArrowUp')
  276 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Primeiro link')
  277 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  278 |   await page.screenshot({ path: info.outputPath('group-links.png'), fullPage: true, animations: 'disabled' })
  279 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  280 |   const firstLink = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  281 |   await firstLink.getByText('Mover e remover', { exact: true }).click(); await firstLink.getByRole('button', { name: 'Mover para outro grupo', exact: true }).click()
  282 |   await selectOption(page.getByLabel('Grupo de destino'), { label: 'Projetos' }); await page.getByRole('button', { name: 'Mover link', exact: true }).click()
  283 |   await expect(page.getByText('Link movido para Projetos.', { exact: true })).toBeVisible()
  284 |   await expect(firstLink).toHaveCount(0)
  285 |   await page.getByText('Opções do grupo', { exact: true }).click(); await page.getByRole('button', { name: 'Editar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Leituras'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  286 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  287 |   await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  288 |   await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  289 |   const moved = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  290 |   await moved.getByRole('button', { name: 'Editar link', exact: true }).click(); await page.getByLabel('Título do link').fill('Link transferido'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  291 |   await autosaved(page); await expect(page.getByRole('status').filter({ hasText: 'Salvo automaticamente' })).toBeVisible()
  292 |   await page.reload(); await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  293 |   await expect(page.locator('[data-profile-link]').last()).toContainText('Link transferido')
  294 |   const removeLink = page.locator('[data-profile-link]').filter({ hasText: 'Projeto novo' })
  295 |   await removeLink.getByText('Mover e remover', { exact: true }).click(); await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click()
  296 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  297 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  298 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  299 |   if (!await page.getByRole('button', { name: 'Remover grupo', exact: true }).isVisible()) await page.getByText('Opções do grupo', { exact: true }).click(); await page.getByRole('button', { name: 'Remover grupo', exact: true }).click()
  300 |   await expect(page.getByRole('dialog')).toContainText('1 link')
  301 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  302 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  303 |   if (!await page.getByRole('button', { name: 'Remover grupo', exact: true }).isVisible()) await page.getByText('Opções do grupo', { exact: true }).click(); await page.getByRole('button', { name: 'Remover grupo', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  304 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  305 |   await expect(page.getByRole('button', { name: 'Leituras Abrir grupo', exact: true })).toBeVisible()
  306 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  307 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  308 | })
  309 | 
  310 | 
  311 | test('F09-E06 autosave, banner e campos não publicados; descartar restaura a publicação', async ({ page }, info) => {
  312 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  313 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  314 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  315 |   await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toHaveCount(0)
  316 |   await expect(page.getByRole('tab', { name: 'Publicação', exact: true })).toHaveCount(0)
  317 |   await step(page, 0)
```