# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09 aparência personalizada persiste e só chega ao público após publicar
- Location: e2e\profiles.spec.ts:62:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('tab', { name: 'Aparência', exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=f3e1]:
  - link "Ir para o conteúdo" [ref=f3e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f3e3]:
    - generic [ref=f3e4]:
      - link "Home" [ref=f3e5] [cursor=pointer]:
        - /url: /
      - button "Menu" [ref=f3e7] [cursor=pointer]
  - main [ref=f3e11]:
    - generic [ref=f3e12]:
      - heading "Minha página de links" [level=1] [ref=f3e15]
      - region "Editor do perfil" [ref=f3e17]:
        - generic [ref=f3e18]:
          - generic [ref=f3e19]: Rascunho
          - group "Ações da página" [ref=f3e24]:
            - button "Atualizar dados" [ref=f3e25] [cursor=pointer]
        - generic [ref=f3e30]:
          - generic [ref=f3e31]: Editar minha página
          - generic [ref=f3e33]:
            - combobox "Editar minha página" [ref=f3e34] [cursor=pointer]:
              - generic [ref=f3e35]: Grupos e links
            - textbox [aria-hidden] [ref=f3e39]: groups
        - form "Editar perfil" [ref=f3e40]:
          - tabpanel "Grupos e links" [ref=f3e41]:
            - group "Dados do perfil" [ref=f3e43]:
              - region "Grupos e links da página" [ref=f3e45]:
                - generic [ref=f3e46]:
                  - generic [ref=f3e47]:
                    - heading "Seus grupos" [level=2] [ref=f3e48]
                    - paragraph [ref=f3e49]: Abra um grupo para cuidar dos links dele.
                  - button "Adicionar grupo" [ref=f3e50] [cursor=pointer]
                - paragraph [ref=f3e54]: Arraste pela alça para ordenar os grupos. Você também pode usar as setas do teclado ou os botões em Mover.
                - list [ref=f3e55]:
                  - listitem [ref=f3e56]:
                    - generic [ref=f3e57]:
                      - generic [ref=f3e58]: 1 links
                      - button "Arrastar grupo Materiais" [ref=f3e60]
                    - button [ref=f3e63] [cursor=pointer]:
                      - strong [ref=f3e64]: Materiais
                      - generic [ref=f3e65]: Abrir grupo
                    - group [ref=f3e68]:
                      - generic "Mover" [ref=f3e69] [cursor=pointer]
                - group [ref=f3e70]:
                  - generic "Escolher botão principal" [ref=f3e71] [cursor=pointer]
        - generic [ref=f3e72]:
          - paragraph [ref=f3e73]: Salve para continuar depois ou confira sua página antes de publicar.
          - group "Salvar e publicar" [ref=f3e74]:
            - button "Salvar rascunho" [ref=f3e76] [cursor=pointer]
            - button "Ver prévia" [ref=f3e80] [cursor=pointer]
            - button "Publicar perfil" [ref=f3e84] [cursor=pointer]
  - contentinfo [ref=f3e88]:
    - generic [ref=f3e89]: Tem Link Aqui
    - navigation "Informações do site" [ref=f3e90]:
      - link "Termos" [ref=f3e91] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f3e92] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f3e93] [cursor=pointer]
  - alert [ref=f3e94]
```

# Test source

```ts
  1   | import { selectOption } from './select-control'
  2   | import AxeBuilder from '@axe-core/playwright'
  3   | import { readFileSync } from 'node:fs'
  4   | import path from 'node:path'
  5   | import { expect, test, type Page, type Locator } from '@playwright/test'
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
  17  |   if (await select.isVisible()) await selectOption(select, { label })
> 18  |   else await page.getByRole('tab', { name: label, exact: true }).click()
      |                                                                  ^ Error: locator.click: Test timeout of 120000ms exceeded.
  19  | }
  20  | async function step(page: Page, target: number) {
  21  |   if (await page.locator('#page-editor-content').count()) await editorSection(page, 'Criar minha página')
  22  |   if (!await page.getByRole('list', { name: 'Etapas do formulário' }).count()) { await editorSection(page, ['Sua página', 'Foto e acesso', 'Grupos e links', 'Publicação'][target]); return }
  23  |   if (await page.getByRole('tab', { name: 'Criar minha página', exact: true }).isVisible()) await editorSection(page, 'Criar minha página')
  24  |   const current = await page.getByRole('list', { name: 'Etapas do formulário' }).locator('li').evaluateAll(items => items.findIndex(item => item.hasAttribute('aria-current')))
  25  |   if (target < current) await page.getByRole('list', { name: 'Etapas do formulário' }).getByRole('button').nth(target).click()
  26  |   else for (let index = current; index < target; index++) await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  27  | }
  28  | async function base(page: Page) {
  29  |   await page.goto(A + '/painel/perfil'); await page.getByLabel('Personalize o link da sua página').fill('ana-estudos'); await page.getByLabel('Título da sua página').fill('Ana Estudos'); await page.getByLabel('Descrição', { exact: true }).fill('Projetos, materiais e conversas sobre leitura.')
  30  |   await step(page, 2); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Materiais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  31  | }
  32  | async function add(page: Page, group: number, index: number, label: string, visible = true) {
  33  |   await page.getByRole('button', { name: 'Adicionar link', exact: true }).click()
  34  |   const row = page.getByRole('dialog')
  35  |   await row.getByLabel('Título do link').fill(label); await row.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/f09-' + group + '-' + index)
  36  |   if (!visible) await row.getByLabel('Link visível', { exact: true }).uncheck()
  37  |   await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  38  |   return page.locator('[data-profile-link]').filter({ has: page.getByText(label, { exact: true }) })
  39  | }
  40  | async function privateCall(page: Page, path = '') { return page.evaluate(async path => { const r = await fetch('/bff/v1/me/profile' + path); return { status: r.status, text: await r.text() } }, path) }
  41  | 
  42  | test('F09 seis temas legíveis, página inteira e movimento reduzido', async ({ page }, info) => {
  43  |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  44  |   await page.emulateMedia({ reducedMotion: 'reduce' })
  45  |   for (const theme of ['Areia', 'Botânico', 'Lavanda', 'Editorial', 'Oceano', 'Pêssego']) {
  46  |     await editorSection(page, 'Aparência')
  47  |     await page.getByRole('button', { name: theme, exact: true }).click()
  48  |     await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  49  |     await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  50  |     await expect(page).toHaveTitle('Prévia da sua página | Tem Link Aqui')
  51  |     const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  52  |     expect(accessibility.violations.map(item => item.id)).toEqual([])
  53  |     await page.getByRole('link', { name: 'Meu site', exact: true }).focus()
  54  |     await expect(page.getByRole('link', { name: 'Meu site', exact: true })).toHaveCSS('transition-duration', '0s')
  55  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  56  |     await page.screenshot({ path: info.outputPath('theme-' + theme + '.png'), fullPage: true, animations: 'disabled' })
  57  |     await page.getByRole('link', { name: 'Voltar à edição' }).click()
  58  |     await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  59  |   }
  60  | })
  61  | 
  62  | test('F09 aparência personalizada persiste e só chega ao público após publicar', async ({ page }, info) => {
  63  |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  64  |   await editorSection(page, 'Aparência')
  65  |   await page.getByRole('button', { name: 'Botânico', exact: true }).click()
  66  |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  67  |   await page.getByText('Cor do fundo', { exact: true }).click()
  68  |   const color = page.getByLabel('Cor do fundo — código hexadecimal')
  69  |   await color.fill('url(x)'); await expect(color).toHaveAttribute('aria-invalid', 'true')
  70  |   await color.fill('#173c32'); await expect(color).not.toHaveAttribute('aria-invalid', 'true')
  71  |   const slider = page.getByRole('slider', { name: 'Cor do fundo — Vermelho' })
  72  |   await slider.focus(); await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue('24')
  73  |   await color.fill('#173c32')
  74  |   await page.getByRole('tab', { name: 'Botões e texto', exact: true }).click()
  75  |   await selectOption(page.getByLabel('Estilo dos botões'), 'shadow')
  76  |   await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  77  |   await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeVisible()
  78  |   await page.reload(); await editorSection(page, 'Aparência')
  79  |   await expect(page.locator('[data-style="shadow"]')).toBeVisible()
  80  |   await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  81  |   await page.getByText('Cor do fundo', { exact: true }).click()
  82  |   await expect(color).toHaveValue('#173c32')
  83  |   const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  84  |   expect(accessibility.violations.map(item => item.id)).toEqual([])
  85  |   await page.screenshot({ path: info.outputPath('appearance-editor.png'), fullPage: true })
  86  |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('appearance-editor.png', { fullPage: true, animations: 'disabled' })
  87  |   const originalViewport = page.viewportSize()!
  88  |   await page.setViewportSize({ width: 320, height: 844 })
  89  |   await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  90  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  91  |   expect(await page.locator('details code').first().evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24)
  92  |   await page.screenshot({ path: info.outputPath('appearance-320-text-200.png'), fullPage: true })
  93  |   await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  94  |   await page.setViewportSize(originalViewport)
  95  |   await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  96  |   await expect(page.getByRole('heading', { name: 'Ana Estudos' })).toBeVisible()
  97  |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  98  |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  99  |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  100 |   await page.getByRole('link', { name: 'Voltar à edição' }).click()
  101 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  102 |   await editorSection(page, 'Aparência')
  103 |   await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click()
  104 |   await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  105 |   await page.goto(A + '/p/ana-estudos')
  106 |   await expect(page.locator('[data-style="shadow"]')).toHaveCSS('background-color', 'rgb(23, 60, 50)')
  107 |   await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0)
  108 |   await expect(page.getByRole('link', { name: 'Criado por Tem Link Aqui' })).toBeVisible()
  109 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  110 |   await page.getByRole('button', { name: 'Gerenciar cookies', exact: true }).click()
  111 |   await page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  112 |   await expect(page.getByRole('region', { name: 'Este site usa cookies' })).toHaveCount(0)
  113 |   await page.screenshot({ path: info.outputPath('personal-page.png'), fullPage: true })
  114 |   if (process.env.E2E_PROFILE_VISUAL === '1') await expect(page).toHaveScreenshot('personal-page.png', { fullPage: true, animations: 'disabled' })
  115 | })
  116 | test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  117 |   const s = fixture(); await login(page); await base(page)
  118 |   await add(page, 1, 1, 'Site principal'); await add(page, 1, 2, 'Material de leitura'); await add(page, 1, 3, 'OcultoSentinela', false)
```