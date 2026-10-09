import { expect, test } from '@playwright/test'

const A = 'http://tenant-a.localhost:3000'

test('cadastro aponta para privacidade e termos', async ({ page }) => {
  await page.goto(`${A}/cadastro`)
  await expect(page.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade')
  await expect(page.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos')
  await page.goto(`${A}/privacidade`)
  await expect(page.getByRole('heading', { level: 1, name: 'Privacidade' })).toBeVisible()
  await expect(page.getByText('12 meses')).toBeVisible()
  await page.goto(`${A}/termos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Termos' })).toBeVisible()
  await expect(page.getByText('Publicar é grátis')).toBeVisible()
  await expect(page.getByText('66.421.121/0001-15')).toBeVisible()
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/\d{5}-?\d{3}/)
})
