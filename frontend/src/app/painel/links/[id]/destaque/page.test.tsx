import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Page from './page'
import { PromotionPurchase } from '@/features/promotions/promotion-purchase'

const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn(), push: vi.fn(), search: '', submit: vi.fn(), confirm: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: mocks.api }))
vi.mock('@/domain/meta-pixel', () => ({ trackMeta: vi.fn(), orderParams: vi.fn() }))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'visual-link' }), useSearchParams: () => new URLSearchParams(mocks.search), useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }))
vi.mock('@stripe/react-stripe-js', () => ({ Elements: ({children}: {children: React.ReactNode}) => children, PaymentElement: () => <div>Campos seguros do cartão</div>, useElements: () => ({submit: mocks.submit}), useStripe: () => ({confirmPayment: mocks.confirm}) }))
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => Promise.resolve(null) }))

const emptyMessage = 'Não há opções de destaque disponíveis para este link no momento.'
beforeEach(() => { mocks.push.mockReset(); HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', '') }; HTMLDialogElement.prototype.close = function() { this.removeAttribute('open') }; mocks.api.mockReset(); mocks.submit.mockReset().mockResolvedValue({}); mocks.confirm.mockReset().mockResolvedValue({}); mocks.search = ''; sessionStorage.clear() })
afterEach(() => { cleanup(); vi.useRealTimers() })

function respondOffers(result: Promise<unknown>) {
  mocks.api.mockImplementation((path: string) => path.startsWith('/v1/promotions/offers') ? result : Promise.resolve({ status: 200, body: { orders: [] } }))
}

it('explica o catálogo vazio depois de uma resposta concluída sem ofertas', async () => {
  respondOffers(Promise.resolve({ status: 200, body: { offers: [] } }))
  render(<Page />)
  expect(await screen.findByText(emptyMessage)).not.toBeNull()
  expect(screen.getByRole('status').textContent).toContain(emptyMessage)
  expect((screen.getByRole('button', { name: /Comprar por/ }) as HTMLButtonElement).disabled).toBe(true)
})

it('mantém carregamento sem antecipar o estado vazio', async () => {
  let finish: ((result: unknown) => void) | undefined
  respondOffers(new Promise(resolve => { finish = resolve }))
  render(<Page />)
  expect(screen.queryByText(emptyMessage)).toBeNull()
  await act(async () => finish?.({ status: 200, body: { offers: [] } }))
  expect(screen.getByText(emptyMessage)).not.toBeNull()
})

it('não apresenta ausência de ofertas como consequência de erro de carregamento', async () => {
  respondOffers(Promise.resolve({ status: 503, body: {} }))
  render(<Page />)
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar os planos.')
  expect(screen.queryByText(emptyMessage)).toBeNull()
})

it('preserva a oferta e o avanço quando o backend retorna um plano selecionável', async () => {
  respondOffers(Promise.resolve({ status: 200, body: { offers: [{ code: 'HOME', name: 'Toda a comunidade', featured: true, surfaces: ['HOME'], prices: [{ durationDays: 28, amountCents: 8400 }] }] } }))
  render(<Page />)
  expect((await screen.findByRole('radio', { name: 'Toda a comunidade' }) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('button', { name: /Comprar por/ }) as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByText(emptyMessage)).toBeNull()
})

const launch = { id: 'launch-1', linkId: 'visual-link', linkName: 'Comunidade de tecnologia', discountPercent: 20, expiresAt: '2099-11-03T18:00:00Z', dismissed: false }
function launchCatalog(home = true) {
  return { launchOffer: launch, offers: [
    { code: 'SEARCH_NICHE', name: 'Busca e nicho', featured: true, surfaces: ['SEARCH', 'NICHE'], prices: [{ durationDays: 7, amountCents: 1432, referenceAmountCents: 1790 }] },
    ...(home ? [{ code: 'SEARCH_NICHE_HOME', name: 'Completo', featured: false, surfaces: ['SEARCH', 'NICHE', 'HOME'], prices: [{ durationDays: 7, amountCents: 2632, referenceAmountCents: 3290 }] }] : []),
  ] }
}

it('mostra os termos do desconto recebido do servidor e começa em sete dias', async () => {
  respondOffers(Promise.resolve({ status: 200, body: launchCatalog() }))
  render(<Page />)
  expect(await screen.findByText('20% OFF')).not.toBeNull()
  expect(mocks.api).toHaveBeenCalledWith('/v1/promotions/offers?linkId=visual-link')
  expect((screen.getByRole('radio', { name: '7 dias' }) as HTMLInputElement).checked).toBe(true)
  const summary = screen.getByRole('region', { name: 'Resumo do destaque' })
  expect(summary.textContent).toContain('14,32')
  expect(summary.textContent).toContain('17,90')
  expect(summary.textContent).toContain('3,58')
})

it('seleciona Home ao tocar o texto do card, atualiza o total e envia um único pacote com a oferta', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve(path.startsWith('/v1/promotions/offers')
    ? { status: 200, body: launchCatalog() }
    : path === '/v1/promotions/checkout'
      ? { status: 200, body: { orderId: 'paid-order', amountCents: 2632, brCode: 'pix-code' } }
      : { status: 200, body: { orders: [] } }))
  render(<Page />)
  const checkbox = await screen.findByRole('checkbox', { name: 'Adicionar a Home ao destaque' }) as HTMLInputElement
  expect(checkbox.checked).toBe(false)
  const summary = screen.getByRole('region', { name: 'Resumo do destaque' })
  const upgrade = checkbox.closest('label')!
  expect(upgrade.parentElement).toBe(summary)
  expect(screen.getByRole('radio', {name: 'Pix'})).not.toBeNull()
  fireEvent.click(screen.getByText('Seu link também na página inicial, pelos mesmos 7 dias.'))
  expect((screen.getByRole('checkbox', { name: 'Adicionar a Home ao destaque' }) as HTMLInputElement).checked).toBe(true)
  expect(summary.textContent).toContain('Completo')
  expect(summary.textContent).toContain('26,32')
  expect(summary.textContent).toContain('Home adicionada')
  fireEvent.click(screen.getByRole('button', { name: /Comprar por/ }))
  await screen.findByLabelText('Pix copia e cola')
  const call = mocks.api.mock.calls.find(([path]) => path === '/v1/promotions/checkout')!
  expect(JSON.parse(call[1].body)).toMatchObject({ launchOfferId: 'launch-1', surfaces: ['SEARCH', 'NICHE', 'HOME'], durationDays: 7 })
})

it('não oferece Home quando o servidor não retorna o pacote Completo', async () => {
  respondOffers(Promise.resolve({ status: 200, body: launchCatalog(false) }))
  render(<Page />)
  await screen.findByText('20% OFF')
  expect(screen.queryByRole('checkbox', { name: 'Adicionar a Home ao destaque' })).toBeNull()
  expect(screen.queryByRole('radio', { name: 'Completo', hidden: true })).toBeNull()
  expect(screen.queryByRole('radio', { name: 'Home', hidden: true })).toBeNull()
})

it('retira o desconto após expirar e recarrega os preços antes de permitir pagamento', async () => {
  vi.useFakeTimers()
  let reads = 0
  mocks.api.mockImplementation((path: string) => {
    if (!path.startsWith('/v1/promotions/offers')) return Promise.resolve({ status: 200, body: { orders: [] } })
    reads += 1
    const catalog = launchCatalog(false)
    return Promise.resolve({ status: 200, body: reads === 1
      ? { ...catalog, launchOffer: { ...launch, expiresAt: new Date(Date.now() + 1000).toISOString() } }
      : { offers: [{ ...catalog.offers[0], prices: [{ durationDays: 7, amountCents: 1790 }] }] } })
  })
  await act(async () => { render(<Page />) })
  expect(screen.getByText('20% OFF')).not.toBeNull()
  await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
  expect(reads).toBe(2)
  expect(screen.queryByText('20% OFF')).toBeNull()
  expect(screen.getByRole('region', { name: 'Resumo do destaque' }).textContent).toContain('17,90')
  expect(screen.getByRole('alert').textContent).toContain('A oferta encerrou')
})

it('consulta o pagamento novamente antes do vencimento do Pix e aguarda confirmação do servidor', async () => {
  let checks = 0
  mocks.api.mockImplementation((path: string) => {
    const body = path.startsWith('/v1/promotions/offers') ? launchCatalog(false)
      : path === '/v1/promotions/checkout' ? { orderId: 'poll-order', amountCents: 1432, brCode: 'pix-code' }
      : path === '/v1/orders/poll-order' ? { id: 'poll-order', linkId: 'visual-link', status: ++checks === 1 ? 'PENDING_PAYMENT' : 'PAID', amountCents: 1432, brCode: 'pix-code', pixExpiresAt: new Date(Date.now() + 900000).toISOString() }
      : { orders: [] }
    return Promise.resolve({ status: 200, body })
  })
  render(<Page />)
  await screen.findByText('20% OFF')
  vi.useFakeTimers()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Comprar por/ })) })
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(checks).toBe(1)
  expect(screen.queryByText('Pagamento confirmado')).toBeNull()
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(checks).toBe(2)
  expect(screen.getByText('Pagamento confirmado')).not.toBeNull()
  expect(screen.queryByText('Oferta por tempo limitado')).toBeNull()
  expect(screen.queryByText('Destaque seu link com 20% OFF')).toBeNull()
  expect(screen.queryByText('Escolha os espaços patrocinados e revise o valor antes de pagar.')).toBeNull()
})

it('pagamento atrasado no modal informa recebimento e leva aos pedidos sem prometer destaque', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve({ status: 200, body:
    path === '/v1/promotions/launch-offer' ? { offer: launch }
      : path.startsWith('/v1/promotions/offers') ? launchCatalog()
      : path === '/v1/promotions/checkout' ? { orderId: 'late-modal', amountCents: 1432, brCode: 'late-pix' }
      : path === '/v1/orders/late-modal' ? { id: 'late-modal', linkId: 'visual-link', status: 'PAID_LATE', amountCents: 1432 }
      : { orders: [] },
  }))
  render(<Page />)
  await screen.findByText('20% OFF')
  fireEvent.click(screen.getByRole('button', { name: 'Voltar para Meus links' }))
  const dialog = await screen.findByRole('dialog', { name: 'Seu destaque com 20% OFF' })
  fireEvent.click(within(dialog).getByRole('button', { name: /Comprar por/ }))
  const received = await screen.findByRole('dialog', { name: 'Pagamento recebido' })
  expect(within(received).getByText('Pagamento recebido após o prazo')).not.toBeNull()
  expect(within(received).queryByText('Compra concluída')).toBeNull()
  expect(within(received).queryByRole('timer')).toBeNull()
  fireEvent.click(within(received).getByRole('button', { name: 'Ver meus pedidos' }))
  expect(mocks.push).toHaveBeenCalledWith('/painel/pedidos')
})

it('preserva a renovação sem usar a campanha de um cadastro', async () => {
  mocks.search = 'renew=HOME'
  respondOffers(Promise.resolve({ status: 200, body: { launchOffer: launch, offers: [{ code: 'HOME', name: 'Home', featured: true, surfaces: ['HOME'], prices: [{ durationDays: 28, amountCents: 4990 }] }] } }))
  render(<Page />)
  await screen.findByRole('radio', { name: 'Home' })
  expect(mocks.api).toHaveBeenCalledWith('/v1/promotions/offers?linkId=visual-link&renewal=1')
  expect(screen.queryByText('20% OFF')).toBeNull()
  expect((screen.getByRole('radio', { name: '28 dias' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Adicionar a Home ao destaque' })).toBeNull()
})

it('preserva a seleção quando a criação do pagamento falha e permite tentar novamente', async () => {
  mocks.api.mockImplementation((path: string) => path === '/v1/promotions/checkout'
    ? Promise.reject(new Error('offline'))
    : Promise.resolve({ status: 200, body: path.startsWith('/v1/promotions/offers') ? launchCatalog() : { orders: [] } }))
  render(<Page />)
  const home = await screen.findByRole('checkbox', { name: 'Adicionar a Home ao destaque' })
  fireEvent.click(home.closest('label')!)
  fireEvent.click(screen.getByRole('button', { name: /Comprar por/ }))
  expect((await screen.findByRole('alert')).textContent).toContain('Sua seleção foi mantida')
  expect((screen.getByRole('checkbox', { name: 'Adicionar a Home ao destaque' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.getByRole('region', { name: 'Resumo do destaque' }).textContent).toContain('Completo')
  expect((screen.getByRole('button', { name: /Comprar por/ }) as HTMLButtonElement).disabled).toBe(false)
})

it('retoma a cobrança de cartão no método original e não apresenta um Pix ao reabrir', async () => {
  const pending = { id: 'pending-card', linkId: 'visual-link', status: 'PENDING_PAYMENT', method: 'CARD', productCode: 'HOME', durationDays: 14, amountCents: 3490 }
  mocks.api.mockImplementation((path: string) => Promise.resolve({ status: 200, body:
    path.startsWith('/v1/promotions/offers') ? { cardEnabled: true, publishableKey: 'pk_test_example', offers: [{ code: 'HOME', name: 'Home', featured: true, surfaces: ['HOME'], prices: [{ durationDays: 14, amountCents: 3490 }] }] }
    : path === '/v1/orders/mine' ? { orders: [pending] }
    : path === '/v1/orders/pending-card/resume' ? { orderId: 'pending-card', amountCents: 3490, clientSecret: 'same-card-secret' }
    : pending }))
  render(<Page />)
  await screen.findByRole('button', { name: /Comprar por/ })
  expect((screen.getByRole('radio', { name: 'Cartão' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByText('Gerando cobrança Pix')).toBeNull()
  expect(screen.getByRole('region', { name: 'Resumo do destaque' }).textContent).toContain('14 dias')
  await waitFor(() => expect((screen.getByRole('button', {name: /Comprar por/}) as HTMLButtonElement).disabled).toBe(false))
  await act(async () => { fireEvent.submit(screen.getByRole('button', {name: /Comprar por/}).closest('form')!) })
  expect(mocks.api).toHaveBeenCalledWith('/v1/orders/pending-card/resume', expect.objectContaining({ method: 'POST', body: undefined }))
  expect(mocks.api.mock.calls.some(([path]) => path === '/v1/promotions/checkout')).toBe(false)
  expect(screen.queryByLabelText('Pix copia e cola')).toBeNull()
})

it('não troca plano ou duração de uma cobrança pendente ao voltar para as opções', async () => {
  const pending = { id: 'pending-card', linkId: 'visual-link', status: 'PENDING_PAYMENT', method: 'CARD', productCode: 'SEARCH_NICHE', durationDays: 7, amountCents: 1432 }
  mocks.api.mockImplementation((path: string) => Promise.resolve({ status: 200, body: path.startsWith('/v1/promotions/offers') ? { ...launchCatalog(), cardEnabled: true, publishableKey: 'pk_test_example' } : path === '/v1/orders/mine' ? { orders: [pending] } : pending }))
  render(<Page />)
  await screen.findByRole('button', { name: /Comprar por/ })
  await waitFor(() => expect((screen.getByRole('radio', { name: '28 dias' }) as HTMLInputElement).disabled).toBe(true))
  expect((screen.getByRole('radio', { name: 'Completo' }) as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByRole('radio', { name: '7 dias' }) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('radio', { name: 'Busca e nicho' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Adicionar a Home ao destaque' })).toBeNull()
  expect(screen.getByRole('region', { name: 'Resumo do destaque' }).textContent).toContain('14,32')
})

it.each([
  ['SEARCH', 'Adicionar Nicho + Home ao destaque', '20,00'],
  ['NICHE', 'Adicionar Busca + Home ao destaque', '16,80'],
  ['HOME', 'Adicionar Busca + Nicho ao destaque', '10,40'],
  ['SEARCH_NICHE', 'Adicionar a Home ao destaque', '12,00'],
])('seleção %s oferece só os espaços que faltam e remove o complemento ao completar', async (code, label, extra) => {
  mocks.search = `plan=${code}`
  const catalog = { ...launchCatalog(), offers: [
    { code: 'SEARCH', name: 'Busca', featured: false, surfaces: ['SEARCH'], prices: [{ durationDays: 7, amountCents: 632 }] },
    { code: 'NICHE', name: 'Nicho', featured: false, surfaces: ['NICHE'], prices: [{ durationDays: 7, amountCents: 952 }] },
    { code: 'HOME', name: 'Home', featured: false, surfaces: ['HOME'], prices: [{ durationDays: 7, amountCents: 1592 }] },
    ...launchCatalog().offers,
  ] }
  respondOffers(Promise.resolve({ status: 200, body: catalog }))
  render(<Page />)
  const checkbox = await screen.findByRole('checkbox', { name: label })
  const summary = screen.getByRole('region', { name: 'Resumo do destaque' })
  expect(summary.textContent).toContain(extra)
  fireEvent.click(checkbox.closest('label')!)
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  expect(summary.textContent).toContain('Completo')
  expect(summary.textContent).toContain('26,32')
})

it('Completo selecionado diretamente não apresenta nenhum complemento', async () => {
  mocks.search = 'plan=SEARCH_NICHE_HOME'
  respondOffers(Promise.resolve({ status: 200, body: launchCatalog() }))
  render(<Page />)
  await screen.findByText('20% OFF')
  expect(screen.queryByRole('checkbox')).toBeNull()
})


it('remove Home sem perder o plano base e permite recomprar na mesma página', async () => {
  respondOffers(Promise.resolve({ status: 200, body: launchCatalog() }))
  render(<Page />)
  const checkbox = await screen.findByRole('checkbox', { name: 'Adicionar a Home ao destaque' }) as HTMLInputElement
  fireEvent.click(checkbox)
  expect(checkbox.checked).toBe(true)
  fireEvent.click(checkbox)
  expect(checkbox.checked).toBe(false)
  expect(screen.getByRole('region', {name: 'Resumo do destaque'}).textContent).toContain('Busca e nicho')
  expect(screen.getByRole('button', {name: /Comprar por R\$ 14,32/})).not.toBeNull()
})


it('pós-cadastro prepara a campanha na página, compra com Pix e sai sem segunda oferta', async () => {
  const leave = vi.fn()
  mocks.api.mockImplementation((path: string) => Promise.resolve({status: 200, body: path === '/v1/promotions/launch-offer' ? {offer: launch} : path.startsWith('/v1/promotions/offers') ? launchCatalog() : {orders: []}}))
  render(<PromotionPurchase linkId="visual-link" mode="post-create" onLeave={leave} />)
  await screen.findByRole('heading', {name: 'Destaque seu link com 20% OFF'})
  expect(screen.queryByRole('dialog')).toBeNull()
  expect((screen.getByRole('radio', {name: 'Pix'}) as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: 'Agora não'}))
  await waitFor(() => expect(leave).toHaveBeenCalledOnce())
  expect(mocks.api).toHaveBeenCalledWith('/v1/promotions/launch-offer', expect.objectContaining({body: JSON.stringify({linkId: 'visual-link', source: 'post_create', productCode: 'SEARCH_NICHE', durationDays: 7})}))
})

it('prepara a oferta de saída com a escolha atual, compra no dialog e não abre outra rota', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve({status: 200, body: path === '/v1/promotions/launch-offer' ? {offer: launch} : path.startsWith('/v1/promotions/offers') ? launchCatalog() : path === '/v1/promotions/checkout' ? {orderId: 'exit-order', amountCents: 1432, brCode: 'exit-pix'} : {orders: []}}))
  render(<Page />)
  await screen.findByText('20% OFF')
  fireEvent.click(screen.getByRole('button', {name: 'Voltar para Meus links'}))
  const dialog = await screen.findByRole('dialog', {name: 'Seu destaque com 20% OFF'})
  expect(within(dialog).queryByRole('checkbox')).toBeNull()
  expect(within(dialog).queryByRole('heading', {name: 'Resumo do destaque'})).toBeNull()
  expect(mocks.api).toHaveBeenCalledWith('/v1/promotions/launch-offer', expect.objectContaining({body: JSON.stringify({linkId: 'visual-link', source: 'exit', productCode: 'SEARCH_NICHE', durationDays: 7})}))
  fireEvent.click(within(dialog).getByRole('button', {name: /Comprar por/}))
  expect(await within(dialog).findByLabelText('Pix copia e cola')).not.toBeNull()
  expect(mocks.push).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', {name: 'Sair sem destacar'}))
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/painel/links'))
})

it('fechar a saída não repete a intervenção e respeita links modificados e hashes', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve({status: 200, body: path === '/v1/promotions/launch-offer' ? {offer: launch} : path.startsWith('/v1/promotions/offers') ? launchCatalog() : {orders: []}}))
  render(<><Page /><a href="/painel" onClick={event => { if (event.ctrlKey) event.preventDefault() }}>Painel interno</a><a href="#resumo">Âncora local</a></>)
  await screen.findByText('20% OFF')
  fireEvent.click(screen.getByText('Painel interno'), {ctrlKey: true})
  fireEvent.click(screen.getByText('Âncora local'))
  expect(mocks.api.mock.calls.some(([path]) => path === '/v1/promotions/launch-offer')).toBe(false)
  fireEvent.click(screen.getByText('Painel interno'))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).queryByRole('button', {name: 'Fechar janela'})).toBeNull()
  fireEvent.keyDown(dialog, {key: 'Escape'})
  fireEvent.click(dialog)
  expect(screen.getByRole('dialog')).not.toBeNull()
  fireEvent.click(within(dialog).getByRole('button', {name: 'Sair sem destacar'}))
  fireEvent.click(screen.getByRole('button', {name: 'Voltar para Meus links'}))
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/painel/links'))
  expect(mocks.api.mock.calls.filter(([path]) => path === '/v1/promotions/launch-offer')).toHaveLength(1)
})

it('cartão coleta campos antes de criar pedido e confirma com o segredo retornado', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve({status: 200, body: path.startsWith('/v1/promotions/offers') ? {...launchCatalog(), cardEnabled: true, publishableKey: 'pk_test_example'} : path === '/v1/promotions/checkout' ? {orderId: 'card-inline', amountCents: 1432, clientSecret: 'secret-inline'} : {orders: []}}))
  render(<Page />)
  await screen.findByText('20% OFF')
  fireEvent.click(screen.getByRole('radio', {name: 'Cartão'}))
  expect(screen.getByText('Campos seguros do cartão')).not.toBeNull()
  expect(mocks.api.mock.calls.some(([path]) => path === '/v1/promotions/checkout')).toBe(false)
  await act(async () => { fireEvent.submit(screen.getByRole('button', {name: /Comprar por/}).closest('form')!) })
  expect(mocks.submit).toHaveBeenCalledOnce()
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({clientSecret: 'secret-inline', redirect: 'if_required'}))
  expect(screen.getByText('Confirmando seu pagamento')).not.toBeNull()
  expect(screen.queryByText('Pagamento confirmado')).toBeNull()
})


it('preserva plano e duração recuperados sem emitir nova campanha ao abrir', async () => {
  mocks.search = 'launch=1&plan=SEARCH_NICHE_HOME&duration=14'
  const catalog = launchCatalog()
  catalog.offers.forEach(offer => offer.prices.push({...offer.prices[0], durationDays: 14}))
  respondOffers(Promise.resolve({status: 200, body: catalog}))
  render(<Page />)
  await screen.findByText('20% OFF')
  expect((screen.getByRole('radio', {name: '14 dias'}) as HTMLInputElement).checked).toBe(true)
  expect(screen.getByRole('region', {name: 'Resumo do destaque'}).textContent).toContain('Completo')
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(mocks.api.mock.calls.some(([path]) => path === '/v1/promotions/launch-offer')).toBe(false)
})

it('sai sem anunciar desconto quando servidor não emite campanha', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve({status: 200, body: path.startsWith('/v1/promotions/offers') ? {offers: launchCatalog().offers} : path === '/v1/promotions/launch-offer' ? {offer: null} : {orders: []}}))
  render(<Page />)
  await screen.findByRole('radio', {name: 'Busca e nicho'})
  fireEvent.click(screen.getByRole('button', {name: 'Voltar para Meus links'}))
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/painel/links'))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('falha de validação do cartão não cria cobrança', async () => {
  mocks.submit.mockResolvedValue({error: {message: 'Confira o número do cartão'}})
  respondOffers(Promise.resolve({status: 200, body: {...launchCatalog(), cardEnabled: true, publishableKey: 'pk_test_example'}}))
  render(<Page />)
  await screen.findByText('20% OFF')
  fireEvent.click(screen.getByRole('radio', {name: 'Cartão'}))
  await act(async () => { fireEvent.submit(screen.getByRole('button', {name: /Comprar por/}).closest('form')!) })
  expect(screen.getByRole('alert').textContent).toContain('Confira o número')
  expect(mocks.api.mock.calls.some(([path]) => path === '/v1/promotions/checkout')).toBe(false)
})


it('trava seleção e chamadas duplicadas enquanto cria o pagamento', async () => {
  let finish: ((value: unknown) => void) | undefined
  mocks.api.mockImplementation((path: string) => path === '/v1/promotions/checkout' ? new Promise(resolve => { finish = resolve }) : Promise.resolve({status: 200, body: path.startsWith('/v1/promotions/offers') ? {...launchCatalog(), cardEnabled: true, publishableKey: 'pk_test_example'} : {orders: []}}))
  render(<Page />)
  await screen.findByText('20% OFF')
  const buy = screen.getByRole('button', {name: /Comprar por/})
  fireEvent.click(buy)
  fireEvent.click(buy)
  expect(mocks.api.mock.calls.filter(([path]) => path === '/v1/promotions/checkout')).toHaveLength(1)
  for (const radio of screen.getAllByRole('radio', {hidden: true})) expect((radio as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
  await act(async () => finish?.({status: 200, body: {orderId: 'locked-pix', amountCents: 1432, brCode: 'pix'}}))
  expect(await screen.findByLabelText('Pix copia e cola')).not.toBeNull()
})

it('novo valor do servidor pede outra confirmação antes de confirmar cartão no mesmo pedido', async () => {
  mocks.api.mockImplementation((path: string) => Promise.resolve({status: 200, body: path.startsWith('/v1/promotions/offers') ? {...launchCatalog(), cardEnabled: true, publishableKey: 'pk_test_example'} : path === '/v1/promotions/checkout' || path === '/v1/orders/updated-card/resume' ? {orderId: 'updated-card', amountCents: 1790, clientSecret: 'updated-secret'} : path === '/v1/orders/updated-card' ? {id: 'updated-card', status: 'PENDING_PAYMENT', method: 'CARD', amountCents: 1790} : {orders: []}}))
  render(<Page />)
  await screen.findByText('20% OFF')
  fireEvent.click(screen.getByRole('radio', {name: 'Cartão'}))
  await act(async () => { fireEvent.submit(screen.getByRole('button', {name: /Comprar por/}).closest('form')!) })
  expect(mocks.confirm).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('O valor atualizado é R$ 17,90')
  await act(async () => { fireEvent.submit(screen.getByRole('button', {name: /Comprar por R\$ 17,90/}).closest('form')!) })
  expect(mocks.api).toHaveBeenCalledWith('/v1/orders/updated-card/resume', expect.objectContaining({body: undefined}))
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({clientSecret: 'updated-secret'}))
  expect(mocks.api.mock.calls.filter(([path]) => path === '/v1/promotions/checkout')).toHaveLength(1)
})


it.each(['success', 'failure'])('aguarda persistir a seleção ao dispensar e permite sair após %s', async result => {
  const leave = vi.fn()
  let settle: (() => void) | undefined
  let claims = 0
  mocks.api.mockImplementation((path: string) => {
    if (path === '/v1/promotions/launch-offer' && ++claims > 1) return new Promise((resolve, reject) => { settle = () => result === 'success' ? resolve({status: 200, body: {offer: launch}}) : reject(new Error('offline')) })
    return Promise.resolve({status: 200, body: path === '/v1/promotions/launch-offer' ? {offer: launch} : path.startsWith('/v1/promotions/offers') ? launchCatalog() : {orders: []}})
  })
  render(<PromotionPurchase linkId="visual-link" mode="post-create" onLeave={leave} />)
  fireEvent.click(await screen.findByRole('checkbox', {name: 'Adicionar a Home ao destaque'}))
  const decline = screen.getByRole('button', {name: 'Agora não'}) as HTMLButtonElement
  fireEvent.click(decline)
  expect(leave).not.toHaveBeenCalled()
  expect(decline.disabled).toBe(true)
  const buy = screen.getByRole('button', {name: /Comprar por/}) as HTMLButtonElement
  expect(buy.disabled).toBe(true)
  fireEvent.click(buy)
  expect(mocks.api.mock.calls.some(([path]) => path === '/v1/promotions/checkout')).toBe(false)
  expect(mocks.api).toHaveBeenCalledWith('/v1/promotions/launch-offer', expect.objectContaining({signal: expect.any(AbortSignal), body: JSON.stringify({linkId: 'visual-link', source: 'post_create', productCode: 'SEARCH_NICHE_HOME', durationDays: 7})}))
  await act(async () => settle?.())
  expect(leave).toHaveBeenCalledOnce()
})


it('não dispensa a oferta enquanto a cobrança está sendo criada', async () => {
  const leave = vi.fn()
  let finish: (() => void) | undefined
  mocks.api.mockImplementation((path: string) => {
    if (path === '/v1/promotions/checkout') return new Promise(resolve => { finish = () => resolve({status: 200, body: {orderId: 'mutual-lock', amountCents: 1432, brCode: 'pix-lock'}}) })
    return Promise.resolve({status: 200, body: path === '/v1/promotions/launch-offer' ? {offer: launch} : path.startsWith('/v1/promotions/offers') ? launchCatalog() : {orders: []}})
  })
  render(<PromotionPurchase linkId="visual-link" mode="post-create" onLeave={leave} />)
  await screen.findByRole('heading', {name: 'Destaque seu link com 20% OFF'})
  fireEvent.click(screen.getByRole('button', {name: /Comprar por/}))
  const decline = screen.getByRole('button', {name: 'Agora não'}) as HTMLButtonElement
  expect(decline.disabled).toBe(true)
  fireEvent.click(decline)
  expect(leave).not.toHaveBeenCalled()
  await act(async () => finish?.())
  expect(await screen.findByLabelText('Pix copia e cola')).not.toBeNull()
  expect(leave).not.toHaveBeenCalled()
})

it('não retém a saída quando a persistência excede o prazo de três segundos', async () => {
  const leave = vi.fn()
  const abort = new AbortController()
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(abort.signal)
  let claims = 0
  mocks.api.mockImplementation((path: string) => {
    if (path === '/v1/promotions/launch-offer' && ++claims > 1) return new Promise(() => {})
    return Promise.resolve({status: 200, body: path === '/v1/promotions/launch-offer' ? {offer: launch} : path.startsWith('/v1/promotions/offers') ? launchCatalog() : {orders: []}})
  })
  try {
    render(<PromotionPurchase linkId="visual-link" mode="post-create" onLeave={leave} />)
    await screen.findByRole('heading', {name: 'Destaque seu link com 20% OFF'})
    fireEvent.click(screen.getByRole('button', {name: 'Agora não'}))
    expect(timeout).toHaveBeenCalledWith(3000)
    expect(leave).not.toHaveBeenCalled()
    await act(async () => abort.abort(new Error('timeout')))
    expect(leave).toHaveBeenCalledOnce()
  } finally { timeout.mockRestore() }
})
