# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-history.spec.ts >> F19-E01/E03 compare, explicit restore, existing preview and republish preserve public content until publication
- Location: e2e\profile-history.spec.ts:38:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 2
Received:   3.0054931640625
```

# Page snapshot

```yaml
- generic [ref=f3e1]:
  - link "Ir para o conteúdo" [ref=f3e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f3e3]:
    - generic [ref=f3e4]:
      - link "Home" [ref=f3e5] [cursor=pointer]:
        - /url: /
      - navigation "Navegação principal" [ref=f3e7]:
        - link "Busca" [ref=f3e8] [cursor=pointer]:
          - /url: /busca
        - link "Painel" [ref=f3e12] [cursor=pointer]:
          - /url: /painel
        - button "Sair" [ref=f3e17] [cursor=pointer]
  - main [ref=f3e21]:
    - complementary [ref=f3e22]:
      - paragraph [ref=f3e23]:
        - text: Meu espaço
        - generic [ref=f3e24]: Tem Link Aqui
      - navigation "Áreas do painel" [ref=f3e26]:
        - generic [ref=f3e27]:
          - paragraph [ref=f3e28]: Seu espaço
          - link "Visão geral" [ref=f3e29] [cursor=pointer]:
            - /url: /painel
          - link "Convites" [ref=f3e32] [cursor=pointer]:
            - /url: /painel/convites
          - link "Equipe" [ref=f3e35] [cursor=pointer]:
            - /url: /painel/equipe
        - generic [ref=f3e38]:
          - paragraph [ref=f3e39]: Catálogo
          - link "Meus links" [ref=f3e40] [cursor=pointer]:
            - /url: /painel/links
          - link "Criar link" [ref=f3e43] [cursor=pointer]:
            - /url: /painel/links/novo
        - group [ref=f3e47]:
          - generic "Minha página" [ref=f3e48] [cursor=pointer]
          - generic [ref=f3e54]:
            - link "Visão geral" [ref=f3e55] [cursor=pointer]:
              - /url: /painel/perfil
            - group [ref=f3e58]:
              - generic "Edição" [ref=f3e59] [cursor=pointer]
            - group [ref=f3e63]:
              - generic "Ferramentas" [ref=f3e64] [cursor=pointer]
              - generic [ref=f3e68]:
                - link "Importar links" [ref=f3e69] [cursor=pointer]:
                  - /url: /painel/perfil/importar
                - link "Importar e exportar" [ref=f3e72] [cursor=pointer]:
                  - /url: /painel/perfil/exportar
                - link "Histórico" [ref=f3e75] [cursor=pointer]:
                  - /url: /painel/perfil/historico
                - link "Checklist" [ref=f3e78] [cursor=pointer]:
                  - /url: /painel/perfil/checklist
            - group [ref=f3e81]:
              - generic "Resultados e divulgação" [ref=f3e82] [cursor=pointer]
        - generic [ref=f3e86]:
          - paragraph [ref=f3e87]: Acompanhar
          - link "Pedidos" [ref=f3e88] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f3e91] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f3e94] [cursor=pointer]:
            - /url: /painel/favoritos
          - link "Categorias seguidas" [ref=f3e97] [cursor=pointer]:
            - /url: /painel/interesses
        - generic [ref=f3e100]:
          - paragraph [ref=f3e101]: Preferências
          - link "Assinatura" [ref=f3e102] [cursor=pointer]:
            - /url: /painel/assinatura
          - link "Conta" [ref=f3e105] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f3e108]:
      - heading "Histórico da minha página" [level=1] [ref=f3e111]
      - region "Histórico da minha página" [ref=f3e113]:
        - generic [ref=f3e114]:
          - link "Voltar à edição" [ref=f3e115] [cursor=pointer]:
            - /url: /painel/perfil
          - button "Atualizar dados" [ref=f3e118] [cursor=pointer]
        - paragraph [ref=f3e122]: Até 50 versões por 180 dias. A publicação atual é preservada. Fotos antigas removidas não são recuperadas.
        - generic [ref=f3e123]:
          - article "Versão 2" [ref=f3e124]:
            - generic [ref=f3e125]:
              - heading "Versão 2" [level=2] [ref=f3e126]
              - generic [ref=f3e127]: Publicada agora
            - paragraph [ref=f3e131]: Página atualizada
            - generic [ref=f3e132]:
              - time [ref=f3e133]: 18/10/2026, 21:00
              - generic [ref=f3e134]: 2 grupos · 1 link
            - button "Ver diferenças" [ref=f3e136] [cursor=pointer]
          - article "Versão 1" [ref=f3e140]:
            - heading "Versão 1" [level=2] [ref=f3e142]
            - paragraph [ref=f3e143]: Página inicial
            - generic [ref=f3e144]:
              - time [ref=f3e145]: 18/10/2026, 21:00
              - generic [ref=f3e146]: 2 grupos · 1 link
            - button "Ver diferenças" [ref=f3e148] [cursor=pointer]
        - dialog [ref=f3e152]:
          - generic [ref=f3e153]:
            - generic [ref=f3e154]:
              - heading "Versão 1" [level=2] [ref=f3e155]
              - button "Fechar janela" [active] [ref=f3e156] [cursor=pointer]
            - generic [ref=f3e160]:
              - paragraph [ref=f3e161]: Compare a versão antiga com seu rascunho atual antes de restaurar.
              - generic [ref=f3e162]:
                - region "Prévia da versão antiga" [ref=f3e163]:
                  - heading "Versão 1" [level=3] [ref=f3e164]
                  - paragraph [ref=f3e165]: Versão antiga
                  - generic [ref=f3e167]:
                    - article "Perfil público" [ref=f3e168]:
                      - generic [ref=f3e169]:
                        - generic [aria-hidden] [ref=f3e170]: P
                        - heading "Página inicial" [level=3] [ref=f3e171]
                        - paragraph [ref=f3e172]: Materiais para estudantes
                      - region "Materiais" [ref=f3e173]:
                        - heading "Materiais" [level=4] [ref=f3e174]
                        - list [ref=f3e175]:
                          - listitem [ref=f3e176]:
                            - link "Aulas" [ref=f3e177] [cursor=pointer]:
                              - /url: https://example.com/aulas
                              - generic [aria-hidden] [ref=f3e179]: ↗
                    - generic [ref=f3e180]:
                      - button "Gerenciar cookies" [ref=f3e181] [cursor=pointer]
                      - link "Criado por Tem Link Aqui" [ref=f3e182] [cursor=pointer]:
                        - /url: /divulgar
                        - generic [ref=f3e183]: Criado por
                        - img "Tem Link Aqui" [ref=f3e184]
                - region "Prévia do rascunho atual" [ref=f3e185]:
                  - heading "Rascunho atual" [level=3] [ref=f3e186]
                  - paragraph [ref=f3e187]: Alterações ainda em rascunho
                  - generic [ref=f3e189]:
                    - article "Perfil público" [ref=f3e190]:
                      - generic [ref=f3e191]:
                        - generic [aria-hidden] [ref=f3e192]: P
                        - heading "Página atualizada" [level=3] [ref=f3e193]
                        - paragraph [ref=f3e194]: Materiais para estudantes
                      - region "Materiais" [ref=f3e195]:
                        - heading "Materiais" [level=4] [ref=f3e196]
                        - list [ref=f3e197]:
                          - listitem [ref=f3e198]:
                            - link "Aulas" [ref=f3e199] [cursor=pointer]:
                              - /url: https://example.com/aulas
                              - generic [aria-hidden] [ref=f3e201]: ↗
                    - generic [ref=f3e202]:
                      - button "Gerenciar cookies" [ref=f3e203] [cursor=pointer]
                      - link "Criado por Tem Link Aqui" [ref=f3e204] [cursor=pointer]:
                        - /url: /divulgar
                        - generic [ref=f3e205]: Criado por
                        - img "Tem Link Aqui" [ref=f3e206]
              - button "Restaurar no rascunho" [ref=f3e208] [cursor=pointer]
              - group [ref=f3e212]:
                - generic "Detalhes das alterações (1)" [ref=f3e213]
  - contentinfo [ref=f3e214]:
    - generic [ref=f3e215]: Tem Link Aqui
    - navigation "Informações do site" [ref=f3e216]:
      - link "Termos" [ref=f3e217] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f3e218] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f3e219] [cursor=pointer]
  - alert [ref=f3e220]: Histórico da minha página | Tem Link Aqui
```

# Test source

```ts
  1   | import {profileEditorTool} from './profile-editor'
  2   | import { readFileSync } from 'node:fs'
  3   | import path from 'node:path'
  4   | import { randomUUID } from 'node:crypto'
  5   | import { expect, test, type Page } from '@playwright/test'
  6   | import AxeBuilder from '@axe-core/playwright'
  7   | import { runtime } from './runtime.cjs'
  8   | import { sql } from './db'
  9   | const fixture = () => JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).profiles as { tenantId: string; owner: string; other: string; password: string }
  10  | const origin = runtime.web('profiles.localhost')
  11  | async function login(page: Page, other = false) {
  12  |   const data = fixture(); await page.goto(origin + '/login'); await page.getByLabel('E-mail').fill(other ? data.other : data.owner); await page.getByLabel('Senha').fill(data.password); await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  13  |   await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  14  |   const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
  15  | }
  16  | async function mutate(page: Page, route: string, body: unknown, method = 'POST') {
  17  |   return page.evaluate(async ({ route, body, method }) => { const csrf = document.cookie.split('; ').find(value => value.startsWith('csrf='))?.slice(5) ?? ''; const response = await fetch('/bff/v1/me/profile' + route, { method, headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf) }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() } }, { route, body, method })
  18  | }
  19  | async function editorAction(page: Page, name: string) {
  20  |   if(name==='Histórico'){await profileEditorTool(page,name);return}
  21  |   const button = page.getByRole('button', { name, exact: true })
  22  |   if (!await button.isVisible()) await page.getByLabel('Mais opções da página', { exact: true }).click()
  23  |   await button.click()
  24  | }
  25  | async function prepare(page: Page) {
  26  |   sql(`DELETE FROM profiles WHERE "tenantId"='${fixture().tenantId}'`)
  27  |   await login(page)
  28  |   const group = randomUUID(), hidden = randomUUID()
  29  |   const content = { slug: 'pagina-historico', name: 'Página inicial', bio: 'Materiais para estudantes', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [{ id: group, name: 'Materiais', visible: true }, { id: hidden, name: 'HistoricoSegredoSentinela', visible: false }], items: [{ id: randomUUID(), categoryId: group, type: 'URL', label: 'Aulas', destination: 'https://example.com/aulas', visible: true }] }
  30  |   const saved = await mutate(page, '', { content, expectedVersion: 0 }, 'PATCH'); expect(saved.status).toBe(200)
  31  |   const published = await mutate(page, '/publish', { expectedVersion: 1 }); expect(published.status).toBe(200)
  32  |   return content
  33  | }
  34  | function deterministicDates() {
  35  |   const day = new Date().toISOString().slice(0, 10)
  36  |   sql(`BEGIN; CREATE TEMP TABLE f19_dates AS SELECT * FROM profile_revisions WHERE "tenantId"='${fixture().tenantId}'; DELETE FROM profile_revisions WHERE "tenantId"='${fixture().tenantId}'; INSERT INTO profile_revisions(id,"profileId","tenantId","ownerId",version,snapshot,"avatarAssetId",imported,"createdAt") SELECT id,"profileId","tenantId","ownerId",version,snapshot,"avatarAssetId",imported,TIMESTAMP '${day} 00:00:00' FROM f19_dates; COMMIT;`)
  37  | }
  38  | test('F19-E01/E03 compare, explicit restore, existing preview and republish preserve public content until publication', async ({ page, browser }, info) => {
  39  |   await prepare(page)
  40  |   await page.goto(origin + '/painel/perfil'); await page.getByRole('region',{name:'Editor do perfil'}).getAttribute('data-save-state');await page.goto(new URL('/painel/perfil/dados',page.url()).href); await page.getByLabel('Nome da página').fill('Página atualizada')
  41  |   await expect(page.getByRole('region', { name: 'Editor do perfil' })).toHaveAttribute('data-save-state', 'saved')
  42  |   await editorAction(page, 'Publicar'); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  43  |   const guest = await browser.newContext(), publicPage = await guest.newPage()
  44  |   try {
  45  |     await publicPage.goto(origin + '/p/pagina-historico'); await expect(publicPage.getByRole('heading', { name: 'Página atualizada' })).toBeVisible()
  46  |     expect(await publicPage.locator('body').textContent()).not.toContain('HistoricoSegredoSentinela')
  47  |     deterministicDates()
  48  |     await editorAction(page, 'Histórico'); await expect(page.getByRole('heading', { name: 'Histórico da minha página', exact: true })).toBeVisible()
  49  |     const first = page.getByRole('article', { name: 'Versão 1', exact: true }); await expect(first).toBeVisible()
  50  |     expect(await first.evaluate(element => parseFloat(getComputedStyle(element).paddingTop))).toBeGreaterThanOrEqual(16)
  51  |     const cards = await page.getByRole('article').evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }))
  52  |     expect(cards[1].top - cards[0].bottom).toBeGreaterThanOrEqual(16)
  53  |     await page.screenshot({ path: info.outputPath('profile-history-list.png'), fullPage: true, animations: 'disabled' })
  54  |     await first.getByRole('button', { name: 'Ver diferenças', exact: true }).click()
  55  |     const dialog = page.getByRole('dialog', { name: 'Versão 1', exact: true }); await expect(dialog).toContainText('Página inicial'); await expect(dialog).toContainText('Página atualizada')
  56  |     const oldPreview = dialog.getByRole('region', { name: 'Prévia da versão antiga', exact: true })
  57  |     const currentPreview = dialog.getByRole('region', { name: 'Prévia do rascunho atual', exact: true })
  58  |     await expect(oldPreview).toContainText('Página inicial'); await expect(currentPreview).toContainText('Página atualizada')
  59  |     await expect(oldPreview.locator('[inert]')).toHaveCount(1); await expect(currentPreview.locator('[inert]')).toHaveCount(1)
  60  |     const oldBounds = await oldPreview.boundingBox(), currentBounds = await currentPreview.boundingBox()
  61  |     if (info.project.name.includes('mobile')) expect(currentBounds!.y).toBeGreaterThan(oldBounds!.y + oldBounds!.height)
> 62  |     else expect(Math.abs(currentBounds!.y - oldBounds!.y)).toBeLessThan(2)
      |                                                            ^ Error: expect(received).toBeLessThan(expected)
  63  |     expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  64  |     await page.evaluate(() => document.fonts.ready)
  65  |     await expect(dialog).toHaveCSS('opacity', '1')
  66  |     const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(accessibility.violations.map(row => row.id), JSON.stringify(accessibility.violations.flatMap(row => row.nodes.map(node => ({ target: node.target, summary: node.failureSummary }))))).toEqual([])
  67  |     await page.screenshot({ path: info.outputPath('profile-history-comparison.png'), fullPage: true, animations: 'disabled' })
  68  |     const originalViewport = page.viewportSize()!
  69  |     await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  70  |     expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  71  |     await page.screenshot({ path: info.outputPath('profile-history-comparison-320-zoom.png'), fullPage: true, animations: 'disabled' })
  72  |     await page.evaluate(() => { document.documentElement.style.fontSize = '' }); await page.setViewportSize(originalViewport)
  73  |     await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Página atualizada' })).toBeVisible()
  74  |     await dialog.getByRole('button', { name: 'Restaurar no rascunho' }).focus(); await page.keyboard.press('Enter')
  75  |     const restore = dialog.getByRole('button', { name: 'Confirmar restauração' }); await restore.focus(); await page.keyboard.press('Enter')
  76  |     await expect(dialog).toHaveCount(0); await expect(page.getByRole('status').filter({ hasText: 'Versão restaurada' })).toBeVisible()
  77  |     await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Página atualizada' })).toBeVisible()
  78  |     await page.getByRole('link', { name: 'Ver prévia', exact: true }).click(); await expect(page.getByRole('region', { name: 'Modo de prévia' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Página inicial', exact: true })).toBeVisible()
  79  |     await page.getByRole('link', { name: 'Voltar à edição' }).click(); await editorAction(page, 'Publicar'); await expect(page.getByRole('status').filter({ hasText: 'Perfil publicado.' })).toBeVisible()
  80  |     await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Página inicial' })).toBeVisible()
  81  |     deterministicDates()
  82  |     await editorAction(page, 'Histórico'); await expect(page.getByRole('article')).toHaveCount(3)
  83  |     await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
  84  |     await page.screenshot({ path: info.outputPath('profile-history-320-zoom.png'), fullPage: true, animations: 'disabled' })
  85  |   } finally { await guest.close() }
  86  | })
  87  | test('F19-E02 private history rejects other owners, handles offline retry, and protects a concurrently updated draft', async ({ page, browser }, info) => {
  88  |   const content = await prepare(page)
  89  |   await page.goto(origin + '/painel/perfil/historico')
  90  |   await expect(page.getByRole('article')).toHaveCount(1)
  91  |   const id = sql(`SELECT id FROM profile_revisions WHERE "tenantId"='${fixture().tenantId}'`)
  92  |   const other = await browser.newContext(), guest = await browser.newContext()
  93  |   try {
  94  |     const stranger = await other.newPage(); await login(stranger, true)
  95  |     const rejected = await stranger.evaluate(async id => (await fetch('/bff/v1/me/profile/revisions/' + id)).status, id); expect(rejected).toBe(404)
  96  |     const unauthenticated = await guest.request.get(runtime.web('127.0.0.1') + '/bff/v1/me/profile/revisions', { headers: { host: 'profiles.localhost:' + runtime.webPort } }); expect(unauthenticated.status()).toBe(401)
  97  |     await page.route('**/bff/v1/me/profile/revisions', route => route.abort())
  98  |     await page.getByRole('button', { name: 'Atualizar dados' }).click(); await expect(page.getByRole('region', { name: 'Histórico da minha página' }).getByRole('alert')).toContainText('Sem conexão')
  99  |     await page.unroute('**/bff/v1/me/profile/revisions'); await page.getByRole('button', { name: 'Tentar de novo' }).click(); await expect(page.getByRole('region', { name: 'Histórico da minha página' }).getByRole('alert')).toHaveCount(0)
  100 |     await page.getByRole('button', { name: 'Ver diferenças' }).click(); await page.getByRole('button', { name: 'Restaurar no rascunho' }).click()
  101 |     expect((await mutate(page, '', { content: { ...content, name: 'Outra aba preservada' }, expectedVersion: 1 }, 'PATCH')).status).toBe(200)
  102 |     await page.getByRole('button', { name: 'Confirmar restauração' }).click(); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('outra aba')
  103 |     const persisted = await page.evaluate(async () => (await fetch('/bff/v1/me/profile')).json()); expect(persisted.draft.name).toBe('Outra aba preservada')
  104 |     await page.screenshot({ path: info.outputPath('profile-history-conflict.png'), fullPage: true, animations: 'disabled' })
  105 |   } finally { await other.close(); await guest.close() }
  106 | })
  107 | 
```