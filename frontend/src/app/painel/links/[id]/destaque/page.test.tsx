import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Page from './page'

const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: mocks.api }))
vi.mock('@/domain/meta-pixel', () => ({ trackMeta: vi.fn(), orderParams: vi.fn() }))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'visual-link' }), useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }))
vi.mock('@stripe/react-stripe-js', () => ({ Elements: () => null, PaymentElement: () => null, useElements: () => null, useStripe: () => null }))
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn() }))

const emptyMessage = 'Não há opções de destaque disponíveis para este link no momento.'
beforeEach(() => { mocks.api.mockReset() })
afterEach(cleanup)

function respondOffers(result: Promise<unknown>) {
  mocks.api.mockImplementation((path: string) => path === '/v1/promotions/offers' ? result : Promise.resolve({ status: 200, body: { orders: [] } }))
}

it('explica o catálogo vazio depois de uma resposta concluída sem ofertas', async () => {
  respondOffers(Promise.resolve({ status: 200, body: { offers: [] } }))
  render(<Page />)
  expect(await screen.findByText(emptyMessage)).not.toBeNull()
  expect(screen.getByRole('status').textContent).toContain(emptyMessage)
  expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true)
})

it('mantém carregamento sem antecipar o estado vazio', async () => {
  let finish: ((result: unknown) => void) | undefined
  respondOffers(new Promise(resolve => { finish = resolve }))
  render(<Page />)
  expect(screen.queryByText(emptyMessage)).toBeNull()
  await act(async () => finish?.({ status: 200, body: { offers: [] } }))
  expect(screen.getByText(emptyMessage)).not.toBeNull()
})

it('não apresenta ausência de ofertas como consequência de erro de carregamento', async () => {
  respondOffers(Promise.resolve({ status: 503, body: {} }))
  render(<Page />)
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar os planos.')
  expect(screen.queryByText(emptyMessage)).toBeNull()
})

it('preserva a oferta e o avanço quando o backend retorna um plano selecionável', async () => {
  respondOffers(Promise.resolve({ status: 200, body: { offers: [{ code: 'HOME', name: 'Toda a comunidade', featured: true, surfaces: ['HOME'], prices: [{ durationDays: 28, amountCents: 8400 }] }] } }))
  render(<Page />)
  expect((await screen.findByRole('radio', { name: 'Toda a comunidade' }) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByText(emptyMessage)).toBeNull()
})
