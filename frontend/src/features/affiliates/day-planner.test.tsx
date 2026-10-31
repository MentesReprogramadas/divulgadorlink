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
it('aceita mais de 24 e mostra capacidade real sem exigir intervalo de 15 minutos',async()=>{
 mock();render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}))
 fireEvent.change(screen.getByLabelText('Começa às'),{target:{value:'09:00'}})
 fireEvent.change(screen.getByLabelText('Termina às'),{target:{value:'10:00'}})
 fireEvent.change(screen.getByLabelText('Ofertas no dia'),{target:{value:'60'}})
 expect(screen.getByLabelText('Ofertas no dia').hasAttribute('max')).toBe(false)
 expect(screen.getByText('60 ofertas por grupo · cerca de 1 min entre ofertas')).toBeTruthy()
 expect(screen.getByRole('button',{name:'Gerar prévia do lote'}).hasAttribute('disabled')).toBe(false)
 fireEvent.change(screen.getByLabelText('Ofertas no dia'),{target:{value:'1000'}})
 expect(screen.getByText(/Até 61 ofertas cabem/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
 await screen.findByText('1 oferta · 1 mensagem por grupo')
 const call=vi.mocked(api).mock.calls.find(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')!
 expect(JSON.parse(String(call[1]?.body)).count).toBe(1000)
})
it('leva mais de 24 ofertas manuais ao mesmo lote',async()=>{
 mock();const selected=Array.from({length:50},(_,i)=>({...product,id:'MLB'+(1000+i)}))
 render(<DayPlanner {...props} selected={selected}/>);fireEvent.click(screen.getByRole('button',{name:'Agendar grupo'}))
 fireEvent.change(screen.getByLabelText('Começa às'),{target:{value:'09:00'}})
 fireEvent.change(screen.getByLabelText('Termina às'),{target:{value:'21:00'}})
 fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}));await screen.findByText('1 oferta · 1 mensagem por grupo')
 const call=vi.mocked(api).mock.calls.find(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')!
 expect(JSON.parse(String(call[1]?.body)).itemIds).toHaveLength(50)
})
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

it('recupera falha no mesmo lote aprovado e exige aceite somente da oferta recuperada',async()=>{
 mock();const original=vi.mocked(api).getMockImplementation()!;let state='FAILED'
 vi.mocked(api).mockImplementation(async(path,init)=>{
  const result=await original(path,init)
  if(path.endsWith('/retry'))state='READY'
  if(!path.endsWith('/batch'))return result
  const value=result.body as DayPlan
  return {...result,body:{...value,status:'APPROVED',summary:{...value.summary,readyOffers:state==='READY'?1:0},entries:value.entries.map(e=>({...e,state,error:state==='FAILED'?'A loja falhou na conferencia.':null}))}}
 })
 render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}));fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
 fireEvent.click(await screen.findByRole('button',{name:'Verificar falhas'}))
 expect(await screen.findByText(/oferta recuperada aguarda/)).toBeTruthy()
 expect(screen.getByRole('button',{name:'Aceitar e agendar 1 oferta'})).toBeTruthy()
 expect(vi.mocked(api).mock.calls.filter(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')).toHaveLength(1)
 expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/retry'))).toHaveLength(1)
 expect(vi.mocked(api).mock.calls.some(([path])=>path.endsWith('/approve'))).toBe(false)
})
it('permite escolher novo periodo para falha passada sem criar outro lote',async()=>{
 mock();const original=vi.mocked(api).getMockImplementation()!
 vi.mocked(api).mockImplementation(async(path,init)=>{
  const result=await original(path,init);if(!path.endsWith('/batch'))return result
  const value=result.body as DayPlan
  return {...result,body:{...value,status:'APPROVED',entries:value.entries.map(e=>({...e,state:'FAILED',scheduledAt:'2020-01-01T12:00:00Z'}))}}
 })
 render(<DayPlanner {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}));fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
 const retry=await screen.findByRole('button',{name:'Verificar falhas'});retry.focus();fireEvent.click(retry)
 expect(document.activeElement).toBe(screen.getByLabelText('Novo início das falhas'))
 fireEvent.click(screen.getByRole('button',{name:'Voltar à revisão'}));expect(document.activeElement).toBe(retry)
 expect(vi.mocked(api).mock.calls.some(([path])=>path.endsWith('/retry'))).toBe(false)
 fireEvent.click(retry)
 fireEvent.change(screen.getByLabelText('Novo início das falhas'),{target:{value:'16:00'}})
 fireEvent.change(screen.getByLabelText('Novo término das falhas'),{target:{value:'20:00'}})
 fireEvent.click(screen.getByRole('button',{name:'Conferir falhas neste período'}))
 await waitFor(()=>expect(vi.mocked(api).mock.calls.find(([path])=>path.endsWith('/retry'))?.[1]?.body).toBe(JSON.stringify({period:{start:'16:00',end:'20:00'}})))
 expect(vi.mocked(api).mock.calls.filter(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')).toHaveLength(1)
})

it('a composição contextual é automática sem checkbox nem percentual fixo',async()=>{
 mock();render(<DayPlanner {...props} segmentName="Natal"/>);fireEvent.click(screen.getByRole('button',{name:'Planejar o dia'}))
 expect(screen.queryByRole('checkbox')).toBeNull()
 expect(screen.getByText(/sem proporção fixa/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Gerar prévia do lote'}))
 await screen.findByText('1 oferta · 1 mensagem por grupo')
 const call=vi.mocked(api).mock.calls.find(([path,init])=>path.endsWith('/day-plans')&&init?.method==='POST')!
 expect(JSON.parse(String(call[1]?.body)).includeGiftIdeas).toBeUndefined()
})
