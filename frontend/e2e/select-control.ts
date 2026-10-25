import { expect, type Locator } from '@playwright/test'

export async function selectOption(control: Locator, option: string | { label: string }) {
  control = control.and(control.page().locator(':not([data-skeleton] *)'))
  await control.waitFor({ state: 'attached' })
  const area = control.locator('xpath=ancestor::*[@data-responsive-area][1]')
  if (await area.count() && !await control.isVisible()) {
    const tab = typeof option === 'string' ? area.getByRole('tab').and(control.page().locator(`[data-value=${JSON.stringify(option)}]`)) : area.getByRole('tab', { name: option.label, exact: true })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    return
  }
  if (!await control.isVisible()) {
    const filters = control.locator('xpath=ancestor::*[@data-workspace-filters][1]')
    if (await filters.count()) await filters.getByRole('button', { name: 'Ver mais filtros', exact: true }).click()
  }
  if (await control.evaluate(element => element.tagName === 'SELECT')) {
    await control.selectOption(option)
    return
  }
  await control.click()
  const choices = control.page().getByRole('option')
  const choice = typeof option === 'string' ? choices.and(control.page().locator(`[data-value=${JSON.stringify(option)}]`)) : control.page().getByRole('option', { name: option.label, exact: true })
  await choice.click()
  // Navigation selects replace their trigger; each flow checks its own focus contract.
  await expect(choice).toBeHidden()
}

export async function expectSelected(control: Locator, value: string) {
  await expect(control.locator('[data-select-value]')).toHaveAttribute('data-select-value', value)
}
