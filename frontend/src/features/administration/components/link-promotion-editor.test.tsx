import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkPromotionEditor } from './link-promotion-editor'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
const mockApi = vi.mocked(api)
const context = { promotions: [], allowedSurfaces: ['SEARCH', 'NICHE', 'HOME'], eligible: true }
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
beforeEach(() => { vi.resetAllMocks(); mockApi.mockResolvedValue({ status: 200, body: context }) })
afterEach(cleanup)
async function open() {
  render(<LinkPromotionEditor linkId="link-1" linkName="Comunidade" />)
  fireEvent.click(screen.getByRole('button', { name: 'Gerenciar destaque' }))
  await screen.findByLabelText('Período')
}
describe('editor de destaque administrativo', () => {
  it('envia prazo indeterminado como null, sem um vencimento artificial', async () => {
    await open()
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'indefinite' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar destaque' }))
    await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/v1/admin/links/link-1/promotions', { method: 'PUT', body: JSON.stringify({ surfaces: ['SEARCH', 'NICHE'], expiresAt: null }) }))
    await screen.findByText('Destaque salvo sem prazo de término.')
  })
  it('mantém dados e erro no formulário após falha de transporte', async () => {
    await open()
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('Data e hora de término'), { target: { value: '2030-11-10T12:00' } })
    mockApi.mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar destaque' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Data e hora de término') as HTMLInputElement).value).toBe('2030-11-10T12:00')
    expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true)
  })
  it('não oferece home restrita nem permite salvar quando todos os locais estão pagos', async () => {
    mockApi.mockResolvedValueOnce({ status: 200, body: { eligible: true, allowedSurfaces: ['SEARCH', 'NICHE'], promotions: [
      { id: 'p1', surface: 'SEARCH', expiresAt: '2030-01-01' }, { id: 'p2', surface: 'NICHE', expiresAt: '2030-01-01' },
    ] } })
    await open()
    expect(screen.queryByRole('option', { name: 'Página inicial' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Salvar destaque' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('recupera prazo indeterminado e remove somente o destaque administrativo', async () => {
    mockApi.mockResolvedValueOnce({ status: 200, body: { ...context, promotions: [{ id: 'p', surface: 'HOME', administrative: true, expiresAt: null }] } })
    await open()
    expect((screen.getByLabelText('Período') as HTMLSelectElement).value).toBe('indefinite')
    fireEvent.click(screen.getByRole('button', { name: 'Remover destaque' }))
    await waitFor(() => expect(mockApi).toHaveBeenLastCalledWith('/v1/admin/links/link-1/promotions', { method: 'DELETE' }))
  })
})
