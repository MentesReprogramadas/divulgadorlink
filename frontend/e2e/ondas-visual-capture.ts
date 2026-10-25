import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { settleAnimations } from './capture-page'
import { captureHorizontalRemainder } from './ondas-admin-visual-tools'

type VisualState = {
  route: string; state: string; source?: 'live' | 'presentation-fixture' | 'reference'; fullPage?: boolean
  horizontal?: false; accessibility?: false
  horizontalStage?: { region: number; label: string; index: number; left: number; clientWidth: number; scrollWidth: number }
}
const pageErrors = new WeakMap<Page, string[]>()
export function observeOndasPage(page: Page) {
  let errors = pageErrors.get(page)
  if (!errors) {
    errors = []
    pageErrors.set(page, errors)
    const observed = errors
    page.on('pageerror', error => observed.push(error.message))
  }
  return errors
}

/** Callers wait for the named state; loading/error fixtures must remain visible. */
export async function captureOndasState(page: Page, info: TestInfo, state: VisualState) {
  const menu = page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true })
  if (await menu.count()) await expect(menu).toBeEnabled()
  if (!state.route.startsWith('/storybook/')) await expect(page.locator('[data-route-pending]:visible')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await settleAnimations(page)
  if (state.fullPage !== false) await page.evaluate(() => new Promise<void>(resolve => {
    scrollTo(0, 0)
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await page.waitForFunction(async () => {
    const visible = [...document.images].filter(image => {
      const box = image.getBoundingClientRect()
      return box.width && box.height && box.bottom > 0 && box.top < innerHeight
    })
    if (!visible.every(image => image.complete)) return false
    await Promise.all(visible.filter(image => image.naturalWidth > 0).map(image => image.decode()))
    return true
  })
  const key = createHash('sha256').update(state.route + '\n' + state.state).digest('hex').slice(0, 10)
  const id = `${state.state.replace(/[^a-z0-9-]+/gi, '-').slice(0, 48)}-${key}`
  const screenshot = info.outputPath(id + '.png')
  const url = new URL(page.url())
  const dom = await page.evaluate(() => ({
    title: document.title,
    headings: [...document.querySelectorAll('h1,h2')].map(element => element.textContent),
    visibleHeadings: [...document.querySelectorAll('h1,h2')].filter(element => element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== 'hidden').map(element => element.textContent),
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    lenses: document.querySelectorAll('[data-optics]').length,
    loading: document.querySelectorAll('[data-skeleton]').length,
  }))
  const bytes = await page.screenshot({ path: screenshot, fullPage: state.fullPage ?? true, animations: 'disabled', caret: 'hide' })
  // Base UI's hidden tab-order sentinels redirect focus; popup keyboard paths are tested separately.
  const accessibility = state.accessibility === false ? null : await new AxeBuilder({ page }).exclude('[data-base-ui-focus-guard]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const violations = accessibility?.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) ?? []
  const safeRoute = new URL(state.route, 'http://visual.local')
  for (const value of [url, safeRoute]) for (const name of value.searchParams.keys()) if (/token|code|secret/i.test(name)) value.searchParams.set(name, '[fixture]')
  const runtimeErrors = [...observeOndasPage(page)]
  const record = { ...state, route: safeRoute.pathname + safeRoute.search, source: state.source ?? 'live', project: info.project.name, url: url.href, viewport: page.viewportSize(), screenshot: path.basename(screenshot), sha256: createHash('sha256').update(bytes).digest('hex'), ...dom, runtimeErrors, accessibilityChecked: accessibility !== null, accessibilityExclusions: ['[data-base-ui-focus-guard]'], violations }
  await writeFile(info.outputPath(id + '.json'), JSON.stringify(record, null, 2))
  await info.attach('ondas-visual-state', { body: JSON.stringify(record), contentType: 'application/json' })
  expect.soft(dom.scrollWidth, `${state.route} / ${state.state}: horizontal overflow`).toBeLessThanOrEqual(dom.width + 1)
  expect.soft(violations, `${state.route} / ${state.state}: accessibility`).toEqual([])
  expect.soft(runtimeErrors, `${state.route} / ${state.state}: unhandled errors`).toEqual([])
  // Horizontal offsets reuse the base DOM audit; every column is still captured.
  if (state.horizontal !== false && state.fullPage !== false) await captureHorizontalRemainder(page, info, state.route, state.state, { source: state.source, capture: captureOndasState })
  return screenshot
}
