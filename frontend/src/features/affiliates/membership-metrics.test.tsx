import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MembershipMetrics } from './membership-metrics'
import { affiliateRequest } from './contracts'

vi.mock('./contracts', async importOriginal => ({ ...await importOriginal<typeof import('./contracts')>(), affiliateRequest: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('separa novas entradas, retornos e saídas sem inventar conversão do anúncio', async () => {
  vi.mocked(affiliateRequest).mockResolvedValue({ since: '2026-09-30T00:00:00Z', until: '2026-10-30T00:00:00Z', totals: { joins: 8, rejoins: 2, leaves: 3 }, groups: [{ groupId: 'g1', groupName: 'Natal #03', segmentId: 's1', status: 'READY', baselineAt: '2026-10-29T22:00:00Z', expiresAt: '2027-01-27T22:00:00Z', lastReceivedAt: '2026-10-29T23:00:00Z', lastErrorCode: null, receivedDuringBaseline: 0, joins: 8, rejoins: 2, leaves: 3, staleEvents: 0 }] })
  render(<MembershipMetrics segmentId="s1" />)
  await waitFor(() => expect(screen.getByText('Novas entradas').nextElementSibling?.textContent).toBe('8'))
  expect(screen.getByText('Retornos').nextElementSibling?.textContent).toBe('2')
  expect(screen.getByText('Saídas do grupo').nextElementSibling?.textContent).toBe('3')
  expect(screen.getByText(/não atribuem entradas ao anúncio/i)).toBeTruthy()
  expect(screen.getByText('Medição ativa')).toBeTruthy()
  expect(affiliateRequest).toHaveBeenCalledWith('/membership?segmentId=s1')
})

it('mostra falta de configuração em vez de zero entradas e permite tentar de novo após erro', async () => {
  vi.mocked(affiliateRequest).mockRejectedValueOnce(new Error('Indisponível')).mockResolvedValueOnce({ since: '2026-09-30T00:00:00Z', until: '2026-10-30T00:00:00Z', totals: { joins: 0, rejoins: 0, leaves: 0 }, groups: [{ groupId: 'g1', groupName: 'Natal', segmentId: 's1', status: 'UNCONFIGURED', baselineAt: null, expiresAt: null, lastReceivedAt: null, lastErrorCode: null, receivedDuringBaseline: 0, joins: 0, rejoins: 0, leaves: 0, staleEvents: 0 }] })
  render(<MembershipMetrics segmentId="s1" />)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Não foi possível consultar as entradas. Tente atualizar.')
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar entradas' }))
  expect(await screen.findByText('Medição não configurada')).toBeTruthy()
  expect(screen.queryByText('0')).toBeNull()
})
