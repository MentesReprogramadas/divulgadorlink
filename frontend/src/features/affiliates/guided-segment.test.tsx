import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { AffiliatesScreen } from './affiliates-screen'
import { SegmentWorkspace } from './segment-workspace'
import { OfferForm } from './affiliate-forms'
import type { AffiliateSnapshot } from './contracts'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
vi.mock('@/components/ui/responsive-tabs', () => ({ ResponsiveTabs: ({ items, onChange }: { items: Array<{id:string;label:string}>; onChange:(id:string)=>void }) => <nav>{items.map(item => <button key={item.id} type="button" onClick={() => onChange(item.id)}>{item.label}</button>)}</nav> }))
const account = { id:'account', name:'Principal', configured:true, enabled:true, ownerPhone:'5511999999999' }
const segment = { id:'natal', name:'Natal 2026', groupName:'Ofertas de Natal', slug:'natal', description:'Presentes', imageUrl:null, capacity:100, autoExpand:false, instanceId:'account', instanceIds:['account'], enabled:true, provisionState:'IDLE' }
function fixture():AffiliateSnapshot { return {segments:[segment],instances:[account],groups:[],offers:[],broadcasts:[],deliveries:[],summary:{segments:1,instances:1,groups:0,offers:0,pending:0,sent:0,uncertain:0,failed:0},readiness:{activeGroups:0,currentOffers:0,approvedDeliveries:0}} }
afterEach(()=>{cleanup();vi.clearAllMocks();window.history.replaceState(null,'','/')})

it('uma consulta antiga não troca uma conexão aberta por desconectada',async()=>{
  const data=fixture();let checks=0,completeOld!:(value:{status:number;body:{state:string}})=>void
  vi.mocked(api).mockImplementation(async(path='')=>{if(path.endsWith('/status')){if(++checks===1)return new Promise(resolve=>{completeOld=resolve});return{status:200,body:{state:'open'}}}return{status:200,body:data}})
  render(<AffiliatesScreen initialArea="instances"/>);await screen.findByRole('heading',{name:'Principal'})
  await waitFor(()=>expect(completeOld).toBeTypeOf('function'));fireEvent.click(screen.getByText('Mais opções',{exact:false}));fireEvent.click(screen.getByRole('button',{name:'Atualizar estado'}));await screen.findByText('Conectada',{exact:true})
  completeOld({status:200,body:{state:'close'}});await waitFor(()=>expect(screen.getByText('Conectada',{exact:true})).toBeTruthy());expect(screen.queryByRole('button',{name:'Conectar WhatsApp'})).toBeNull()
})

it('após criar a segmentação abre sua jornada, sem criar um grupo automaticamente',async()=>{
  const data=fixture(),all={...data,segments:[],summary:{...data.summary,segments:0}}
  vi.mocked(api).mockImplementation(async(path='',options)=>{
    if(path.endsWith('/status'))return{status:200,body:{state:'open'}}
    if(path==='/v1/admin/affiliates/segments'&&options?.method==='POST'){all.segments=data.segments as never[];all.summary.segments=1;return{status:200,body:segment}}
    return{status:200,body:path.endsWith('/segments/natal')?data:all}
  })
  render(<AffiliatesScreen initialArea="segments"/>);fireEvent.click(await screen.findByRole('button',{name:'Nova segmentação'}))
  fireEvent.change(screen.getByLabelText('Nome da segmentação'),{target:{value:segment.name}});fireEvent.change(screen.getByLabelText('Nome dos grupos no WhatsApp'),{target:{value:segment.groupName}})
  fireEvent.click(screen.getByRole('button',{name:'Continuar para WhatsApp'}));fireEvent.click(screen.getByRole('checkbox',{name:/Principal/}));fireEvent.click(screen.getByRole('button',{name:'Conferir conexões e continuar'}));fireEvent.click(await screen.findByRole('button',{name:'Criar segmentação'}))
  await screen.findByRole('heading',{name:'Prepare o primeiro grupo'});expect(window.location.pathname).toBe('/admin/afiliados/segmentacoes/natal')
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments/natal',expect.anything())
  expect(vi.mocked(api).mock.calls.some(([path])=>path.includes('/prepare-group'))).toBe(false)
})

it('criar primeiro grupo exige confirmação e avança para buscar ofertas sem trocar de tema',async()=>{
  const data=fixture()
  vi.mocked(api).mockImplementation(async(path='')=>{
    if(path.endsWith('/status'))return{status:200,body:{state:'open'}}
    if(path.endsWith('/prepare-group')){data.groups=[{id:'group',name:'Ofertas de Natal #1',jid:'123@g.us',segmentId:'natal',instanceId:'account',participantCount:2,capacity:100,enabled:true,syncedAt:null}];data.summary.groups=1;data.readiness!.activeGroups=1;return{status:200,body:{url:'https://chat.whatsapp.com/fixture'}}}
    return{status:200,body:data}
  })
  render(<AffiliatesScreen initialArea="segments" initialSegmentId="natal"/>);fireEvent.click(await screen.findByRole('button',{name:'Criar primeiro grupo'}))
  const dialog=screen.getByRole('dialog',{name:'Criar primeiro grupo'});expect((within(dialog).getByRole('button',{name:'Criar grupo no WhatsApp'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(within(dialog).getByRole('checkbox'));fireEvent.click(within(dialog).getByRole('button',{name:'Criar grupo no WhatsApp'}))
  await screen.findByRole('heading',{name:'Encontre e envie uma oferta'});expect(screen.getByRole('button',{name:'Ver ofertas'})).toBeTruthy();expect(screen.getByText('Ofertas de Natal #1')).toBeTruthy()
})

it('oferta contextual não pede escolher o tema novamente e salva no destino correto',async()=>{
  const save=vi.fn().mockResolvedValue(undefined)
  render(<OfferForm scopedSegment={segment} segments={[segment]} product={{id:'product',title:'Presente de Natal',productUrl:'https://www.mercadolivre.com.br/p/MLB123',affiliateUrl:'https://meli.la/new',priceCents:3990,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}} save={save}/>)
  expect(screen.queryByLabelText('Segmentação da oferta')).toBeNull();expect(screen.getByText('Natal 2026')).toBeTruthy();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Salvar oferta'}))
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({segmentId:'natal',title:'Presente de Natal'})))
})

it('grupos pausados orientam ativar, sem oferecer criação de outro grupo',()=>{
  const data=fixture();data.groups=[{id:'old',name:'Natal #1',jid:'123@g.us',segmentId:'natal',instanceId:'account',participantCount:1,capacity:100,enabled:false,syncedAt:null}]
  render(<SegmentWorkspace snapshot={data} states={{account:'open'}} section="groups" busy={false} onSection={vi.fn()} onBack={vi.fn()} onEdit={vi.fn()} onConnections={vi.fn()} onCreateGroup={vi.fn()} onLinkGroup={vi.fn()} onCatalog={vi.fn()} onReview={vi.fn()} onReconcile={vi.fn()}>Lista</SegmentWorkspace>)
  expect(screen.getByRole('heading',{name:'Ative um grupo para receber ofertas'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Criar primeiro grupo'})).toBeNull()
})

it('mantém produtos como foco em Ofertas quando a preparação já foi concluída',()=>{
  const data=fixture();data.readiness={activeGroups:1,currentOffers:1,approvedDeliveries:4,nextOffer:{id:'fresh',segmentId:'natal',title:'Nova oferta',productUrl:'https://meli.la/product',affiliateUrl:'https://meli.la/new',priceCents:1990,oldPriceCents:null,imageUrl:null,note:'',status:'DRAFT',checkedAt:new Date().toISOString(),expiresAt:null}}
  render(<SegmentWorkspace snapshot={data} states={{account:'open'}} section="offers" busy={false} onSection={vi.fn()} onBack={vi.fn()} onEdit={vi.fn()} onConnections={vi.fn()} onCreateGroup={vi.fn()} onLinkGroup={vi.fn()} onCatalog={vi.fn()} onReview={vi.fn()} onReconcile={vi.fn()}>Lista</SegmentWorkspace>)
  expect(screen.queryByRole('region',{name:'Próximo passo da segmentação'})).toBeNull();expect(screen.getByText('Lista')).toBeTruthy()
})

it('conta sem configuração não fica esperando uma consulta que nunca será iniciada',()=>{
  const data=fixture();data.instances=[{...account,configured:false}]
  render(<SegmentWorkspace snapshot={data} states={{}} section="groups" busy={false} onSection={vi.fn()} onBack={vi.fn()} onEdit={vi.fn()} onConnections={vi.fn()} onCreateGroup={vi.fn()} onLinkGroup={vi.fn()} onCatalog={vi.fn()} onReview={vi.fn()} onReconcile={vi.fn()}>Lista</SegmentWorkspace>)
  const action=screen.getByRole('button',{name:'Revisar contas da segmentação'}) as HTMLButtonElement
  expect(action.disabled).toBe(false);expect(screen.queryByText('Conferindo o WhatsApp…')).toBeNull();expect(screen.getByText(/configuração no servidor/)).toBeTruthy()
})
