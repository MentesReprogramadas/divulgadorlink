import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { DayPlanner, type DayPlan } from './day-planner'

vi.mock('@/lib/api',()=>({api:vi.fn()}))
vi.mock('@/components/ui/liquid-lens',()=>({LiquidLens:()=>null}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks()})
const product={id:'MLB123',title:'Cascata de Luzes de Natal',productUrl:'https://www.mercadolivre.com.br/p/MLB123',imageUrl:null,priceCents:6198,oldPriceCents:15117,checkedAt:'2026-10-31T12:00:00Z'}
const message='*Cascata de Luzes de Natal*\n\nDe: ~R$ 151,17~\n🔥 *R$ 61,98*\n💸 *59% OFF* · Economize *R$ 89,19*\n\nCompre aqui 👇\nhttps://meli.la/fixture'
function mock(){
  let value:DayPlan={id:'batch',mode:'AUTO',status:'DRAFT',source:'OPENAI',config:{day:'2026-11-01',start:'09:00',end:'21:00'},expiresAt:'2099-11-01T12:00:00Z',error:null,groups:[{id:'g1',name:'Natal #1'},{id:'g2',name:'Natal #2'}],dailyByGroup:[{id:'g1',name:'Natal #1',messages:3},{id:'g2',name:'Natal #2',messages:1}],summary:{offers:1,groups:2,totalMessages:2,intervalMinutes:null},entries:[{id:'entry',itemId:product.id,title:product.title,scheduledAt:'2026-11-01T12:00:00Z',state:'READY',error:null,product,message,sentCount:2}]}
  vi.mocked(api).mockImplementation(async(path,init)=>{
    if(path.endsWith('/approve'))value={...value,status:'APPROVED'}
    if(init?.method==='DELETE')value={...value,summary:{...value.summary,offers:0},entries:[]}
    return {status:200,body:path.endsWith('/day-plans')?init?.method==='POST'?{id:'batch'}:{batches:[]}:value}
  })
}
const props={segmentId:'natal',selected:[],clearSelection:vi.fn(),onChanged:vi.fn()}
it('inicia hoje com horário futuro e destaca amanhã quando a data é alterada',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T14:27:25Z'))
  render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}))
  expect((screen.getByLabelText('Dia') as HTMLInputElement).value).toBe('2026-10-31')
  expect((screen.getByLabelText('Começa às') as HTMLInputElement).value).toBe('11:35')
  expect(screen.getByText('Hoje, 31/10/2026 · 11:35–21:00 · Brasília')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Dia'),{target:{value:'2026-11-01'}})
  expect(screen.getByText('Amanhã, 01/11/2026 · 11:35–21:00 · Brasília')).toBeTruthy()
})
it('mostra foto e motivo do item com falha sem tratá-lo como oferta pronta',async()=>{
  mock();const original=vi.mocked(api).getMockImplementation()!
  vi.mocked(api).mockImplementation(async(path,init)=>{
    const result=await original(path,init)
    if(!path.endsWith('/batch'))return result
    const plan=result.body as DayPlan
    return {...result,body:{...plan,summary:{...plan.summary,offers:0,totalMessages:0},entries:[{...plan.entries[0],state:'FAILED',error:'A loja não confirmou um preço atual.',message:undefined,product:{...product,imageUrl:'https://http2.mlstatic.com/fixture.jpg'}}]}}
  })
  render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}));fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
  expect((await screen.findByRole('img',{name:product.title})).getAttribute('src')).toContain('fixture.jpg')
  expect(screen.getByText('A loja não confirmou um preço atual.')).toBeTruthy()
  expect(screen.getByText(/Foto e preço da coleta/)).toBeTruthy()
  expect(screen.getByRole('button',{name:'Aceitar e agendar 0 ofertas'}).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button',{name:'Verificar falhas'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Verificar novamente: '+product.title}))
  await waitFor(()=>expect(vi.mocked(api).mock.calls.some(([path,init])=>path.endsWith('/retry')&&init?.body===JSON.stringify({entryId:'entry'}))).toBe(true))

})
it('gera uma revisão com volume e destinos; só agenda no aceite explícito',async()=>{
  mock();render(<DayPlanner {...props}/>)
  fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}))
  expect(screen.getByLabelText('Ofertas no dia')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
  await screen.findByText('1 oferta · 1 mensagem por grupo')
  expect(screen.getByText('2 grupos · 2 mensagens neste lote')).toBeTruthy()
  fireEvent.click(screen.getByText('Destinos e total de mensagens no dia'))
  expect(screen.getByText(/Natal #1 · 3 mensagens no dia/)).toBeTruthy()
  expect(vi.mocked(api).mock.calls.some(([path])=>path.endsWith('/approve'))).toBe(false)
  fireEvent.click(screen.getByText('Ver mensagem e link'));expect(screen.getByText(/💸 \*59% OFF\*/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Aceitar e agendar 1 oferta'}))
  await screen.findByRole('dialog',{name:'Ofertas agendadas'})
  expect(vi.mocked(api).mock.calls.find(([path])=>path.endsWith('/approve'))?.[1]?.body).toBe(JSON.stringify({confirm:true}))
})
it('seleção manual aparece na barra; envia ids escolhidos e permite remover na revisão',async()=>{
  mock();render(<DayPlanner {...props} selected={[product]}/>)
  const floating=screen.getByLabelText('Ofertas selecionadas')
  fireEvent.click(within(floating).getByRole('button',{name:'Agendar grupo'}))
  expect(screen.queryByLabelText('Ofertas no dia')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
  await screen.findByText(product.title)
  const body=JSON.parse(String(vi.mocked(api).mock.calls.find(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')?.[1]?.body))
  expect(body.itemIds).toEqual(['MLB123']);expect(body.count).toBe(1)
  fireEvent.click(screen.getByRole('button',{name:'Remover do lote: '+product.title}))
  await waitFor(()=>expect(screen.queryByText(product.title)).toBeNull())
  expect(screen.getByRole('button',{name:'Aceitar e agendar 0 ofertas'}).hasAttribute('disabled')).toBe(true)
})
it('falha no aceite preserva revisão e oferece recuperação sem repetir envio',async()=>{
  mock();const original=vi.mocked(api).getMockImplementation()!
  vi.mocked(api).mockImplementation(async(path,init)=>path.endsWith('/approve')?{status:409,body:{message:'Os destinos mudaram. Gere outro lote.'}}:original(path,init))
  render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}));fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
  fireEvent.click(await screen.findByRole('button',{name:'Aceitar e agendar 1 oferta'}))
  expect((await screen.findByRole('alert')).textContent).toContain('Os destinos mudaram')
  expect(screen.getByText(product.title)).toBeTruthy()
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/approve'))).toHaveLength(1)
})

it('abre agenda com cards e paginação e permite voltar aos produtos',async()=>{
  mock();const original=vi.mocked(api).getMockImplementation()!
  vi.mocked(api).mockImplementation(async(path,init)=>path.includes('/day-plans?')?{status:200,body:{batches:[{id:'batch',status:'APPROVED',config:{day:'2026-11-01',start:'09:00',end:'21:00'},groupCount:2,_count:{entries:12}}],pagination:{page:path.includes('page=2')?2:1,total:9,hasPrevious:path.includes('page=2'),hasNext:!path.includes('page=2')}}}:original(path,init))
  render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Agenda'}))
  expect(await screen.findByText('12 ofertas')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}))
  expect(await screen.findByText('Página 2 · 9 agendas')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Anterior'}))
  expect(await screen.findByText('Página 1 · 9 agendas')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Agenda'}))
  expect(screen.queryByLabelText('Agendas de ofertas')).toBeNull()
})

it('falhas de agenda aprovada abrem nova revisão com horário futuro e preservam o lote existente',async()=>{
  mock();const original=vi.mocked(api).getMockImplementation()!
  vi.mocked(api).mockImplementation(async(path,init)=>{
    const result=await original(path,init)
    if(!path.endsWith('/batch'))return result
    const value=result.body as DayPlan
    return {...result,body:{...value,status:'APPROVED',entries:value.entries.map(e=>({...e,state:'FAILED',error:'A loja falhou na conferência.'}))}}
  })
  render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}));fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
  fireEvent.click(await screen.findByRole('button',{name:'Verificar falhas'}))
  expect(screen.getByText(/As ofertas que falharam serão conferidas em um novo lote/)).toBeTruthy()
  expect(screen.getByLabelText('Dia')).toBeTruthy()
  expect(screen.queryByLabelText('Ofertas no dia')).toBeNull()
  expect(vi.mocked(api).mock.calls.some(([path])=>path.endsWith('/retry')||path.endsWith('/approve')||path.endsWith('/cancel'))).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
  await waitFor(()=>expect(vi.mocked(api).mock.calls.filter(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')).toHaveLength(2))
  const posts=vi.mocked(api).mock.calls.filter(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')
  expect(JSON.parse(String(posts[1][1]?.body)).itemIds).toEqual([product.id])
})
