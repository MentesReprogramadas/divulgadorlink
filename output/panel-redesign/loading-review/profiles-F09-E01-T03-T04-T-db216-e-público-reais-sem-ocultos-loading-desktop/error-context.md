# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profiles.spec.ts >> F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos
- Location: e2e\profiles.spec.ts:32:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Prévia do perfil', exact: true }).getByRole('link', { name: 'Vídeos' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('region', { name: 'Prévia do perfil', exact: true }).getByRole('link', { name: 'Vídeos' }) with timeout 20000ms
  - waiting for getByRole('region', { name: 'Prévia do perfil', exact: true }).getByRole('link', { name: 'Vídeos' })

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
  - region "Modo de prévia":
    - strong: Modo de prévia
    - paragraph: Somente você vê este rascunho.
    - link "Voltar à edição":
      - /url: /painel/perfil
  - article "Perfil público":
    - heading "Ana Estudos" [level=1]
    - paragraph: Projetos, materiais e conversas sobre leitura.
    - link "Site principal":
      - /url: https://example.com/f09-1-1
    - region "Redes sociais":
      - heading "Redes sociais" [level=2]
      - list:
        - listitem:
          - link "Vídeos":
            - /url: https://example.com/videos
    - region "Materiais":
      - heading "Materiais" [level=2]
      - list:
        - listitem:
          - link "Material de leitura":
            - /url: https://example.com/f09-1-2
- contentinfo:
  - text: Tem Link Aqui
  - navigation "Informações do site":
    - link "Termos":
      - /url: /termos
    - link "Privacidade":
      - /url: /privacidade
    - button "Gerenciar cookies"
- alert: Prévia da sua página | Tem Link Aqui
```

# Test source

```ts
  1   | import { selectOption } from './select-control'
  2   | import { readFileSync } from 'node:fs'
  3   | import path from 'node:path'
  4   | import { expect, test, type Page } from '@playwright/test'
  5   | import { runtime } from './runtime.cjs'
  6   | import { sql } from './db'
  7   | const A = runtime.web('profiles.localhost')
  8   | function state() { return JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; ownerId: string; catalogId: string; owner: string; other: string; password: string } }
  9   | function fixture() { const s = state(); sql(`DELETE FROM profiles WHERE "tenantId"='${s.tenantId}'; DELETE FROM profile_assets WHERE "tenantId"='${s.tenantId}'; UPDATE networks SET "requiresAge"=false WHERE "tenantId"='${s.tenantId}'`); return s }
  10  | async function login(page: Page, email = state().owner) {
  11  |   await page.goto(A + '/login'); await page.getByLabel('E-mail').fill(email); await page.getByLabel('Senha').fill(state().password); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  12  |   const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
  13  | }
  14  | async function step(page: Page, target: number) {
  15  |   const current = await page.getByRole('list', { name: 'Etapas do formulário' }).locator('li').evaluateAll(items => items.findIndex(item => item.hasAttribute('aria-current')))
  16  |   if (target < current) await page.getByRole('list', { name: 'Etapas do formulário' }).getByRole('button').nth(target).click()
  17  |   else for (let index = current; index < target; index++) await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  18  | }
  19  | async function base(page: Page) {
  20  |   await page.goto(A + '/painel/perfil'); await page.getByLabel('Personalize o link da sua página').fill('ana-estudos'); await page.getByLabel('Título da sua página').fill('Ana Estudos'); await page.getByLabel('Descrição', { exact: true }).fill('Projetos, materiais e conversas sobre leitura.')
  21  |   await step(page, 2); await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo 1', { exact: true }).fill('Materiais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  22  | }
  23  | async function add(page: Page, group: number, index: number, label: string, visible = true) {
  24  |   await page.getByRole('button', { name: 'Adicionar link ao grupo ' + group, exact: true }).click()
  25  |   const row = page.getByRole('dialog')
  26  |   await row.getByLabel('Título do link').fill(label); await row.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/f09-' + group + '-' + index)
  27  |   if (!visible) await row.getByLabel('Link visível', { exact: true }).uncheck()
  28  |   await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  29  |   return page.getByRole('group', { name: `Link ${index} do grupo ${group}`, exact: true })
  30  | }
  31  | async function privateCall(page: Page, path = '') { return page.evaluate(async path => { const r = await fetch('/bff/v1/me/profile' + path); return { status: r.status, text: await r.text() } }, path) }
  32  | test('F09-E01/T03/T04/T05 grupos, ordem, redes, foto e botão principal; prévia e público reais sem ocultos', async ({ page, browser }, info) => {
  33  |   const s = fixture(); await login(page); await base(page)
  34  |   await add(page, 1, 1, 'Site principal'); await add(page, 1, 2, 'Material de leitura'); await add(page, 1, 3, 'OcultoSentinela', false)
  35  |   await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo 2', { exact: true }).fill('Redes sociais'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
  36  |   const socialRow = await add(page, 2, 1, 'Vídeos'); await socialRow.getByRole('button', { name: 'Editar link', exact: true }).click(); const social = page.getByRole('dialog'); await selectOption(social.getByLabel('Tipo de link'), 'SOCIAL'); await social.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/videos'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
  37  |   await selectOption(page.getByLabel('Botão principal'), { label: 'Site principal' })
  38  |   await step(page, 1)
  39  |   for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
  40  |     const buffer = mime === 'image/png' ? readFileSync(path.join(__dirname, '../../backend/src/domain/profiles/avatar.fixture.png')) : Buffer.from(await page.evaluate(mime => {
  41  |       const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16
  42  |       const context = canvas.getContext('2d')!; context.fillStyle = '#146dca'; context.fillRect(0, 0, 16, 16)
  43  |       return canvas.toDataURL(mime).split(',')[1]
  44  |     }, mime), 'base64')
  45  |     await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'foto.' + mime.split('/')[1], mimeType: mime, buffer })
  46  |     await expect(page.getByRole('status').filter({ hasText: 'Foto recebida.' })).toBeVisible()
  47  |   }
  48  |   await step(page, 2)
  49  |   await page.getByRole('button', { name: 'Subir grupo 2', exact: true }).click()
  50  |   await step(page, 3)
  51  |   await page.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  52  |   const preview = page.getByRole('region', { name: 'Prévia do perfil', exact: true })
> 53  |   await expect(preview.getByRole('link', { name: 'Vídeos' })).toBeVisible(); expect(await preview.innerHTML()).not.toContain('OcultoSentinela')
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  54  |   await preview.scrollIntoViewIfNeeded()
  55  |   await expect.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  56  |   await page.screenshot({ path: info.outputPath('private-preview.png'), fullPage: true })
  57  |   const size = page.viewportSize()!
  58  |   await page.setViewportSize({ width: size.width, height: 450 })
  59  |   await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  60  |   await expect.poll(async () => (await page.getByRole('region', { name: 'Modo de prévia' }).boundingBox())!.y).toBe(0)
  61  |   await page.getByRole('link', { name: 'Voltar à edição', exact: true }).click()
  62  |   await page.setViewportSize(size)
  63  |   await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  64  |   await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  65  |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  66  |   try {
  67  |     const guest = await context.newPage(); await guest.goto(A + '/painel/perfil/previa')
  68  |     await expect(guest.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  69  |     expect((await privateCall(guest, '/preview')).status).toBe(401)
  70  |     expect(await guest.content()).not.toContain('Ana Estudos')
  71  |     await guest.goto(A + '/p/ana-estudos')
  72  |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  73  |     const profile = guest.getByRole('article', { name: 'Perfil público' })
  74  |     await expect(profile.getByRole('heading', { level: 2 })).toHaveText(['Redes sociais', 'Materiais'])
  75  |     await expect(profile.getByRole('link')).toHaveCount(3)
  76  |     expect(await guest.content()).not.toMatch(/OcultoSentinela|owner@profiles.test|passwordHash/)
  77  |     const response = await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(response).not.toContain('OcultoSentinela')
  78  |     expect(await profile.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  79  |     await guest.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }).click()
  80  |     await guest.screenshot({ path: info.outputPath('public-profile.png'), fullPage: true })
  81  |     await expect(guest.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://profiles.localhost/p/ana-estudos')
  82  |     await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  83  |   } finally { await context.close() }
  84  |   expect(sql(`SELECT COUNT(*) FROM links WHERE "tenantId"='${s.tenantId}'`)).toBe('1')
  85  |   await page.reload(); await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  86  | })
  87  | test('F09-E04 restrição de idade não entrega conteúdo no HTML/API antes do aceite real', async ({ page, browser }, info) => {
  88  |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  89  |   await step(page, 1)
  90  |   await page.getByLabel('Conteúdo para maiores de 18 anos', { exact: true }).check()
  91  |   await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  92  |   const context = await browser.newContext({ viewport: info.project.use.viewport })
  93  |   try {
  94  |     const guest = await context.newPage(); await guest.goto(A + '/p/ana-estudos')
  95  |     await expect(guest.getByRole('dialog')).toBeVisible(); expect(await guest.content()).not.toContain('Ana Estudos')
  96  |     expect(await guest.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).json())).toEqual({ restricted: true })
  97  |     await guest.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click()
  98  |     await expect(guest.getByRole('heading', { name: 'Ana Estudos', exact: true })).toBeVisible()
  99  |     await expect(guest.getByRole('dialog')).toHaveCount(0)
  100 |   } finally { await context.close() }
  101 | })
  102 | test('F09-E02/T02/T06 sessão real, admin não ganha dono, suspeita/provedor bloqueiam e preservam página anterior', async ({ page, browser }) => {
  103 |   fixture(); await page.goto(A + '/painel/perfil'); await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible(); expect((await privateCall(page)).status).toBe(401)
  104 |   await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  105 |   await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  106 |   for (const text of ['SuspeitoFixture', 'FalhaProvedorFixture']) {
  107 |     await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill(text); await step(page, 3); await page.getByRole('button', { name: 'Publicar perfil', exact: true }).click()
  108 |     await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('rascunho foi mantido')
  109 |     await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(text)
  110 |     const live = await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).text()); expect(live).not.toContain(text)
  111 |   }
  112 |   const context = await browser.newContext()
  113 |   try { const other = await context.newPage(); await login(other, state().other); await other.goto(A + '/painel/perfil'); await expect(other.getByLabel('Título da sua página')).toHaveValue(''); expect((await privateCall(other)).text).not.toContain('FalhaProvedorFixture') } finally { await context.close() }
  114 |   await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar retirada', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Perfil retirado do ar.' })).toBeVisible()
  115 |   expect(await page.evaluate(async () => (await fetch('/bff/v1/profiles/ana-estudos')).status)).toBe(404)
  116 | })
  117 | test('F09-E03 offline mantém dados, teclado salva, 320px e texto 200%, conflito entre abas não sobrescreve', async ({ page }, info) => {
  118 |   fixture(); await login(page); await base(page); await add(page, 1, 1, 'Meu site')
  119 |   await page.context().setOffline(true); await step(page, 3); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('Sem conexão.'); await expect(page.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  120 |   await page.context().setOffline(false); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeFocused()
  121 |   const second = await page.context().newPage()
  122 |   try {
  123 |     await second.goto(A + '/painel/perfil'); await expect(second.getByLabel('Título da sua página')).toHaveValue('Ana Estudos')
  124 |     await step(page, 0); await page.getByLabel('Descrição', { exact: true }).fill('Gravado na primeira aba'); await step(page, 3); await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeVisible()
  125 |     await step(second, 0); await second.getByLabel('Descrição', { exact: true }).fill('Rascunho preservado'); await step(second, 3); await second.getByRole('button', { name: 'Salvar rascunho', exact: true }).click(); await expect(second.getByRole('region', { name: 'Editor do perfil', exact: true }).getByRole('alert')).toContainText('outra aba'); await expect(second.getByLabel('Descrição', { exact: true })).toHaveValue('Rascunho preservado')
  126 |   } finally { await second.close() }
  127 |   await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  128 |   await page.screenshot({ path: info.outputPath('profile-320-text200.png'), fullPage: true })
  129 | })
  130 | 
```