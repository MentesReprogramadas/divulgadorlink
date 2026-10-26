import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Page, { generateMetadata } from '@/app/link/[id]/page'
import { forward } from '@/lib/upstream'

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'tenant-a.localhost:3013' }), cookies: async () => ({get:()=>undefined}) }))
vi.mock('@/lib/upstream', () => ({ forward: vi.fn(), tenantHost: (host: string) => host }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not-found') }, useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
vi.mock('@/features/catalog/server/related-links', () => ({ RelatedLinksSection: () => <div>Related fixture</div> }))
vi.mock('@/components/domain/impression', () => ({ Impression: ({ linkId, surfaceToken }: { linkId: string; surfaceToken: string }) => <span data-testid="impression" data-link={linkId} data-token={surfaceToken} /> }))
vi.mock('@/features/favorites/components/favorite-button', () => ({ FavoriteButton: ({ linkId, className }: { linkId: string; className?: string }) => <button className={className} data-link={linkId}>Salvar favorito</button> }))
vi.mock('@/components/domain/age-gate', () => ({ AgePrompt: () => <p>Confirmação de idade necessária</p>, confirmAge: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => <span aria-hidden="true" /> }))

const link = {
  available: true, name: 'Clube de leitura', description: 'Leituras e boas conversas. Encontros aos sábados com a comunidade.',
  imageUrl: '/api/v1/links/one/media/cover', imageAlt: 'Livros sobre a mesa', iconUrl: '/api/v1/links/one/media/icon',
  network: { name: 'Telegram', slug: 'telegram' }, niche: { name: 'Literatura', slug: 'literatura', requiresAge: false },
  discovery: { city: { name: 'Curitiba', state: 'PR' }, languageTag: 'pt', modality: 'ONLINE' },
  surfaceToken: 'organic.signed', seo: { title: 'Clube de leitura', description: 'Leituras e conversas', canonical: 'https://tenant-a.test/link/one', robots: 'index, follow' },
}
function respond(value: object, status = 200) { vi.mocked(forward).mockResolvedValue({ status, body: Buffer.from(JSON.stringify(value)), headers: {} }) }
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Detalhe real no padrão Ondas', () => {
  it('entrega a prévia pública adulta sem serializar saída, mídia ou relacionados', async () => {
    respond({available:true,ageRequired:true,requiresAge:true,name:'Comunidade adulta autorizada',description:'Prévia editorial pública.',seo:{title:'Comunidade adulta',description:'Prévia editorial pública.',canonical:'https://tenant-a.test/link/one',robots:'index,follow',rating:'adult'}})
    render(await Page({params:Promise.resolve({id:'one'}),searchParams:Promise.resolve({})}))
    expect(screen.getByRole('heading',{level:1,name:'Comunidade adulta autorizada'})).toBeTruthy()
    expect(screen.getByText('Prévia editorial pública.')).toBeTruthy()
    expect(screen.queryByRole('link',{name:'Acessar'})).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByTestId('impression')).toBeNull()
    expect(screen.queryByText('Related fixture')).toBeNull()
    expect(await generateMetadata({params:Promise.resolve({id:'one'})})).toMatchObject({robots:{index:true,follow:true},other:{rating:'adult'}})
  })
  it('separa capa, resumo curto e descrição completa, exibindo apenas os dados declarados', async () => {
    respond(link)
    render(await Page({ params: Promise.resolve({ id: 'one' }), searchParams: Promise.resolve({ surfaceToken: 'home.signed', queryId: '00000000-0000-4000-8000-000000000001' }) }))
    expect(screen.getByRole('heading', { level: 1, name: 'Clube de leitura' })).toBeTruthy()
    expect(screen.getByAltText('Livros sobre a mesa').getAttribute('src')).toBe('/bff/v1/links/one/media/cover')
    expect(screen.getByText('Leituras e boas conversas.')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Sobre o link' })).getByText(link.description)).toBeTruthy()
    const information = screen.getByRole('complementary', { name: 'Detalhes' })
    expect(within(information).getByText('Telegram')).toBeTruthy()
    expect(within(information).getByText('Curitiba / PR')).toBeTruthy()
    expect(within(information).getByRole('button', { name: 'Copiar link' })).toBeTruthy()
    expect(within(information).getByRole('link', { name: 'Denunciar um link', hidden: true }).getAttribute('href')).toBe('/painel/denunciar/one')
    expect(screen.getByRole('link', { name: 'Acessar' }).getAttribute('href')).toBe('/go/one?surfaceToken=home.signed&queryId=00000000-0000-4000-8000-000000000001')
    expect(screen.getByTestId('impression').getAttribute('data-token')).toBe('home.signed')
    expect(screen.queryByText('O que você encontra por lá')).toBeNull()
  })

  it('omite mídia e fatos ausentes sem inventar tipo, localização ou idioma', async () => {
    respond({ available: true, name: 'Sem anexos', description: 'Sem anexos' })
    render(await Page({ params: Promise.resolve({ id: 'two' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Sobre o link' })).toBeNull()
    expect(screen.queryByText('Localização')).toBeNull()
    expect(screen.queryByText('Idioma')).toBeNull()
    expect(screen.queryByText('Tipo')).toBeNull()
    expect(screen.getByRole('link', { name: 'Acessar' }).getAttribute('href')).toBe('/go/two')
    expect(screen.getByRole('complementary', { name: 'Detalhes' })).toBeTruthy()
  })

  it('mantém indisponibilidade sem expor anexos, descrição, favorito ou saída', async () => {
    respond({ ...link, available: false })
    render(await Page({ params: Promise.resolve({ id: 'one' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('heading', { name: 'Link indisponível' })).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Acessar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Salvar favorito' })).toBeNull()
    expect(screen.queryByTestId('impression')).toBeNull()
  })

  it('mostra iniciais reais quando o arquivo de ícone não carrega', async () => {
    respond(link)
    render(await Page({ params: Promise.resolve({ id: 'one' }), searchParams: Promise.resolve({}) }))
    fireEvent.error(screen.getByAltText(''))
    expect(screen.getByText('CL')).toBeTruthy()
  })

  it('conserva a página neutra sem prévia aprovada, sem renderizar o conteúdo antes do aceite', async () => {
    respond({available:true,ageRequired:true,requiresAge:true,name:'Conteúdo para maiores de 18',seo:{title:'Conteúdo para maiores de 18',description:'Confirme sua idade.',canonical:'https://tenant-a.test/link/one',robots:'noindex,nofollow'}})
    render(await Page({ params: Promise.resolve({ id: 'one' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('heading',{name:'Conteúdo para maiores de 18'})).toBeTruthy()
    expect(screen.queryByText('Clube de leitura')).toBeNull()
    expect(await generateMetadata({ params: Promise.resolve({ id: 'one' }) })).toMatchObject({ title: 'Conteúdo para maiores de 18', robots: { index: false, follow: false } })
  })
})
