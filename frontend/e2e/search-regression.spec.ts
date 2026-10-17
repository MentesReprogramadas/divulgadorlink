import { expect, test } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'

const origin = runtime.web('tenant-a.localhost')

test('sugestões e ver todos mantêm o mesmo link para trecho do nome sem vetor', async ({ page }, testInfo) => {
  // Force the regression: neither full-text token matching nor embeddings can find "Sa".
  sql(`UPDATE links SET name = 'Sala de estudos', embedding = NULL, "embeddingState" = 'ABSENT' WHERE name = 'Receitas'`)
  await page.goto(`${origin}/busca`)
  await page.getByLabel('Busca', { exact: true }).fill('Sa')
  await expect(page.getByRole('option', { name: 'Sala de estudos' })).toBeVisible()
  const all = page.getByRole('link', { name: 'Ver todos os resultados' })
  await expect(all).toHaveAttribute('href', '/busca?q=Sa')
  await page.screenshot({ path: testInfo.outputPath('suggestions.png'), fullPage: true, animations: 'disabled' })
  const response = page.waitForResponse(res => res.url().includes('/bff/v1/search?q=Sa'))
  await all.focus()
  await page.keyboard.press('Enter')
  expect((await response).status()).toBe(200)
  await expect(page).toHaveURL(`${origin}/busca?q=Sa`)
  await expect(page.getByRole('link', { name: 'Sala de estudos', exact: true })).toBeVisible()
  await expect(page.getByText('Nenhum resultado')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('results.png'), fullPage: true, animations: 'disabled' })
  // Both endpoints must also honor the tenant's configured threshold.
  sql(`UPDATE configs SET value = '0.9' WHERE "tenantId" = (SELECT id FROM tenants WHERE host = 'tenant-a.localhost') AND key = 'SEARCH_RELEVANCE_THRESHOLD'`)
  try {
    const responses = await page.evaluate(async () => {
      const urls = ['/bff/v1/search/suggest?q=Sa', '/bff/v1/search?q=Sa']
      return Promise.all(urls.map(async url => {
        const response = await fetch(url)
        return { status: response.status, body: await response.json() }
      }))
    })
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect(responses[0].body.items).toEqual([])
    expect(responses[1].body.organic).toEqual([])
  } finally {
    sql(`UPDATE configs SET value = '0.35' WHERE "tenantId" = (SELECT id FROM tenants WHERE host = 'tenant-a.localhost') AND key = 'SEARCH_RELEVANCE_THRESHOLD'`)
  }
})
