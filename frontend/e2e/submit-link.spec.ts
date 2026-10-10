import { expect, test } from '@playwright/test'
import path from 'node:path'

const A = 'http://tenant-a.localhost:3000'

test.use({ storageState: path.join(__dirname, 'bia.storage.json') })

test('o envio guarda rascunho, mostra a vaga e não chama de publicado', async ({ page }) => {
  await page.goto(`${A}/painel/links/novo`)
  await expect(page.getByText(/Vagas em uso: \d+ de 4\./)).toBeVisible()
  await page.getByLabel('Nome').fill('Rascunho do anúncio')
  await page.getByLabel('Descrição').fill('Texto que precisa voltar')
  await page.reload()
  await expect(page.getByLabel('Nome')).toHaveValue('Rascunho do anúncio')
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
  await page.getByLabel('Nome').fill('Rascunho do anúncio')
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
  await page.getByLabel('Nome').fill('Segura')
  await page.getByLabel('Descrição').fill('Espera o pedido')
  await page.getByLabel('URL').fill('https://example.com/segura')
  await page.getByLabel('Rede').selectOption({ label: 'Site' })
  await page.getByLabel('Nicho').selectOption({ label: 'Jogos' })
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  release()
})
