# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E07 selects nos modais não alteram dimensões nem acrescentam scroll
- Location: e2e\profiles.spec.ts:62:5

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 641
Received:    704
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
      - navigation "Navegação principal" [ref=f2e7]:
        - link "Busca" [ref=f2e8] [cursor=pointer]:
          - /url: /busca
        - link "Painel" [ref=f2e12] [cursor=pointer]:
          - /url: /painel
        - button "Sair" [ref=f2e17] [cursor=pointer]
  - main [ref=f2e21]:
    - complementary [ref=f2e22]:
      - paragraph [ref=f2e23]:
        - text: Meu espaço
        - generic [ref=f2e24]: Tem Link Aqui
      - navigation "Áreas do painel" [ref=f2e26]:
        - generic [ref=f2e27]:
          - paragraph [ref=f2e28]: Seu espaço
          - link "Visão geral" [ref=f2e29] [cursor=pointer]:
            - /url: /painel
          - group [ref=f2e32]:
            - generic "Publicação" [ref=f2e33] [cursor=pointer]
            - generic [ref=f2e39]:
              - link "Links" [ref=f2e40] [cursor=pointer]:
                - /url: /painel/links
              - link "Criar link" [ref=f2e41] [cursor=pointer]:
                - /url: /painel/links/novo
              - link "Minha página" [ref=f2e42] [cursor=pointer]:
                - /url: /painel/perfil
              - link "Convites" [ref=f2e43] [cursor=pointer]:
                - /url: /painel/convites
        - generic [ref=f2e44]:
          - paragraph [ref=f2e45]: Acompanhar
          - link "Pedidos" [ref=f2e46] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f2e49] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f2e52] [cursor=pointer]:
            - /url: /painel/favoritos
        - generic [ref=f2e55]:
          - paragraph [ref=f2e56]: Preferências
          - link "Conta" [ref=f2e57] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f2e60]:
      - heading "Minha página de links" [level=1] [ref=f2e63]
      - region "Editor do perfil" [ref=f2e65]:
        - region "Alterações não publicadas" [ref=f2e66]:
          - strong [ref=f2e67]: Tem alterações não publicadas
          - generic [ref=f2e68]:
            - generic "Disponível depois da primeira publicação" [ref=f2e69]:
              - button "Descartar" [disabled] [ref=f2e70]
            - button "Publicar" [ref=f2e72] [cursor=pointer]
        - generic [ref=f2e75]:
          - button "Ver prévia" [ref=f2e76] [cursor=pointer]
          - button "Atualizar dados" [ref=f2e80] [cursor=pointer]
        - tablist "Seções da minha página" [ref=f2e86]:
          - tab "Grupos e links" [selected] [ref=f2e87] [cursor=pointer]
          - tab "Página" [ref=f2e88] [cursor=pointer]
          - tab "Aparência" [ref=f2e89] [cursor=pointer]
        - form "Editar perfil" [ref=f2e90]:
          - tabpanel "Grupos e links" [ref=f2e91]:
            - group "Dados da página" [ref=f2e92]:
              - region "Grupos e links da página" [ref=f2e94]:
                - generic [ref=f2e95]:
                  - heading "Grupos e links" [level=2] [ref=f2e96]
                  - generic [ref=f2e97]:
                    - button "Botão principal" [ref=f2e98] [cursor=pointer]
                    - button "Adicionar grupo" [ref=f2e100] [cursor=pointer]
                - paragraph [ref=f2e104]: Arraste pela alça ou use Mover para ordenar. No teclado, use as setas na alça.
                - list [ref=f2e105]:
                  - listitem [ref=f2e106]:
                    - generic [ref=f2e107]:
                      - generic [ref=f2e108]: 1 link
                      - button "Arrastar grupo Materiais" [ref=f2e110]
                    - button [ref=f2e113] [cursor=pointer]:
                      - strong [ref=f2e114]: Materiais
                      - generic [ref=f2e115]: Abrir grupo
                    - group [ref=f2e118]:
                      - generic "Mover" [ref=f2e119] [cursor=pointer]
                - dialog [ref=f2e120]:
                  - generic [ref=f2e121]:
                    - generic [ref=f2e122]:
                      - heading "Escolher botão principal" [level=2] [ref=f2e123]
                      - button "Fechar janela" [ref=f2e124] [cursor=pointer]
                    - generic [ref=f2e128]:
                      - generic [ref=f2e130]:
                        - generic [ref=f2e131]: Botão principal
                        - generic [ref=f2e133]:
                          - combobox "Botão principal" [expanded] [ref=f2e134] [cursor=pointer]:
                            - generic [ref=f2e135]: Sem botão principal
                          - listbox [ref=f2e142]:
                            - group [ref=f2e143]:
                              - option "Sem botão principal" [active] [selected] [ref=f2e144] [cursor=pointer]:
                                - generic [aria-hidden] [ref=f2e146]: ✓
                              - option "Meu site com nome longo para conferir a largura do seletor e do modal sem esticar o conteúdo" [ref=f2e147] [cursor=pointer]
                          - textbox [aria-hidden] [ref=f2e151]
                        - generic [ref=f2e152]: Escolha o link que aparece no topo da sua página.
                      - generic [ref=f2e153]:
                        - button "Cancelar" [ref=f2e154] [cursor=pointer]
                        - button "Concluir" [ref=f2e156] [cursor=pointer]
  - contentinfo [ref=f2e158]:
    - generic [ref=f2e159]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e160]:
      - link "Termos" [ref=f2e161] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e162] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e163] [cursor=pointer]
  - alert [ref=f2e164]
```

# Test source

```ts
  1   | import { selectOption } from './select-control'
  2   | import AxeBuilder from '@axe-core/playwright'
  3   | import { readFileSync } from 'node:fs'
  4   | import path from 'node:path'
  5   | import { expect, test, type Page, type Locator, type TestInfo } from '@playwright/test'
  6   | import { runtime } from './runtime.cjs'
  7   | import { sql } from './db'
  8   | const A = runtime.web('profiles.localhost')
  9   | function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; ownerId: string; catalogId: string; owner: string; other: string; password: string } }
  10  | function fixture() { const s = state(); sql(`DELETE FROM profiles WHERE "tenantId"='${s.tenantId}'; DELETE FROM profile_assets WHERE "tenantId"='${s.tenantId}'; UPDATE networks SET "requiresAge"=false WHERE "tenantId"='${s.tenantId}'`); return s }
  11  | async function login(page: Page, email = state().owner) {
  12  |   await page.goto(A + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  13  |   const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
  14  | }
  15  | async function editorSection(page: Page, label: string) {
  16  |   const select = page.getByRole('combobox', { name: 'Editar minha página', exact: true })
  17  |   const tab = page.getByRole('tab', { name: label, exact: true })
  18  |   await expect(select.or(tab)).toBeVisible()
  19  |   if (await select.isVisible()) await selectOption(select, { label })
  20  |   else await tab.click()
  21  | }
  22  | async function step(page: Page, target: number) { await editorSection(page, target >= 2 ? 'Grupos e links' : 'Página') }
  23  | async function autosaved(page: Page) { await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'saved') }
  24  | async function base(page: Page, info?: TestInfo) {
  25  |   await page.goto(A + '/painel/perfil'); await page.getByLabel('Endereço da página').fill('ana-estudos'); await page.getByLabel('Nome da página').fill('Ana Estudos'); await page.getByLabel('Descrição', { exact: true }).fill('Projetos, materiais e conversas sobre leitura.')
  26  |   if (info) { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: info.outputPath('creation-identity.png'), fullPage: true, animations: 'disabled' }) }
  27  |   await step(page, 2); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Materiais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  28  | }
  29  | async function add(page: Page, group: number, index: number, label: string, visible = true) {
  30  |   await page.getByRole('button', { name: 'Adicionar link', exact: true }).click()
  31  |   const row = page.getByRole('dialog')
  32  |   await row.getByLabel('Título do link').fill(label); await row.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/f09-' + group + '-' + index)
  33  |   if (!visible) await row.getByLabel('Link visível', { exact: true }).uncheck()
  34  |   await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  35  |   return page.locator('[data-profile-link]').filter({ has: page.getByText(label, { exact: true }) })
  36  | }
  37  | async function privateCall(page: Page, path = '') { return page.evaluate(async path => { const r = await fetch('/bff/v1/me/profile' + path); return { status: r.status, text: await r.text() } }, path) }
  38  | 
  39  | async function stableModalSelect(page: Page, label: string, info: TestInfo, shot: string) {
  40  |   const dialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: label, exact: true }) })
  41  |   const control = dialog.getByRole('combobox', { name: label, exact: true })
  42  |   const geometry = () => dialog.evaluate(element => {
  43  |     const rect = element.getBoundingClientRect()
  44  |     return { width: rect.width, height: rect.height, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }
  45  |   })
  46  |   const before = await geometry()
  47  |   await control.click(); await expect(page.getByRole('listbox')).toBeVisible()
  48  |   await page.screenshot({ path: info.outputPath(shot + '.png'), animations: 'disabled' })
  49  |   const after = await geometry()
  50  |   expect(after.width, JSON.stringify({ before, after })).toBeCloseTo(before.width, 0)
  51  |   expect(after.height, JSON.stringify({ before, after })).toBeCloseTo(before.height, 0)
> 52  |   expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth + 1)
      |                             ^ Error: expect(received).toBeLessThanOrEqual(expected)
  53  |   expect(after.scrollHeight - after.clientHeight).toBeLessThanOrEqual(Math.max(0, before.scrollHeight - before.clientHeight) + 1)
  54  |   const popup = await page.getByRole('listbox').boundingBox()
  55  |   expect(popup).not.toBeNull()
  56  |   expect(popup!.x).toBeGreaterThanOrEqual(0)
  57  |   expect(popup!.x + popup!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  58  |   await page.keyboard.press('Escape'); await expect(page.getByRole('listbox')).toHaveCount(0)
  59  |   await expect(dialog).toBeVisible(); await expect(control).toBeFocused()
  60  | }
  61  | 
  62  | test('F09-E07 selects nos modais não alteram dimensões nem acrescentam scroll', async ({ page }, info) => {
  63  |   fixture(); await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page); await base(page)
  64  |   await add(page, 1, 1, 'Meu site com nome longo para conferir a largura do seletor e do modal sem esticar o conteúdo')
  65  |   await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  66  |   await page.getByRole('button', { name: 'Botão principal', exact: true }).click()
  67  |   await stableModalSelect(page, 'Botão principal', info, 'primary-select-open')
  68  |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  69  |   await page.getByRole('button', { name: 'Materiais Abrir grupo', exact: true }).click()
  70  |   await page.getByRole('button', { name: 'Editar link', exact: true }).click()
  71  |   await stableModalSelect(page, 'Tipo de link', info, 'link-type-select-open')
  72  |   await selectOption(page.getByRole('combobox', { name: 'Tipo de link', exact: true }), 'CATALOG')
  73  |   await stableModalSelect(page, 'Link do catálogo', info, 'catalog-select-open')
  74  |   await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  75  | })
  76  | 
  77  | test('F09 seis temas legíveis, página inteira e movimento reduzido', async ({ page }, info) => {
  78  |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  79  |   await page.emulateMedia({ reducedMotion: 'reduce' })
  80  |   for (const theme of ['Areia', 'Botânico', 'Lavanda', 'Editorial', 'Oceano', 'Pêssego']) {
  81  |     await editorSection(page, 'Aparência')
  82  |     await page.getByRole('button', { name: theme, exact: true }).click()
  83  |     await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  84  |     await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  85  |     await expect(page).toHaveTitle('Prévia da sua página | Tem Link Aqui')
  86  |     const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  87  |     expect(accessibility.violations.map(item => item.id)).toEqual([])
  88  |     await page.getByRole('link', { name: 'Meu site', exact: true }).focus()
  89  |     await expect(page.getByRole('link', { name: 'Meu site', exact: true })).toHaveCSS('transition-duration', '0s')
  90  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  91  |     await page.screenshot({ path: info.outputPath('theme-' + theme + '.png'), fullPage: true, animations: 'disabled' })
  92  |     await page.getByRole('link', { name: 'Voltar à edição' }).click()
  93  |     await expect(page.getByLabel('Nome da página')).toHaveValue('Ana Estudos')
  94  |   }
  95  | })
  96  | 
  97  | test('F09 aparência personalizada persiste e só chega ao público após publicar', async ({ page }, info) => {
  98  |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  99  |   await editorSection(page, 'Aparência')
  100 |   await page.getByRole('button', { name: 'Botânico', exact: true }).click()
  101 |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  102 |   await page.getByText('Cor do fundo', { exact: true }).click()
  103 |   const color = page.getByLabel('Cor do fundo — código hexadecimal')
  104 |   await color.fill('url(x)'); await expect(color).toHaveAttribute('aria-invalid', 'true')
  105 |   await color.fill('#173c32'); await expect(color).not.toHaveAttribute('aria-invalid', 'true')
  106 |   const slider = page.getByRole('slider', { name: 'Cor do fundo — Vermelho' })
  107 |   await slider.focus(); await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue('24')
  108 |   await color.fill('#173c32')
  109 |   await page.getByRole('tab', { name: 'Botões e texto', exact: true }).click()
  110 |   await selectOption(page.getByLabel('Estilo dos botões'), 'shadow')
  111 |   await autosaved(page)
  112 |   await expect(page.getByText('Salvo automaticamente', { exact: true })).toHaveCount(0)
  113 |   await page.reload(); await editorSection(page, 'Aparência')
  114 |   await expect(page.locator('[data-style="shadow"]')).toBeVisible()
  115 |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  116 |   await page.getByText('Cor do fundo', { exact: true }).click()
  117 |   await expect(color).toHaveValue('#173c32')
  118 |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  119 |   expect(accessibility.violations.map(item => item.id)).toEqual([])
  120 |   await page.screenshot({ path: info.outputPath('appearance-editor.png'), fullPage: true })
  121 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('appearance-editor.png', { fullPage: true, animations: 'disabled' })
  122 |   const originalViewport = page.viewportSize()!
  123 |   await page.setViewportSize({ width: 320, height: 844 })
  124 |   await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  125 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  126 |   expect(await page.locator('details code').first().evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24)
  127 |   await page.screenshot({ path: info.outputPath('appearance-320-text-200.png'), fullPage: true })
  128 |   await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  129 |   await page.setViewportSize(originalViewport)
  130 |   await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  131 |   await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  132 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  133 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  134 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  135 |   await page.getByRole('link', { name: 'Voltar à edição' }).click()
  136 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  137 |   await editorSection(page, 'Aparência')
  138 |   await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  139 |   await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  140 |   await page.goto(A + '/p/ana-estudos')
  141 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  142 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  143 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  144 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  145 |   await page.getByRole('button', { name: 'Gerenciar cookies', exact: true }).click()
  146 |   await page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  147 |   await expect(page.getByRole('region', { name: 'Este site usa cookies' })).toHaveCount(0)
  148 |   await page.screenshot({ path: info.outputPath('personal-page.png'), fullPage: true })
  149 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('personal-page.png', { fullPage: true, animations: 'disabled' })
  150 | })
  151 | test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  152 |   const s = fixture(); await login(page); await base(page)
```