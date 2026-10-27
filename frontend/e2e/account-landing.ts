import { expect, type Page } from '@playwright/test'

// Check the role's default destination before opening the panel used by these fixtures.
export async function accountLanding(page: Page) {
  await expect(page).toHaveURL(/\/(?:painel|admin\/visao)$/)
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('catalogo.session') ?? 'null') as { role: string } | null)
  expect(session?.role).toMatch(/^(USER|ADMIN)$/)
  await expect(page).toHaveURL(new URL(session?.role === 'ADMIN' ? '/admin/visao' : '/painel', page.url()).href)
  if (session?.role === 'ADMIN') await page.goto(new URL('/painel', page.url()).href)
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
}
