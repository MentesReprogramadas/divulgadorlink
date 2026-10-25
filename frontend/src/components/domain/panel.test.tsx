import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OrdersArea, UserDesk } from './panel'
import { api } from '@/lib/api'

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


it('distingue erro de pedidos vazios, tenta novamente e preserva pedidos conhecidos após falha de atualização', async () => {
  vi.mocked(api).mockClear()
  type Result = { status: number; body: object }
  let orderResponse: Promise<Result> = Promise.resolve({ status: 503, body: { message: 'Pedidos indisponíveis.' } })
  vi.mocked(api).mockImplementation(async path => path === '/v1/orders/mine' ? await orderResponse : { status: 200, body: { links: [{ id: 'a', name: 'Comunidade de estudos', status: 'PUBLISHED' }] } })
  const first = render(<OrdersArea />)
  expect((await screen.findByRole('alert')).textContent).toContain('Pedidos indisponíveis.')
  expect(screen.queryByText('Nada por aqui ainda.')).toBeNull()

  orderResponse = Promise.resolve({ status: 200, body: { orders: [{ id: 'order-a', amountCents: 2900, status: 'PAID', linkId: 'a' }] } })
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  await screen.findByText('Comunidade de estudos')
  expect(screen.queryByRole('alert')).toBeNull()
  first.unmount()

  orderResponse = Promise.resolve({ status: 503, body: { message: 'Não foi possível atualizar os pedidos.' } })
  render(<OrdersArea />)
  await screen.findByText('Não foi possível atualizar os pedidos.')
  expect(screen.getByText('Comunidade de estudos')).toBeTruthy()
  expect(screen.queryByText('Nada por aqui ainda.')).toBeNull()
  let resolve: (value: Result) => void = () => {}
  orderResponse = new Promise<Result>(finish => { resolve = finish })
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(screen.getByText('Comunidade de estudos')).toBeTruthy()
  await act(async () => resolve({ status: 200, body: { orders: [] } }))
  await screen.findByText('Nada por aqui ainda.')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(vi.mocked(api).mock.calls.filter(([path]) => path === '/v1/orders/mine')).toHaveLength(4)
})

it('trata falha de rede nos pedidos como erro recuperável sem confirmar vazio', async () => {
  vi.mocked(api).mockImplementation(async path => {
    if (path === '/v1/orders/mine') throw new Error('offline')
    return { status: 200, body: { links: [] } }
  })
  render(<OrdersArea />)
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar os pedidos.'))
  expect(screen.queryByText('Nada por aqui ainda.')).toBeNull()
  expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
})
