import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { DiscoveryPanel } from './discovery-panel'
import { ProductImage } from './product-image'
import type { DiscoveryState } from './contracts'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('./day-planner',()=>({DayPlanner:()=>null}))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })
const initial: DiscoveryState = { enabled: true, usesSegmentName: true, terms: ['Natal'], products: [], counts: null, checkedAt: null, nextRunAt: null, status: 'QUEUED', error: null }
const product = { id: 'MLB123', title: 'Produto conferido', priceCents: 12990, oldPriceCents: null, imageUrl: 'https://http2.mlstatic.com/fixture.jpg', checkedAt: '2026-10-28T12:00:00Z', productUrl: 'https://produto.mercadolivre.com.br/MLB-123' }
const ready: DiscoveryState = { ...initial, status: 'READY', checkedAt: '2026-10-28T12:00:00Z', products: [product] }
const props = { segmentId: 'natal', contextName: 'Natal', busy: false, canGenerate: true, prepare: vi.fn() }
it('mantém produto enviado visível e permite nova revisão depois de concluir as pendências',async()=>{
  vi.mocked(api).mockResolvedValue({status:200,body:{...ready,products:[{...product,decision:'SENT',sentCount:3,pendingCount:0}]}})
  render(<DiscoveryPanel {...props}/>)
  expect(await screen.findByRole('heading',{name:product.title})).toBeTruthy()
  expect(screen.getByText('Enviado 3 vezes')).toBeTruthy()
  expect(screen.getByRole('button',{name:'Revisar e enviar'}).hasAttribute('disabled')).toBe(false)
})
it('consulta as duas fontes sem seletor e libera a revisão Shopee com credenciais próprias', async () => {
  vi.mocked(api).mockResolvedValue({status:200,body:{...ready,products:[{...product,id:'SHP123_456',productUrl:'https://shopee.com.br/product/123/456'}]}})
  render(<DiscoveryPanel {...props} canGenerate={false} canGenerateShopee />)
  const review = await screen.findByRole('button',{name:'Revisar e enviar'})
  expect(review.hasAttribute('disabled')).toBe(false)
  expect(screen.getByRole('link',{name:/Ver na Shopee/})).toBeTruthy()
  expect(screen.queryByRole('combobox')).toBeNull()
  fireEvent.click(screen.getByRole('tab',{name:'Configurações'}))
  expect(screen.queryByRole('combobox',{name:'Fonte dos produtos'})).toBeNull()
  expect(screen.getByText(/Shopee e Mercado Livre são consultados juntos/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Salvar termos'}))
  await waitFor(()=>expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery/config',expect.objectContaining({method:'POST',body:JSON.stringify({enabled:true,terms:['Natal']})})))
  expect(screen.queryByRole('combobox',{name:/termo/i})).toBeNull()
})

it('mantém avaliações automáticas antigas em Produtos e reserva Descartados às decisões do administrador',async()=>{
 const automatic={...product,evaluation:{status:'DISCARDED',rulesVersion:'v1',reasons:[],reportedDiscountPercent:null,history:{days:0,medianPriceCents:null,dropPercent:null,verified:false,windowDays:30},reputation:{level:'2_orange',status:'POOR'}}}
 vi.mocked(api).mockImplementation(async path=>({status:200,body:{...ready,products:path.includes('view=DISCARDED')?[{...automatic,id:'MLB456',title:'Descartado manualmente',decision:'DISCARDED'}]:[automatic]}}))
 render(<DiscoveryPanel {...props}/>);await screen.findByText(product.title)
 expect(screen.getByText('Conferir antes de enviar')).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/^Descartados$/}))
 await screen.findByText('Descartado manualmente');expect(screen.queryByText(product.title)).toBeNull()
})

it('continua acompanhando a coleta enquanto novos termos são concluídos',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
 vi.mocked(api).mockImplementation(async()=>({status:200,body:{...ready,status:'QUEUED',pageStatus:'READY',checkedAt:new Date().toISOString()}}))
 render(<DiscoveryPanel {...props}/>);await act(async()=>{})
 await act(async()=>{await vi.advanceTimersByTimeAsync(189000)})
 expect(screen.queryByText(/A conferência foi interrompida/)).toBeNull()
 expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='GET').length).toBeGreaterThan(61)
})

it('limita a conferência quando a coleta não apresenta progresso',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
 vi.mocked(api).mockResolvedValue({status:200,body:{...ready,status:'QUEUED',pageStatus:'READY'}})
 render(<DiscoveryPanel {...props}/>);await act(async()=>{})
 await act(async()=>{await vi.advanceTimersByTimeAsync(189000)})
 expect(screen.getByText(/A conferência foi interrompida/)).toBeTruthy()
 const calls=vi.mocked(api).mock.calls.length
 await act(async()=>{await vi.advanceTimersByTimeAsync(6000)})
 expect(vi.mocked(api).mock.calls).toHaveLength(calls)
})

it('abre produtos válidos em revisão por padrão e mantém a página visível enquanto busca a seguinte', async () => {
  let finish!: (value: Awaited<ReturnType<typeof api>>) => void
  vi.mocked(api).mockImplementation(async path => path.includes('page=2') ? new Promise(resolve=>{finish=resolve}) : {status:200,body:{...ready,pagination:{term:'Natal',page:1,pageSize:20,total:40,hasPrevious:false,hasNext:true},products:[{...product,evaluation:{status:'REVIEW',reasons:[],rulesVersion:'v1',reportedDiscountPercent:null,history:{days:0,windowDays:30,verified:false,medianPriceCents:null,dropPercent:null},reputation:{level:null,status:'UNKNOWN'}}}]}})
  render(<DiscoveryPanel {...props} />)
  await screen.findByText('Produto conferido')
  expect(screen.getByRole('tab',{name:'Produtos'}).getAttribute('aria-selected')).toBe('true')
  expect(screen.queryByRole('button',{name:'Forçar atualização'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}))
  await screen.findByText('Atualizando produtos…')
  expect(screen.getByText('Produto conferido')).toBeTruthy()
  expect(screen.getByRole('button',{name:'Revisar e enviar'}).hasAttribute('disabled')).toBe(true)
  await act(async()=>{finish({status:200,body:{...ready,products:[{...product,id:'MLB124',title:'Próximo produto'}]}})})
  expect(await screen.findByText('Próximo produto')).toBeTruthy()
})

it('inicia coleta sem digitar busca e mantém cache durante atualização sem gerar links', async () => {
  vi.useFakeTimers(); let queued=false
  vi.mocked(api).mockImplementation(async (_path, options) => {if(options?.method==='POST')queued=true;return {status:200,body:queued?{...ready,status:'RUNNING'}:initial}})
  render(<DiscoveryPanel {...props} />)
  await act(async()=>{});await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
  expect(screen.getByText('Produto conferido')).toBeTruthy()
  expect(screen.getByText('Buscando sugestões em segundo plano…')).toBeTruthy()
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery/refresh', expect.objectContaining({ method: 'POST', body: '{}' }))
  expect(props.prepare).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Revisar e enviar' })).toBeTruthy()
})

it('consulta novamente a cada três segundos e interrompe ao desmontar', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValue({ status: 200, body: { ...ready, status: 'RUNNING' } })
  const view = render(<DiscoveryPanel {...props} />)
  await act(async () => {})
  expect(api).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(api).toHaveBeenCalledTimes(2)
  const signal = vi.mocked(api).mock.calls[0][1]?.signal
  view.unmount()
  expect(signal?.aborted).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
  expect(api).toHaveBeenCalledTimes(2)
})

it('ignora resposta antiga ao trocar segmentação', async () => {
  let finish!: (value: Awaited<ReturnType<typeof api>>) => void
  vi.mocked(api).mockImplementation(async path => path.includes('/natal/') ? new Promise(resolve => { finish = resolve }) : { status: 200, body: { ...ready, products: [] } })
  const view = render(<DiscoveryPanel {...props} />)
  view.rerender(<DiscoveryPanel {...props} segmentId="verao" contextName="Verão" />)
  await screen.findByText('Nenhum produto por aqui. Aguarde a próxima coleta.')
  await act(async () => { finish({ status: 200, body: ready }) })
  expect(screen.queryByText('Produto conferido')).toBeNull()
  expect(screen.getByRole('heading', { name: 'Sugestões para Verão' })).toBeTruthy()
})

it('preserva pausa, salva termos e exige ação para retomar', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { ...ready, enabled: false, status: 'PAUSED' } })
  render(<DiscoveryPanel {...props} />)
  await screen.findByText('Descoberta automática pausada.')
  expect(api).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  fireEvent.change(screen.getByLabelText('Termos de busca'), { target: { value: 'presentes, decoração' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar termos' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery/config', expect.objectContaining({ method: 'POST', body: JSON.stringify({ enabled: false, terms: ['presentes', 'decoração'] }) })))
})

it('mostra falha de coleta junto do cache e não apaga produtos válidos', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { ...ready, status: 'ERROR', error: 'Origem indisponível.' } })
  render(<DiscoveryPanel {...props} />)
  expect(await screen.findByText('Origem indisponível.')).toBeTruthy()
  expect(screen.getByText('Produto conferido')).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  expect(screen.getByRole('button', { name: 'Forçar atualização' }).hasAttribute('disabled')).toBe(false)
})

it('renderiza foto HTTPS e usa fallback quando ausente, insegura ou falha', () => {
  const view = render(<ProductImage src={product.imageUrl} title={product.title} />)
  const image = screen.getByRole('img', { name: product.title })
  expect(image.getAttribute('src')).toBe(product.imageUrl)
  expect(image.getAttribute('loading')).toBe('lazy')
  fireEvent.error(image)
  expect(screen.getByText('Imagem indisponível')).toBeTruthy()
  view.rerender(<ProductImage src="http://insecure.test/image" title={product.title} />)
  expect(screen.queryByRole('img')).toBeNull()
  view.rerender(<ProductImage src={null} title={product.title} />)
  expect(screen.getByText('Imagem indisponível')).toBeTruthy()
})


it('permite conferir por GET depois de uma falha no polling, preservando cache', async () => {
  vi.useFakeTimers()
  let checks = 0
  vi.mocked(api).mockImplementation(async () => ++checks === 2 ? { status: 503, body: { message: 'Consulta interrompida.' } } : { status: 200, body: { ...ready, status: 'RUNNING' } })
  render(<DiscoveryPanel {...props} />)
  await act(async () => {})
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(screen.getByText('Consulta interrompida.')).toBeTruthy()
  expect(screen.getByText('Produto conferido')).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir sugestões novamente' }))
  await act(async () => {})
  expect(api).toHaveBeenCalledTimes(3)
  expect(vi.mocked(api).mock.calls.every(call => call[1]?.method === 'GET')).toBe(true)
})

it('limita polling e permite conferir de novo sem solicitar outra coleta', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValue({ status: 200, body: { ...ready, status: 'RUNNING' } })
  render(<DiscoveryPanel {...props} />)
  await act(async () => { await vi.advanceTimersByTimeAsync(183000) })
  const count = vi.mocked(api).mock.calls.length
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  expect(screen.getByRole('button', { name: 'Conferir sugestões novamente' }).hasAttribute('disabled')).toBe(false)
  await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
  expect(api).toHaveBeenCalledTimes(count)
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir sugestões novamente' }))
  await act(async () => {})
  expect(api).toHaveBeenCalledTimes(count + 1)
  expect(vi.mocked(api).mock.calls.every(call => call[1]?.method === 'GET')).toBe(true)
})


it('permite recuperar conferência se salvar configuração falha durante coleta', async () => {
  vi.mocked(api).mockImplementation(async (_path, options) => options?.method === 'POST' ? { status: 503, body: { message: 'Configuração indisponível.' } } : { status: 200, body: { ...ready, status: 'RUNNING' } })
  render(<DiscoveryPanel {...props} />)
  await screen.findByText('Produto conferido')
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar termos' }))
  await screen.findByText('Configuração indisponível.')
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  expect(screen.getByRole('button', { name: 'Conferir sugestões novamente' }).hasAttribute('disabled')).toBe(false)
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  fireEvent.click(screen.getByRole('button', { name: 'Conferir sugestões novamente' }))
  await waitFor(() => expect(api).toHaveBeenCalledTimes(3))
  expect(vi.mocked(api).mock.calls[2][1]?.method).toBe('GET')
})


it('mantém termos implícitos ao pausar e retomar a descoberta', async () => {
  vi.mocked(api).mockResolvedValue({ status: 200, body: { ...ready, usesSegmentName: true } })
  render(<DiscoveryPanel {...props} />)
  await screen.findByText('Produto conferido')
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}))
  fireEvent.click(screen.getByRole('button', { name: 'Pausar descoberta automática' }))
  await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery/config', expect.objectContaining({ method: 'POST', body: JSON.stringify({ enabled: false, terms: [] }) })))
})


it('confere cache pronto a cada minuto para exibir novas coletas automáticas', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValue({ status: 200, body: ready })
  render(<DiscoveryPanel {...props} />)
  await act(async () => {})
  expect(api).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(59999) })
  expect(api).toHaveBeenCalledTimes(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(api).toHaveBeenCalledTimes(2)
  expect(vi.mocked(api).mock.calls.every(call => call[1]?.method === 'GET')).toBe(true)
})


it('pausa consultas com aba oculta e confere ao voltar', async () => {
  vi.useFakeTimers()
  const visibility = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.mocked(api).mockResolvedValue({ status: 200, body: ready })
  const view = render(<DiscoveryPanel {...props} />)
  await act(async () => {})
  visibility.mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  await act(async () => { await vi.advanceTimersByTimeAsync(120000) })
  expect(api).toHaveBeenCalledTimes(1)
  visibility.mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  await act(async () => {})
  expect(api).toHaveBeenCalledTimes(2)
  view.unmount(); visibility.mockRestore()
})

it('pagina lista combinada sem seletor nem coleta por termo e usa nextRunAt real', async () => {
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
  let sourcePage=1
  vi.mocked(api).mockImplementation(async (_path,options) => {
    if(options?.method==='GET')sourcePage=Number(new URL(_path,'http://local').searchParams.get('page')||1)
    return {status:200,body:{...ready,nextRunAt:'2026-10-28T12:15:00Z',cycleIntervalMs:900000,pagination:{term:'Natal',page:sourcePage,pageSize:20,total:120,hasPrevious:sourcePage>1,hasNext:true}}}
  })
  render(<DiscoveryPanel {...props}/>);await act(async()=>{})
  expect(screen.getByText('15:00')).toBeTruthy();await act(async()=>{await vi.advanceTimersByTimeAsync(1000)});expect(screen.getByText('14:59')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}));await act(async()=>{})
  expect(screen.getByText('Página 2 · 120 produtos')).toBeTruthy()
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery?mode=MIXED&view=ALL&page=2',expect.objectContaining({method:'GET'})); expect(screen.queryByRole('combobox')).toBeNull()
  fireEvent.click(screen.getByRole('tab',{name:'Configurações'}))
  fireEvent.click(screen.getByRole('button',{name:'Forçar atualização'}));await act(async()=>{})
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery/refresh',expect.objectContaining({body:JSON.stringify({force:true})}))
})
it('não trata desconto anunciado como histórico verificado e mostra reputação desconhecida',async()=>{
  vi.mocked(api).mockResolvedValue({status:200,body:{...ready,products:[{...product,evaluation:{status:'REVIEW',rulesVersion:'v1',reasons:['Histórico insuficiente.'],reportedDiscountPercent:20,history:{days:1,medianPriceCents:null,dropPercent:null,verified:false,windowDays:30},reputation:{level:null,status:'UNKNOWN'}}}],statusCounts:{SELECTED:0,REVIEW:1,DISCARDED:0}}})
  render(<DiscoveryPanel {...props}/>);await screen.findByText('Sugestões atualizadas.');await screen.findByText('Produto conferido')
  fireEvent.click(screen.getByText('Por que este produto?'))
  expect(screen.getByText(/Reputação do vendedor: não informada/)).toBeTruthy();expect(screen.getByText(/Histórico insuficiente para comprovar queda/)).toBeTruthy()
})

it('volta à primeira página da lista combinada depois de trocar a configuração',async()=>{
  vi.mocked(api).mockImplementation(async(path,options)=>({status:200,body:{...ready,terms:options?.method==='POST'&&path.endsWith('/config')?['Verão']:['Natal'],expandedTerms:['Natal','presentes'],pagination:{term:'Natal',page:path.includes('page=2')?2:1,pageSize:20,total:100,hasPrevious:true,hasNext:true}}}))
  render(<DiscoveryPanel {...props}/>);await screen.findByText('Produto conferido')
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}));await waitFor(()=>expect(api).toHaveBeenCalledWith(expect.stringContaining('page=2'),expect.anything()))
  fireEvent.click(screen.getByRole('tab', {name:'Configurações'}));fireEvent.change(screen.getByLabelText('Termos de busca'),{target:{value:'Verão'}});fireEvent.click(screen.getByRole('button',{name:'Salvar termos'}))
  await waitFor(()=>expect(vi.mocked(api).mock.calls.at(-1)?.[0]).toBe('/v1/admin/affiliates/segments/natal/discovery?mode=MIXED&view=ALL&page=1'))
})

it('coleta página fria de segmentação existente uma vez mesmo com checkedAt e READY',async()=>{
 vi.useFakeTimers()
 const cold={...ready,products:[],pageStatus:'NOT_COLLECTED',pagination:{term:'Natal',page:1,pageSize:20,total:0,hasPrevious:false,hasNext:false}}
 vi.mocked(api).mockResolvedValue({status:200,body:cold})
 render(<DiscoveryPanel {...props}/>);await act(async()=>{})
 expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal/discovery/refresh',expect.objectContaining({method:'POST',body:JSON.stringify({})}))
 expect(screen.getByText('As primeiras ofertas estão sendo coletadas. Aguarde a atualização.')).toBeTruthy()
 await act(async()=>{await vi.advanceTimersByTimeAsync(6000)})
 expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/discovery/refresh'))).toHaveLength(1)
 expect(vi.mocked(api).mock.calls.filter(([,options])=>options?.method==='GET')).toHaveLength(3)
 vi.mocked(api).mockResolvedValue({status:200,body:{...ready,pageStatus:'READY',pagination:cold.pagination}})
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000)})
 expect(screen.getByText('Produto conferido')).toBeTruthy()
 expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/discovery/refresh'))).toHaveLength(1)
})

it('mostra espera pelo agendador quando o horário da próxima coleta já chegou',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-28T12:16:00Z'))
 vi.mocked(api).mockResolvedValue({status:200,body:{...ready,nextRunAt:'2026-10-28T12:15:00Z'}})
 render(<DiscoveryPanel {...props}/>);await act(async()=>{})
 expect(screen.getByText('Aguardando próxima coleta')).toBeTruthy();expect(screen.queryByText('0:00',{exact:true})).toBeNull()
})
