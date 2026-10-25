import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeCatalog } from './home-catalog'

const { api } = vi.hoisted(() => ({ api: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))

const sponsored = { id: 'ad', name: 'Anúncio original', description: 'Descrição', surfaceToken: 'ad-token' }
const organic = { id: 'original', name: 'Link original', description: 'Descrição', surfaceToken: 'original-token' }
const next = { id: 'novo', name: 'Link novo', description: 'Descrição', surfaceToken: 'novo+token' }
const initial = { sponsored: [sponsored], organic: [organic], nextCursor: 'cursor+inicial' }

afterEach(() => { cleanup(); api.mockReset(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })

describe('carregamento incremental da home', () => {
  it('mantém os controles ao filtrar e ignora um lote da seleção anterior', async () => {
    let resolve: (value: unknown) => void = () => undefined
    api.mockReturnValue(new Promise(done => { resolve = done }))
    const view = render(<HomeCatalog initial={initial}><input aria-label="Filtro persistente" /></HomeCatalog>)
    const control = screen.getByRole('textbox', { name: 'Filtro persistente' })
    control.focus()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    view.rerender(<HomeCatalog initial={{ sponsored: [], organic: [next] }} filters={{ cityId: null, languageTag: 'en', modality: null }}><input aria-label="Filtro persistente" /></HomeCatalog>)
    expect(screen.getByRole('textbox', { name: 'Filtro persistente' })).toBe(control)
    expect(document.activeElement).toBe(control)
    await act(async () => { resolve({ status: 200, body: initial }) })
    expect(screen.queryByRole('link', { name: 'Link original' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Link novo' })).toBeTruthy()
  })
  it('não observa scroll antes de lotes adicionais e limpa timer e listeners ao desmontar', async () => {
    api.mockResolvedValue({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } })
    const view = render(<HomeCatalog initial={initial} />)
    const write = vi.spyOn(window.history, 'replaceState')
    try {
      fireEvent.scroll(window)
      fireEvent.keyDown(document.body, { key: 'Enter' })
      expect(write).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
      await screen.findByRole('link', { name: 'Link novo' })
      write.mockClear()
      vi.useFakeTimers()
      fireEvent.scroll(window)
      view.unmount()
      fireEvent.scroll(window)
      fireEvent.keyDown(document.body, { key: 'Enter' })
      act(() => { vi.advanceTimersByTime(500) })
      expect(write).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    } finally { write.mockRestore(); vi.useRealTimers() }
  })

  it.each(['click', 'keyboard'] as const)('salva scroll limitado e descarrega a posição antes de navegação SPA por %s', async navigation => {
    vi.stubGlobal('scrollY', 100)
    api.mockResolvedValue({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } })
    let beforeNavigation: unknown
    const navigate = () => {
      beforeNavigation = window.history.state.tlaCatalog
      window.history.pushState({ __NA: true, filterEntry: true }, '', '/?languageTag=en')
    }
    render(<><HomeCatalog initial={initial} /><button onClick={navigate} onKeyDown={event => { if (event.key === 'Enter') navigate() }}>Aplicar filtro</button></>)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    await screen.findByRole('link', { name: 'Link novo' })
    vi.useFakeTimers()
    try {
      vi.stubGlobal('scrollY', 200)
      fireEvent.scroll(window)
      vi.stubGlobal('scrollY', 250)
      fireEvent.scroll(window)
      fireEvent.keyDown(document.body, { key: 'PageDown' })
      act(() => { vi.advanceTimersByTime(499) })
      expect(window.history.state.tlaCatalog.scrollY).toBe(100)
      act(() => { vi.advanceTimersByTime(1) })
      expect(window.history.state.tlaCatalog.scrollY).toBe(250)
      vi.stubGlobal('scrollY', 400)
      fireEvent.scroll(window)
      const button = screen.getByRole('button', { name: 'Aplicar filtro' })
      if (navigation === 'click') fireEvent.click(button)
      else fireEvent.keyDown(button, { key: 'Enter' })
      expect(beforeNavigation).toMatchObject({ path: '/', pages: 1, scrollY: 400 })
      act(() => { vi.advanceTimersByTime(500) })
      expect(window.history.state).toEqual({ __NA: true, filterEntry: true })
    } finally { vi.useRealTimers() }
  })

  it('revalida os cursores da entrada ao voltar, preserva posição e não armazena cartões', async () => {
    window.history.replaceState({ __NA: true, tlaCatalog: { path: '/', pages: 1, scrollY: 400 } }, '', '/')
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    api.mockResolvedValue({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } })
    render(<HomeCatalog initial={initial} />)
    expect(await screen.findByRole('link', { name: 'Link novo' })).toBeTruthy()
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 400))
    expect(window.history.state.__NA).toBe(true)
    expect(api).toHaveBeenCalledWith('/v1/home?cursor=cursor%2Binicial', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(window.history.state.tlaCatalog.pages).toBe(1)
    expect(JSON.stringify(window.history.state.tlaCatalog)).not.toMatch(/surfaceToken|Link novo|description/)
  })

  it('histórico indisponível não interrompe paginação e entrada de outra rota não é restaurada', async () => {
    window.history.replaceState({ tlaCatalog: { path: '/?cityId=outra', pages: 1, scrollY: 400 } }, '', '/')
    api.mockResolvedValue({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } })
    render(<HomeCatalog initial={initial} />)
    expect(api).not.toHaveBeenCalled()
    const write = vi.spyOn(window.history, 'replaceState').mockImplementation(() => { throw new DOMException('blocked') })
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
      expect(await screen.findByRole('link', { name: 'Link novo' })).toBeTruthy()
    } finally { write.mockRestore() }
  })

  it('falha na restauração preserva a primeira página e permite nova tentativa', async () => {
    window.history.replaceState({ tlaCatalog: { path: '/', pages: 1, scrollY: 400 } }, '', '/')
    api.mockRejectedValueOnce(new Error('offline'))
    api.mockResolvedValueOnce({ status: 200, body: { sponsored: [], organic: [next], nextCursor: null } })
    render(<HomeCatalog initial={initial} />)
    await screen.findByRole('alert')
    expect(screen.getByRole('link', { name: 'Link original' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    expect(await screen.findByRole('link', { name: 'Link novo' })).toBeTruthy()
  })

  it('vazio com filtros oferece limpeza e vazio inicial orienta publicação', () => {
    const view = render(<HomeCatalog initial={{ sponsored: [], organic: [] }} filters={{ cityId: null, languageTag: 'pt-BR', modality: null }} />)
    expect(screen.getByRole('link', { name: 'Limpar filtros' }).getAttribute('href')).toBe('/')
    view.rerender(<HomeCatalog initial={{ sponsored: [], organic: [] }} />)
    expect(screen.getByRole('link', { name: 'Publicar um link' }).getAttribute('href')).toBe('/divulgar')
  })
  it('preserva mídia aprovada e contexto de navegação no lote inicial e na paginação', async () => {
    const withMedia = { ...organic, imageUrl: '/api/v1/links/original/media/photo', imageAlt: 'Encontro da comunidade' }
    api.mockResolvedValue({ status: 200, body: { sponsored: [], organic: [{ ...next, iconUrl: '/api/v1/links/novo/media/icon' }], nextCursor: null } })
    render(<HomeCatalog initial={{ ...initial, organic: [withMedia] }} />)
    expect(screen.getByRole('img', { name: 'Encontro da comunidade' }).getAttribute('src')).toBe('/bff/v1/links/original/media/photo')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }))
    const link = await screen.findByRole('link', { name: 'Link novo' })
    expect(link.closest('article')?.querySelector('.link-name img')?.getAttribute('src')).toBe('/bff/v1/links/novo/media/icon')
    expect(link.getAttribute('href')).toBe('/link/novo?surfaceToken=novo%2Btoken')
  })

  it('usa o mesmo componente de card para patrocinados e orgânicos', () => {
    const { container } = render(<HomeCatalog initial={initial} />)
    const cards = container.querySelectorAll('article[data-link-id]')
    expect(cards).toHaveLength(2)
    expect(cards[0].className).toBe(cards[1].className)
    for (const card of cards) {
      expect(card.classList.contains('link-row')).toBe(true)
      expect(card.querySelector('.link-name')).not.toBeNull()
      expect(card.querySelector('.link-row-description')).not.toBeNull()
    }
    expect(cards[0].getAttribute('data-placement')).toBe('sponsored')
    expect(cards[1].getAttribute('data-placement')).toBe('organic')
  })

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
    expect(screen.getAllByRole('link').filter(link => link.closest('article'))).toHaveLength(3)
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
