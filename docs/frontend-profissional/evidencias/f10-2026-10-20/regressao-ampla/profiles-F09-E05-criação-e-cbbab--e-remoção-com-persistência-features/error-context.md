# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência
- Location: e2e\profiles.spec.ts:386:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 2
Received:   243.796875
```

# Page snapshot

```yaml
- generic [ref=f7e1]:
  - link "Ir para o conteúdo" [ref=f7e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f7e3]:
    - generic [ref=f7e4]:
      - link "Home" [ref=f7e5] [cursor=pointer]:
        - /url: /
      - navigation "Navegação principal" [ref=f7e7]:
        - link "Busca" [ref=f7e8] [cursor=pointer]:
          - /url: /busca
        - link "Painel" [ref=f7e12] [cursor=pointer]:
          - /url: /painel
        - button "Sair" [ref=f7e17] [cursor=pointer]
  - main [ref=f7e21]:
    - complementary [ref=f7e22]:
      - paragraph [ref=f7e23]:
        - text: Meu espaço
        - generic [ref=f7e24]: Tem Link Aqui
      - navigation "Áreas do painel" [ref=f7e26]:
        - generic [ref=f7e27]:
          - paragraph [ref=f7e28]: Seu espaço
          - link "Visão geral" [ref=f7e29] [cursor=pointer]:
            - /url: /painel
          - link "Convites" [ref=f7e32] [cursor=pointer]:
            - /url: /painel/convites
          - link "Equipe" [ref=f7e35] [cursor=pointer]:
            - /url: /painel/equipe
        - generic [ref=f7e38]:
          - paragraph [ref=f7e39]: Catálogo
          - link "Meus links" [ref=f7e40] [cursor=pointer]:
            - /url: /painel/links
          - link "Criar link" [ref=f7e43] [cursor=pointer]:
            - /url: /painel/links/novo
        - group [ref=f7e47]:
          - generic "Minha página" [ref=f7e48] [cursor=pointer]
          - generic [ref=f7e54]:
            - link "Visão geral" [ref=f7e55] [cursor=pointer]:
              - /url: /painel/perfil
            - group [ref=f7e58]:
              - generic "Edição" [ref=f7e59] [cursor=pointer]
              - generic [ref=f7e63]:
                - link "Dados da página" [ref=f7e64] [cursor=pointer]:
                  - /url: /painel/perfil/dados
                - link "Grupos e links" [ref=f7e67] [cursor=pointer]:
                  - /url: /painel/perfil/links
                - link "Aparência" [ref=f7e70] [cursor=pointer]:
                  - /url: /painel/perfil/aparencia
                - link "Modelos" [ref=f7e73] [cursor=pointer]:
                  - /url: /painel/perfil/modelos
                - link "Endereço próprio" [ref=f7e76] [cursor=pointer]:
                  - /url: /painel/perfil/endereco
            - group [ref=f7e79]:
              - generic "Ferramentas" [ref=f7e80] [cursor=pointer]
            - group [ref=f7e84]:
              - generic "Resultados e divulgação" [ref=f7e85] [cursor=pointer]
        - generic [ref=f7e89]:
          - paragraph [ref=f7e90]: Acompanhar
          - link "Pedidos" [ref=f7e91] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f7e94] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f7e97] [cursor=pointer]:
            - /url: /painel/favoritos
          - link "Categorias seguidas" [ref=f7e100] [cursor=pointer]:
            - /url: /painel/interesses
        - generic [ref=f7e103]:
          - paragraph [ref=f7e104]: Preferências
          - link "Assinatura" [ref=f7e105] [cursor=pointer]:
            - /url: /painel/assinatura
          - link "Conta" [ref=f7e108] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f7e111]:
      - heading "Grupos e links" [level=1] [ref=f7e114]
      - region "Editor do perfil" [ref=f7e116]:
        - region "Alterações não publicadas" [ref=f7e117]:
          - strong [ref=f7e118]: Tem alterações não publicadas
          - generic [ref=f7e119]:
            - generic "Disponível depois da primeira publicação" [ref=f7e120]:
              - button "Descartar" [disabled] [ref=f7e121]
            - button "Publicar" [ref=f7e125] [cursor=pointer]
        - generic "Navegação e ações da minha página" [ref=f7e129]:
          - tablist "Seções da minha página" [ref=f7e132]:
            - tab "Visão geral" [ref=f7e133] [cursor=pointer]
            - tab "Grupos e links" [selected] [ref=f7e134] [cursor=pointer]
            - tab "Página" [ref=f7e136] [cursor=pointer]
            - tab "Aparência" [ref=f7e137] [cursor=pointer]
          - generic [ref=f7e138]:
            - button "Importar links" [ref=f7e139] [cursor=pointer]
            - button "Modelos" [ref=f7e143] [cursor=pointer]
            - generic [ref=f7e147]:
              - button "Ver prévia" [ref=f7e148] [cursor=pointer]:
                - generic [ref=f7e149]: Prévia
              - button "Atualizar dados" [ref=f7e152] [cursor=pointer]
              - group [ref=f7e156]:
                - generic "Mais opções da página" [ref=f7e157] [cursor=pointer]
        - generic [ref=f7e162]:
          - form "Editar perfil" [ref=f7e164]:
            - tabpanel "Grupos e links" [ref=f7e165]:
              - group "Dados da página" [ref=f7e166]:
                - region "Grupos e links da página" [ref=f7e168]:
                  - generic [ref=f7e169]:
                    - button "Voltar aos grupos" [ref=f7e170] [cursor=pointer]
                    - generic [ref=f7e174]:
                      - heading "Materiais" [active] [level=2] [ref=f7e175]
                      - generic [ref=f7e176]: 2 links
                  - group "Ações do grupo" [ref=f7e178]:
                    - button "Editar grupo" [ref=f7e179] [cursor=pointer]
                    - button "Remover grupo" [ref=f7e183] [cursor=pointer]
                    - button "Adicionar link" [ref=f7e187] [cursor=pointer]
                    - button "Ocultar grupo" [ref=f7e191] [cursor=pointer]
                  - paragraph [ref=f7e193]: Arraste pela alça para ordenar. No teclado, use as setas na alça.
                  - list [ref=f7e194]:
                    - listitem [ref=f7e195]:
                      - button "Arrastar link Primeiro link" [ref=f7e197]
                      - generic [ref=f7e200]:
                        - strong [ref=f7e201]: Primeiro link
                        - paragraph [ref=f7e202]: https://example.com/f09-1-1
                      - generic [ref=f7e203]:
                        - button "Ocultar link Primeiro link" [ref=f7e204] [cursor=pointer]:
                          - generic [ref=f7e205]: Ocultar
                        - button "Editar link" [ref=f7e206] [cursor=pointer]:
                          - generic [ref=f7e207]: Editar
                        - button "Remover link" [ref=f7e210] [cursor=pointer]:
                          - generic [ref=f7e211]: Remover
                    - listitem [ref=f7e214]:
                      - button "Arrastar link Segundo link" [ref=f7e216]
                      - generic [ref=f7e219]:
                        - strong [ref=f7e220]: Segundo link
                        - paragraph [ref=f7e221]: https://example.com/f09-1-2
                      - generic [ref=f7e222]:
                        - button "Ocultar link Segundo link" [ref=f7e223] [cursor=pointer]:
                          - generic [ref=f7e224]: Ocultar
                        - button "Editar link" [ref=f7e225] [cursor=pointer]:
                          - generic [ref=f7e226]: Editar
                        - button "Remover link" [ref=f7e229] [cursor=pointer]:
                          - generic [ref=f7e230]: Remover
          - complementary "Prévia ao vivo da página" [ref=f7e233]:
            - generic [ref=f7e234]:
              - strong [ref=f7e235]: Prévia ao vivo
              - generic [ref=f7e238]: Formato iPhone · rascunho
            - region "Tela da prévia em formato iPhone" [ref=f7e241]:
              - generic [ref=f7e243]:
                - article "Perfil público" [ref=f7e244]:
                  - generic [ref=f7e245]:
                    - generic [aria-hidden] [ref=f7e246]: A
                    - heading "Ana Estudos" [level=3] [ref=f7e247]
                    - paragraph [ref=f7e248]: Projetos, materiais e conversas sobre leitura.
                  - region "Materiais" [ref=f7e249]:
                    - heading "Materiais" [level=4] [ref=f7e250]
                    - list [ref=f7e251]:
                      - listitem [ref=f7e252]:
                        - link "Primeiro link" [ref=f7e253] [cursor=pointer]:
                          - /url: https://example.com/f09-1-1
                          - generic [aria-hidden] [ref=f7e255]: ↗
                      - listitem [ref=f7e256]:
                        - link "Segundo link" [ref=f7e257] [cursor=pointer]:
                          - /url: https://example.com/f09-1-2
                          - generic [aria-hidden] [ref=f7e259]: ↗
                  - region "Projetos" [ref=f7e260]:
                    - heading "Projetos" [level=4] [ref=f7e261]
                    - list [ref=f7e262]:
                      - listitem [ref=f7e263]:
                        - link "Projeto novo" [ref=f7e264] [cursor=pointer]:
                          - /url: https://example.com/f09-2-1
                          - generic [aria-hidden] [ref=f7e266]: ↗
                - generic [ref=f7e267]:
                  - button "Gerenciar cookies" [ref=f7e268] [cursor=pointer]
                  - link "Criado por Tem Link Aqui" [ref=f7e269] [cursor=pointer]:
                    - /url: /divulgar
                    - generic [ref=f7e270]: Criado por
                    - img "Tem Link Aqui" [ref=f7e271]
  - contentinfo [ref=f7e272]:
    - generic [ref=f7e273]: Tem Link Aqui
    - navigation "Informações do site" [ref=f7e274]:
      - link "Termos" [ref=f7e275] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f7e276] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f7e277] [cursor=pointer]
  - alert [ref=f7e278]
```

# Test source

```ts
  324 |   await page.reload(); await editorSection(page, 'Página'); await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  325 | })
  326 | test('F09-E04 restrição de idade não entrega conteúdo no HTML/API antes do aceite real', async ({ page, browser }, info) => {
  327 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  328 |   await step(page, 1)
  329 |   await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check()
  330 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  331 |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  332 |   try {
  333 |     const guest = await context.newPage(); await guest.goto(A + '/p/ana-estudos')
  334 |     await expect(guest.getByRole('dialog')).toBeVisible(); expect(await guest.content()).not.toContain('Ana Estudos')
  335 |     expect(await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).toEqual({ restricted: true })
  336 |     await guest.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click()
  337 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  338 |     await expect(guest.getByRole('dialog')).toHaveCount(0)
  339 |   } finally { await context.close() }
  340 | })
  341 | test('F09-E02/T02/T06 sessão real, admin não ganha dono, suspeita/provedor seguem para humano e preservam página anterior', async ({ page, browser }) => {
  342 |   fixture(); await page.goto(A + '/painel/perfil'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible(); expect((await privateCall(page)).status).toBe(401)
  343 |   await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  344 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  345 |   for (const text of ['SuspeitoFixture', 'FalhaProvedorFixture']) {
  346 |     await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill(text); await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  347 |     await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
  348 |     await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(text)
  349 |     const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(live).not.toContain(text)
  350 |   }
  351 |   const context = await browser.newContext()
  352 |   try { const other = await context.newPage(); await login(other, state().other); await other.goto(A + '/painel/perfil?secao=pagina'); await expect(other.getByLabel('Nome da página')).toHaveValue(''); expect((await privateCall(other)).text).not.toContain('FalhaProvedorFixture'); expect((await privateCall(other, '/preview')).status).toBe(404) } finally { await context.close() }
  353 |   await page.getByLabel('Mais opções da página', { exact: true }).click(); await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil retirado do ar.' })).toBeVisible()
  354 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  355 | })
  356 | test('F09-E03 autosave offline mantém dados, retoma online, 320px e conflito não sobrescreve', async ({ page }, info) => {
  357 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site'); await autosaved(page)
  358 |   await step(page, 0); await page.context().setOffline(true); await page.getByLabel('Descrição', { exact: true }).fill('Texto offline preservado')
  359 |   await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Texto offline preservado')
  360 |   await page.context().setOffline(false); await autosaved(page)
  361 |   const second = await page.context().newPage()
  362 |   try {
  363 |     await second.goto(A + '/painel/perfil/dados');await expect(second.getByLabel('Descrição',{exact:true})).toBeEnabled()
  364 |     await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await autosaved(page)
  365 |     await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado')
  366 |     await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  367 |   } finally { await second.close() }
  368 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  369 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  370 |   await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true, animations: 'disabled' })
  371 | })
  372 | 
  373 | async function dragOrder(page: Page, source: Locator, target: Locator, touch: boolean) {
  374 |   await source.evaluate(element => element.closest('li')!.scrollIntoView({ block: 'center',behavior:'instant' }))
  375 |   const from = (await source.boundingBox())!, to = (await target.boundingBox())!
  376 |   if (touch) {
  377 |     const session = await page.context().newCDPSession(page)
  378 |     await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }] })
  379 |     await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }] })
  380 |     await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach()
  381 |   } else {
  382 |     await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 }); await page.mouse.up()
  383 |   }
  384 | }
  385 | 
  386 | test('F09-E05 criação e gestão: cards, DnD, transferência, edição e remoção com persistência', async ({ page }, info) => {
  387 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page, info)
  388 |   await add(page, 1, 1, 'Primeiro link'); await add(page, 1, 2, 'Segundo link')
  389 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  390 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  391 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Descartado')
  392 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  393 |   await expect(page.getByRole('button', { name: 'Descartado Abrir grupo', exact: true })).toHaveCount(0)
  394 |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click()
  395 |   await page.getByLabel('Nome do grupo', { exact: true }).fill('Projetos'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  396 |   await add(page, 2, 1, 'Projeto novo')
  397 |   await step(page, 3); await autosaved(page)
  398 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  399 |   await page.reload()
  400 |   await editorSection(page, 'Grupos e links')
  401 |   await expect(page.getByRole('list', { name: 'Etapas do formulário' })).toHaveCount(0)
  402 |   await expect(page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true })).toBeVisible()
  403 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  404 |   await page.evaluate(() => document.fonts.ready)
  405 |   await page.screenshot({ path: info.outputPath('groups-overview.png'), fullPage: true, animations: 'disabled' })
  406 |   const handles = page.getByRole('button', { name: /^Arrastar grupo / })
  407 |   await dragOrder(page, page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }), page.getByRole('button', { name: 'Arrastar grupo Projetos', exact: true }), Boolean(info.project.use.isMobile))
  408 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Projetos')
  409 |   await page.getByRole('button', { name: 'Arrastar grupo Materiais', exact: true }).focus(); await page.keyboard.press('ArrowUp')
  410 |   await expect(handles.first()).toHaveAccessibleName('Arrastar grupo Materiais')
  411 |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  412 |   await expect(page.getByRole('form',{name:'Editar perfil'}).getByRole('heading', { name: 'Materiais', exact: true })).toBeFocused()
  413 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  414 |   const groupActions = page.getByRole('group', { name: 'Ações do grupo', exact: true })
  415 |   await expect(groupActions.getByRole('button', { name: 'Editar grupo', exact: true })).toBeVisible()
  416 |   await expect(groupActions.getByRole('button', { name: 'Remover grupo', exact: true })).toBeVisible()
  417 |   await expect(groupActions.getByRole('heading')).toHaveCount(0)
  418 |   await expect(groupActions.getByRole('button', { name: 'Voltar aos grupos' })).toHaveCount(0)
  419 |   await expect(page.getByText('Opções do grupo', { exact: true })).toHaveCount(0)
  420 |   await expect(page.getByText('Mover e remover', { exact: true })).toHaveCount(0)
  421 |   const cards = page.locator('[data-profile-link]')
  422 |   const firstBox = await cards.nth(0).boundingBox(), secondBox = await cards.nth(1).boundingBox()
  423 |   if (!info.project.use.isMobile) {
> 424 |     expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(2)
      |                                                  ^ Error: expect(received).toBeLessThan(expected)
  425 |     expect(secondBox!.x).toBeGreaterThan(firstBox!.x + firstBox!.width)
  426 |   }
  427 |   const linkHandles = page.getByRole('button', { name: /^Arrastar link / })
  428 |   const linkFrom = page.getByRole('button', { name: 'Arrastar link Primeiro link', exact: true })
  429 |   await dragOrder(page, linkFrom, page.getByRole('button', { name: 'Arrastar link Segundo link', exact: true }), Boolean(info.project.use.isMobile))
  430 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Segundo link')
  431 |   await linkFrom.focus(); await page.keyboard.press('ArrowUp')
  432 |   await expect(linkHandles.first()).toHaveAccessibleName('Arrastar link Primeiro link')
  433 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  434 |   await page.screenshot({ path: info.outputPath('group-links.png'), fullPage: true, animations: 'disabled' })
  435 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  436 |   const firstLink = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  437 |   await firstLink.getByRole('button', { name: 'Editar link', exact: true }).click()
  438 |   await stableModalSelect(page, 'Grupo', info, 'group-select-open'); await selectOption(page.getByRole('combobox', { name: 'Grupo', exact: true }), { label: 'Projetos' }); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  439 |   await expect(page.getByText('Link movido para Projetos.', { exact: true })).toBeVisible()
  440 |   await expect(firstLink).toHaveCount(0)
  441 |   await page.getByRole('button', { name: 'Editar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Leituras'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  442 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  443 |   await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  444 |   await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  445 |   const moved = page.locator('[data-profile-link]').filter({ hasText: 'Primeiro link' })
  446 |   await moved.getByRole('button', { name: 'Editar link', exact: true }).click(); await page.getByLabel('Título do link').fill('Link transferido'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  447 |   await autosaved(page); await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  448 |   await page.reload(); await editorSection(page, 'Grupos e links'); await page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true }).click()
  449 |   await expect(page.locator('[data-profile-link]').last()).toContainText('Link transferido')
  450 |   const removeLink = page.locator('[data-profile-link]').filter({ hasText: 'Projeto novo' })
  451 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click()
  452 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(page.locator('[data-profile-link]')).toHaveCount(2)
  453 |   await removeLink.getByRole('button', { name: 'Remover link', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  454 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  455 |   await page.getByRole('button', { name: 'Remover grupo', exact: true }).click()
  456 |   await expect(page.getByRole('dialog')).toContainText('1 link')
  457 |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  458 |   await expect(page.locator('[data-profile-link]')).toHaveCount(1)
  459 |   await page.getByRole('button', { name: 'Remover grupo', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar remoção', exact: true }).click()
  460 |   await expect(page.getByRole('button', { name: 'Projetos Abrir grupo', exact: true })).toHaveCount(0)
  461 |   await expect(page.getByRole('button', { name: 'Leituras Abrir grupo', exact: true })).toBeVisible()
  462 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  463 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  464 | })
  465 | 
  466 | 
  467 | test('F09-E06 autosave, banner e campos não publicados; descartar restaura a publicação', async ({ page }, info) => {
  468 |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  469 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  470 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  471 |   await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toHaveCount(0)
  472 |   await expect(page.getByRole('tab', { name: 'Publicação', exact: true })).toHaveCount(0)
  473 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  474 |   const refresh = page.getByRole('button', { name: 'Atualizar dados', exact: true })
  475 |   await expect(refresh.locator('svg')).toBeVisible()
  476 |   expect(await refresh.evaluate(button => button.closest('details') === null)).toBe(true)
  477 |   await expect(page.getByRole('button', { name: 'Ver prévia', exact: true }).locator('svg')).toBeVisible()
  478 |   await step(page, 0)
  479 |   await page.getByLabel('Nome da página', { exact: true }).fill('Ana atualizada'); await page.getByLabel('Descrição', { exact: true }).fill('Descrição ainda não publicada')
  480 |   await autosaved(page)
  481 |   await expect(page.getByText('Tem alterações não publicadas', { exact: true })).toBeVisible()
  482 |   await expect(page.getByLabel('Nome da página', { exact: true }).locator('xpath=ancestor::*[@data-unpublished][1]')).toHaveCount(1)
  483 |   await expect(page.getByLabel('Endereço da página', { exact: true }).locator('xpath=ancestor::*[@data-unpublished][1]')).toHaveCount(0)
  484 |   expect((await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).name).toBe('Ana Estudos')
  485 |   if (!info.project.use.isMobile) await page.setViewportSize({ width: 1440, height: 900 })
  486 |   await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => document.fonts.ready)
  487 |   await page.screenshot({ path: info.outputPath('unpublished-fields.png'), fullPage: true, animations: 'disabled' })
  488 |   expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(item => item.id)).toEqual([])
  489 |   await page.reload(); await expect(page.getByText('Tem alterações não publicadas', { exact: true })).toBeVisible()
  490 |   await page.getByRole('button', { name: 'Descartar', exact: true }).click(); await expect(page.getByText('Alterações descartadas. A versão publicada foi restaurada.', { exact: true })).toBeVisible()
  491 |   await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  492 |   await step(page, 0); await expect(page.getByLabel('Nome da página', { exact: true })).toHaveValue('Ana Estudos')
  493 |   await expect(page.locator('[data-unpublished]')).toHaveCount(0)
  494 |   await page.screenshot({ path: info.outputPath('published-restored.png'), fullPage: true, animations: 'disabled' })
  495 |   let release = () => {}; const held = new Promise<void>(resolve => { release = resolve }); let intercepted = 0
  496 |   await page.route('**/bff/v1/me/profile', async route => { if (route.request().method() === 'PATCH') { intercepted++; await held }; await route.continue() })
  497 |   try {
  498 |     await page.getByLabel('Descrição', { exact: true }).fill('Salvamento em andamento')
  499 |     await expect.poll(() => intercepted).toBe(1)
  500 |     await page.getByLabel('Nome da página', { exact: true }).fill('Edição mais recente')
  501 |     await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  502 |     release()
  503 |     await expect(page.getByText('Alterações descartadas. A versão publicada foi restaurada.', { exact: true })).toBeVisible()
  504 |     await expect(page.getByLabel('Nome da página', { exact: true })).toHaveValue('Ana Estudos')
  505 |     await expect(page.getByRole('region', { name: 'Alterações não publicadas' })).toHaveCount(0)
  506 |     expect(intercepted).toBe(1)
  507 |   } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
  508 |   await page.getByLabel('Descrição', { exact: true }).fill('Agora publicar explicitamente'); await autosaved(page)
  509 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByText('Perfil publicado.', { exact: true })).toBeVisible()
  510 |   await expect(page.locator('[data-unpublished]')).toHaveCount(0)
  511 |   expect((await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).bio).toBe('Agora publicar explicitamente')
  512 | })
  513 | 
  514 | 
  515 | test('F09-E11 Minha página tem subseções expansíveis e escolha inicial de criação',async({page},info)=>{
  516 |  fixture();await login(page);await page.goto(A+'/painel/perfil');await expect(page.getByRole('link',{name:/Criar do meu jeito/})).toBeVisible();await expect(page.getByRole('region',{name:'Escolha como criar sua página'})).toBeVisible();await page.screenshot({path:info.outputPath('profile-overview-actions.png'),fullPage:true,animations:'disabled'});
  517 |  const mobile=page.getByRole('button',{name:'Menu',exact:true});if(await mobile.isVisible())await mobile.click();const nav=page.getByRole('navigation',{name:'Áreas do painel'}).filter({visible:true});
  518 |  for(const name of ['Edição','Ferramentas','Resultados e divulgação']){const summary=nav.locator('summary').filter({hasText:new RegExp('^'+name+'$')});const group=summary.locator('..');await expect(group).not.toHaveAttribute('open');await summary.focus();await page.keyboard.press('Enter');await expect(group).toHaveAttribute('open');if(name==='Edição'){await nav.getByRole('link',{name:'Modelos',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('profile-menu-expanded.png'),animations:'disabled'})}await summary.focus();await page.keyboard.press('Enter');await expect(group).not.toHaveAttribute('open')}
  519 |  if(await mobile.isVisible())await page.getByRole('button',{name:'Fechar menu',exact:true}).click();await page.getByRole('link',{name:/Criar do meu jeito/}).click();await expect(page).toHaveURL(/perfil\/dados$/);await expect(page.getByLabel('Nome da página')).toBeVisible();await page.screenshot({path:info.outputPath('dedicated-page-details.png'),fullPage:true,animations:'disabled'});await editorSection(page,'Aparência');await expect(page.getByRole('region',{name:'Resumo do rascunho'})).toHaveCount(0)
  520 | })
  521 | 
```