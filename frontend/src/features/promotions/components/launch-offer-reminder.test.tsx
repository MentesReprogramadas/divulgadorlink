import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LaunchOfferReminder } from './launch-offer-reminder'
const { api, route } = vi.hoisted(() => ({ api: vi.fn(), route: { pathname: '/painel/links' } }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
const campaign = () => ({ id: 'offer', linkId: 'link', linkName: 'Comunidade', discountPercent: 20, expiresAt: new Date(Date.now() + 60000).toISOString(), dismissed: false, productCode: 'SEARCH_NICHE_HOME', durationDays: 14 })
beforeEach(() => { api.mockReset(); route.pathname = '/painel/links'; api.mockResolvedValue({ status: 200, body: { offer: campaign(), launchOffer: campaign(), offers: [{ code: 'SEARCH_NICHE_HOME', name: 'Busca + Nicho + Home', prices: [{ durationDays: 14, amountCents: 2632 }] }] } }) })
afterEach(() => { cleanup(); vi.useRealTimers() })
it('expande e recolhe, preserva seleção e não permite dispensar no painel', async () => {
 render(<LaunchOfferReminder enabled />)
 fireEvent.click(await screen.findByRole('button', { name: 'Expandir oferta de destaque' }))
 const recovery = await screen.findByRole('link', { name: 'Recuperar oferta' })
 expect(recovery.getAttribute('href')).toBe('/painel/links/link/destaque?launch=1&plan=SEARCH_NICHE_HOME&duration=14')
 expect(await screen.findByText('R$ 26,32')).toBeTruthy()
 expect(screen.queryByRole('button', { name: 'Ocultar aqui' })).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: 'Recolher oferta de destaque' }))
 expect(screen.queryByRole('link', { name: 'Recuperar oferta' })).toBeNull()
})
it('mantém no painel mesmo após dispensa fora do painel', async () => {
 api.mockResolvedValue({ status: 200, body: { offer: { ...campaign(), dismissed: true } } })
 render(<LaunchOfferReminder enabled />)
 expect(await screen.findByRole('button', { name: 'Expandir oferta de destaque' })).toBeTruthy()
})
it('oculta somente na faixa expandida fora do painel e persiste no servidor', async () => {
 route.pathname = '/busca'
 api.mockImplementation((_path: string, init?: RequestInit) => Promise.resolve(init?.method === 'DELETE' ? { status: 204, body: {} } : { status: 200, body: { offer: campaign() } }))
 render(<LaunchOfferReminder enabled />)
 const expand = await screen.findByRole('button', { name: 'Expandir oferta de destaque' })
 expect(screen.queryByRole('button', { name: 'Ocultar aqui' })).toBeNull()
 fireEvent.click(expand); fireEvent.click(screen.getByRole('button', { name: 'Ocultar aqui' }))
 await act(async () => {})
 expect(api).toHaveBeenCalledWith('/v1/promotions/launch-offer/offer', { method: 'DELETE' })
 expect(screen.queryByRole('button', { name: 'Expandir oferta de destaque' })).toBeNull()
})
it('desaparece no prazo absoluto sem reiniciar a promoção', async () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-03T18:00:00Z'))
 api.mockResolvedValue({ status: 200, body: { offer: { ...campaign(), expiresAt: '2026-11-03T18:00:02Z' } } })
 await act(async () => { render(<LaunchOfferReminder enabled />) })
 expect(screen.getByRole('button', { name: 'Expandir oferta de destaque' })).toBeTruthy()
 await act(async () => { vi.advanceTimersByTime(2000) })
 expect(screen.queryByRole('complementary')).toBeNull()
})
it('remove oferta após confirmação de compra ou perda de elegibilidade', async () => {
 render(<LaunchOfferReminder enabled />)
 await screen.findByRole('button', { name: 'Expandir oferta de destaque' })
 api.mockResolvedValue({ status: 200, body: { offer: null } })
 await act(async () => { window.dispatchEvent(new Event('focus')) })
 expect(screen.queryByRole('complementary')).toBeNull()
})
it('não consulta nem mostra oferta sem permissão ou nas telas de compra e cadastro', () => {
 const view = render(<LaunchOfferReminder enabled={false} />)
 expect(api).not.toHaveBeenCalled()
 for (const path of ['/painel/links/novo', '/painel/links/link/destaque']) { route.pathname = path; view.rerender(<LaunchOfferReminder enabled />) }
 expect(api).not.toHaveBeenCalled()
})

it('não anuncia preço promocional se a campanha do catálogo mudou durante expansão', async () => {
 api.mockImplementation((path: string) => Promise.resolve({ status: 200, body: path.includes('/offers?') ? { launchOffer: { ...campaign(), id: 'outra-campanha' }, offers: [{ code: 'SEARCH_NICHE_HOME', name: 'Completo', prices: [{ durationDays: 14, amountCents: 2632 }] }] } : { offer: campaign() } }))
 render(<LaunchOfferReminder enabled />)
 fireEvent.click(await screen.findByRole('button', { name: 'Expandir oferta de destaque' }))
 await act(async () => {})
 expect(screen.queryByText('R$ 26,32')).toBeNull()
 expect(screen.queryByRole('complementary')).toBeNull()
})
