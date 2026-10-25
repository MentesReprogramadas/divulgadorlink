import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { chooseSelect } from '@/test-select'
import { HomeNetworkLinks, HomeNetworkSelect, HomeTopics, type HomeFacet } from './home-navigation'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
})
afterEach(() => { cleanup(); push.mockReset() })

const discoveryQuery = 'languageTag=pt-BR&modality=ONLINE'
const niches: HomeFacet[] = [
  { slug: 'jogos', name: 'Jogos' },
  { slug: 'musicas', name: 'Música' },
  { slug: 'filmes-series', name: 'Cinema' },
  { slug: 'educacao-cursos', name: 'Educação' },
  { slug: 'compras-ofertas-cupons', name: 'Compras' },
  { slug: 'arte/cultura', name: 'Arte e cultura' },
  { slug: 'adulto', name: 'Adulto', requiresAge: true },
  { slug: 'streaming', name: 'Streaming' },
  { slug: 'servicos-profissionais', name: 'Serviços' },
  { slug: 'esportes', name: 'Esportes' },
]

describe('navegação Ondas com os assuntos reais', () => {
  it('mantém sete assuntos iniciais, expande todos sem excluir restritos e preserva filtros', () => {
    render(<HomeTopics niches={niches} discoveryQuery={discoveryQuery} />)
    const navigation = screen.getByRole('navigation', { name: 'Explorar por nicho' })
    const initialLinks = within(navigation).getAllByRole('link')
    expect(initialLinks).toHaveLength(8)
    expect(initialLinks[0].getAttribute('href')).toBe('/?' + discoveryQuery)
    expect(initialLinks[0].getAttribute('aria-current')).toBe('page')
    expect(initialLinks[1].textContent).toBe('Compras')
    expect(screen.queryByRole('link', { name: 'Esportes' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Arte e cultura' }).getAttribute('href')).toBe('/nicho/arte%2Fcultura?' + discoveryQuery)
    const expand = screen.getByRole('button', { name: 'Ver mais' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(expand)
    expect(within(navigation).getAllByRole('link')).toHaveLength(11)
    expect(screen.getByRole('link', { name: 'Adulto 18+' }).getAttribute('href')).toBe('/nicho/adulto?' + discoveryQuery)
    expect(screen.getByRole('link', { name: 'Esportes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }))
    expect(within(navigation).getAllByRole('link')).toHaveLength(8)
  })

  it('não oferece expansão sem assuntos adicionais nem inventa categorias', () => {
    render(<HomeTopics niches={[{ slug: 'jogos', name: 'Jogos' }]} discoveryQuery="" />)
    expect(screen.getByRole('link', { name: 'Para descobrir' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Jogos' }).getAttribute('href')).toBe('/nicho/jogos')
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('redes do hero Ondas', () => {
  it('oferece todas as redes no select e navega preservando filtros e codificação do slug', async () => {
    render(<HomeNetworkSelect discoveryQuery={discoveryQuery} networks={[
      { slug: 'rede/beta', name: 'Rede Beta', requiresAge: true },
      { slug: 'youtube', name: 'YouTube' },
    ]} />)
    const select = screen.getByRole('combobox', { name: 'Filtrar por rede' })
    expect(select.textContent).toContain('Todas as redes')
    fireEvent.click(select)
    expect(screen.getByRole('option', { name: 'Rede Beta 18+' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'YouTube' })).toBeTruthy()
    fireEvent.keyDown(select, { key: 'Escape' })
    await chooseSelect(select, 'rede/beta')
    expect(push).toHaveBeenLastCalledWith('/rede/rede%2Fbeta?' + discoveryQuery)
    await chooseSelect(select, '')
    expect(push).toHaveBeenLastCalledWith('/?' + discoveryQuery)
  })

  it('mostra só WhatsApp, Telegram e Discord existentes e sem restrição etária', () => {
    render(<HomeNetworkLinks discoveryQuery={discoveryQuery} networks={[
      { slug: 'discord', name: 'Discord' },
      { slug: 'youtube', name: 'YouTube' },
      { slug: 'telegram', name: 'Telegram', requiresAge: true },
      { slug: 'whatsapp', name: 'WhatsApp' },
    ]} />)
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      '/rede/whatsapp?' + discoveryQuery,
      '/rede/discord?' + discoveryQuery,
    ])
    expect(screen.queryByRole('link', { name: /Telegram/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /YouTube/ })).toBeNull()
  })

  it('omite o bloco se nenhuma das três redes existir', () => {
    const { container } = render(<HomeNetworkLinks discoveryQuery="" networks={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
