import { expect, it } from 'vitest'
import { dayPlanInput, dayPlanSlots, rankDayProducts,selectDayProducts,dayPlanCandidatePool } from './day-plan'
import { evaluateAffiliateProduct } from './evaluation'
import { isShopeeProduct } from './shopee'

const petCatalog=()=>{
 const make=(id:string,title:string,rate=10)=>{const p={id,catalogId:id,title,priceCents:1000,oldPriceCents:null,reportedDiscountPercent:rate,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Pets',sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}}
 return [...Array.from({length:80},(_,i)=>make('food'+i,'Ração para cachorro marca '+i,70)),...['Areia sanitária para gato','Comedouro para cachorro','Shampoo para cachorro','Arranhador para gato','Brinquedo para cachorro'].flatMap((title,j)=>Array.from({length:5},(_,i)=>make('cat'+j+'item'+i,title+' modelo '+i)))]
}
it.each(['sem IA','IA só ração','IA inválida'])('diversifica Pets com catálogo dominado por ração: %s',mode=>{
 const catalog=petCatalog(),analysis=mode==='sem IA'?[]:catalog.slice(0,24).map(p=>({id:mode==='IA inválida'?'foreign':p.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Produto adequado ao grupo Pets.'}}))
 const selected=selectDayProducts(catalog,{name:'Pets'},24,analysis)
 expect(selected).toHaveLength(24)
 expect(selected.filter(p=>p.title.startsWith('Ração'))).toHaveLength(4)
 for(const title of ['Areia','Comedouro','Shampoo','Arranhador','Brinquedo'])expect(selected.filter(p=>p.title.startsWith(title))).toHaveLength(4)
 expect(selected.some((p,i)=>i>0&&p.title.startsWith('Ração')&&selected[i-1].title.startsWith('Ração'))).toBe(false)
})
it('distribui categorias escassas ao longo do dia e completa apenas com Pets disponíveis',()=>{
 const catalog=petCatalog(),selected=selectDayProducts(catalog,{name:'Pets'},100)
 expect(selected).toHaveLength(100)
 expect(selected.slice(0,20).some(p=>!p.title.startsWith('Ração'))).toBe(true)
 expect(selected.slice(-20).some(p=>!p.title.startsWith('Ração'))).toBe(true)
 expect(selected.map(p=>p.title.startsWith('Ração')?'f':'x').join('')).not.toContain('ffffff')
 expect(selectDayProducts(catalog.slice(0,10),{name:'Pets'},24)).toHaveLength(10)
})
it('mantém ranking dentro da categoria e bloqueio físico multiloja ao diversificar Pets',()=>{
 const catalog=petCatalog(),food=catalog[0],feeding=catalog[85]
 const products=[...catalog,{...food,id:'shopee:999',catalogId:'shopee:999',pendingCount:1},{...feeding,id:'shopee:888',catalogId:'shopee:888',sentCount:2}]
 const analysis=[{id:'food2',context:{role:'CORE' as const,framing:'THEME' as const,reason:'Ração adequada ao grupo Pets.'}}]
 const selected=selectDayProducts(products,{name:'Pets'},12,analysis)
 expect(selected.some(p=>p.title===food.title)).toBe(false)
 expect(selected.filter(p=>p.title===feeding.title).length).toBeLessThanOrEqual(1)
 expect(selected.find(p=>p.title.startsWith('Ração'))?.id).toBe('food2')
 expect(selected.find(p=>p.title.startsWith('Ração'))?.planContext).toBe(analysis[0].context)
})

const now=new Date('2026-10-31T12:00:00Z'),input={day:'2026-11-01',start:'09:00',end:'21:00'}
const providerCatalog=(theme='Enfeite Natal')=>['SHP','MLB'].flatMap((provider,j)=>Array.from({length:20},(_,i)=>({...petCatalog()[0],id:provider==='SHP'?`SHP10_${100+i}`:`MLB${100+i}`,catalogId:provider+j+'model'+i,title:theme+' modelo '+provider+i,sourceTerm:theme,reportedDiscountPercent:j?20:80})))
it.each(['Natal','Yoga','Pets'])('alterna lojas elegíveis em %s apesar da IA escolher só Shopee',name=>{
 const catalog=providerCatalog(name==='Pets'?'Brinquedo para cachorro':name==='Yoga'?'Tapete para Yoga':'Enfeite Natal')
 const analysis=catalog.slice(0,12).map(p=>({id:p.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Produto nativo do tema do grupo.'}}))
 for(const selection of [analysis,[]]){
  const selected=selectDayProducts(catalog,{name},12,selection)
  expect(selected).toHaveLength(12)
  expect(selected.filter(p=>isShopeeProduct(p.id))).toHaveLength(6)
  expect(selected.every((p,i)=>!i||isShopeeProduct(p.id)!==isShopeeProduct(selected[i-1].id))).toBe(true)
 }
})
it('alterna representantes físicos entre lojas e mantém um anúncio por família com histórico e pendência',()=>{
 const shopee=providerCatalog().slice(0,10),ml=shopee.map((p,i)=>({...p,id:'MLB'+(500+i),catalogId:'MLB'+(500+i),reportedDiscountPercent:20}))
 const ranked=rankDayProducts([...shopee,...ml])
 expect(ranked).toHaveLength(10)
 expect(ranked.filter(p=>isShopeeProduct(p.id))).toHaveLength(5)
 expect(new Set(ranked.map(p=>p.title)).size).toBe(10)
 expect(rankDayProducts([...shopee,...ml.map((p,i)=>i? p:{...p,pendingCount:1})]).some(p=>p.title===shopee[0].title)).toBe(false)
})
it('inclui ambas as lojas na amostra do mesmo termo e usa só produtos disponíveis sem quota',()=>{
 const catalog=providerCatalog(),pool=dayPlanCandidatePool(catalog,12)
 expect(pool.filter(p=>isShopeeProduct(p.id))).toHaveLength(6)
 expect(selectDayProducts(catalog.slice(0,20),{name:'Natal'},12)).toHaveLength(12)
 const scarce=[...catalog.slice(0,20),catalog[20]],selected=selectDayProducts(scarce,{name:'Natal'},12)
 expect(selected).toHaveLength(12)
 expect(selected.filter(p=>!isShopeeProduct(p.id))).toHaveLength(1)
 const unrelated=catalog.slice(20).map(p=>({...p,title:'Ração para cachorro '+p.id}))
 expect(selectDayProducts([...catalog.slice(0,20),...unrelated],{name:'Natal'},12).every(p=>isShopeeProduct(p.id))).toBe(true)
})
it('alterna Tecnologia por termos do título e não usa termo de coleta como prova temática',()=>{
 const catalog=providerCatalog(),products=catalog.map(p=>({...p,title:isShopeeProduct(p.id)?'Celular smartphone modelo '+p.id:'Mouse gamer modelo '+p.id}))
 const analysis=products.slice(0,12).map(p=>({id:p.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Dispositivo tecnológico do grupo.'}}))
 const segment={name:'Tecnologia',discovery:{terms:['celular','mouse gamer']}}
 expect(selectDayProducts(products,segment,12,analysis).filter(p=>!isShopeeProduct(p.id))).toHaveLength(6)
 const unrelated=products.slice(20).map(p=>({...p,title:'Ração para cachorro '+p.id,sourceTerm:'mouse gamer'}))
 expect(selectDayProducts([...products.slice(0,20),...unrelated],segment,12,analysis).every(p=>isShopeeProduct(p.id))).toBe(true)
})
it('combina categorias e lojas em Pets sem preencher com produto infantil',()=>{
 const catalog=petCatalog().map((p,i)=>({...p,id:i%2?'MLB'+i:`SHP10_${i+100}`,catalogId:'physical'+i}))
 const selected=selectDayProducts([...catalog,{...catalog[0],id:'MLB999999',catalogId:'baby',title:'Brinquedo para bebê infantil'}],{name:'Pets'},24)
 expect(selected.filter(p=>isShopeeProduct(p.id))).toHaveLength(12)
 expect(selected.some(p=>p.title.includes('bebê'))).toBe(false)
 for(const title of ['Ração','Areia','Comedouro','Shampoo','Arranhador','Brinquedo'])expect(selected.filter(p=>p.title.startsWith(title))).toHaveLength(4)
})
it('reduz pool contextual ampliado sem exceder quantidade nem transformar complementos em núcleo',()=>{
 const catalog=providerCatalog('Produto de tecnologia')
 const analysis=catalog.slice(0,12).map((p,i)=>({id:p.id,context:{role:i<8?'CORE' as const:'RELATED' as const,framing:i<8?'THEME' as const:'COMPANION' as const,reason:'Relação avaliada semanticamente pela IA.'}}))
 analysis.push(...catalog.slice(20,32).map(p=>({id:p.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Equipamento adequado ao segmento.'}})))
 const selected=selectDayProducts(catalog,{name:'Tecnologia'},12,analysis)
 expect(selected).toHaveLength(12)
 expect(selected.filter(p=>p.planContext.role==='RELATED')).toHaveLength(2)
 expect(selected.filter(p=>!isShopeeProduct(p.id))).toHaveLength(5)
 expect(selected.filter(p=>p.planContext.role==='RELATED').every(p=>p.planContext.framing==='COMPANION')).toBe(true)
})
it('distribui o dia em Brasília com limites exatos e intervalo mínimo',()=>{
  const slots=dayPlanSlots(input,13,now)
  expect(slots[0].toISOString()).toBe('2026-11-01T12:00:00.000Z')
  expect(slots.at(-1)?.toISOString()).toBe('2026-11-02T00:00:00.000Z')
  expect(slots[1].getTime()-slots[0].getTime()).toBe(3600000)
  expect(dayPlanSlots({...input,start:'22:00',end:'23:00'},1,now)[0].toISOString()).toBe('2026-11-02T01:00:00.000Z')
  for(const bad of [{...input,day:'2026-02-30'},{...input,day:'2026-12-01'},{...input,start:'21:00',end:'09:00'},{...input,day:'2026-10-31',start:'09:00'}])expect(()=>dayPlanSlots(bad,12,now)).toThrow()
  expect(dayPlanSlots({...input,end:'10:00'},61,now)).toHaveLength(61)
  expect(()=>dayPlanSlots({...input,end:'10:00'},62,now)).toThrow(/um minuto/)
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

it('distribui a amostra pelos termos para não ocultar o tema atrás de descontos de uma categoria',()=>{
 const make=(id:string,sourceTerm:string)=>{const p={id,catalogId:id,title:id,priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm,sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}}
 const high=Array.from({length:150},(_,i)=>make('fone'+i,'Fone Bluetooth')),core=Array.from({length:30},(_,i)=>make('natal'+i,'Decoração de Natal'))
 const selected=dayPlanCandidatePool([...high,...core],100)
 expect(selected).toHaveLength(100);expect(selected.filter(p=>p.sourceTerm==='Decoração de Natal')).toHaveLength(30)
 expect(selected[0].id).toBe('fone0');expect(selected[1].id).toBe('natal0');expect(new Set(selected.map(p=>p.id)).size).toBe(100)
 expect(dayPlanCandidatePool(core,120)).toHaveLength(30)
})

it('aceita volume solicitado acima de 24 sem alocar horários antes de conhecer disponibilidade',()=>{
 expect(dayPlanInput.safeParse({idempotencyKey:crypto.randomUUID(),...input,count:1000000}).success).toBe(true)
 expect(dayPlanInput.safeParse({idempotencyKey:crypto.randomUUID(),...input,count:Number.MAX_SAFE_INTEGER+1}).success).toBe(false)
 const slots=dayPlanSlots(input,121,now)
 expect(slots).toHaveLength(121);expect(new Set(slots.map(s=>s.getTime())).size).toBe(121)
 expect(slots.at(-1)?.toISOString()).toBe('2026-11-02T00:00:00.000Z')
})
it('completa análise curta com produtos Pets estritamente elegíveis e não inventa núcleo genérico',()=>{
 const catalog=Array.from({length:80},(_,i)=>{const p={id:'MLB'+i,catalogId:'MLB'+i,title:'Brinquedo para cachorro modelo '+i,priceCents:1000,oldPriceCents:null,imageUrl:null,productUrl:'https://meli.la/test',checkedAt:now.toISOString(),sourceTerm:'Pets',sourcePage:1};return {...p,evaluation:evaluateAffiliateProduct(p,[])}})
 const analysis=catalog.slice(0,12).map(p=>({id:p.id,context:{role:'CORE' as const,framing:'THEME' as const,reason:'Produto apropriado para animais.'}}))
 const selected=selectDayProducts([...catalog,{...catalog[0],id:'MLB999',catalogId:'MLB999',title:'Brinquedo para bebê infantil'}],{name:'Pets'},60,analysis)
 expect(selected).toHaveLength(60);expect(new Set(selected.map(p=>p.id)).size).toBe(60)
 expect(selected.some(p=>p.title.includes('bebê'))).toBe(false)
 expect(selectDayProducts(catalog,{name:'Colecionadores'},60,analysis)).toHaveLength(12)
})
