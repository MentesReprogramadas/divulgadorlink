import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { runtime } from './runtime.cjs'
import { sql } from './db'

test('home conserva navegação e rolagem sem refração SVG ou animação contínua', async ({ page, context }, info) => {
  test.setTimeout(120_000)
  const state = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as { receitas: string; tenantA: string }
  const prefix = 'scroll-home-'
  const filters = { cityId: null, languageTag: 'es', modality: 'ONLINE' }
  const filterKey = createHash('sha256').update(JSON.stringify([[state.tenantA, 'unknown', 'HOME', null, null], filters])).digest('hex')
  const cursor = Buffer.from(JSON.stringify({ kind: 'sponsored', activatedAt: null, id: prefix + 'start', seed: '0'.repeat(32), filterKey })).toString('base64url')
  sql(`INSERT INTO links(id,"tenantId","canonicalUrl",name,description,"networkId","nicheId",status,"languageTag",modality,"updatedAt")
    SELECT '${prefix}' || i, "tenantId", 'https://example.com/scroll/' || i, 'Comunidade de teste ' || i,
      'Conversas, novidades e conteúdos compartilhados nesta comunidade de teste.', "networkId", "nicheId", 'PUBLISHED', 'es', 'ONLINE', NOW()
    FROM links CROSS JOIN generate_series(1,48) i WHERE id='${state.receitas}';`)
  try {
    await context.addCookies([{ name: 'tla_consent', value: 'denied', domain: 'tenant-a.localhost', path: '/' }])
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      const state = window as Window & { homeDraws?: number }
      state.homeDraws = 0
      const draw = WebGLRenderingContext.prototype.drawArrays
      WebGLRenderingContext.prototype.drawArrays = function (...args: Parameters<typeof draw>) {
        state.homeDraws = (state.homeDraws ?? 0) + 1
        return draw.apply(this, args)
      }
    })
    await page.goto(runtime.web() + '/?languageTag=es&modality=ONLINE&cursor=' + cursor)
    const cards = page.locator('#home-catalog-results article')
    await expect(cards).toHaveCount(24)
    await page.getByRole('button', { name: 'Mostrar mais', exact: true }).click()
    await expect(cards).toHaveCount(48)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(700)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const samples = []
    for (let run = 0; run < 3; run++) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(250)
      await page.evaluate(() => {
        const intervals: number[] = []
        let previous = performance.now()
        let running = true
        const finished = new Promise<number[]>(resolve => {
          requestAnimationFrame(function tick(now) {
            intervals.push(now - previous)
            previous = now
            if (running) requestAnimationFrame(tick)
            else resolve(intervals)
          })
        })
        const state = window as Window & { scrollMeasurement?: { finished: Promise<number[]>; stop: () => void } }
        state.scrollMeasurement = { finished, stop: () => { running = false } }
      })
      await page.mouse.move(Math.min(info.project.use.viewport?.width ?? 1280, 1200) - 50, 400)
      for (let step = 0; step < 12; step++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(45) }
      await page.waitForTimeout(250)
      const result = await page.evaluate(async () => {
        const state = window as Window & { scrollMeasurement?: { finished: Promise<number[]>; stop: () => void } }
        const measurement = state.scrollMeasurement!
        measurement.stop()
        const intervals = (await measurement.finished).slice(1).sort((a, b) => a - b)
        delete state.scrollMeasurement
        return { count: intervals.length, p95: Math.round(intervals[Math.floor(intervals.length * .95)] ?? 0), max: Math.round(Math.max(0, ...intervals)), scrollY: Math.round(scrollY) }
      })
      expect(result.scrollY).toBeGreaterThan(300)
      samples.push(result)
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    writeFileSync(info.outputPath('scroll-metrics.json'), JSON.stringify({ viewport: info.project.use.viewport, cpu: 4, metric: 'rAF callback intervals; not presented FPS or INP', samples }, null, 2))
    await page.screenshot({ path: info.outputPath('home-scrolled.png'), animations: 'allow' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await cards.first().scrollIntoViewIfNeeded()
    await cards.first().getByRole('link').focus()
    await expect(cards.first().getByRole('link')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(cards.first().getByRole('button', { name: 'Salvar favorito' })).toBeFocused()
    await page.screenshot({ path: info.outputPath('home-keyboard-focus.png'), animations: 'allow' })
    if (info.project.use.isMobile) await page.setViewportSize({ width: 320, height: 844 })
    else await page.evaluate(() => { document.body.style.zoom = '2' })
    await expect.poll(() => page.locator('#home-catalog-results').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await page.evaluate(() => { document.body.style.zoom = '' })
    if (info.project.use.isMobile) await page.setViewportSize({ width: 390, height: 844 })
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(audit.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([])
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: info.outputPath('home-top.png'), animations: 'allow' })
    await expect(page.locator('[data-optics] svg')).toHaveCount(0)
    const canvas = page.locator('canvas').first()
    const atmosphere = canvas.locator('..')
    await expect.poll(() => atmosphere.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
    const before = await page.evaluate(() => (window as Window & { homeDraws?: number }).homeDraws)
    if (info.project.use.isMobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 700 }] })
      for (let step = 1; step <= 10; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 700 - step * 50 }] })
        await page.waitForTimeout(20)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    else await page.mouse.wheel(0, 600)
    await page.waitForTimeout(250)
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300)
    expect(await page.evaluate(() => (window as Window & { homeDraws?: number }).homeDraws)).toBe(before)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => atmosphere.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
    await cards.first().getByRole('link').click()
    await expect(page).toHaveURL(/\/link\/scroll-home-\d+\?surfaceToken=/)
  } finally {
    sql(`DELETE FROM links WHERE id LIKE '${prefix}%';`)
  }
})
