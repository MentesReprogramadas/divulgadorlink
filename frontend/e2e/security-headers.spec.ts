import { expect, test } from '@playwright/test'

test('a home manda os headers e não anuncia o Next', async ({ page }) => {
  const response = await page.goto('http://tenant-a.localhost:3000/')
  const headers = response?.headers() ?? {}
  expect(headers['strict-transport-security']).toContain('max-age=31536000')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['content-security-policy']).toContain('https://js.stripe.com')
  expect(headers['x-powered-by']).toBeUndefined()
  await expect(page.getByRole('link', { name: 'Receitas' })).toBeVisible()
})
