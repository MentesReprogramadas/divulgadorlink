import { expect, type Page } from '@playwright/test'

export async function logoutIfSignedIn(page: Page) {
  await page.keyboard.press('Escape')
  const logout = page.getByRole('button', { name: 'Sair', exact: true, includeHidden: true })
  if (!await logout.count()) return
  if (!await logout.isVisible()) await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.locator('button:visible').filter({ hasText: /^Sair$/ }).click()
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
}
