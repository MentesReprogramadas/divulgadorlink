import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabNavigation, Tabs } from './tabs'

afterEach(cleanup)
it('ignores skeleton interaction and enables selection when content is ready', async () => {
  const onChange = vi.fn()
  const props = { value: 'team', onChange, label: 'Equipe', items: [{ id: 'team', label: 'Minha equipe', content: 'Equipe' }, { id: 'pages', label: 'Acessos por página', content: 'Páginas' }] }
  const view = render(<Tabs {...props} disabled />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('tab', { name: 'Acessos por página' }))
  expect(onChange).not.toHaveBeenCalled()
  view.rerender(<Tabs {...props} />)
  await user.click(screen.getByRole('tab', { name: 'Acessos por página' }))
  expect(onChange).toHaveBeenCalledWith('pages')
})

it('mantém navegação por teclado sem ativar abas desativadas e aponta para o painel externo', async () => {
  const onChange = vi.fn()
  render(<TabNavigation value="themes" onChange={onChange} label="Aparência" idPrefix="appearance" items={[{ id: 'themes', label: 'Temas' }, { id: 'colors', label: 'Cores', disabled: true }, { id: 'style', label: 'Botões e texto' }]} />)
  const first = screen.getByRole('tab', { name: 'Temas' })
  const last = screen.getByRole('tab', { name: 'Botões e texto' })
  first.focus()
  const user = userEvent.setup()
  await user.keyboard('{ArrowRight}{Enter}')
  expect(onChange).not.toHaveBeenCalled()
  await user.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(last)
  await user.keyboard('{Enter}')
  expect(onChange).toHaveBeenCalledWith('style')
  expect(last.getAttribute('aria-controls')).toBe('appearance-panel-style')
  expect(screen.getByRole('tablist', { name: 'Aparência' })).toBeTruthy()
})
