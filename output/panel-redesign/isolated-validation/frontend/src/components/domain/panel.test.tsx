import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { UserDesk } from './panel'

vi.mock('./panel-links', () => ({ useMyLinks: () => ({ ready: true, error: '', links: [{ id: 'a', name: 'Estudos', status: 'PUBLISHED' }], stats: { a: null } }), LinkList: () => null }))
vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ status: 503, body: {} })) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/painel' }))
afterEach(cleanup)
it('mostra indisponibilidade de contagem e pedidos sem transformar falhas em totais zerados', async () => {
  render(<UserDesk />)
  await screen.findByText('Pedidos indisponíveis')
  const metrics = screen.getByLabelText('Métricas')
  expect(within(metrics).getAllByText('—')).toHaveLength(2)
  expect(within(metrics).queryByText('R$ 0,00')).toBeNull()
  expect(screen.getByText('Contagem parcial: alguns dados indisponíveis')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Precisa de atenção' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Links mais clicados' })).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: 'Operação' })).toBeNull()
})
