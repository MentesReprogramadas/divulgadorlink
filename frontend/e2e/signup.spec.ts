import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const A = 'http://tenant-a.localhost:3000'
const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { password: string }

test('cadastro sem telefone cai na verificação e avisa o spam', async ({ page }) => {
  await page.goto(`${A}/cadastro`)
  await expect(page.getByLabel('Telefone')).toHaveCount(0)
  await page.getByLabel('Nome').fill('Nova')
  await page.getByLabel('E-mail').fill(`nova-${Date.now()}@tenant-a.test`)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/painel\/verificar/)
  await expect(page.getByText('Olhe também o spam.')).toBeVisible()
})
