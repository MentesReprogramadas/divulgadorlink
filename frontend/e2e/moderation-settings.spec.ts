import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Queue, QueueEvents } from '../../backend/node_modules/bullmq'
import { runtime } from './runtime.cjs'
import { sql } from './db'
const origin = runtime.web('evolution.localhost')
const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).evolution as { tenantA: string; admin: string; password: string; receitas: string }

test('admin ajusta a barra e recebe os motivos no WhatsApp pelo outbox real', async ({ page, request }, info) => {
  test.setTimeout(120000)
  sql(`UPDATE configs SET value='0.85' WHERE "tenantId"='${state.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)
  await page.goto(origin + '/login')
  await page.getByLabel('E-mail').fill(state.admin)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(origin+'/admin/visao')
  await page.goto(origin + '/admin/configuracoes')
  const refuseCookies = page.getByRole('button', { name: 'Recusar', exact: true })
  if (await refuseCookies.isVisible()) await refuseCookies.click()
  const slider = page.getByRole('slider', { name: 'Limiar de aprovação da IA' })
  await expect(slider).toHaveValue('85')
  await slider.focus()
  await slider.press('ArrowRight')
  await expect(slider).toHaveValue('86')
  await slider.press('End')
  await expect(slider).toHaveValue('100')
  await slider.press('Home')
  await expect(slider).toHaveValue('0')
  await expect(page.getByText('Aprovação automática sem IA.', { exact: true })).toBeVisible()
  expect(sql(`SELECT value FROM configs WHERE "tenantId"='${state.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)).toBe('0.85')
  expect((await new AxeBuilder({ page }).include('section[aria-label="Aprovação pela IA"]').analyze()).violations).toEqual([])
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: info.outputPath('zero-warning.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Salvar limiar' }).click()
  await expect(page.getByText(/Limiar salvo/)).toBeVisible()
  await page.reload()
  await expect(slider).toHaveValue('0')
  expect(sql(`SELECT COUNT(*) FROM audit_logs WHERE "tenantId"='${state.tenantA}' AND action='config.update' AND after->>'value'='0'`)).not.toBe('0')

  const connection = { host: '127.0.0.1', port: runtime.redisPort }
  const queue = new Queue('divulgador-links', { connection }), events = new QueueEvents('divulgador-links', { connection })
  async function moderate() {
    const id = 'threshold-' + randomUUID()
    sql(`INSERT INTO links (id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"updatedAt") SELECT '${id}',"tenantId","ownerId",'https://example.com/${id}','Limiar ${id}','Conteúdo de teste',"networkId","nicheId",'PENDING_MODERATION',NOW() FROM links WHERE id='${state.receitas}'`)
    await events.waitUntilReady()
    const job = await queue.add('moderate-link', { linkId: id }, { jobId: id, removeOnComplete: true })
    await job.waitUntilFinished(events, 30000)
    return id
  }
  try {
    const approvedId = await moderate()
    expect(sql(`SELECT status FROM links WHERE id='${approvedId}'`)).toBe('PUBLISHED')
    sql(`UPDATE configs SET value='0.85' WHERE "tenantId"='${state.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)
    const reviewedId = await moderate()
    expect(sql(`SELECT status FROM links WHERE id='${reviewedId}'`)).toBe('PENDING_MODERATION')
    const cycle = new Queue('divulgador-evolution', { connection }), cycleEvents = new QueueEvents('divulgador-evolution', { connection })
    try {
      await cycleEvents.waitUntilReady()
      const job = await cycle.add('evolution-cycle', {}, { jobId: randomUUID(), removeOnComplete: true })
      await job.waitUntilFinished(cycleEvents, 30000)
    } finally { await cycleEvents.close(); await cycle.close() }
    const messages = (await (await request.get(runtime.stubOrigin + '/evolution/messages')).json()) as { text: string }[]
    expect(messages.find(row => row.text.includes(approvedId) && row.text.includes('APROVADO POR CONFIGURAÇÃO'))?.text).toContain('Limiar configurado: 0%')
    const reviewed = messages.find(row => row.text.includes(reviewedId) && row.text.includes('IA NÃO APROVOU AUTOMATICAMENTE'))?.text
    expect(reviewed).toContain('não retornou uma avaliação válida')
    expect(reviewed).toContain('Limiar configurado: 85%')
    expect(reviewed).toContain('Não é uma recusa definitiva')
  } finally { await events.close(); await queue.close() }
  await page.reload()
  await expect(slider).toHaveValue('85')
  const audit = await new AxeBuilder({ page }).include('section[aria-label="Aprovação pela IA"]').analyze()
  expect(audit.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('positive-threshold.png'), fullPage: true, animations: 'disabled' })
  if (!info.project.use.isMobile) {
    await page.evaluate(() => { document.documentElement.style.zoom = '2' })
    await expect(slider).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('zoom-200.png'), fullPage: true, animations: 'disabled' })
    await page.evaluate(() => { document.documentElement.style.zoom = '' })
  }
  if (!info.project.use.isMobile) {
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(slider).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  await page.route('**/bff/v1/admin/config/MODERATION_AUTO_APPROVE_THRESHOLD', route => route.abort())
  await slider.fill('10')
  await page.getByRole('button', { name: 'Salvar limiar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível conectar' })).toBeVisible()
  await expect(slider).toHaveValue('10')
  expect(sql(`SELECT value FROM configs WHERE "tenantId"='${state.tenantA}' AND key='MODERATION_AUTO_APPROVE_THRESHOLD'`)).toBe('0.85')
})
