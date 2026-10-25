import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DirectorySearch } from './directory-search'
import type { DiscoveredProfile } from './discovery-api'

const activate = vi.fn()
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
const profile: DiscoveredProfile = { id: 'one', slug: 'ana', name: 'Ana', bio: 'Projetos', avatarUrl: null, niche: { id: 'n', name: 'Educação' }, sponsored: false, following: false }
const props = { value: 'Ana', onChange: vi.fn(), profiles: [profile], pending: false, error: '', nicheId: 'n' }
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); Element.prototype.scrollIntoView = vi.fn(); vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(activate) })

it('sugere apenas páginas públicas do resultado filtrado e preserva categoria em ver todas', () => {
  render(<DirectorySearch {...props} profiles={[profile, { ...profile, id: 'private', slug: null }, { ...profile, id: 'unavailable', available: false }]}/>)
  fireEvent.focus(screen.getByRole('combobox'))
  expect(screen.getAllByRole('option')).toHaveLength(1)
  expect(screen.getByRole('option').getAttribute('href')).toBe('/p/ana')
  expect(screen.getByRole('link', { name: 'Ver todas as páginas' }).getAttribute('href')).toBe('/paginas?q=Ana&nicheId=n')
  expect(screen.queryByText('Links sugeridos')).toBeNull()
})

it('Enter sem seleção conserva a busca; setas selecionam e Escape fecha', () => {
  render(<DirectorySearch {...props}/>)
  const input = screen.getByRole('combobox')
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(activate).not.toHaveBeenCalled()
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option').id)
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(activate).toHaveBeenCalledTimes(1)
  expect(activate.mock.instances[0]).toBe(screen.getByRole('option'))
  expect(screen.getByRole('option').getAttribute('href')).toBe('/p/ana')
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).toBeNull()
})

it('mantém navegação nativa e modificadores ao clicar na página', () => {
  render(<DirectorySearch {...props}/>)
  fireEvent.focus(screen.getByRole('combobox'))
  const option = screen.getByRole('option')
  const events: Array<{ prevented: boolean; ctrl: boolean }> = []
  const observe = (event: MouseEvent) => {
    events.push({ prevented: event.defaultPrevented, ctrl: event.ctrlKey })
    event.preventDefault()
  }
  document.addEventListener('click', observe)
  try {
    fireEvent.click(option)
    fireEvent.click(option, { ctrlKey: true })
  } finally { document.removeEventListener('click', observe) }
  expect(events).toEqual([{ prevented: false, ctrl: false }, { prevented: false, ctrl: true }])
  expect(option.getAttribute('href')).toBe('/p/ana')
})

it('não oferece resultado anterior durante busca nem após erro; mantém acesso a todas as páginas', () => {
  const { rerender } = render(<DirectorySearch {...props} pending/>)
  fireEvent.focus(screen.getByRole('combobox'))
  expect(screen.queryByRole('option')).toBeNull()
  rerender(<DirectorySearch {...props} error="Sem conexão"/>)
  expect(screen.queryByRole('option')).toBeNull()
  expect(screen.getByText('Não foi possível carregar as sugestões. Tente buscar novamente.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Ver todas as páginas' })).toBeTruthy()
})

it('aguarda composição antes de filtrar e ignora Enter durante IME', () => {
  render(<DirectorySearch {...props}/>)
  const input = screen.getByRole('combobox')
  fireEvent.compositionStart(input)
  fireEvent.change(input, { target: { value: '日本' } })
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(props.onChange).not.toHaveBeenCalled()
  expect(activate).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input, { data: '日本' })
  expect(props.onChange).toHaveBeenCalledWith('日本')
})
