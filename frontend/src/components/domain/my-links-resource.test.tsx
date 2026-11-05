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

it('só aplica visibilidade confirmada, mantém status/vaga e persiste cache após métricas atrasadas', async () => {
  let metrics: (value: { status: number; body: object }) => void = () => {}
  const link = { id: 'visibility', name: 'Meu link', status: 'PUBLISHED', occupiesSlot: true, ownerHidden: false }
  let visibility: { status: number; body: { message?: string; ownerHidden?: boolean } } = { status: 503, body: { message: 'Tente novamente.' } }
  vi.mocked(api).mockImplementation(async path => {
    if (String(path).endsWith('/visibility')) return visibility
    if (String(path).includes('/analytics/')) return new Promise(resolve => { metrics = resolve })
    return { status: 200, body: { links: [link], total: 1 } }
  })
  const first = renderHook(() => useMyLinks())
  await waitFor(() => expect(first.result.current.links).toEqual([link]))
  await act(async () => { await expect(first.result.current.setVisibility(link.id, true)).rejects.toThrow('Tente novamente.') })
  expect(first.result.current.links).toEqual([link])
  visibility = { status: 200, body: { ownerHidden: true } }
  await act(async () => { await first.result.current.setVisibility(link.id, true) })
  expect(first.result.current.links).toEqual([{ ...link, ownerHidden: true }])
  expect(vi.mocked(api)).toHaveBeenCalledWith('/v1/links/visibility/visibility', { method: 'PATCH', body: JSON.stringify({ hidden: true }) })
  await act(async () => metrics({ status: 200, body: { impressions: 2, clicks: 1, ctr: 50 } }))
  first.unmount()
  vi.mocked(api).mockImplementation(async () => new Promise(() => {}))
  const cached = renderHook(() => useMyLinks())
  expect(cached.result.current.links).toEqual([{ ...link, ownerHidden: true }])
})

it('desoculta rejeitado sem alterar moderação ou vaga e confirma novamente na leitura', async () => {
  let hidden = true
  const link = { id: 'rejected', name: 'Meu envio', status: 'PRE_REJECTED', occupiesSlot: true }
  vi.mocked(api).mockImplementation(async (path, init) => {
    if (init?.method === 'PATCH') { hidden = false; return { status: 200, body: { ownerHidden: false } } }
    if (String(path).includes('/analytics/')) return { status: 503, body: {} }
    return { status: 200, body: { links: [{ ...link, ownerHidden: hidden }], total: 1 } }
  })
  const { result } = renderHook(() => useMyLinks())
  await waitFor(() => expect(result.current.links).toEqual([{ ...link, ownerHidden: true }]))
  await act(async () => { await result.current.setVisibility(link.id, false) })
  expect(result.current.links).toEqual([{ ...link, ownerHidden: false }])
  act(() => result.current.reload())
  await waitFor(() => expect(result.current.ready).toBe(true))
  expect(result.current.links).toEqual([{ ...link, ownerHidden: false }])
})

it('preserva PATCH confirmado quando uma lista antiga chega após mostrar o cache', async () => {
  const link = { id: 'race', name: 'Link em cache', status: 'PUBLISHED', occupiesSlot: true, ownerHidden: false }
  vi.mocked(api).mockImplementation(async path => String(path).includes('/analytics/') ? { status: 503, body: {} } : { status: 200, body: { links: [link], total: 1 } })
  const first = renderHook(() => useMyLinks())
  await waitFor(() => expect(first.result.current.links).toEqual([link]))
  first.unmount()
  let finishList: (value: { status: number; body: object }) => void = () => {}
  vi.mocked(api).mockImplementation(async (path, init) => {
    if (init?.method === 'PATCH') return { status: 200, body: { id: link.id, ownerHidden: true } }
    if (String(path).includes('/analytics/')) return { status: 503, body: {} }
    return new Promise(resolve => { finishList = resolve })
  })
  const cached = renderHook(() => useMyLinks())
  expect(cached.result.current.links).toEqual([link])
  await act(async () => { await cached.result.current.setVisibility(link.id, true) })
  await act(async () => finishList({ status: 200, body: { links: [link], total: 1 } }))
  expect(cached.result.current.links).toEqual([{ ...link, ownerHidden: true }])
  cached.unmount()
  vi.mocked(api).mockImplementation(async () => new Promise(() => {}))
  const restored = renderHook(() => useMyLinks())
  expect(restored.result.current.links).toEqual([{ ...link, ownerHidden: true }])
})

it('recusa resposta de visibilidade identificada como outro link', async () => {
  const link = { id: 'target', name: 'Meu link', status: 'PUBLISHED', ownerHidden: false }
  vi.mocked(api).mockImplementation(async (path, init) => {
    if (init?.method === 'PATCH') return { status: 200, body: { id: 'other', ownerHidden: true } }
    if (String(path).includes('/analytics/')) return { status: 503, body: {} }
    return { status: 200, body: { links: [link], total: 1 } }
  })
  const { result } = renderHook(() => useMyLinks())
  await waitFor(() => expect(result.current.links).toEqual([link]))
  await act(async () => { await expect(result.current.setVisibility(link.id, true)).rejects.toThrow('Não foi possível alterar a visibilidade.') })
  expect(result.current.links).toEqual([link])
})
