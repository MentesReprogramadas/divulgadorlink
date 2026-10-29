import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Page from './page'

const { api, query } = vi.hoisted(() => ({ api: vi.fn(), query: { value: 'q=antes' } }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query.value) }))
vi.mock('@/components/ui/back-button', () => ({ BackButton: () => null }))
vi.mock('@/components/domain/search-box', () => ({ SearchBox: () => null }))
vi.mock('@/features/catalog/discovery/discovery-filters', () => ({ DiscoveryFilters: () => null }))
vi.mock('@/features/favorites/components/favorite-button', () => ({ FavoriteButton: () => null }))

afterEach(() => { cleanup(); api.mockReset(); query.value = 'q=antes' })
it('cancela consulta superada, anuncia conclusão e oferece saída do vazio', async () => {
  let resolveOld: (value: unknown) => void = () => undefined
  api.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
  api.mockResolvedValueOnce({ status: 200, body: { target: { kind: 'results', slug: null }, sponsored: [], organic: [] } })
  const view = render(<Page />)
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
  const signal = api.mock.calls[0][1]?.signal as AbortSignal | undefined
  query.value = 'q=novo'
  view.rerender(<Page />)
  expect(await screen.findByText('Nenhum link encontrado')).toBeTruthy()
  expect(signal?.aborted).toBe(true)
  expect(screen.getByRole('link', { name: 'Explorar o catálogo' }).getAttribute('href')).toBe('/')
  await act(async () => { resolveOld({ status: 200, body: { target: { kind: 'results', slug: null }, sponsored: [], organic: [{ id: 'antigo', name: 'Resultado antigo', description: '', surfaceToken: 'token' }] } }) })
  expect(screen.queryByText('Resultado antigo')).toBeNull()
})

it('anuncia o total carregado e preserva surfaceToken e queryId', async () => {
  api.mockResolvedValue({ status: 200, body: { queryId: 'query+1', target: { kind: 'results', slug: null }, sponsored: [], organic: [{ id: 'atual', name: 'Resultado atual', description: 'Descrição', surfaceToken: 'signed+1' }] } })
  render(<Page />)
  await waitFor(() => expect(screen.getByRole('status', { name: 'Resultados da busca' })).toHaveProperty('textContent', '1 link encontrado.'))
  expect(screen.getByRole('link', { name: 'Resultado atual' }).getAttribute('href')).toBe('/link/atual?surfaceToken=signed%2B1&queryId=query%2B1')
})

it('prioriza links e deixa os destinos de contexto depois dos resultados',async()=>{
  api.mockResolvedValue({status:200,body:{target:{kind:'results',slug:null},facets:[{kind:'niche',slug:'jogos',name:'Jogos'}],sponsored:[],organic:[{id:'related',name:'Comunidade relacionada',description:'Descrição',surfaceToken:'signed'}]}})
  render(<Page/>)
  const link=await screen.findByRole('link',{name:'Comunidade relacionada'})
  const context=screen.getByRole('navigation',{name:'Nichos e redes relacionados'})
  expect(link.compareDocumentPosition(context)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
