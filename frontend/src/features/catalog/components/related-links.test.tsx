import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RelatedLinks } from './related-links'
import { api } from '@/lib/api'
vi.mock('@/lib/api', () => ({ api: vi.fn() }))
const item = { id: 'one', name: 'Clube de livros', description: 'Leituras e encontros', sponsored: false, surfaceToken: 'related.token' }
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('F03 relacionados', () => {
  it('F03-C01/T03 omite seção vazia', () => {
    render(<RelatedLinks linkId="source" initial={{ items: [], nextCursor: null, showImpressions: true }} />)
    expect(screen.queryByRole('heading', { name: 'A descoberta continua.' })).toBeNull()
  })
  it('F03-C01 usa card e marcação de patrocinado existentes quando presente no contrato', () => {
    render(<RelatedLinks linkId="source" initial={{ items: [{ ...item, sponsored: true }], nextCursor: null, showImpressions: false }} />)
    expect(screen.getByRole('heading', { name: 'A descoberta continua.' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Clube de livros' }).getAttribute('href')).toBe('/link/one?surfaceToken=related.token')
    expect(screen.getByText('Patrocinado')).toBeTruthy()
    expect(screen.queryByRole('img', { name: /impress/ })).toBeNull()
  })
  it('F03-C01 impede dupla paginação, mantém cards em erro e recupera sem duplicados', async () => {
    let fail = () => {}
    vi.mocked(api).mockImplementationOnce(() => new Promise((_, reject) => { fail = () => reject(new Error('offline')) }))
    vi.mocked(api).mockResolvedValueOnce({ status: 200, body: { items: [item, { ...item, id: 'two', name: 'Mais leituras' }], nextCursor: null, showImpressions: true } })
    render(<RelatedLinks linkId="source" initial={{ items: [item], nextCursor: 'next', showImpressions: true }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais relacionados' })); fireEvent.click(screen.getByRole('button', { name: 'Carregando…' }))
    expect(api).toHaveBeenCalledTimes(1); fail(); await screen.findByRole('alert')
    expect(screen.getByRole('link', { name: 'Clube de livros' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais relacionados' })); await screen.findByRole('link', { name: 'Mais leituras' })
    expect(screen.getAllByRole('link', { name: 'Clube de livros' })).toHaveLength(1)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('status')))
  })
  it('F03-C02 erro inicial é recuperável e payload negado não entra no DOM', async () => {
    vi.mocked(api).mockResolvedValue({ status: 404, body: { items: [{ ...item, name: 'sentinela-privada' }] } })
    render(<RelatedLinks linkId="source" initial={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'A descoberta continua.' })).toBeNull())
    expect(document.body.innerHTML).not.toContain('sentinela-privada')
  })
  it('F03-C02 cursor obsoleto oferece atualização da primeira página e mantém loading acessível', async () => {
    vi.mocked(api).mockResolvedValueOnce({ status: 400, body: {} })
    vi.mocked(api).mockResolvedValueOnce({ status: 200, body: { items: [{ ...item, id: 'new', name: 'Nova seleção' }], nextCursor: null, showImpressions: false } })
    render(<RelatedLinks linkId="source" initial={{ items: [item], nextCursor: 'old', showImpressions: false }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais relacionados' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Atualizar sugestões' }))
    await screen.findByRole('link', { name: 'Nova seleção' })
    expect(api).toHaveBeenLastCalledWith('/v1/links/source/related')
    expect(screen.queryByRole('link', { name: 'Clube de livros' })).toBeNull()
  })
})

it('shows declared local, language and participation in related cards without changing the signed destination',()=>{
 render(<RelatedLinks linkId="source" initial={{items:[{...item,discovery:{city:{name:'São Paulo',state:'SP'},languageTag:'pt',modality:'ONLINE'}}],nextCursor:null,showImpressions:false}}/>)
 expect(screen.getByText('São Paulo / SP')).toBeTruthy();expect(screen.getByText('português')).toBeTruthy();expect(screen.getByText('Online')).toBeTruthy()
 expect(screen.getByRole('link',{name:'Clube de livros'}).getAttribute('href')).toBe('/link/one?surfaceToken=related.token')
})
