import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { captureOndasState, observeOndasPage } from './ondas-visual-capture'

const origin = process.env.ONDAS_STORYBOOK_ORIGIN ?? 'http://127.0.0.1:6018'
const controls = 'design-system-controles--'
const date = 'design-system-campos-datepicker--'
const stories = [
  ...['primary', 'secondary', 'danger', 'ghost', 'disabled', 'pending', 'navigation', 'fields', 'feedback', 'acquisition', 'tabbed-lists', 'step-progress', 'workspace-controls', 'page-failure', 'page-pending', 'global-failure', 'workspace-skeletons', 'confirmation', 'choices', 'report', 'support-mode', 'suspended', 'notice', 'badges'].map(id => controls + id),
  ...['default', 'empty', 'date-and-time', 'disabled', 'in-dialog'].map(id => date + id),
  'design-system-personalização-colorpicker--interactive',
]
async function open(page: Page, id: string) {
  await page.goto(`${origin}/iframe.html?id=${id}&viewMode=story`)
  await expect(page.locator('#storybook-root')).not.toBeEmpty()
  await expect(page.locator('canvas')).toHaveCount(1)
}
async function shot(page: Page, info: TestInfo, id: string, state: string) {
  await expect(page.locator('#storybook-root')).not.toBeEmpty()
  await expect(page.locator('#storybook-root')).toBeVisible()
  await expect(page.locator('#storybook-root canvas')).toHaveCount(1)
  return captureOndasState(page, info, { route: '/storybook/' + id, state, source: 'presentation-fixture' })
}
test.beforeEach(async ({ page }) => { observeOndasPage(page); await page.emulateMedia({ reducedMotion: 'reduce' }) })
for (const id of stories) test('Primitive baseline ' + id, async ({ page }, info) => {
  if (id.endsWith('support-mode')) await page.route('**/bff/v1/auth/session', route => route.fulfill({ json: { support: { name: 'Ana Ondas', expiresAt: Date.now() + 900_000 } } }))
  await open(page, id)
  if (id.endsWith('support-mode')) await expect(page.getByText('Modo de suporte · Ana Ondas', { exact: true })).toBeVisible()
  if (id.endsWith('global-failure')) {
    await expect(page.locator('#storybook-root html, #storybook-root body')).toHaveCount(0)
    await expect(page.getByRole('main', { name: 'Não foi possível abrir esta página' })).toBeVisible()
    for (const control of [page.getByRole('button', { name: 'Tentar de novo' }), page.getByRole('link', { name: 'Voltar ao catálogo' })]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
  }
  await shot(page, info, id, 'ready')
  if (id.endsWith('global-failure')) {
    await page.getByRole('button', { name: 'Tentar de novo' }).focus()
    await shot(page, info, id, 'keyboard-focus')
    await page.emulateMedia({ forcedColors: 'active' })
    await shot(page, info, id, 'forced-colors')
  }
})

test('Primitive button pointer and keyboard states', async ({ page }, info) => {
  for (const variant of ['primary', 'secondary', 'danger', 'ghost']) {
    const id = controls + variant
    await open(page, id)
    const button = page.getByRole('button')
    await button.focus()
    await shot(page, info, id, 'keyboard-focus')
    await button.blur()
    await button.hover()
    await shot(page, info, id, 'pointer-hover')
    await page.mouse.down()
    await shot(page, info, id, 'pointer-active')
    await page.mouse.up()
  }
})
test('Primitive fields select tabs progress and confirmation', async ({ page }, info) => {
  await open(page, controls + 'fields')
  await page.getByRole('combobox').click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await shot(page, info, controls + 'fields', 'select-open')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.getByLabel('Nome', { exact: true }).focus()
  await shot(page, info, controls + 'fields', 'input-focus-invalid-disabled')
  await open(page, controls + 'workspace-controls')
  await page.getByRole('combobox').click()
  await shot(page, info, controls + 'workspace-controls', 'select-disabled-option')
  await page.keyboard.press('Escape')
  await open(page, controls + 'tabbed-lists')
  await page.getByRole('tab', { name: 'Coleções' }).click()
  await shot(page, info, controls + 'tabbed-lists', 'collections-tab')
  await open(page, controls + 'step-progress')
  for (let step = 1; step <= 3; step++) {
    await page.getByRole('button', { name: 'Continuar' }).click()
    await shot(page, info, controls + 'step-progress', 'step-' + (step + 1))
  }
  await open(page, controls + 'confirmation')
  const trigger = page.getByRole('button', { name: 'Excluir exemplo', exact: true })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, controls + 'confirmation', 'dialog-open')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
test('Primitive calendar popup invalid date and modal', async ({ page }, info) => {
  for (const variant of ['default', 'empty', 'date-and-time', 'in-dialog']) {
    const id = date + variant
    await open(page, id)
    await page.getByRole('button', { name: 'Abrir calendário' }).click()
    await expect(page.getByRole('grid')).toBeVisible()
    const popup = page.getByRole('dialog', { name: (await page.getByRole('grid').getAttribute('aria-label'))!, exact: true })
    const box = await popup.boundingBox()
    expect(box!.height).toBeGreaterThan(300)
    expect(box!.y).toBeGreaterThanOrEqual(8)
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 7)
    await shot(page, info, id, 'calendar-open')
    const selected = popup.locator('button[data-selected]')
    if (await selected.count()) {
      const fill = await selected.evaluate(element => getComputedStyle(element).backgroundColor)
      await selected.hover()
      await expect(selected).toHaveCSS('background-color', fill)
      await shot(page, info, id, 'calendar-selected-hover')
    }
    await page.getByRole('button', { name: 'Próximo mês' }).click()
    await shot(page, info, id, 'calendar-next-month')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Abrir calendário' })).toBeFocused()
    const input = page.getByRole('textbox')
    await input.fill('31/02/2026' + (variant === 'date-and-time' || variant === 'in-dialog' ? ' 14:30' : ''))
    await input.evaluate((element: HTMLInputElement) => element.reportValidity())
    await expect.poll(() => input.evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(false)
    await page.keyboard.press('Tab')
    await shot(page, info, id, 'invalid-date')
  }
})
test('Primitive color picker palette invalid code and channel', async ({ page }, info) => {
  const id = 'design-system-personalização-colorpicker--interactive'
  await open(page, id)
  await page.locator('summary').click()
  await shot(page, info, id, 'palette-open')
  await page.getByRole('button', { name: 'Cor do fundo: #ece5ff', exact: true }).click()
  await shot(page, info, id, 'palette-selected')
  await page.getByRole('textbox').fill('#GGGGGG')
  await expect(page.getByRole('alert')).toBeVisible()
  await shot(page, info, id, 'invalid-hex')
  await page.getByRole('slider', { name: 'Cor do fundo — Azul', exact: true }).fill('90')
  await shot(page, info, id, 'rgb-channel')
})
test('Primitive compact choices retain keyboard and forced colors', async ({ page }, info) => {
  const id = controls + 'choices'
  await open(page, id)
  const choice = page.getByRole('checkbox', { name: 'Permitir contato', exact: true })
  await choice.focus()
  await page.keyboard.press('Space')
  await expect(choice).toBeChecked()
  await expect(choice).toHaveCSS('width', '20px')
  await shot(page, info, id, 'checked-focus')
  const radio = page.getByRole('radio', { name: 'Dividir por igual', exact: true })
  await radio.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Priorizar destinos', exact: true })).toBeChecked()
  await shot(page, info, id, 'radio-keyboard')
  await page.emulateMedia({ forcedColors: 'active' })
  await expect(choice).toHaveCSS('accent-color', 'auto')
  await shot(page, info, id, 'forced-colors')
})
test('Primitive responsive focus and transparency fallback', async ({ page, context }, info) => {
  await open(page, controls + 'workspace-controls')
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await shot(page, info, controls + 'workspace-controls', 'width-' + width)
  }
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 390 : 1440, height: 900 })
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await shot(page, info, controls + 'workspace-controls', 'text-200-percent')
  await open(page, controls + 'workspace-controls')
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-reduced-transparency', value: 'reduce' }] })
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true)
  await shot(page, info, controls + 'workspace-controls', 'reduced-transparency')
  await cdp.detach()
})
test('Primitive report keeps dates and words readable while scrolling', async ({ page }, info) => {
  const id = controls + 'report'
  await open(page, id)
  for (const text of ['15/10/2026', 'Publicado']) {
    const lines = await page.getByText(text, { exact: true }).evaluate(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return range.getClientRects().length
    })
    expect(lines, text + ' must occupy one readable line').toBe(1)
  }
  const region = page.getByRole('region', { name: 'Publicações', exact: true })
  await region.focus()
  await shot(page, info, id, 'table-focus')
  await region.evaluate(element => { element.scrollLeft = element.scrollWidth })
  await shot(page, info, id, 'table-scroll-end')
})
test('Primitive support notice retains expired pending and failure states', async ({ page }, info) => {
  const id = controls + 'support-mode'
  let expiresAt = Date.now() + 900_000
  await page.route('**/bff/v1/auth/session', route => route.fulfill({ json: { support: { name: 'Ana Ondas', expiresAt } } }))
  await open(page, id)
  await expect(page.getByText('Modo de suporte · Ana Ondas', { exact: true })).toBeVisible()
  let release = () => {}
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/bff/v1/support/exit', async route => { await held; await route.fulfill({ status: 503, json: { message: 'Falha local' } }) })
  await page.getByRole('button', { name: 'Sair do suporte' }).click()
  await expect(page.getByRole('button', { name: 'Saindo…' })).toBeDisabled()
  await shot(page, info, id, 'exit-pending')
  release()
  await expect(page.getByRole('alert')).toContainText('Não foi possível sair')
  await shot(page, info, id, 'exit-failure')
  expiresAt = Date.now() - 1
  await open(page, id)
  await expect(page.getByText('Sessão indisponível ou expirada. Saia para voltar ao admin.')).toBeVisible()
  await shot(page, info, id, 'session-expired')
})
