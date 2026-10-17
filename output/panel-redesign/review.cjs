const { chromium } = require('../../frontend/node_modules/@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const state = JSON.parse(fs.readFileSync(path.resolve('frontend/e2e/state.json'), 'utf8'))
const origin = 'http://tenant-a.localhost:3100'
;(async () => {
  const browser = await chromium.launch()
  const diagnostics = []
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile })
    await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
    const page = await context.newPage()
    const suffix = mobile ? 'mobile' : 'desktop'
    for (const admin of [false, true]) {
      await context.clearCookies()
      await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
      await page.goto(origin + '/login')
      await page.getByLabel('E-mail', { exact: true }).fill(admin ? state.admin : state.bia)
      await page.getByLabel('Senha', { exact: true }).fill(state.password)
      await page.getByRole('button', { name: 'Entrar', exact: true }).click()
      await page.waitForURL('**/painel')
      for (const route of admin ? ['admin/visao', 'admin/configuracoes', 'admin/integracoes'] : ['painel', 'painel/links', 'painel/pedidos', 'painel/favoritos', 'painel/links/novo', 'painel/perfil']) {
        await page.goto(origin + '/' + route)
        await page.waitForLoadState('networkidle')
        await page.evaluate(() => document.fonts.ready)
        diagnostics.push({ suffix, route, ...(await page.locator('a[href="#main-content"]').evaluate(el => { const s = getComputedStyle(el); return { active: document.activeElement?.outerHTML.slice(0, 200), rect: el.getBoundingClientRect().toJSON(), transform: s.transform, position: s.position, top: s.top, focused: el.matches(':focus') } })) })
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: path.resolve('output/panel-redesign/' + route.replaceAll('/', '-') + '-' + suffix + '.png'), fullPage: true, animations: 'disabled' })
        if (route === 'painel/links') {
          await page.getByLabel('Situação do link').click()
          await page.getByRole('listbox').waitFor({ state: 'visible' })
          await page.screenshot({ path: path.resolve('output/panel-redesign/select-' + suffix + '.png'), animations: 'disabled' })
          await page.keyboard.press('Escape')
        }
        if (route === 'painel/favoritos') {
          await page.getByRole('tab', { name: 'Coleções', exact: true }).click()
          await page.screenshot({ path: path.resolve('output/panel-redesign/collections-' + suffix + '.png'), fullPage: true, animations: 'disabled' })
          await page.getByRole('button', { name: 'Nova coleção', exact: true }).click()
          await page.screenshot({ path: path.resolve('output/panel-redesign/collection-form-' + suffix + '.png'), animations: 'disabled' })
          await page.keyboard.press('Escape')
        }
        if (route === 'painel/perfil') {
          await page.getByLabel('Personalize o link da sua página', { exact: true }).fill('previa-de-layout')
          await page.getByLabel('Título da sua página', { exact: true }).fill('Prévia de layout')
          await page.getByRole('button', { name: 'Continuar', exact: true }).click()
          await page.getByLabel('Foto do perfil', { exact: true }).waitFor({ state: 'attached' })
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.screenshot({ path: path.resolve('output/panel-redesign/upload-' + suffix + '.png'), fullPage: true, animations: 'disabled' })
        }
        if (mobile && ['painel/links', 'admin/configuracoes'].includes(route)) {
          await page.getByRole('button', { name: 'Menu', exact: true }).click()
          if (admin) await page.locator('dialog summary').click()
          await page.screenshot({ path: path.resolve('output/panel-redesign/sidebar-' + (admin ? 'admin' : 'panel') + '.png'), animations: 'disabled' })
          await page.keyboard.press('Escape')
        }
      }
    }
    await context.close()
  }
  fs.writeFileSync('output/panel-redesign/browser-diagnostics.json', JSON.stringify(diagnostics, null, 2))
  await browser.close()
})().catch(e => { console.error(e); process.exitCode = 1 })
