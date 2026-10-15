import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeCatalog } from './home-catalog'

const { api } = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))

const sponsored = { id: 'ad', name: 'Anúncio original', description: 'Descrição', surfaceToken: 'ad-token' }
const organic = { id: 'original', name: 'Link original', description: 'Descrição', surfaceToken: 'original-token' }
const next = { id: 'novo', name: 'Link novo', description: 'Descrição', surfaceToken: 'novo+token' }
const initial = { sponsored: [sponsored], organic: [organic], nextCursor: 'cursor+inicial' }

afterEach(() => { cleanup(); api.mockReset() })

describe('carregamento incremental da home', () => {
  it('acrescenta links sem remontar anúncios nem duplicar os existentes', async () => {
    api.mockResolvedValue({ status: 200, body: { sponsored: [sponsored], organic: [organic, next, next], nextCursor: 'proximo', showImpressions: false } })
    render(<HomeCatalog initial={initial} />)
    const ad = screen.getByRole('link', { name: 'Anúncio original' })
    const original = screen.getByRole('link', { name: 'Link original' })
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    const added = await screen.findByRole('link', { name: 'Link novo' })
    expect(api).toHaveBeenCalledWith('/v1/home?cursor=cursor%2Binicial')
    expect(screen.getByRole('link', { name: 'Anúncio original' })).toBe(ad)
    expect(screen.getByRole('link', { name: 'Link original' })).toBe(original)
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(added.getAttribute('href')).toBe('/link/novo?surfaceToken=novo%2Btoken')
    expect(added.closest('article')?.querySelector('.impression-mark')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('1 novo link carregado.')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/v1/home?cursor=proximo'))
  })

  it('impede envio duplicado enquanto aguarda o lote', async () => {
    let resolve: (value: unknown) => void = () => undefined
    api.mockReturnValue(new Promise(done => { resolve = done }))
    render(<HomeCatalog initial={initial} />)
    const button = screen.getByRole('button', { name: 'Mostrar mais' }) as HTMLButtonElement
    fireEvent.click(button)
    fireEvent.click(button)
    expect(api).toHaveBeenCalledOnce()
    expect(button.disabled).toBe(true)
    await act(async () => { resolve({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } }) })
    expect(screen.getByRole('link', { name: 'Link novo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mostrar mais' })).toBeNull()
  })

  it.each(['rede', 'http'])('preserva o catálogo e permite repetir o mesmo cursor após falha de %s', async (failure) => {
    if (failure === 'rede') api.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    else api.mockResolvedValueOnce({ status: 503, body: {} })
    api.mockResolvedValueOnce({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } })
    render(<HomeCatalog initial={initial} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('link', { name: 'Anúncio original' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Link original' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    await screen.findByRole('link', { name: 'Link novo' })
    expect(api.mock.calls.map(([path]) => path)).toEqual(['/v1/home?cursor=cursor%2Binicial', '/v1/home?cursor=cursor%2Binicial'])
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
