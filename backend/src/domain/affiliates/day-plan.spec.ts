import { expect, it } from 'vitest'
import { dayPlanInput, dayPlanSlots, rankDayProducts } from './day-plan'
import { evaluateAffiliateProduct } from './evaluation'

const now=new Date('2026-10-31T12:00:00Z'),input={day:'2026-11-01',start:'09:00',end:'21:00'}
it('distribui o dia em Brasília com limites exatos e intervalo mínimo',()=>{
  const slots=dayPlanSlots(input,13,now)
  expect(slots[0].toISOString()).toBe('2026-11-01T12:00:00.000Z')
  expect(slots.at(-1)?.toISOString()).toBe('2026-11-02T00:00:00.000Z')
  expect(slots[1].getTime()-slots[0].getTime()).toBe(3600000)
  expect(dayPlanSlots({...input,start:'22:00',end:'23:00'},1,now)[0].toISOString()).toBe('2026-11-02T01:00:00.000Z')
  for(const bad of [{...input,day:'2026-02-30'},{...input,day:'2026-12-01'},{...input,start:'21:00',end:'09:00'},{...input,day:'2026-10-31',start:'09:00'}])expect(()=>dayPlanSlots(bad,12,now)).toThrow()
  expect(()=>dayPlanSlots({...input,end:'10:00'},24,now)).toThrow(/15 minutos/)
  expect(()=>dayPlanSlots(input,0,now)).toThrow()
})
it('prioriza descontos e contabiliza repetições; sem desconto ainda completa, sem duplicar pendências',()=>{
  const product=(id:string,rate:number,sentCount=0,pendingCount=0)=>{const p={id,catalogId:id,title:id,priceCents:1000,oldPriceCents:null,reportedDiscountPercent:rate,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sentCount,pendingCount};return {...p,evaluation:evaluateAffiliateProduct(p,[]),sourceTerm:'Natal',sourcePage:1}}
  const products=[product('sem',0),product('alto-repetido',80,3),product('baixo-novo',10),product('alto-novo',60),product('pendente',90,0,1),{...product('descartado',99),decision:'DISCARDED' as const}]
  expect(rankDayProducts([...products,products[0]]).map(p=>p.id)).toEqual(['alto-novo','baixo-novo','alto-repetido','sem'])
  expect(rankDayProducts(products,['sem','baixo-novo','alto-novo']).map(p=>p.id)).toEqual(['baixo-novo','alto-novo','alto-repetido','sem'])
  expect(dayPlanInput.safeParse({idempotencyKey:crypto.randomUUID(),...input,itemIds:['MLB123','MLB123']}).success).toBe(false)
})
