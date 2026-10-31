import { expect, it } from 'vitest'
import { dayPlanInput, dayPlanSlots, rankDayProducts,selectDayProducts } from './day-plan'
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

it('Natal usa somente produtos natalinos; presentes são opcionais e limitados a um em cada cinco',()=>{
 const product=(id:string,title:string)=>{const p={id,catalogId:id,title,priceCents:1000,oldPriceCents:2000,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Natal',sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}}
 const theme=Array.from({length:20},(_,i)=>product('n'+i,'Enfeite Natal modelo '+i)),gifts=Array.from({length:10},(_,i)=>product('g'+i,['Fone Bluetooth','Tênis casual','Caixa de som','Relógio','Perfume','Bolsa','Mochila','Caneca','Livro','Console'][i]+' modelo '+i))
 const products=[...gifts,...theme,product('duplicate',theme[0].title),product('outside','Ração para cachorro')]
 expect(selectDayProducts(products,{name:'Natal'},24).every(p=>p.title.includes('Natal'))).toBe(true)
 const mixed=selectDayProducts(products,{name:'Natal'},24,true)
 expect(mixed).toHaveLength(24);expect(mixed.filter(p=>p.id.startsWith('g'))).toHaveLength(4)
 expect(mixed.slice(0,5).map(p=>p.id.startsWith('g'))).toEqual([false,false,false,false,true])
 expect(selectDayProducts(gifts,{name:'Natal'},24,true)).toHaveLength(0)
 expect(selectDayProducts([...gifts,...theme.slice(0,3)],{name:'Natal'},24,true)).toHaveLength(3)
})

it('contabiliza o histórico de anúncios equivalentes e bloqueia variante com envio já pendente',()=>{
 const p={id:'MLB1',catalogId:'MLB1',title:'Fone Bluetooth JBL modelo 510',priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Natal',sourcePage:1,sentCount:2,pendingCount:0}
 const a={...p,evaluation:evaluateAffiliateProduct(p,[])},b={...a,id:'MLB2',catalogId:'MLB2',sentCount:3}
 expect(rankDayProducts([a,b])[0].sentCount).toBe(5)
 expect(rankDayProducts([a,{...b,pendingCount:1}])).toHaveLength(0)
})

it('varia os presentes entre categorias, incluindo aliases de celulares e tablets',()=>{
 const product=(id:string,title:string)=>{const p={id,catalogId:id,title,priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Natal',sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}}
 const native=Array.from({length:20},(_,i)=>product('n'+i,'Enfeite Natal modelo '+i))
 const gifts=[product('g1','Smartphone Samsung modelo 1'),product('g2','Celular Motorola modelo 2'),product('g3','Tablet Samsung modelo 3'),product('g4','iPad Apple modelo 4'),product('g5','Notebook modelo 5')]
 const selected=selectDayProducts([...native,...gifts],{name:'Natal'},24,true)
 expect(selected.filter(p=>/Smartphone|Celular/.test(p.title))).toHaveLength(1)
 expect(selected.filter(p=>/Tablet|iPad/.test(p.title))).toHaveLength(1)
})
