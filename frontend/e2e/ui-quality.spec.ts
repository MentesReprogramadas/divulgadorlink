import { selectOption } from './select-control'
import { runtime as e2eRuntime } from './runtime.cjs'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { settleAnimations } from './capture-page'

type Fixture = { receitas: string; bia: string; admin: string; password: string }
const origin = (e2eRuntime.web('tenant-a.localhost'))
const publicRoutes = ['/', '/divulgar', '/busca', '/nicho/jogos', '/rede/telegram', '/login', '/cadastro', '/esqueci-senha', '/recuperar-senha', '/termos', '/privacidade', '/nao-encontrado']
const stableScreens = new Set(['/divulgar', '/cadastro', '/login', '/recuperar-senha', '/painel/links/novo', '/admin/configuracoes'])

for (const role of ['public', 'user', 'admin'] as const) {
  test(`${role}: telas sem overflow, campos nomeados e estados navegáveis`, async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    const fixture = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as Fixture
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(/facebook|google(tagmanager|adservices)|doubleclick/, route => route.abort())
    await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
    if (role !== 'public') {
      await page.goto(`${origin}/login`)
      await page.getByLabel('E-mail', { exact: true }).fill(role === 'admin' ? fixture.admin : fixture.bia)
      await page.getByLabel('Senha', { exact: true }).fill(fixture.password)
      await page.getByRole('button', { name: 'Entrar', exact: true }).click()
      await expect(page).toHaveURL(/\/painel/)
      await expect(page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true })).toBeEnabled()
    }
    const routes = role === 'public' ? [...publicRoutes, `/link/${fixture.receitas}`] : role === 'user'
      ? ['/painel', '/painel/links', '/painel/links/novo', `/painel/links/${fixture.receitas}/editar`, `/painel/links/${fixture.receitas}/destaque`, `/painel/links/${fixture.receitas}/contestar`, '/painel/pedidos', '/painel/conta']
      : ['/admin/visao', '/admin/moderacao', '/admin/planos', '/admin/configuracoes', '/admin/integracoes', '/admin/estornos']
    for (const route of routes) {
      await test.step(route, async () => {
        const response = await page.goto(`${origin}${route}`)
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.waitForLoadState('networkidle'); await settleAnimations(page)
        await page.evaluate(() => document.fonts.ready)
        if (route === '/admin/planos') {
          const edit = page.getByRole('button', { name: 'Editar', exact: true }).first()
          await edit.click()
          await expect(page.getByRole('dialog')).toBeVisible()
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toHaveCount(0)
          await expect(edit).toBeFocused()
        }
        if (route === '/admin/visao') {
          const selector = page.getByLabel('Área de gestão', { exact: true })
          const sections = [{value:'metricas',label:'Métricas'}, {value:'contas',label:'Contas'}, {value:'links',label:'Links'}, {value:'cliques',label:'Cliques'}, {value:'pagadores',label:'Pagadores'}, {value:'trafego',label:'Tráfego'}, {value:'financeiro',label:'Financeiro'}, {value:'retencao',label:'Retenção'}]
          for (let index = 0; index < sections.length; index += 1) {
            const sectionLabel = sections[index]!.label
            await selectOption(selector, sections[index]!.value)
            await page.waitForLoadState('networkidle'); await settleAnimations(page)
            const insightTabs = page.getByRole('tablist', { name: sectionLabel, exact: true }).getByRole('tab')
            const insightCount = await insightTabs.count()
            if (sectionLabel === 'Tráfego' || sectionLabel === 'Financeiro') {
              await expect(insightTabs.first()).toBeVisible()
            }
            for (let tabIndex = 0; tabIndex < Math.max(1, insightCount); tabIndex += 1) {
              if (insightCount) {
                await insightTabs.nth(tabIndex).click()
                await expect(insightTabs.nth(tabIndex)).toHaveAttribute('aria-selected', 'true')
              }
              await page.waitForLoadState('networkidle'); await settleAnimations(page)
              const reportLists = page.getByRole('tablist', { name: /^Visualização: / })
              for (let reportIndex = 0; reportIndex < await reportLists.count(); reportIndex += 1) {
                const reportTabs = reportLists.nth(reportIndex).getByRole('tab')
                for (let viewIndex = 0; viewIndex < await reportTabs.count(); viewIndex += 1) {
                  await reportTabs.nth(viewIndex).click()
                  await expect(reportTabs.nth(viewIndex)).toHaveAttribute('aria-selected', 'true')
                  await settleAnimations(page)
                  const reportAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
                  expect.soft(reportAccessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), `${route}: seção ${index}, aba ${tabIndex}, relatório ${reportIndex}, visão ${viewIndex}`).toEqual([])
                }
              }
              expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${route}: aba ${tabIndex}`).toBe(true)
              const tabAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
              expect.soft(tabAccessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), `${route}: seção ${index}, aba ${tabIndex}`).toEqual([])
            }
            const sectionAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
            expect.soft(sectionAccessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), `${route}: seção ${index}`).toEqual([])
            await testInfo.attach(`${role}-section-${index}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' })
          }
        }
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
        const unnamed = await page.locator('input:not([type="hidden"]), select, textarea').evaluateAll(controls => controls.filter(control => {
          const input = control as HTMLInputElement
          if (input.getAttribute('aria-hidden') === 'true') return false
          return !input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')
        }).map(control => control.outerHTML.slice(0, 160)))
        expect(unnamed).toEqual([])
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        expect.soft(accessibility.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), route).toEqual([])
        if (['/painel', '/painel/links', '/admin/moderacao', '/painel/links/novo', '/admin/configuracoes'].includes(route)) {
          await page.screenshot({ path: testInfo.outputPath(route.replaceAll('/', '-').slice(1) + '.png'), fullPage: true, animations: 'disabled', caret: 'hide' })
        }
        if (stableScreens.has(route)) {
          await expect(page).toHaveScreenshot(`${route.replaceAll('/', '-').slice(1)}.png`, { fullPage: true, animations: 'disabled', caret: 'hide' })
        }
      })
    }
    expect(errors).toEqual([])
    await testInfo.attach('routes', { body: JSON.stringify({ role, routes }), contentType: 'application/json' })
  })
}

test('landing: foco por teclado e CTA levam ao cadastro', async ({ page }) => {
  await page.goto(`${origin}/divulgar`)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: 'Publicar um link', exact: true }).click()
  await expect(page).toHaveURL(/\/cadastro/)
  await expect(page.getByLabel('Nome', { exact: true })).toBeVisible()
})

test('busca: carregamento, falha e recuperação preservam a tarefa', async ({ page }) => {
  let release: () => void = () => undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  let attempts = 0
  await page.route('**/bff/v1/search?**', async route => {
    attempts += 1
    if (attempts === 1) {
      await gate
      await route.fulfill({ status: 503, json: {} })
    } else {
      await route.fulfill({ status: 200, json: { target: { kind: 'results', slug: null }, sponsored: [], organic: [] } })
    }
  })
  await page.goto(`${origin}/busca?q=recuperacao`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status', { name: 'Carregando links', exact: true })).toBeVisible()
  release()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByText('Nenhum link encontrado', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Busca', exact: true })).toHaveValue('recuperacao')
})

test('login: falha de rede libera uma nova tentativa', async ({ page }) => {
  await page.route('**/bff/v1/auth/login', route => route.abort('failed'))
  await page.goto(`${origin}/login`)
  await page.getByLabel('E-mail', { exact: true }).fill('teste@tenant-a.test')
  await page.getByLabel('Senha', { exact: true }).fill('Senha-e2e-1')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Verifique sua conexão')
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled()
})
