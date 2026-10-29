import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { requestConnectionQr } from './connection-qr'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

it('aguarda o provedor preparar o QR, consultando somente a conta já cadastrada', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValueOnce({ status: 200, body: { state: 'connecting', count: 0 } }).mockResolvedValueOnce({ status: 200, body: { state: 'connecting', count: 0 } }).mockResolvedValueOnce({ status: 200, body: { state: 'connecting', base64: 'data:image/png;base64,AA==' } })
  const result = requestConnectionQr('one', new AbortController().signal)
  await vi.advanceTimersByTimeAsync(3000)
  expect(await result).toMatchObject({ base64: 'data:image/png;base64,AA==' })
  expect(api).toHaveBeenCalledTimes(3)
  expect(vi.mocked(api).mock.calls.every(([path]) => path === '/v1/admin/affiliates/instances/one/connect')).toBe(true)
})

it('limita a espera e para novas consultas ao fechar o fluxo', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValue({ status: 200, body: { state: 'connecting' } })
  const result = requestConnectionQr('one', new AbortController().signal)
  await vi.advanceTimersByTimeAsync(6000)
  expect(await result).toEqual({ state: 'connecting' })
  expect(api).toHaveBeenCalledTimes(5)
  vi.clearAllMocks()
  const controller = new AbortController(), cancelled = requestConnectionQr('two', controller.signal)
  const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
  await vi.advanceTimersByTimeAsync(0)
  controller.abort()
  await rejected
  await vi.advanceTimersByTimeAsync(6000)
  expect(api).toHaveBeenCalledTimes(1)
})
