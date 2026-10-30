import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { GroupPolicySettings } from './group-policy-settings'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const policy = { enabled: true, disappearingSeconds: 604800, joinApproval: true, autoApproveDelaySeconds: 120, groups: [{ id: 'g1', name: 'Pets #1', groupPolicyState: 'UNSUPPORTED', groupPolicyErrorCode: 'admission_extension_required', groupPolicyNextRunAt: null }] }

it('separates desired settings from unsupported application and sends the complete strict policy', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: policy })
  const pending = vi.fn()
  render(<GroupPolicySettings segmentId="pets" pending={pending} />)
  await screen.findByText(/Extensão do provedor necessária; aplicação pendente/)
  expect(screen.queryByText('Aplicada')).toBeNull()
  fireEvent.change(screen.getByLabelText('Espera antes da aprovação automática (segundos)'), { target: { value: '240' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar política dos grupos' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/pets/group-policy', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ enabled: true, disappearingSeconds: 604800, joinApproval: true, autoApproveDelaySeconds: 240 }) })))
  expect(pending).toHaveBeenCalledWith(true)
  await waitFor(() => expect(pending).toHaveBeenLastCalledWith(false))
  expect((await screen.findByRole('status')).textContent).toContain('Preferências salvas')
})

it('keeps changes and displays an error if saving fails', async () => {
  vi.mocked(api).mockImplementation(async (_path, options) => options?.method === 'PUT' ? { status: 503, body: {} } : { status: 200, body: policy })
  render(<GroupPolicySettings segmentId="pets" pending={vi.fn()} />)
  const input = await screen.findByLabelText('Espera antes da aprovação automática (segundos)')
  fireEvent.change(input, { target: { value: '180' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar política dos grupos' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Seus dados foram mantidos')
  expect((input as HTMLInputElement).value).toBe('180')
})
