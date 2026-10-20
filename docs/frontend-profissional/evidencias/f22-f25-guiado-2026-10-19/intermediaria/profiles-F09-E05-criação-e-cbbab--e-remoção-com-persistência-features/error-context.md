# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência
- Location: e2e\profiles.spec.ts:384:5

# Error details

```
Error: expect(locator).toHaveAccessibleName(expected) failed

Locator:  getByRole('button', { name: /^Arrastar grupo / }).first()
Expected: "Arrastar grupo Projetos"
Received: "Arrastar grupo Materiais"
Timeout:  20000ms

Call log:
  - Expect "toHaveAccessibleName" getByRole('button', { name: /^Arrastar grupo / }).first() with timeout 20000ms
  - waiting for getByRole('button', { name: /^Arrastar grupo / }).first()
    43 × locator resolved to <button type="button" aria-describedby="_r_t_" class="profile-groups_handle__ydOmY" aria-label="Arrastar grupo Materiais">…</button>
       - unexpected value "Arrastar grupo Materiais"

```

```yaml
- button "Arrastar grupo Materiais"
```

# Test source

```ts
  306 |     await expect(guest.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  307 |     expect((await privateCall(guest, '/preview')).status).toBe(401)
  308 |     expect(await guest.content()).not.toContain('Ana Estudos')
  309 |     await guest.goto(A + '/p/ana-estudos')
  310 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  311 |     const profile = guest.getByRole('article', { name: 'Perfil público' })
  312 |     await expect(profile.getByRole('heading', { level: 2 })).toHaveText(['Redes sociais', 'Materiais'])
  313 |     await expect(profile.getByRole('link')).toHaveCount(3)
  314 |     expect(await guest.content()).not.toMatch(/OcultoSentinela|owner@profiles.test|passwordHash/)
  315 |     const response = await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(response).not.toContain('OcultoSentinela')
  316 |     expect(await profile.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  317 |     await guest.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  318 |     await guest.screenshot({ path: info.outputPath('public-profile.png'), fullPage: true })
  319 |     await expect(guest.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://profiles.localhost/p/ana-estudos')
  320 |     await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  321 |   } finally { await context.close() }
  322 |   expect(sql(`SELECT COUNT(*) FROM links WHERE "tenantId"='${s.tenantId}'`)).toBe('1')
  323 |   await page.reload(); await editorSection(page, 'Página'); await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  324 | })
  325 | test('F09-E04 restrição de idade não entrega conteúdo no HTML/API antes do aceite real', async ({ page, browser }, info) => {
  326 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  327 |   await step(page, 1)
  328 |   await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check()
  329 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  330 |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  331 |   try {
  332 |     const guest = await context.newPage(); await guest.goto(A + '/p/ana-estudos')
  333 |     await expect(guest.getByRole('dialog')).toBeVisible(); expect(await guest.content()).not.toContain('Ana Estudos')
  334 |     expect(await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).toEqual({ restricted: true })
  335 |     await guest.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click()
  336 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  337 |     await expect(guest.getByRole('dialog')).toHaveCount(0)
  338 |   } finally { await context.close() }
  339 | })
  340 | test('F09-E02/T02/T06 sessão real, admin não ganha dono, suspeita/provedor seguem para humano e preservam página anterior', async ({ page, browser }) => {
  341 |   fixture(); await page.goto(A + '/painel/perfil'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible(); expect((await privateCall(page)).status).toBe(401)
  342 |   await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  343 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  344 |   for (const text of ['SuspeitoFixture', 'FalhaProvedorFixture']) {
  345 |     await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill(text); await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  346 |     await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
  347 |     await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(text)
  348 |     const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(live).not.toContain(text)
  349 |   }
  350 |   const context = await browser.newContext()
  351 |   try { const other = await context.newPage(); await login(other, state().other); await other.goto(A + '/painel/perfil?secao=pagina'); await expect(other.getByLabel('Nome da página')).toHaveValue(''); expect((await privateCall(other)).text).not.toContain('FalhaProvedorFixture'); expect((await privateCall(other, '/preview')).status).toBe(404) } finally { await context.close() }
  352 |   await page.getByLabel('Mais opções da página', { exact: true }).click(); await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil retirado do ar.' })).toBeVisible()
  353 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  354 | })
  355 | test('F09-E03 autosave offline mantém dados, retoma online, 320px e conflito não sobrescreve', async ({ page }, info) => {
  356 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site'); await autosaved(page)
  357 |   await step(page, 0); await page.context().setOffline(true); await page.getByLabel('Descrição', { exact: true }).fill('Texto offline preservado')
  358 |   await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Texto offline preservado')
  359 |   await page.context().setOffline(false); await autosaved(page)
  360 |   const second = await page.context().newPage()
  361 |   try {
  362 |     await second.goto(A + '/painel/perfil/dados');await expect(second.getByLabel('Descrição',{exact:true})).toBeEnabled()
  363 |     await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await autosaved(page)
  364 |     await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado')
  365 |     await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  366 |   } finally { await second.close() }
  367 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  368 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  369 |   await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true, animations: 'disabled' })
  370 | })
  371 | 
  372 | async function dragOrder(page: Page, source: Locator, target: Locator, touch: boolean) {
  373 |   await source.evaluate(element => element.closest('li')!.scrollIntoView({ block: 'start',behavior:'instant' }))
  374 |   const from = (await source.boundingBox())!, to = (await target.boundingBox())!
  375 |   if (touch) {
  376 |     const session = await page.context().newCDPSession(page)
  377 |     await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  378 |     await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  379 |     await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach()
  380 |   } else {
  381 |     await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 }); await page.mouse.up()
  382 |   }
  383 | }
  384 | 
  385 | test('F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência', async ({ page }, info) => {
  386 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page, info)
  387 |   await add(page, 1, 1, 'Primeiro link'); await add(page, 1, 2, 'Segundo link')
  388 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  389 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  390 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Descartado')
  391 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  392 |   await expect(page.getByRole('button', { name: 'Descartado Abrir grupo', exact: true })).toHaveCount(0)
  393 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  394 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Projetos'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  395 |   await add(page, 2, 1, 'Projeto novo')
  396 |   await step(page, 3); await autosaved(page)
  397 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  398 |   await page.reload()
  399 |   await editorSection(page, 'Grupos e links')
  400 |   await expect(page.getByRole('list', { name: 'Etapas do formulário' })).toHaveCount(0)
  401 |   await expect(page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true })).toBeVisible()
  402 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  403 |   await page.evaluate(() => document.fonts.ready)
  404 |   await page.screenshot({ path: info.outputPath('groups-overview.png'), fullPage: true, animations: 'disabled' })
  405 |   const handles = page.getByRole('button', { name: /^Arrastar grupo / })
> 406 |   await dragOrder(page, page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }), page.getByRole('button', { name: 'Arrastar grupo Projetos', exact: true }), Boolean(info.project.use.isMobile))
      |                                 ^ Error: expect(locator).toHaveAccessibleName(expected) failed
  407 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Projetos')
  408 |   await page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }).focus(); await page.keyboard.press('ArrowUp')
  409 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Materiais')
  410 |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  411 |   await expect(page.getByRole('heading', { name: 'Materiais', exact: true })).toBeFocused()
  412 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  413 |   const groupActions = page.getByRole('group', { name: 'Ações do grupo', exact: true })
  414 |   await expect(groupActions.getByRole('button', { name: 'Editar grupo', exact: true })).toBeVisible()
  415 |   await expect(groupActions.getByRole('button', { name: 'Remover grupo', exact: true })).toBeVisible()
  416 |   await expect(groupActions.getByRole('heading')).toHaveCount(0)
  417 |   await expect(groupActions.getByRole('button', { name: 'Voltar aos grupos' })).toHaveCount(0)
  418 |   await expect(page.getByText('Opções do grupo', { exact: true })).toHaveCount(0)
  419 |   await expect(page.getByText('Mover e remover', { exact: true })).toHaveCount(0)
  420 |   const cards = page.locator('[data-profile-link]')
  421 |   const firstBox = await cards.nth(0).boundingBox(), secondBox = await cards.nth(1).boundingBox()
  422 |   if (!info.project.use.isMobile) {
  423 |     expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(2)
  424 |     expect(secondBox!.x).toBeGreaterThan(firstBox!.x + firstBox!.width)
  425 |   }
  426 |   const linkHandles = page.getByRole('button', { name: /^Arrastar link / })
  427 |   const linkFrom = page.getByRole('button', { name: 'Arrastar link Primeiro link', exact: true })
  428 |   await dragOrder(page, linkFrom, page.getByRole('button', { name: 'Arrastar link Segundo link', exact: true }), Boolean(info.project.use.isMobile))
  429 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Segundo link')
  430 |   await linkFrom.focus(); await page.keyboard.press('ArrowUp')
  431 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Primeiro link')
  432 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  433 |   await page.screenshot({ path: info.outputPath('group-links.png'), fullPage: true, animations: 'disabled' })
  434 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  435 |   const firstLink = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  436 |   await firstLink.getByRole('button', { name: 'Editar link', exact: true }).click()
  437 |   await stableModalSelect(page, 'Grupo', info, 'group-select-open'); await selectOption(page.getByRole('combobox', { name: 'Grupo', exact: true }), { label: 'Projetos' }); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  438 |   await expect(page.getByText('Link movido para Projetos.', { exact: true })).toBeVisible()
  439 |   await expect(firstLink).toHaveCount(0)
  440 |   await page.getByRole('button', { name: 'Editar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Leituras'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  441 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  442 |   await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  443 |   await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  444 |   const moved = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  445 |   await moved.getByRole('button', { name: 'Editar link', exact: true }).click(); await page.getByLabel('Título do link').fill('Link transferido'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  446 |   await autosaved(page); await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  447 |   await page.reload(); await editorSection(page, 'Grupos e links'); await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  448 |   await expect(page.locator('[data-profile-link]').last()).toContainText('Link transferido')
  449 |   const removeLink = page.locator('[data-profile-link]').filter({ hasText: 'Projeto novo' })
  450 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click()
  451 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  452 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  453 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  454 |   await page.getByRole('button', { name: 'Remover grupo', exact: true }).click()
  455 |   await expect(page.getByRole('dialog')).toContainText('1 link')
  456 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  457 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  458 |   await page.getByRole('button', { name: 'Remover grupo', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  459 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  460 |   await expect(page.getByRole('button', { name: 'Leituras Abrir grupo', exact: true })).toBeVisible()
  461 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  462 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  463 | })
  464 | 
  465 | 
  466 | test('F09-E06 autosave, banner e campos não publicados; descartar restaura a publicação', async ({ page }, info) => {
  467 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  468 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  469 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  470 |   await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toHaveCount(0)
  471 |   await expect(page.getByRole('tab', { name: 'Publicação', exact: true })).toHaveCount(0)
  472 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  473 |   const refresh = page.getByRole('button', { name: 'Atualizar dados', exact: true })
  474 |   await expect(refresh.locator('svg')).toBeVisible()
  475 |   expect(await refresh.evaluate(button => button.closest('details') === null)).toBe(true)
  476 |   await expect(page.getByRole('button', { name: 'Ver prévia', exact: true }).locator('svg')).toBeVisible()
  477 |   await step(page, 0)
  478 |   await page.getByLabel('Nome da página', { exact: true }).fill('Ana atualizada'); await page.getByLabel('Descrição', { exact: true }).fill('Descrição ainda não publicada')
  479 |   await autosaved(page)
  480 |   await expect(page.getByText('Tem alterações não publicadas', { exact: true })).toBeVisible()
  481 |   await expect(page.getByLabel('Nome da página', { exact: true }).locator('xpath=ancestor::*[@data-unpublished][1]')).toHaveCount(1)
  482 |   await expect(page.getByLabel('Endereço da página', { exact: true }).locator('xpath=ancestor::*[@data-unpublished][1]')).toHaveCount(0)
  483 |   expect((await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).name).toBe('Ana Estudos')
  484 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  485 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => document.fonts.ready)
  486 |   await page.screenshot({ path: info.outputPath('unpublished-fields.png'), fullPage: true, animations: 'disabled' })
  487 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  488 |   await page.reload(); await expect(page.getByText('Tem alterações não publicadas', { exact: true })).toBeVisible()
  489 |   await page.getByRole('button', { name: 'Descartar', exact: true }).click(); await expect(page.getByText('Alterações descartadas. A versão publicada foi restaurada.', { exact: true })).toBeVisible()
  490 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  491 |   await step(page, 0); await expect(page.getByLabel('Nome da página', { exact: true })).toHaveValue('Ana Estudos')
  492 |   await expect(page.locator('[data-unpublished]')).toHaveCount(0)
  493 |   await page.screenshot({ path: info.outputPath('published-restored.png'), fullPage: true, animations: 'disabled' })
  494 |   let release = () => {}; const held = new Promise<void>(resolve => { release = resolve }); let intercepted = 0
  495 |   await page.route('**/bff/v1/me/profile', async route => { if (route.request().method() === 'PATCH') { intercepted++; await held }; await route.continue() })
  496 |   try {
  497 |     await page.getByLabel('Descrição', { exact: true }).fill('Salvamento em andamento')
  498 |     await expect.poll(() => intercepted).toBe(1)
  499 |     await page.getByLabel('Nome da página', { exact: true }).fill('Edição mais recente')
  500 |     await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  501 |     release()
  502 |     await expect(page.getByText('Alterações descartadas. A versão publicada foi restaurada.', { exact: true })).toBeVisible()
  503 |     await expect(page.getByLabel('Nome da página', { exact: true })).toHaveValue('Ana Estudos')
  504 |     await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  505 |     expect(intercepted).toBe(1)
  506 |   } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
```