import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

// A viewport screenshot cannot show the part below an internally scrolling dialog.
// Capture overlapping positions without changing any form values or decisions.
type DialogCaptureOptions = { dialog?: Locator; source?: 'live' | 'presentation-fixture' | 'reference' }
export async function captureDialogRemainder(page: Page, info: TestInfo, route: string, state: string, options: DialogCaptureOptions = {}) {
  const dialog = options.dialog ?? page.getByRole('dialog')
  await expect(dialog).toHaveCount(1)
  const geometry = await dialog.evaluate(element => ({ top: element.scrollTop, height: element.clientHeight, total: element.scrollHeight }))
  if (geometry.total <= geometry.height + 2) return
  const { captureOndasState } = await import('./ondas-visual-capture')
  const step = Math.max(1, Math.floor(geometry.height * .8))
  try {
    let index = 1
    for (let top = step; top < geometry.total; top += step) {
      await dialog.evaluate((element, offset) => { element.scrollTop = offset }, Math.min(top, geometry.total - geometry.height))
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await captureOndasState(page, info, { route, state: state + '-dialog-scroll-' + index++, source: options.source ?? 'presentation-fixture', fullPage: false })
      if (top >= geometry.total - geometry.height) break
    }
  } finally {
    await dialog.evaluate((element, top) => { element.scrollTop = top }, geometry.top)
  }
}

type HorizontalStage = { region: number; label: string; index: number; left: number; clientWidth: number; scrollWidth: number }
type HorizontalState = {
  route: string; state: string; source: 'live' | 'presentation-fixture' | 'reference'; fullPage: boolean
  horizontal: false; accessibility: false; horizontalStage: HorizontalStage
}
type HorizontalCaptureOptions = {
  source?: HorizontalState['source']
  capture: (page: Page, info: TestInfo, state: HorizontalState) => Promise<unknown>
}

// Tables and featured rails scroll locally; their first image cannot reveal later columns/cards.
export async function captureHorizontalRemainder(page: Page, info: TestInfo, route: string, state: string, options: HorizontalCaptureOptions) {
  const regions = page.locator('[role="region"]:has(table), :is(div,section,ul):has(> article)')
  const count = await regions.count()
  const originalPage = await page.evaluate(() => ({ x: scrollX, y: scrollY, height: innerHeight }))
  try {
    for (let regionIndex = 0; regionIndex < count; regionIndex++) {
      const region = regions.nth(regionIndex)
      const geometry = await region.evaluate(element => ({
        left: element.scrollLeft, width: element.clientWidth, total: element.scrollWidth,
        height: element.getBoundingClientRect().height, overflow: getComputedStyle(element).overflowX, hasTable: Boolean(element.querySelector('table')),
        label: element.getAttribute('aria-label') ?? (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim(),
      }))
      if (!geometry.width || !geometry.height || geometry.total <= geometry.width + 2 || !/^(auto|scroll|overlay)$/.test(geometry.overflow)) continue
      const end = geometry.total - geometry.width
      const step = Math.max(1, Math.floor(geometry.width * .8))
      const compact = !geometry.hasTable && geometry.height <= originalPage.height - 100
      try {
        if (compact) await region.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
        for (let offset = 0, index = 1; ; offset += step, index++) {
          const left = Math.min(offset, end)
          await region.evaluate((element, value) => { element.scrollLeft = value }, left)
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
          const actualLeft = await region.evaluate(element => element.scrollLeft)
          await options.capture(page, info, {
            route, state: state + '-horizontal-region-' + (regionIndex + 1) + '-step-' + index,
            source: options.source ?? 'presentation-fixture', fullPage: !compact, horizontal: false, accessibility: false,
            horizontalStage: { region: regionIndex + 1, label: geometry.label, index, left: actualLeft, clientWidth: geometry.width, scrollWidth: geometry.total },
          })
          if (left >= end) break
        }
      } finally {
        await region.evaluate((element, left) => { element.scrollLeft = left }, geometry.left)
      }
    }
  } finally {
    await page.evaluate(({ x, y }) => { scrollTo(x, y) }, originalPage)
  }
}
