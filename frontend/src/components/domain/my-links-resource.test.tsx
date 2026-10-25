import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { useMyLinks } from './panel-links'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('repete a leitura recusada sem escrever no link nem manter erro após a recuperação', async () => {
  vi.mocked(api).mockResolvedValueOnce({ status: 503, body: {} }).mockResolvedValueOnce({ status: 200, body: { links: [], total: 0 } })
  const { result } = renderHook(() => useMyLinks())
  await waitFor(() => expect(result.current.ready).toBe(true))
  expect(result.current.error).not.toBe('')
  act(() => result.current.reload())
  await waitFor(() => expect(result.current.ready).toBe(true))
  expect(result.current.error).toBe('')
  expect(result.current.links).toEqual([])
  expect(vi.mocked(api).mock.calls).toHaveLength(2)
  expect(vi.mocked(api).mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true)
})
