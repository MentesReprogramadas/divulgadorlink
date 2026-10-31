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

it('aceita composições sem quota fixa escolhidas pela IA e preserva predominância do núcleo',()=>{
 const product=(id:string,title:string)=>{const p={id,catalogId:id,title,priceCents:1000,oldPriceCents:2000,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Natal',sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}}
 const theme=Array.from({length:7},(_,i)=>product('n'+i,'Enfeite Natal modelo '+i)),gifts=Array.from({length:3},(_,i)=>product('g'+i,['Fone Bluetooth','Tênis casual','Relógio'][i]))
 const products=[...theme,...gifts]
 const analysis=products.map(p=>({id:p.id,context:{role:p.id.startsWith('n')?'CORE' as const:'RELATED' as const,framing:p.id.startsWith('n')?'THEME' as const:'GIFT' as const,reason:'Relação contextual analisada pela IA.'}}))
 expect(selectDayProducts(products,{name:'Natal'},10,analysis)).toHaveLength(10)
 expect(selectDayProducts(products,{name:'Natal'},10,analysis.slice(0,8))).toHaveLength(8)
 expect(selectDayProducts(products,{name:'Natal'},10,analysis.slice(0,7))).toHaveLength(7)
 expect(selectDayProducts(products,{name:'Natal'},10,analysis.slice(6))).toHaveLength(7)
 expect(selectDayProducts(products,{name:'Natal'},10).every(p=>p.title.includes('Natal'))).toBe(true)
})

it('contabiliza o histórico de anúncios equivalentes e bloqueia variante com envio já pendente',()=>{
 const p={id:'MLB1',catalogId:'MLB1',title:'Fone Bluetooth JBL modelo 510',priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Natal',sourcePage:1,sentCount:2,pendingCount:0}
 const a={...p,evaluation:evaluateAffiliateProduct(p,[])},b={...a,id:'MLB2',catalogId:'MLB2',sentCount:3}
 expect(rankDayProducts([a,b])[0].sentCount).toBe(5)
 expect(rankDayProducts([a,{...b,pendingCount:1}])).toHaveLength(0)
})

it('aplica a análise contextual a qualquer segmento e mantém a exclusão de infantis em Pets',()=>{
 const p={id:'MLB1',catalogId:'MLB1',title:'Tapete para yoga',priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Yoga',sourcePage:1}
 const a={...p,evaluation:evaluateAffiliateProduct(p,[])},b={...a,id:'MLB2',catalogId:'MLB2',title:'Garrafa térmica'},c={...a,id:'MLB3',catalogId:'MLB3',title:'Bloco para yoga'}
 const analysis=[{id:a.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Equipamento usado na prática.'}},{id:b.id,context:{role:'RELATED' as const,framing:'COMPANION' as const,reason:'Hidratação durante a prática.'}},{id:c.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Apoio para exercícios de yoga.'}}]
 expect(selectDayProducts([a,b,c],{name:'Yoga'},3,analysis).map(p=>p.id)).toEqual(['MLB1','MLB2','MLB3'])
 expect(selectDayProducts([{...a,title:'Chocalho para bebê'}],{name:'Pets'},1,[analysis[0]])).toHaveLength(0)
})

it('não limita a análise semântica a categorias natalinas pré-programadas',()=>{
 const make=(id:string,title:string)=>{const p={id,catalogId:id,title,priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Natal',sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}}
 const products=[make('1','Guirlanda decorativa'),make('2','Papai Noel'),make('3','Chocolates sortidos')]
 const analysis=products.map((p,i)=>({id:p.id,context:{role:i===2?'RELATED' as const:'CORE' as const,framing:i===2?'GIFT' as const:'THEME' as const,reason:'Contexto sazonal compreendido pela IA.'}}))
 expect(selectDayProducts(products,{name:'Natal'},3,analysis)).toHaveLength(3)
})
