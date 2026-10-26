import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SearchBox } from './search-box'

const { api, push } = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const suggestions = {
  status: 200,
  body: {
    facet: { kind: 'niche', slug: 'jogos', name: 'Jogos' },
    items: [{ id: 'guilda', name: 'Guilda de RPG', surfaceToken: 'signed+token', sponsored: true, niche: { name: 'Jogos', slug: 'jogos' }, network: { name: 'Discord', slug: 'discord' } }],
  },
}

beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.useRealTimers(); api.mockReset(); push.mockReset() })

describe('sugestões da busca', () => {
  it('mostra categorias e redes do contexto sem duplicar o destino legado',async()=>{
    api.mockResolvedValue({status:200,body:{facet:{kind:'niche',slug:'adulto',name:'Adulto'},facets:[{kind:'niche',slug:'adulto',name:'Adulto',requiresAge:true},{kind:'network',slug:'telegram',name:'Telegram'}],items:[]}})
    render(<SearchBox id="context-search" label="Busca" discoveryQuery="languageTag=pt"/>)
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'corno telegram'}})
    const facets=await screen.findByRole('group',{name:'Nichos e redes'})
    expect(within(facets).getAllByRole('option')).toHaveLength(2)
    expect(within(facets).getByRole('option',{name:/Adulto/}).getAttribute('href')).toBe('/nicho/adulto?languageTag=pt')
    expect(within(facets).getByRole('option',{name:/Telegram/}).getAttribute('href')).toBe('/rede/telegram?languageTag=pt')
    expect(within(facets).getByText(/\+18/)).toBeTruthy()
  })
  it('preserva a primeira digitação antes dos efeitos passivos da montagem', async () => {
    api.mockResolvedValue(suggestions)
    function EarlyTyping() {
      useLayoutEffect(() => {
        fireEvent.change(document.getElementById('early-search')!, { target: { value: 'jogos' } })
      }, [])
      return <SearchBox id="early-search" label="Busca" />
    }
    render(<EarlyTyping />)
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('jogos')
    expect(await screen.findByRole('listbox')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/v1/search/suggest?q=jogos&quick=1', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('separa facetas de links e mantém os metadados dentro de uma única ação', async () => {
    api.mockResolvedValue(suggestions)
    render(<SearchBox id="search" label="Busca" />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jogos' } })
    const facets = await screen.findByRole('group', { name: 'Nichos e redes' })
    const links = screen.getByRole('group', { name: 'Links sugeridos' })
    expect(within(facets).getAllByRole('option')).toHaveLength(1)
    const option = within(links).getByRole('option')
    expect(screen.getAllByRole('option')[0]).toBe(option)
    expect(option.getAttribute('href')).toBe('/link/guilda?surfaceToken=signed%2Btoken')
    expect(within(option).getByText('Discord').closest('a')).toBe(option)
    expect(within(option).getByText('Patrocinado')).toBeTruthy()
    expect(option.querySelector('a')).toBeNull()
    expect(screen.getByRole('link', { name: /Ver todos os resultados/ }).getAttribute('href')).toBe('/busca?q=jogos')
    fireEvent.click(option)
    expect(push).toHaveBeenCalledWith('/link/guilda?surfaceToken=signed%2Btoken')
  })

  it('preserva a ordem pelo teclado e fecha com Escape', async () => {
    api.mockResolvedValue(suggestions)
    render(<SearchBox id="search" label="Busca" />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'jogos' } })
    await screen.findByRole('listbox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/nicho/jogos')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('ignora respostas antigas quando a consulta muda', async () => {
    let resolveOld: (value: typeof suggestions) => void = () => undefined
    api.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
    api.mockResolvedValueOnce({ status: 200, body: { items: [{ id: 'novo', name: 'Resultado novo' }] } })
    render(<SearchBox id="search" label="Busca" />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jogos' } })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'novo' } })
    await screen.findByText('Resultado novo')
    await act(async () => { resolveOld(suggestions) })
    expect(screen.queryByText('Guilda de RPG')).toBeNull()
    expect(screen.getByText('Resultado novo')).toBeTruthy()
  })

  it.each(['http', 'network'])('distingue falha %s de busca vazia e permite tentar de novo', async failure => {
    if (failure === 'http') api.mockResolvedValueOnce({ status: 503, body: {} })
    else api.mockRejectedValueOnce(new Error('offline'))
    api.mockResolvedValueOnce(suggestions)
    render(<SearchBox id="search" label="Busca" />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jogos' } })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Não foi possível carregar as sugestões'))
    expect(screen.queryByText('Nenhuma sugestão')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
    expect(await screen.findByText('Guilda de RPG')).toBeTruthy()
  })

  it('aguarda a pausa na digitação e cancela a consulta anterior', async () => {
    vi.useFakeTimers()
    api.mockImplementation(() => new Promise(() => {}))
    const view = render(<SearchBox id="search" label="Busca" />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'jo' } })
    fireEvent.change(input, { target: { value: 'jogos' } })
    await act(async () => { vi.advanceTimersByTime(149) })
    expect(api).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(1) })
    expect(api).toHaveBeenCalledTimes(1)
    const signal = api.mock.calls[0][1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    fireEvent.change(input, { target: { value: 'novo' } })
    expect(signal.aborted).toBe(true)
    view.unmount()
    await act(async () => { vi.advanceTimersByTime(350) })
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('entrega sugestões rápidas sem esperar pela interpretação e só enriquece quando faltam links',async()=>{
    vi.useFakeTimers()
    let resolveContext:(value:typeof suggestions)=>void=()=>undefined
    api.mockResolvedValueOnce({status:200,body:{facets:[{kind:'niche',slug:'jogos',name:'Jogos'}],items:[]}})
    api.mockReturnValueOnce(new Promise(resolve=>{resolveContext=resolve}))
    render(<SearchBox id="progressive" label="Busca"/>)
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'busco aventura em comunidades'}})
    await act(async()=>{vi.advanceTimersByTime(150)})
    expect(api.mock.calls[0][0]).toBe('/v1/search/suggest?q=busco%20aventura%20em%20comunidades&quick=1')
    expect(screen.getByRole('option',{name:/Jogos/})).toBeTruthy()
    expect(screen.getByText('Buscando links relacionados…')).toBeTruthy()
    expect(screen.queryByText('Nenhuma sugestão')).toBeNull()
    await act(async()=>{vi.advanceTimersByTime(350)})
    expect(api.mock.calls[1][0]).toBe('/v1/search/suggest?q=busco%20aventura%20em%20comunidades')
    fireEvent.keyDown(screen.getByRole('combobox'),{key:'ArrowDown'})
    await act(async()=>{resolveContext(suggestions)})
    expect(screen.getAllByRole('option')[0].textContent).toContain('Guilda de RPG')
    expect(screen.getByRole('combobox').hasAttribute('aria-activedescendant')).toBe(false)
    expect(screen.queryByText('Buscando links relacionados…')).toBeNull()
    await act(async()=>{vi.advanceTimersByTime(1000)})
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('não agenda interpretação quando as sugestões rápidas exigem maioridade',async()=>{
    vi.useFakeTimers()
    api.mockResolvedValue({status:200,body:{items:[],ageRequired:true}})
    render(<SearchBox id="gated-quick" label="Busca"/>)
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'conteúdo reservado'}})
    await act(async()=>{vi.advanceTimersByTime(150)})
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async()=>{vi.advanceTimersByTime(1000)})
    expect(api).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Buscando links relacionados…')).toBeNull()
  })

  it('cancelar a digitação cancela também a interpretação agendada e links rápidos dispensam IA',async()=>{
    vi.useFakeTimers()
    api.mockResolvedValueOnce({status:200,body:{items:[]}}).mockResolvedValueOnce(suggestions)
    render(<SearchBox id="cancel-context" label="Busca"/>)
    const input=screen.getByRole('combobox')
    fireEvent.change(input,{target:{value:'contexto novo'}})
    await act(async()=>{vi.advanceTimersByTime(150)})
    fireEvent.change(input,{target:{value:'jogos'}})
    await act(async()=>{vi.advanceTimersByTime(150)})
    expect(screen.getAllByRole('option')[0].textContent).toContain('Guilda de RPG')
    await act(async()=>{vi.advanceTimersByTime(1000)})
    expect(api).toHaveBeenCalledTimes(2)
    expect(api.mock.calls.every(call=>call[0].endsWith('&quick=1'))).toBe(true)
  })

  it.each(['Escape', 'blur', 'clear'])('não reabre após %s nem mantém descendente ativo oculto', async action => {
    api.mockResolvedValueOnce(suggestions)
    let resolveLate: (value: typeof suggestions) => void = () => undefined
    api.mockReturnValueOnce(new Promise(resolve => { resolveLate = resolve }))
    render(<SearchBox id="search" label="Busca" />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'jogos' } })
    await screen.findByRole('listbox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.change(input, { target: { value: 'novo' } })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    if (action === 'Escape') fireEvent.keyDown(input, { key: 'Escape' })
    else if (action === 'blur') fireEvent.blur(input, { relatedTarget: document.body })
    else fireEvent.change(input, { target: { value: '' } })
    await act(async () => { resolveLate(suggestions) })
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    expect(input.hasAttribute('aria-controls')).toBe(false)
  })

  it('não navega nem consulta enquanto um termo está sendo composto por IME', async () => {
    vi.useFakeTimers()
    api.mockResolvedValue(suggestions)
    render(<SearchBox id="search" label="Busca" />)
    const input = screen.getByRole('combobox')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'jogos' } })
    await act(async () => { vi.advanceTimersByTime(400) })
    expect(api).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    await act(async () => { vi.advanceTimersByTime(350) })
    expect(api).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(push).not.toHaveBeenCalled()
  })

  it('invalida sugestões quando os filtros mudam', async () => {
    api.mockImplementation(() => new Promise(() => {}))
    const view = render(<SearchBox id="search" label="Busca" />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jogos' } })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    const signal = api.mock.calls[0][1].signal as AbortSignal
    view.rerender(<SearchBox id="search" label="Busca" discoveryQuery="modality=ONLINE" />)
    expect(signal.aborted).toBe(true)
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false')
  })

  it('mantém a digitação no mesmo contexto e aplica um novo termo inicial cancelando a consulta', async () => {
    vi.useFakeTimers()
    api.mockImplementation(() => new Promise(() => {}))
    const view = render(<SearchBox id="search" label="Busca" initial="anterior" />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'jogos' } })
    await act(async () => { vi.advanceTimersByTime(350) })
    const signal = api.mock.calls[0][1].signal as AbortSignal
    view.rerender(<SearchBox id="search" label="Busca" initial="anterior" />)
    expect(input.value).toBe('jogos')
    expect(signal.aborted).toBe(false)
    view.rerender(<SearchBox id="search" label="Busca" initial="outro termo" />)
    expect(input.value).toBe('outro termo')
    expect(signal.aborted).toBe(true)
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })
})
