import { runtime as e2eRuntime } from './runtime.cjs'
import { expect, test } from '@playwright/test'

const A = (e2eRuntime.web('tenant-a.localhost'))

test('a landing do anúncio usa o mesmo cabeçalho e não lista faceta restrita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${A}/divulgar`)
  await expect(page.getByRole('heading', { level: 1, name: 'Publique o seu link.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Publicar um link' })).toHaveAttribute('href', '/cadastro')
  await expect(page.getByText('Publicar é grátis.')).toBeVisible()
  const html = await page.content()
  expect(html).not.toMatch(/adulto|apostas|ganhar dinheiro|onlyfans|fansly|fatal model|privacy/i)
  expect(html).toContain('href="/busca"')
  expect(html).not.toContain('href="/nicho/')
  expect(html).not.toContain('href="/rede/')
  const mark = page.getByRole('link', { name: 'Home' })
  await expect(mark).toHaveAttribute('href', '/')
  await page.goto(`${A}/cadastro`)
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  expect(await page.content()).toContain('href="/busca"')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})

test('a home em 390px mostra o nicho inteiro e não rola para o lado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${A}/`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
  const clipped = await page.evaluate(() => {
    return [...document.querySelectorAll('.facet-line .facet')].some((node) => {
      const box = node.getBoundingClientRect()
      return box.right > document.documentElement.clientWidth + 1 || box.left < -1
    })
  })
  expect(clipped).toBe(false)
})

for (const width of [390, 1440]) {
  test(`a marca Confluência mantém navegação e ícones em ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 1000 })
    const requestAsset = (target: string) => {
      const url = new URL(target, A)
      const host = url.host
      url.hostname = '127.0.0.1'
      return request.get(url.href, { headers: { host } })
    }
    const logo = await requestAsset('/logo.svg')
    const master = await requestAsset('/brand/confluencia/horizontal-claro.svg')
    expect(logo.ok()).toBe(true)
    expect(await logo.text()).toBe(await master.text())
    expect(await logo.text()).not.toMatch(/<(?:text|image)\b/)
    for (const route of ['/', '/divulgar', '/cadastro']) {
      await page.goto(`${A}${route}`)
      const home = page.getByRole('link', { name: 'Home', exact: true })
      await expect(home).toHaveAttribute('href', '/')
      await expect(home.locator('img')).toHaveAttribute('src', '/logo.svg')
      await home.locator('img').evaluate((image: HTMLImageElement) => image.decode())
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
      const icons = await page.locator('link[rel="icon"],link[rel="apple-touch-icon"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href))
      expect(icons.some(url => new URL(url).pathname === '/icon1.svg')).toBe(true)
      expect(icons.some(url => new URL(url).pathname === '/apple-icon.png')).toBe(true)
      for (const url of icons) expect((await requestAsset(url)).ok()).toBe(true)
    }
    if (width === 390) {
      const toggle = page.getByRole('button', { name: 'Menu', exact: true })
      await toggle.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByAltText('Tem Link Aqui')).toHaveAttribute('src', '/logo.svg')
      await page.keyboard.press('Escape')
      await expect(toggle).toBeFocused()
    }
    await page.screenshot({ path: `test-results/confluencia-site-${width}.png`, fullPage: true })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`${A}/icon1.svg`)
    expect(await page.locator('.ink').first().evaluate(el => getComputedStyle(el).fill)).toBe('rgb(255, 255, 255)')
    await page.emulateMedia({ colorScheme: 'light' })
    expect(await page.locator('.ink').first().evaluate(el => getComputedStyle(el).fill)).toBe('rgb(10, 25, 47)')
  })
}
