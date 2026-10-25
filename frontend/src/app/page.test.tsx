import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeContent as Page } from '@/features/catalog/server/home-page'

const { forward, age } = vi.hoisted(() => ({ forward: vi.fn(), age: { value: '' } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000' }), cookies: async () => ({ get: (name: string) => name === 'age' ? { value: age.value } : undefined }) }))
vi.mock('@/lib/upstream', () => ({ forward, tenantHost: (host: string) => host }))
vi.mock('@/components/domain/home-search', () => ({ HomeSearch: () => <form aria-label="Busca" /> }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/catalog/discovery/discovery-filters',()=>({DiscoveryFilters:()=> <div aria-label="Filtros de local e idioma"/>}))

const row = { id: 'link', name: 'Comunidade', description: 'Descrição curta', surfaceToken: 'token+assinado' }
const seo = {
  title: 'Tem Link Aqui', description: 'Catálogo', canonical: 'https://localhost/', robots: 'index,follow',
  openGraph: { title: 'Tem Link Aqui', description: 'Catálogo', url: 'https://localhost/' }, structuredData: {},
}

afterEach(() => { cleanup(); forward.mockReset(); age.value = '' })

describe('home', () => {
  it.each(['yes', 'no', 'invalid'])('SSR compartilha somente a preferência de idade válida: %s', async value => {
    age.value = value
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify({ seo, niches: [], networks: [], sponsored: [], organic: [] })) })
    render(await Page({ searchParams: Promise.resolve({}) }))
    expect(forward).toHaveBeenCalledWith(expect.objectContaining({ cookie: value === 'invalid' ? undefined : `age=${value}` }))
  })
  it('exibe patrocinados depois de explorar, sem barras laterais e com rastreamento preservado', async () => {
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify({
      seo, niches: [], networks: [], sponsored: [row], organic: [{ ...row, id: 'organico', name: 'Link orgânico' }], nextCursor: 'pagina+2',
    })) })
    render(await Page({ searchParams: Promise.resolve({}) }))
    const explore = screen.getByRole('navigation', { name: 'Explorar por nicho' })
    const sponsored = screen.getByRole('region', { name: 'Links em destaque' })
    expect(explore.compareDocumentPosition(sponsored) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('complementary').textContent).toContain('Publicar é grátis')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Encontre seu próximo link.')
    expect(within(sponsored).getByRole('link', { name: 'Comunidade' }).getAttribute('href')).toBe('/link/link?surfaceToken=token%2Bassinado')
    expect(within(sponsored).getByText('Patrocinado')).toBeTruthy()
    expect(within(sponsored).getByText('Patrocinado').querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(screen.getByRole('button', { name: 'Mostrar mais' }).getAttribute('type')).toBe('button')
  })

  it('não reserva espaço para anúncios ausentes e mantém o estado vazio', async () => {
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify({ seo, niches: [], networks: [], sponsored: [], organic: [] })) })
    render(await Page({ searchParams: Promise.resolve({}) }))
    expect(screen.queryByRole('region', { name: 'Links em destaque' })).toBeNull()
    expect(screen.getByText('Nenhum link publicado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mostrar mais' })).toBeNull()
  })
})
