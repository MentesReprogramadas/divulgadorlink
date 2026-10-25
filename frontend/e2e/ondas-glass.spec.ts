import { expect, test } from '@playwright/test'
import { runtime } from './runtime.cjs'

const origin = runtime.web('tenant-a.localhost')

test('Ondas login não coloca credenciais na URL antes da hidratação', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: info.project.use.viewport })
  try {
    await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
    const page = await context.newPage()
    await page.route('**/login', async route => {
      if (route.request().method() === 'POST') await route.fulfill({ contentType: 'text/plain', body: 'Envio nativo de teste recebido.' })
      else await route.continue()
    })
    await page.goto(origin + '/login')
    await page.getByLabel('E-mail', { exact: true }).fill('native@fixture.test')
    await page.getByLabel('Senha', { exact: true }).fill('Exemplo-sem-segredo')
    const request = page.waitForRequest(request => request.method() === 'POST' && request.url() === origin + '/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const sent = await request
    expect(new URL(sent.url()).search).toBe('')
    expect(sent.postData()).toContain('password=Exemplo-sem-segredo')
    await expect(page.getByText('Envio nativo de teste recebido.')).toBeVisible()
  } finally { await context.close() }
})

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('Ondas busca mantém recomendações acima de Explore no e permite abrir o resultado', async ({ page }, info) => {
  await page.route('**/bff/v1/search/suggest?**', route => route.fulfill({ json: {
    items: [{ id: 'glass-suggestion', name: 'Comunidade de descoberta', network: { slug: 'telegram', name: 'Telegram' } }],
  } }))
  await page.goto(origin + '/')
  await page.getByRole('combobox', { name: 'Busca', exact: true }).fill('descoberta')
  const recommendation = page.getByRole('option', { name: /Comunidade de descoberta/ })
  await expect(recommendation).toBeVisible()
  const explore = page.getByText('Explore no', { exact: true })
  await expect(explore).toBeVisible()
  const frontmost = await explore.evaluate(element => {
    const popup = document.querySelector('[role="listbox"]')?.parentElement
    const box = element.getBoundingClientRect()
    return popup?.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  })
  expect(frontmost).toBe(true)
  await page.screenshot({ path: info.outputPath('home-recommendations.png'), animations: 'disabled' })
  await recommendation.click()
  await expect(page).toHaveURL(/\/link\/glass-suggestion$/)
})

test('Ondas aviso +18 desfoca toda a página e conserva a confirmação de idade', async ({ page }, info) => {
  let accepted = false
  await page.route('**/bff/v1/search?**', route => route.fulfill({ json: {
    ageRequired: !accepted, target: { kind: 'results', slug: null }, sponsored: [], organic: [],
  } }))
  await page.route('**/bff/v1/age', async route => {
    expect(route.request().postDataJSON()).toEqual({ choice: 'yes' })
    accepted = true
    await route.fulfill({ status: 204 })
  })
  await page.goto(origin + '/busca?q=restrito')
  const dialog = page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })
  await expect(dialog).toBeVisible()
  const backdrop = await dialog.evaluate(element => {
    const style = getComputedStyle(element, '::backdrop')
    return { modal: element.matches(':modal'), filter: style.backdropFilter, position: style.position, inset: style.inset }
  })
  expect(backdrop).toEqual({ modal: true, filter: 'blur(20px) saturate(0.65)', position: 'fixed', inset: '0px' })
  await expect(dialog.locator('[data-optics]')).toHaveCount(3)
  await page.screenshot({ path: info.outputPath('whole-page-age-backdrop.png'), animations: 'disabled' })
  await dialog.getByRole('button', { name: 'Tenho 18 anos ou mais' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Nenhum link encontrado', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('catalogo.age'))).toBe('yes')
})
