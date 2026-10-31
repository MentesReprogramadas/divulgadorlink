import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { DayPlanner, type DayPlan } from './day-planner'

vi.mock('@/lib/api',()=>({api:vi.fn()}))
vi.mock('@/components/ui/liquid-lens',()=>({LiquidLens:()=>null}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
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
