# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09 aparência personalizada persiste e só chega ao público após publicar
- Location: e2e\profiles.spec.ts:195:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "scrollable-region-focusable",
+ ]
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
            - group [ref=f7e76]:
              - generic "Ferramentas" [ref=f7e77] [cursor=pointer]
            - group [ref=f7e81]:
              - generic "Resultados e divulgação" [ref=f7e82] [cursor=pointer]
        - generic [ref=f7e86]:
          - paragraph [ref=f7e87]: Acompanhar
          - link "Pedidos" [ref=f7e88] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f7e91] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f7e94] [cursor=pointer]:
            - /url: /painel/favoritos
          - link "Categorias seguidas" [ref=f7e97] [cursor=pointer]:
            - /url: /painel/interesses
        - generic [ref=f7e100]:
          - paragraph [ref=f7e101]: Preferências
          - link "Assinatura" [ref=f7e102] [cursor=pointer]:
            - /url: /painel/assinatura
          - link "Conta" [ref=f7e105] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f7e108]:
      - heading "Aparência da página" [level=1] [ref=f7e111]
      - region "Editor do perfil" [ref=f7e113]:
        - region "Alterações não publicadas" [ref=f7e114]:
          - strong [ref=f7e115]: Tem alterações não publicadas
          - generic [ref=f7e116]:
            - generic "Disponível depois da primeira publicação" [ref=f7e117]:
              - button "Descartar" [disabled] [ref=f7e118]
            - button "Publicar" [ref=f7e122] [cursor=pointer]
        - generic "Navegação e ações da minha página" [ref=f7e126]:
          - tablist "Seções da minha página" [ref=f7e129]:
            - tab "Visão geral" [ref=f7e130] [cursor=pointer]
            - tab "Grupos e links" [ref=f7e131] [cursor=pointer]
            - tab "Página" [ref=f7e133] [cursor=pointer]
            - tab "Aparência" [selected] [ref=f7e134] [cursor=pointer]
          - generic [ref=f7e135]:
            - button "Importar links" [ref=f7e136] [cursor=pointer]
            - button "Modelos" [ref=f7e140] [cursor=pointer]
            - generic [ref=f7e144]:
              - button "Ver prévia" [ref=f7e145] [cursor=pointer]
              - button "Atualizar dados" [ref=f7e149] [cursor=pointer]
              - group [ref=f7e153]:
                - generic "Mais opções da página" [ref=f7e154] [cursor=pointer]
        - generic [ref=f7e159]:
          - form "Editar perfil" [ref=f7e161]:
            - tabpanel "Aparência" [ref=f7e162]:
              - group "Aparência da página" [ref=f7e163]:
                - generic [ref=f7e165]:
                  - tablist "Personalizar aparência" [ref=f7e167]:
                    - tab "Temas" [ref=f7e168] [cursor=pointer]
                    - tab "Cores" [selected] [ref=f7e169] [cursor=pointer]
                    - tab "Botões e texto" [ref=f7e170] [cursor=pointer]
                  - tabpanel "Cores" [ref=f7e171]:
                    - heading "Cores e fundo" [level=2] [ref=f7e172]
                    - generic "Alteração não publicada" [ref=f7e173]:
                      - group [ref=f7e174]:
                        - 'generic "Cor do fundo #173C32" [active] [ref=f7e175] [cursor=pointer]':
                          - generic [ref=f7e177]: Cor do fundo
                          - code [ref=f7e178]: "#173C32"
                          - generic [aria-hidden] [ref=f7e179]: ⌄
                        - generic [ref=f7e180]:
                          - 'group "Paleta: Cor do fundo" [ref=f7e181]':
                            - 'button "Cor do fundo: #f5f0e8" [ref=f7e182] [cursor=pointer]'
                            - 'button "Cor do fundo: #ffffff" [ref=f7e183] [cursor=pointer]'
                            - 'button "Cor do fundo: #151515" [ref=f7e184] [cursor=pointer]'
                            - 'button "Cor do fundo: #173c32" [pressed] [ref=f7e185] [cursor=pointer]'
                            - 'button "Cor do fundo: #d9efb6" [ref=f7e186] [cursor=pointer]'
                            - 'button "Cor do fundo: #ece5ff" [ref=f7e187] [cursor=pointer]'
                            - 'button "Cor do fundo: #523b85" [ref=f7e188] [cursor=pointer]'
                            - 'button "Cor do fundo: #123b63" [ref=f7e189] [cursor=pointer]'
                            - 'button "Cor do fundo: #d5edff" [ref=f7e190] [cursor=pointer]'
                            - 'button "Cor do fundo: #ffddc8" [ref=f7e191] [cursor=pointer]'
                            - 'button "Cor do fundo: #803a35" [ref=f7e192] [cursor=pointer]'
                            - 'button "Cor do fundo: #e35339" [ref=f7e193] [cursor=pointer]'
                          - generic [ref=f7e194]: Código da cor
                          - textbox "Cor do fundo — código hexadecimal" [ref=f7e195]: "#173c32"
                          - generic [ref=f7e196]:
                            - text: Vermelho
                            - slider "Cor do fundo — Vermelho" [ref=f7e197] [cursor=pointer]: "23"
                            - status [ref=f7e198]: "23"
                          - generic [ref=f7e199]:
                            - text: Verde
                            - slider "Cor do fundo — Verde" [ref=f7e200] [cursor=pointer]: "60"
                            - status [ref=f7e201]: "60"
                          - generic [ref=f7e202]:
                            - text: Azul
                            - slider "Cor do fundo — Azul" [ref=f7e203] [cursor=pointer]: "50"
                            - status [ref=f7e204]: "50"
                    - generic "Alteração não publicada" [ref=f7e205]:
                      - group [ref=f7e206]:
                        - 'generic "Cor dos botões #D9EFB6" [ref=f7e207] [cursor=pointer]':
                          - generic [ref=f7e209]: Cor dos botões
                          - code [ref=f7e210]: "#D9EFB6"
                          - generic [aria-hidden] [ref=f7e211]: ⌄
                    - generic [ref=f7e213]:
                      - generic [ref=f7e214]: Acabamento do fundo
                      - generic [ref=f7e216]:
                        - combobox "Acabamento do fundo" [ref=f7e217] [cursor=pointer]:
                          - generic [ref=f7e218]: Cor sólida
                        - textbox [aria-hidden] [ref=f7e224]: solid
                    - paragraph [ref=f7e225]: O texto se ajusta automaticamente para manter a leitura.
          - complementary "Prévia ao vivo da página" [ref=f7e226]:
            - generic [ref=f7e227]:
              - strong [ref=f7e228]: Prévia ao vivo
              - generic [ref=f7e231]: Rascunho · não publicado
            - generic [ref=f7e234]:
              - article "Perfil público" [ref=f7e235]:
                - generic [ref=f7e236]:
                  - generic [aria-hidden] [ref=f7e237]: A
                  - heading "Ana Estudos" [level=3] [ref=f7e238]
                  - paragraph [ref=f7e239]: Projetos, materiais e conversas sobre leitura.
                - region "Materiais" [ref=f7e240]:
                  - heading "Materiais" [level=4] [ref=f7e241]
                  - list [ref=f7e242]:
                    - listitem [ref=f7e243]:
                      - link "Meu site" [ref=f7e244] [cursor=pointer]:
                        - /url: https://example.com/f09-1-1
                        - generic [aria-hidden] [ref=f7e246]: ↗
              - generic [ref=f7e247]:
                - button "Gerenciar cookies" [ref=f7e248] [cursor=pointer]
                - link "Criado por Tem Link Aqui" [ref=f7e249] [cursor=pointer]:
                  - /url: /divulgar
                  - generic [ref=f7e250]: Criado por
                  - img "Tem Link Aqui" [ref=f7e251]
  - contentinfo [ref=f7e252]:
    - generic [ref=f7e253]: Tem Link Aqui
    - navigation "Informações do site" [ref=f7e254]:
      - link "Termos" [ref=f7e255] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f7e256] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f7e257] [cursor=pointer]
  - alert [ref=f7e258]
```

# Test source

```ts
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
  212 |   await expect(page.locator('[data-style="shadow"]')).toBeVisible()
  213 |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  214 |   await page.getByText('Cor do fundo', { exact: true }).click()
  215 |   await expect(color).toHaveValue('#173c32')
  216 |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
> 217 |   expect(accessibility.violations.map(item => item.id)).toEqual([])
      |                                                         ^ Error: expect(received).toEqual(expected) // deep equality
  218 |   await page.screenshot({ path: info.outputPath('appearance-editor.png'), fullPage: true })
  219 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('appearance-editor.png', { fullPage: true, animations: 'disabled' })
  220 |   const originalViewport = page.viewportSize()!
  221 |   await page.setViewportSize({ width: 320, height: 844 })
  222 |   await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  223 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  224 |   expect(await page.locator('details code').first().evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24)
  225 |   await page.screenshot({ path: info.outputPath('appearance-320-text-200.png'), fullPage: true })
  226 |   await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  227 |   await page.setViewportSize(originalViewport)
  228 |   await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  229 |   await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  230 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  231 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  232 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  233 |   await page.getByRole('link', { name: 'Voltar à edição' }).click()
  234 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  235 |   await editorSection(page, 'Aparência')
  236 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  237 |   await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  238 |   await page.goto(A + '/p/ana-estudos')
  239 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  240 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  241 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  242 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  243 |   await page.getByRole('button', { name: 'Gerenciar cookies', exact: true }).click()
  244 |   await page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  245 |   await expect(page.getByRole('region', { name: 'Este site usa cookies' })).toHaveCount(0)
  246 |   await page.screenshot({ path: info.outputPath('personal-page.png'), fullPage: true })
  247 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('personal-page.png', { fullPage: true, animations: 'disabled' })
  248 | })
  249 | test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  250 |   const s = fixture(); await login(page); await base(page)
  251 |   await add(page, 1, 1, 'Site principal'); await add(page, 1, 2, 'Material de leitura'); await add(page, 1, 3, 'OcultoSentinela', false)
  252 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Redes sociais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  253 |   const socialRow = await add(page, 2, 1, 'Vídeos'); await socialRow.getByRole('button', { name: 'Editar link', exact: true }).click(); const social = page.getByRole('dialog'); await expect(social.getByRole('tab',{name:'Novo',exact:true})).toHaveAttribute('aria-selected','true');await expect(social.getByRole('option',{name:'Rede social',exact:true})).toHaveCount(0); await social.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/videos'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  254 |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click(); await profileEditorTool(page, 'Botão principal')
  255 |   await selectOption(page.getByRole('combobox', { name: 'Botão principal', exact: true }), { label: 'Site principal' })
  256 |   await page.screenshot({ path: info.outputPath('primary-button-modal.png'), fullPage: true, animations: 'disabled' })
  257 |   await page.getByRole('dialog').getByRole('button', { name: 'Concluir', exact: true }).click()
  258 |   await expect(page.getByLabel('Mais opções da página', { exact: true })).toBeFocused()
  259 |   await step(page, 1)
  260 |   for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
  261 |     const buffer = mime === 'image/png' ? readFileSync(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png')) : Buffer.from(await page.evaluate(mime => {
  262 |       const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16
  263 |       const context = canvas.getContext('2d')!; context.fillStyle = '#146dca'; context.fillRect(0, 0, 16, 16)
  264 |       return canvas.toDataURL(mime).split(',')[1]
  265 |     }, mime), 'base64')
  266 |     await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'foto.' + mime.split('/')[1], mimeType: mime, buffer })
  267 |     await expect(page.getByLabel('Foto do perfil', { exact: true })).toBeEnabled(); await expect(page.getByRole('img', { name: 'Foto atual do perfil' })).toBeVisible(); await autosaved(page)
  268 |   }
  269 |   await step(page, 2)
  270 |   const socialCard = page.getByRole('listitem').filter({ hasText: 'Redes sociais' }); await socialCard.getByText('Mover', { exact: true }).click(); await socialCard.getByRole('button', { name: 'Subir grupo', exact: true }).click()
  271 |   await step(page, 3)
  272 |   let releasePreview = () => {}
  273 |   const previewHeld = new Promise<void>(resolve => { releasePreview = resolve })
  274 |   await page.route('**/bff/v1/me/profile/preview/items', async route => { await previewHeld; await route.continue() })
  275 |   try {
  276 |     await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  277 |     await expect(page).toHaveURL(A + '/painel/perfil/previa')
  278 |     await expect(page.locator('[data-skeleton]:visible')).toHaveCount(1)
  279 |     await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  280 |     await page.screenshot({ path: info.outputPath('private-preview-loading.png'), fullPage: true })
  281 |   } finally { releasePreview(); await page.unrouteAll({ behavior: 'wait' }) }
  282 |   const preview = page.getByRole('article', { name: 'Perfil público', exact: true })
  283 |   await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible()
  284 |   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  285 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/me/profile/preview')).headers.get('cache-control'))).toContain('no-store')
  286 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  287 |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  288 |   expect(accessibility.violations.map(item => item.id)).toEqual([])
  289 |   await expect(preview.getByRole('link', { name: 'Vídeos' })).toBeVisible(); expect(await preview.innerHTML()).not.toContain('OcultoSentinela')
  290 |   await preview.scrollIntoViewIfNeeded()
  291 |   await expect.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  292 |   await page.screenshot({ path: info.outputPath('private-preview.png'), fullPage: true })
  293 |   const size = page.viewportSize()!
  294 |   await page.setViewportSize({ width: size.width, height: 450 })
  295 |   await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  296 |   await expect.poll(async () => (await page.getByRole('region', { name: 'Modo de prévia' }).boundingBox())!.y).toBe(0)
  297 |   await page.getByRole('link', { name: 'Voltar à edição', exact: true }).click()
  298 |   await editorSection(page, 'Página')
  299 |   await page.setViewportSize(size)
  300 |   await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  301 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  302 |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  303 |   try {
  304 |     const guest = await context.newPage(); await guest.goto(A + '/painel/perfil/previa')
  305 |     await expect(guest.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  306 |     expect((await privateCall(guest, '/preview')).status).toBe(401)
  307 |     expect(await guest.content()).not.toContain('Ana Estudos')
  308 |     await guest.goto(A + '/p/ana-estudos')
  309 |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  310 |     const profile = guest.getByRole('article', { name: 'Perfil público' })
  311 |     await expect(profile.getByRole('heading', { level: 2 })).toHaveText(['Redes sociais', 'Materiais'])
  312 |     await expect(profile.getByRole('link')).toHaveCount(3)
  313 |     expect(await guest.content()).not.toMatch(/OcultoSentinela|owner@profiles.test|passwordHash/)
  314 |     const response = await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(response).not.toContain('OcultoSentinela')
  315 |     expect(await profile.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  316 |     await guest.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  317 |     await guest.screenshot({ path: info.outputPath('public-profile.png'), fullPage: true })
```