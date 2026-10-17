# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência
- Location: e2e\profiles.spec.ts:285:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('dialog')
Expected substring: "1 link"
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('dialog') with timeout 20000ms
  - waiting for getByRole('dialog')

```

```yaml
- link "Ir para o conteúdo":
  - /url: "#main-content"
- banner:
  - link "Home":
    - /url: /
  - button "Menu"
- main:
  - heading "Minha página de links" [level=1]
  - region "Editor do perfil":
    - region "Alterações não publicadas":
      - strong: Tem alterações não publicadas
      - button "Descartar" [disabled]
      - button "Publicar"
    - button "Ver prévia"
    - button "Atualizar dados"
    - tablist "Seções da minha página":
      - tab "Grupos e links" [selected]
      - tab "Página"
      - tab "Aparência"
    - form "Editar perfil":
      - tabpanel "Grupos e links":
        - group "Dados da página":
          - text: Dados da página
          - region "Grupos e links da página":
            - status: Removido.
            - button "Voltar aos grupos"
            - heading "Projetos" [level=2]
            - text: 1 link
            - group "Ações do grupo":
              - button "Editar grupo"
              - button "Remover grupo"
              - button "Adicionar link"
            - paragraph: Arraste pela alça para ordenar. No teclado, use as setas na alça.
            - list:
              - listitem:
                - button "Arrastar link Link transferido"
                - strong: Link transferido
                - paragraph: https://example.com/f09-1-1
                - button "Editar link": Editar
                - button "Remover link": Remover
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
  254 | })
  255 | test('F09-E03 autosave offline mantém dados, retoma online, 320px e conflito não sobrescreve', async ({ page }, info) => {
  256 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site'); await autosaved(page)
  257 |   await step(page, 0); await page.context().setOffline(true); await page.getByLabel('Descrição', { exact: true }).fill('Texto offline preservado')
  258 |   await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Texto offline preservado')
  259 |   await page.context().setOffline(false); await autosaved(page)
  260 |   const second = await page.context().newPage()
  261 |   try {
  262 |     await second.goto(A + '/painel/perfil'); await expect(second.getByRole('button', { name: 'Ver prévia', exact: true })).toBeVisible()
  263 |     await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await autosaved(page)
  264 |     await step(second, 0); await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado')
  265 |     await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  266 |   } finally { await second.close() }
  267 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  268 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  269 |   await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true, animations: 'disabled' })
  270 | })
  271 | 
  272 | async function dragOrder(page: Page, source: Locator, target: Locator, touch: boolean) {
  273 |   await source.evaluate(element => element.closest('li')!.scrollIntoView({ block: 'start' }))
  274 |   const from = (await source.boundingBox())!, to = (await target.boundingBox())!
  275 |   if (touch) {
  276 |     const session = await page.context().newCDPSession(page)
  277 |     await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  278 |     await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  279 |     await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach()
  280 |   } else {
  281 |     await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 }); await page.mouse.up()
  282 |   }
  283 | }
  284 | 
  285 | test('F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência', async ({ page }, info) => {
  286 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page, info)
  287 |   await add(page, 1, 1, 'Primeiro link'); await add(page, 1, 2, 'Segundo link')
  288 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  289 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  290 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Descartado')
  291 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  292 |   await expect(page.getByRole('button', { name: 'Descartado Abrir grupo', exact: true })).toHaveCount(0)
  293 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  294 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Projetos'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  295 |   await add(page, 2, 1, 'Projeto novo')
  296 |   await step(page, 3); await autosaved(page)
  297 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  298 |   await page.reload()
  299 |   await expect(page.getByRole('list', { name: 'Etapas do formulário' })).toHaveCount(0)
  300 |   await expect(page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true })).toBeVisible()
  301 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  302 |   await page.evaluate(() => document.fonts.ready)
  303 |   await page.screenshot({ path: info.outputPath('groups-overview.png'), fullPage: true, animations: 'disabled' })
  304 |   const handles = page.getByRole('button', { name: /^Arrastar grupo / })
  305 |   await dragOrder(page, page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }), page.getByRole('button', { name: 'Arrastar grupo Projetos', exact: true }), Boolean(info.project.use.isMobile))
  306 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Projetos')
  307 |   await page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }).focus(); await page.keyboard.press('ArrowUp')
  308 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Materiais')
  309 |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  310 |   await expect(page.getByRole('heading', { name: 'Materiais', exact: true })).toBeFocused()
  311 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  312 |   const groupActions = page.getByRole('group', { name: 'Ações do grupo', exact: true })
  313 |   await expect(groupActions.getByRole('button', { name: 'Editar grupo', exact: true })).toBeVisible()
  314 |   await expect(groupActions.getByRole('button', { name: 'Remover grupo', exact: true })).toBeVisible()
  315 |   await expect(groupActions.getByRole('heading')).toHaveCount(0)
  316 |   await expect(groupActions.getByRole('button', { name: 'Voltar aos grupos' })).toHaveCount(0)
  317 |   await expect(page.getByText('Opções do grupo', { exact: true })).toHaveCount(0)
  318 |   await expect(page.getByText('Mover e remover', { exact: true })).toHaveCount(0)
  319 |   const cards = page.locator('[data-profile-link]')
  320 |   const firstBox = await cards.nth(0).boundingBox(), secondBox = await cards.nth(1).boundingBox()
  321 |   if (!info.project.use.isMobile) {
  322 |     expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(2)
  323 |     expect(secondBox!.x).toBeGreaterThan(firstBox!.x + firstBox!.width)
  324 |   }
  325 |   const linkHandles = page.getByRole('button', { name: /^Arrastar link / })
  326 |   const linkFrom = page.getByRole('button', { name: 'Arrastar link Primeiro link', exact: true })
  327 |   await dragOrder(page, linkFrom, page.getByRole('button', { name: 'Arrastar link Segundo link', exact: true }), Boolean(info.project.use.isMobile))
  328 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Segundo link')
  329 |   await linkFrom.focus(); await page.keyboard.press('ArrowUp')
  330 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Primeiro link')
  331 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  332 |   await page.screenshot({ path: info.outputPath('group-links.png'), fullPage: true, animations: 'disabled' })
  333 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  334 |   const firstLink = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  335 |   await firstLink.getByRole('button', { name: 'Editar link', exact: true }).click()
  336 |   await stableModalSelect(page, 'Grupo', info, 'group-select-open'); await selectOption(page.getByRole('combobox', { name: 'Grupo', exact: true }), { label: 'Projetos' }); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  337 |   await expect(page.getByText('Link movido para Projetos.', { exact: true })).toBeVisible()
  338 |   await expect(firstLink).toHaveCount(0)
  339 |   await page.getByRole('button', { name: 'Editar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Leituras'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  340 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  341 |   await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  342 |   await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  343 |   const moved = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  344 |   await moved.getByRole('button', { name: 'Editar link', exact: true }).click(); await page.getByLabel('Título do link').fill('Link transferido'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  345 |   await autosaved(page); await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  346 |   await page.reload(); await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  347 |   await expect(page.locator('[data-profile-link]').last()).toContainText('Link transferido')
  348 |   const removeLink = page.locator('[data-profile-link]').filter({ hasText: 'Projeto novo' })
  349 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click()
  350 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  351 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  352 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  353 |   await page.getByRole('button', { name: 'Remover grupo', exact: true }).click()
> 354 |   await expect(page.getByRole('dialog')).toContainText('1 link')
      |                                          ^ Error: expect(locator).toContainText(expected) failed
  355 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  356 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  357 |   await page.getByRole('button', { name: 'Remover grupo', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  358 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  359 |   await expect(page.getByRole('button', { name: 'Leituras Abrir grupo', exact: true })).toBeVisible()
  360 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  361 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  362 | })
  363 | 
  364 | 
  365 | test('F09-E06 autosave, banner e campos não publicados; descartar restaura a publicação', async ({ page }, info) => {
  366 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  367 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  368 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  369 |   await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toHaveCount(0)
  370 |   await expect(page.getByRole('tab', { name: 'Publicação', exact: true })).toHaveCount(0)
  371 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  372 |   const refresh = page.getByRole('button', { name: 'Atualizar dados', exact: true })
  373 |   await expect(refresh.locator('svg')).toBeVisible()
  374 |   expect(await refresh.evaluate(button => button.closest('details') === null)).toBe(true)
  375 |   await expect(page.getByRole('button', { name: 'Ver prévia', exact: true }).locator('svg')).toBeVisible()
  376 |   await step(page, 0)
  377 |   await page.getByLabel('Nome da página', { exact: true }).fill('Ana atualizada'); await page.getByLabel('Descrição', { exact: true }).fill('Descrição ainda não publicada')
  378 |   await autosaved(page)
  379 |   await expect(page.getByText('Tem alterações não publicadas', { exact: true })).toBeVisible()
  380 |   await expect(page.getByLabel('Nome da página', { exact: true }).locator('xpath=ancestor::*[@data-unpublished][1]')).toHaveCount(1)
  381 |   await expect(page.getByLabel('Endereço da página', { exact: true }).locator('xpath=ancestor::*[@data-unpublished][1]')).toHaveCount(0)
  382 |   expect((await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).name).toBe('Ana Estudos')
  383 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  384 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => document.fonts.ready)
  385 |   await page.screenshot({ path: info.outputPath('unpublished-fields.png'), fullPage: true, animations: 'disabled' })
  386 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  387 |   await page.reload(); await expect(page.getByText('Tem alterações não publicadas', { exact: true })).toBeVisible()
  388 |   await page.getByRole('button', { name: 'Descartar', exact: true }).click(); await expect(page.getByText('Alterações descartadas. A versão publicada foi restaurada.', { exact: true })).toBeVisible()
  389 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  390 |   await step(page, 0); await expect(page.getByLabel('Nome da página', { exact: true })).toHaveValue('Ana Estudos')
  391 |   await expect(page.locator('[data-unpublished]')).toHaveCount(0)
  392 |   await page.screenshot({ path: info.outputPath('published-restored.png'), fullPage: true, animations: 'disabled' })
  393 |   let release = () => {}; const held = new Promise<void>(resolve => { release = resolve }); let intercepted = 0
  394 |   await page.route('**/bff/v1/me/profile', async route => { if (route.request().method() === 'PATCH') { intercepted++; await held }; await route.continue() })
  395 |   try {
  396 |     await page.getByLabel('Descrição', { exact: true }).fill('Salvamento em andamento')
  397 |     await expect.poll(() => intercepted).toBe(1)
  398 |     await page.getByLabel('Nome da página', { exact: true }).fill('Edição mais recente')
  399 |     await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  400 |     release()
  401 |     await expect(page.getByText('Alterações descartadas. A versão publicada foi restaurada.', { exact: true })).toBeVisible()
  402 |     await expect(page.getByLabel('Nome da página', { exact: true })).toHaveValue('Ana Estudos')
  403 |     await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  404 |     expect(intercepted).toBe(1)
  405 |   } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
  406 |   await page.getByLabel('Descrição', { exact: true }).fill('Agora publicar explicitamente'); await autosaved(page)
  407 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  408 |   await expect(page.locator('[data-unpublished]')).toHaveCount(0)
  409 |   expect((await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).bio).toBe('Agora publicar explicitamente')
  410 | })
  411 | 
```