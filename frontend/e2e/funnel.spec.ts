import { expect, test } from '@playwright/test'
import { sql } from './db'

const A = 'http://tenant-a.localhost:3000'

test('o primeiro anúncio fica na conta e a Meta não é chamada sem aceite', async ({ page }) => {
  let facebook = 0
  await page.route('**/*facebook*', async (route) => {
    facebook += 1
    await route.abort()
  })
  const email = `funil-${Date.now()}@tenant-a.test`
  await page.goto(`${A}/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=outubro&utm_content=a&utm_term=b`)
  await page.goto(`${A}/cadastro`)
  await page.getByLabel('Nome').fill('Funil')
  await page.getByLabel('E-mail').fill(email)
  if (await page.getByLabel('Telefone').count()) {
    await page.getByLabel('Telefone').fill('11988887777')
  }
  await page.getByLabel('Senha').fill('Senha-e2e-1')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/painel/)
  const campaign = sql(`SELECT campaign FROM acquisition_touches WHERE "userId" = (SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL)`)
  expect(campaign).toBe('outubro')
  await page.goto(`${A}/divulgar?utm_source=meta&utm_medium=paid&utm_campaign=novembro&utm_content=a&utm_term=b`)
  const again = sql(`SELECT campaign FROM acquisition_touches WHERE "userId" = (SELECT "userId" FROM user_identifiers WHERE "normalizedValue" = '${email}' AND "replacedAt" IS NULL)`)
  expect(again).toBe('outubro')
  expect(facebook).toBe(0)
})
