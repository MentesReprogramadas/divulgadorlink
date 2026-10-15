import { expect, test } from '@playwright/test'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const A = 'http://tenant-a.localhost:3000'

const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { submitter: string; password: string }
test.beforeEach(async ({ page }) => {
  await page.goto(`${A}/login`)
  await page.getByLabel('E-mail').fill(state.submitter)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
})

test('o envio guarda rascunho, mostra a vaga e não chama de publicado', async ({ page }) => {
  await page.goto(`${A}/painel/links/novo`)
  await expect(page.getByText(/Vagas em uso: \d+ de 4\./)).toBeVisible()
  await page.getByLabel('Titulo').fill('Rascunho do anúncio')
  await page.getByLabel('Descrição').fill('Texto que precisa voltar')
  await page.reload()
  await expect(page.getByLabel('Titulo')).toHaveValue('Rascunho do anúncio')
  await expect(page.getByLabel('Descrição')).toHaveValue('Texto que precisa voltar')

  const url = `https://example.com/envio-${Date.now()}`
  await page.getByLabel('URL').fill(url)
  await page.getByLabel('Rede').selectOption({ label: 'Site' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('heading', { name: 'Enviado para análise.' })).toBeVisible()
  await expect(page.getByText('Publicado')).toHaveCount(0)
  await expect(page).toHaveURL(/\/painel\/links\/?$/)

  await page.goto(`${A}/painel/links/novo`)
  await page.getByLabel('Titulo').fill('Rascunho do anúncio')
  await page.getByLabel('Descrição').fill('Texto que precisa voltar')
  await page.getByLabel('URL').fill(url)
  await page.getByLabel('Rede').selectOption({ label: 'Site' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Esse link já está no catálogo.')).toBeVisible()
})

test('o botão de envio não dispara duas vezes', async ({ page }) => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/bff/v1/links', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await gate
    await route.continue()
  })
  await page.goto(`${A}/painel/links/novo`)
  await page.getByLabel('Titulo').fill('Segura')
  await page.getByLabel('Descrição').fill('Espera o pedido')
  await page.getByLabel('URL').fill('https://example.com/segura')
  await page.getByLabel('Rede').selectOption({ label: 'Site' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  release()
})
