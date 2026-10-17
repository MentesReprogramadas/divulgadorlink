import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeContent as Page } from '@/features/catalog/server/home-page'

const { forward } = vi.hoisted(() => ({ forward: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000' }) }))
vi.mock('@/lib/upstream', () => ({ forward, tenantHost: (host: string) => host }))
vi.mock('@/components/domain/home-search', () => ({ HomeSearch: () => <form aria-label="Busca" /> }))
vi.mock('@/components/domain/facet-filters', () => ({ HomeExplore: () => <div>Facetas</div> }))

const row = { id: 'link', name: 'Comunidade', description: 'Descrição curta', surfaceToken: 'token+assinado' }
const seo = {
  title: 'Tem Link Aqui', description: 'Catálogo', canonical: 'https://localhost/', robots: 'index,follow',
  openGraph: { title: 'Tem Link Aqui', description: 'Catálogo', url: 'https://localhost/' }, structuredData: {},
}

afterEach(() => { cleanup(); forward.mockReset() })

describe('home', () => {
  it('exibe patrocinados depois de explorar, sem barras laterais e com rastreamento preservado', async () => {
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify({
      seo, niches: [], networks: [], sponsored: [row], organic: [{ ...row, id: 'organico', name: 'Link orgânico' }], nextCursor: 'pagina+2',
    })) })
    render(await Page({ searchParams: Promise.resolve({}) }))
    const explore = screen.getByRole('region', { name: 'Explorar' })
    const sponsored = screen.getByRole('region', { name: 'Patrocinados' })
    expect(explore.compareDocumentPosition(sponsored) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(within(sponsored).getByRole('link', { name: 'Comunidade' }).getAttribute('href')).toBe('/link/link?surfaceToken=token%2Bassinado')
    expect(within(sponsored).getByText('Patrocinado')).toBeTruthy()
    expect(within(sponsored).getByText('Patrocinado').querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(screen.getByRole('button', { name: 'Mostrar mais' }).getAttribute('type')).toBe('button')
  })

  it('não reserva espaço para anúncios ausentes e mantém o estado vazio', async () => {
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify({ seo, niches: [], networks: [], sponsored: [], organic: [] })) })
    render(await Page({ searchParams: Promise.resolve({}) }))
    expect(screen.queryByRole('region', { name: 'Patrocinados' })).toBeNull()
    expect(screen.getByText('Nenhum link publicado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mostrar mais' })).toBeNull()
  })
})
