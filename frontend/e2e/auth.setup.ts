import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test as setup } from '@playwright/test'

const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { bia: string; password: string }

setup('sessão da Bia para os testes do painel', async ({ page }) => {
  await page.goto('http://tenant-a.localhost:3000/login')
  await page.getByLabel('E-mail').fill(state.bia)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await page.context().storageState({ path: path.join(__dirname, 'bia.storage.json') })
})
