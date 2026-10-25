import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Page from './page'

const fixture = vi.hoisted(() => ({ state: { links: [], error: 'Links indisponíveis.', ready: true, reload: vi.fn() } }))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'link-proprio' }) }))
vi.mock('@/components/domain/panel', () => ({ useAreaSession: () => ({ role: 'USER', status: 'ACTIVE' }) }))
vi.mock('@/components/domain/panel-links', () => ({ useMyLinks: () => fixture.state, LinkEditor: () => <p>Editor do link</p> }))
afterEach(() => { cleanup(); fixture.state.error = 'Links indisponíveis.'; fixture.state.reload.mockReset() })

it('oferece tentar novamente no erro de transporte sem confundir com link ausente', () => {
  render(<Page />)
  expect(screen.getByRole('alert').textContent).toContain('Links indisponíveis.')
  expect(screen.queryByText('Link não encontrado.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(fixture.state.reload).toHaveBeenCalledOnce()
})

it('mostra o estado vazio com volta aos links quando a coleção carregou sem o recurso', () => {
  fixture.state.error = ''
  render(<Page />)
  expect(screen.getByRole('status').textContent).toContain('Link não encontrado.')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('link', { name: 'Voltar aos seus links' }).getAttribute('href')).toBe('/painel/links')
})
