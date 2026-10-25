import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomeDiscoveryPanel } from './home-discovery-panel'
import { emptyDiscovery } from '../discovery/discovery-contract'

vi.mock('../discovery/discovery-filters', () => ({ DiscoveryFilters: () => <input aria-label="Filtro" /> }))
afterEach(cleanup)

it('limpar filtros mantém o painel aberto e o foco; fechar continua sendo escolha da pessoa', () => {
  const active = { ...emptyDiscovery(), languageTag: 'pt' }
  const view = render(<HomeDiscoveryPanel filters={active} />)
  const panel = screen.getByText('Localização e preferências').closest('details')!
  const input = screen.getByRole('textbox', { name: 'Filtro' })
  input.focus()
  view.rerender(<HomeDiscoveryPanel filters={emptyDiscovery()} />)
  expect(panel.open).toBe(true)
  expect(document.activeElement).toBe(input)
  panel.open = false; fireEvent(panel, new Event('toggle'))
  view.rerender(<HomeDiscoveryPanel filters={active} />)
  expect(panel.open).toBe(false)
})
