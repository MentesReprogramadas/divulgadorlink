import { expect, test } from '@playwright/test'

const A = 'http://tenant-a.localhost:3000'

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
  const wrap = await page.evaluate(() => {
    const line = document.querySelector('.facet-line')
    return line ? getComputedStyle(line).flexWrap : ''
  })
  expect(wrap).toBe('wrap')
})
