import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { CatalogPanel } from './catalog-panel'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('permite repetir a consulta de integração após falha',async()=>{
  vi.mocked(api).mockResolvedValueOnce({status:503,body:{message:'Integração indisponível.'}}).mockResolvedValue({status:200,body:{configured:true,connected:true,affiliateConfigured:true}})
  render(<CatalogPanel createOffer={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button',{name:'Tentar verificar integração'}))
  expect(await screen.findByRole('button',{name:'Configurar aplicativo'})).toBeTruthy()
})

it('carrega sugestões em paralelo com a integração e preserva o painel quando ela responde', async () => {
  let finish!: (value: Awaited<ReturnType<typeof api>>) => void
  vi.mocked(api).mockImplementation(async path => path.endsWith('/catalog/status') ? new Promise(resolve => {finish=resolve}) : {status:200,body:{enabled:false,usesSegmentName:true,terms:['Natal'],products:[],counts:null,checkedAt:null,nextRunAt:null,status:'PAUSED',error:null}})
  render(<CatalogPanel segmentId="natal" contextName="Natal" createOffer={vi.fn()} />)
  await screen.findByRole('heading',{name:'Sugestões para Natal'})
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery?mode=MIXED&view=ALL&page=1',expect.objectContaining({method:'GET'})))
  await finish({status:200,body:{configured:true,connected:true,affiliateConfigured:true}})
  fireEvent.click(screen.getByRole('tab',{name:'Configurações'}))
  await screen.findByRole('button',{name:'Configurar aplicativo'})
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.includes('/discovery?'))).toHaveLength(1)
})

it('mantém a busca central e permite configurar uma conta própria sem conectar novamente a central', async () => {
  vi.mocked(api).mockImplementation(async path => ({ status: 200, body: path.endsWith('/catalog/status') ? { mode: 'CENTRAL', configured: true, connected: true, status: 'CONNECTED', clientId: null, redirectUri: '', affiliateConfigured: true } : { products: [], warnings: [] } }))
  render(<CatalogPanel createOffer={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Usar meu aplicativo' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Conectar Mercado Livre' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Trocar conta do catálogo' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Buscar produtos'), { target: { value: 'natal' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar nas duas lojas' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/catalog/search?q=natal', expect.objectContaining({ method: 'GET' })))
})

it('permite trocar e desconectar a conta própria do catálogo', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { configured: true, connected: true, status: 'CONNECTED', clientId: 'local-app', redirectUri: 'https://temlinkaqui.com/bff/v1/admin/affiliates/catalog/callback', affiliateConfigured: false } })
  render(<CatalogPanel createOffer={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Configurar aplicativo' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Trocar conta do catálogo' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Desconectar catálogo' })).toBeTruthy()
})

it('mantém a busca indisponível quando o catálogo central está desconectado', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { mode: 'CENTRAL', configured: true, connected: false, status: 'RECONNECT', clientId: null, redirectUri: '', affiliateConfigured: false } })
  render(<CatalogPanel createOffer={vi.fn()} />)
  await screen.findByText('Conexão central pendente')
  expect(screen.getByRole('button', { name: 'Buscar nas duas lojas' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button', { name: 'Usar meu aplicativo' })).toBeTruthy()
})

it('mostra somente a conferência enquanto a integração ainda não respondeu', async () => {
  let resolveStatus!: (value: Awaited<ReturnType<typeof api>>) => void
  vi.mocked(api).mockReturnValue(new Promise(resolve => { resolveStatus = resolve }))
  render(<CatalogPanel contextName="Natal" createOffer={vi.fn()} />)
  expect(screen.getByRole('status', { name: 'Conferindo integração com o Mercado Livre' })).toBeTruthy()
  expect(screen.queryByText(/Gerador de afiliados pendente/)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Configurar aplicativo' })).toBeNull()
  resolveStatus({ status: 200, body: { mode: 'CENTRAL', connected: true, configured: true, affiliateConfigured: true } })
  expect(await screen.findByRole('button', { name: 'Buscar nas duas lojas' })).toBeTruthy()
  expect(screen.getByText('Catálogo central conectado')).toBeTruthy()
})


it('explica que os anúncios disponíveis pertencem a uma amostra consultada', async () => {
  vi.mocked(api).mockImplementation(async path => ({ status: 200, body: path.endsWith('/catalog/status') ? { mode: 'CENTRAL', connected: true, configured: true, affiliateConfigured: true } : { products: [], warnings: ['Alguns produtos não têm ofertas disponíveis.'], counts: { catalogsFound: 10000, catalogsChecked: 20, withoutOffers: 20, failed: 0 } } }))
  render(<CatalogPanel contextName="Natal" createOffer={vi.fn()} />)
  fireEvent.change(await screen.findByRole('searchbox', { name: 'Buscar produtos' }), { target: { value: 'natal' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar nas duas lojas' }))
  expect(await screen.findByText(/0 anúncios disponíveis entre 20 produtos consultados/)).toBeTruthy()
  expect(screen.getByText(/esta consulta compara uma amostra/)).toBeTruthy()
})


it('não abre oferta de uma geração que terminou depois de sair da segmentação', async () => {
  let finish!: (value: Awaited<ReturnType<typeof api>>) => void
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/catalog/affiliate')) return new Promise(resolve => { finish = resolve })
    return { status: 200, body: path.endsWith('/catalog/status') ? { mode: 'CENTRAL', connected: true, configured: true, affiliateConfigured: true } : { products: [{ id: 'item', title: 'Produto', productUrl: 'https://www.mercadolivre.com.br/p/MLB123456', priceCents: 3990, oldPriceCents: null, checkedAt: new Date().toISOString() }], warnings: [] } }
  })
  const createOffer = vi.fn(), view = render(<CatalogPanel contextName="Natal" createOffer={createOffer} />)
  fireEvent.change(await screen.findByRole('searchbox', { name: 'Buscar produtos' }), { target: { value: 'natal' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar nas duas lojas' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Gerar link e preparar' }))
  await waitFor(() => expect(finish).toBeDefined())
  view.unmount(); finish({ status: 200, body: { url: 'https://meli.la/fixture' } })
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(createOffer).not.toHaveBeenCalled()
})

it('gera por URL sem depender da busca e prepara oferta sem inventar preço ou título', async () => {
  const createOffer = vi.fn()
  vi.mocked(api).mockImplementation(async path => ({ status: 200, body: path.endsWith('/catalog/affiliate') ? { url: 'https://meli.la/exato' } : { connected: false, configured: false, affiliateConfigured: true } }))
  render(<CatalogPanel contextName="Natal" createOffer={createOffer} />)
  fireEvent.change(await screen.findByLabelText('Endereço do anúncio'), { target: { value: 'https://produto.mercadolivre.com.br/MLB-123456-produto' } })
  fireEvent.click(screen.getByRole('button', { name: 'Gerar link de afiliado' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Preparar oferta' }))
  expect(createOffer).toHaveBeenCalledWith({ productUrl: 'https://produto.mercadolivre.com.br/MLB-123456-produto', affiliateUrl: 'https://meli.la/exato' })
  expect(api).not.toHaveBeenCalledWith(expect.stringContaining('/catalog/search'), expect.anything())
})

it('apaga segredos ao fechar a configuração e separa sessão de OAuth', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { mode: 'CENTRAL', connected: true, configured: true, affiliateConfigured: true } })
  render(<CatalogPanel createOffer={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Configurar minha sessão' }))
  fireEvent.change(screen.getByLabelText('Nome da conta de afiliados'), { target: { value: 'Minha conta' } })
  fireEvent.change(screen.getByLabelText('Etiqueta de afiliado (tag)'), { target: { value: 'minha-tag' } })
  fireEvent.change(screen.getByLabelText('Perfil de afiliado'), { target: { value: 'meu-perfil' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para sessão' }))
  const cookie = screen.getByLabelText('Cookie da sessão') as HTMLInputElement
  expect(cookie.type).toBe('password')
  fireEvent.change(cookie, { target: { value: 'secret-cookie' } })
  fireEvent.change(screen.getByLabelText('Token CSRF (x-csrf-token)'), { target: { value: 'secret-csrf' } })
  fireEvent.click(screen.getByRole('button', { name: 'Fechar janela' }))
  fireEvent.click(screen.getByRole('button', { name: 'Configurar minha sessão' }))
  fireEvent.change(screen.getByLabelText('Nome da conta de afiliados'), { target: { value: 'Minha conta' } })
  fireEvent.change(screen.getByLabelText('Etiqueta de afiliado (tag)'), { target: { value: 'minha-tag' } })
  fireEvent.change(screen.getByLabelText('Perfil de afiliado'), { target: { value: 'meu-perfil' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para sessão' }))
  expect((screen.getByLabelText('Cookie da sessão') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Token CSRF (x-csrf-token)') as HTMLInputElement).value).toBe('')
})

it('confirma desconexão da sessão e não oferece geração sem configuração ativa', async () => {
  let configured = true
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/catalog/session/disconnect')) { configured = false; return { status: 200, body: {} } }
    return { status: 200, body: { connected: true, configured: true, affiliateConfigured: configured, session: { mode: configured ? 'OWN' : 'DISCONNECTED', configured, verified: false, accountLabel: 'Minha conta', tag: 'tag', profile: 'perfil' } } }
  })
  render(<CatalogPanel createOffer={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Desconectar sessão de afiliados' }))
  expect(api).not.toHaveBeenCalledWith(expect.stringContaining('/session/disconnect'), expect.anything())
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar desconexão da sessão' }))
  await screen.findByText('Sessão própria desconectada')
  expect(screen.getByRole('button', { name: 'Gerar link de afiliado' }).hasAttribute('disabled')).toBe(true)
})

it('reconcilia sessão recusada após erro ao gerar sem esconder o erro original', async () => {
  let refused = false
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/catalog/affiliate')) { refused = true; return { status: 409, body: { message: 'Configure a sessão novamente.' } } }
    return { status: 200, body: { configured: true, connected: true, affiliateConfigured: !refused, session: { mode: 'OWN', configured: true, verified: !refused, status: refused ? 'RECONNECT' : 'CONNECTED', accountLabel: 'Minha conta', tag: 'tag', profile: 'perfil' } } }
  })
  render(<CatalogPanel createOffer={vi.fn()} />)
  fireEvent.change(await screen.findByLabelText('Endereço do anúncio'), { target: { value: 'https://produto.mercadolivre.com.br/MLB-123456-anuncio' } })
  fireEvent.click(screen.getByRole('button', { name: 'Gerar link de afiliado' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Configure a sessão novamente.')
  expect(screen.getByText('Sessão recusada ou expirada; configure novamente')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Gerar link de afiliado' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button', { name: 'Trocar sessão de afiliados' })).toBeTruthy()
})

it('permite desativar origens centrais apenas na operação e confirma antes da mutação', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { mode: 'CENTRAL', connected: true, configured: true, affiliateConfigured: true, session: { mode: 'CENTRAL', configured: true, verified: true, status: 'CONNECTED', accountLabel: 'Central', tag: 'tag', profile: 'perfil' } } })
  render(<CatalogPanel createOffer={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Desativar catálogo central' }))
  expect(screen.getByText('O catálogo central será desativado somente nesta operação. A conta na origem VHG permanece conectada.')).toBeTruthy()
  expect(api).not.toHaveBeenCalledWith(expect.stringContaining('/catalog/disconnect'), expect.anything())
  fireEvent.click(screen.getByRole('button', { name: 'Fechar janela' }))
  fireEvent.click(screen.getByRole('button', { name: 'Desativar sessão central' }))
  expect(screen.getByText('A sessão central será desativada somente nesta operação. A conta na origem VHG permanece conectada.')).toBeTruthy()
  expect(api).not.toHaveBeenCalledWith(expect.stringContaining('/catalog/session/disconnect'), expect.anything())
})

it('mantém geração direta disponível quando somente o catálogo central falha', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { mode: 'CENTRAL', connected: false, configured: true, status: 'UNAVAILABLE', catalogError: 'A origem não respondeu.', affiliateConfigured: true, session: { mode: 'OWN', configured: true, verified: false, status: 'CONFIGURED', accountLabel: 'Minha conta', tag: 'tag', profile: 'perfil' } } })
  render(<CatalogPanel createOffer={vi.fn()} />)
  expect(await screen.findByText(/Catálogo indisponível: A origem não respondeu/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Gerar link de afiliado' }).hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('button', { name: 'Buscar nas duas lojas' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button', { name: 'Trocar sessão de afiliados' })).toBeTruthy()
})


it('exibe falha ao gerar sugestão fora das ferramentas manuais recolhidas', async () => {
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/products/preview')) return { status: 403, body: { message: 'Sessão recusada na geração.' } }
    if (path.includes('/discovery')) return { status: 200, body: { enabled: true, usesSegmentName: true, terms: ['Natal'], products: [{ id: 'item', title: 'Produto', productUrl: 'https://produto.mercadolivre.com.br/MLB-123456', priceCents: 3990, oldPriceCents: null, imageUrl: null, checkedAt: '2026-10-28T12:00:00Z' }], counts: null, checkedAt: '2026-10-28T12:00:00Z', nextRunAt: null, status: 'READY', error: null } }
    return { status: 200, body: { configured: true, connected: true, affiliateConfigured: true } }
  })
  render(<CatalogPanel segmentId="natal" contextName="Natal" createOffer={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Revisar e enviar' }))
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe('Sessão recusada na geração.')
  expect(alert.closest('details')).toBeNull()
  expect(screen.queryByText('Buscar outro produto')).toBeNull()
})

it('oferece configuração de sessão diretamente junto das sugestões', async () => {
  vi.mocked(api).mockImplementation(async path => ({ status: 200, body: path.includes('/discovery') ? { enabled: false, usesSegmentName: true, terms: ['Natal'], products: [], counts: null, checkedAt: null, nextRunAt: null, status: 'PAUSED', error: null } : { configured: true, connected: true, affiliateConfigured: false } }))
  render(<CatalogPanel segmentId="natal" contextName="Natal" createOffer={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button',{name:'Configurações'}))
  const button = await screen.findByRole('button', { name: 'Configurar sessão de afiliados' })
  expect(button.closest('details')).toBeNull()
  fireEvent.click(button)
  expect(screen.getByRole('dialog', { name: 'Configurar sessão de afiliados' })).toBeTruthy()
})
