import { groupAffiliateProducts } from './product-identity'
import { christmasProductKind, isChristmasSegment, isPetSegment, type AffiliateSegmentTheme, type AffiliatePlanContext, affiliateProductFitsSegment } from './segment-relevance'
import { z } from 'zod'
import { affiliateProductId } from './shopee'
import { AffiliateError } from './contracts'
import type { DiscoveryProduct } from './evaluation'

export const dayPlanInput=z.object({
  idempotencyKey:z.uuid(),day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('09:00'),
  end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('21:00'),
  includeGiftIdeas:z.boolean().optional(),
  count:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(12),
  itemIds:z.array(affiliateProductId).min(1).max(1440).refine(ids=>new Set(ids).size===ids.length).optional(),
}).strict()
export type DayPlanInput=z.infer<typeof dayPlanInput>
export function dayPlanCapacity(input:Pick<DayPlanInput,'start'|'end'>){
  const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3))
  return Math.max(1,minutes(input.end)-minutes(input.start)+1)
}
export function dayPlanSlots(input:Pick<DayPlanInput,'day'|'start'|'end'>,count:number,now=new Date()):Date[]{
  const start=new Date(`${input.day}T${input.start}:00-03:00`),end=new Date(`${input.day}T${input.end}:00-03:00`)
  if(!Number.isFinite(start.getTime())||new Date(start.getTime()-3*3600000).toISOString().slice(0,10)!==input.day||!Number.isFinite(end.getTime())||end<start||start<=now||end.getTime()>now.getTime()+30*86400000)throw new AffiliateError(400,'Escolha um período futuro, no mesmo dia, nos próximos 30 dias (horário de Brasília).')
  if(!Number.isSafeInteger(count)||count<1||count>dayPlanCapacity(input))throw new AffiliateError(400,'Escolha ao menos uma oferta e reserve um minuto por horário. Amplie o período para incluir mais ofertas.')
  return Array.from({length:count},(_,i)=>new Date(start.getTime()+(count===1?0:Math.floor((end.getTime()-start.getTime())*i/(count-1)/60000)*60000)))
}
export const productDiscount=(p:Pick<DiscoveryProduct,'priceCents'|'oldPriceCents'|'reportedDiscountPercent'>)=>p.reportedDiscountPercent??(p.oldPriceCents&&p.oldPriceCents>p.priceCents?Math.floor((p.oldPriceCents-p.priceCents)/p.oldPriceCents*100):0)
export function rankDayProducts<T extends DiscoveryProduct & {sentCount?:number;pendingCount?:number}>(products:T[],aiOrder:string[]=[]):T[]{
  const positions=new Map(aiOrder.map((id,i)=>[id,i]))
  const distinct=[...new Map(products.map(p=>[p.id,p])).values()]
  const compare=(a:T,b:T)=>Number(productDiscount(b)>0)-Number(productDiscount(a)>0)||(a.sentCount??0)-(b.sentCount??0)||(positions.get(a.id)??1000)-(positions.get(b.id)??1000)||productDiscount(b)-productDiscount(a)||a.id.localeCompare(b.id)
  const eligible=groupAffiliateProducts(distinct).flatMap(family=>{
    if(family.some(p=>!!p.pendingCount))return []
    const sentCount=family.reduce((total,p)=>total+(p.sentCount??0),0)
    const choices=family.filter(p=>p.decision!=='DISCARDED').map(p=>({...p,sentCount})).sort(compare)
    return choices.length?[choices[0]]:[]
  })
  return eligible.sort(compare)
}

// Cover the collected search contexts before the AI decides the final mix.
// Ranking the entire catalog first can fill the prompt with one high-discount category.
export function dayPlanCandidatePool<T extends DiscoveryProduct>(products:T[],limit=120):T[]{
  const buckets=new Map<string,T[]>()
  for(const product of products){
    const key=(product.sourceTerm??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim()
    const bucket=buckets.get(key)??[];bucket.push(product);buckets.set(key,bucket)
  }
  const result:T[]=[]
  for(let round=0;result.length<limit;round++){
    let added=false
    for(const bucket of buckets.values()){if(bucket[round]){result.push(bucket[round]);added=true;if(result.length===limit)break}}
    if(!added)break
  }
  return result
}
export type DayProductSelection={id:string;context:AffiliatePlanContext}
export function selectDayProducts<T extends DiscoveryProduct & {sentCount?:number;pendingCount?:number}>(products:T[],segment:AffiliateSegmentTheme,count:number,analysis:DayProductSelection[]=[]){
  const ranked=rankDayProducts(products).filter(p=>affiliateProductFitsSegment(segment,p.title))
  const byId=new Map(ranked.map(p=>[p.id,p]))
  const chosen=analysis.slice(0,count).flatMap(item=>{
    const product=byId.get(item.id)
    if(!product)return []
    if(item.context.role==='CORE'&&item.context.framing!=='THEME'||item.context.role==='RELATED'&&item.context.framing==='THEME')return []
    return [{...product,planContext:item.context}]
  })
  const core=chosen.filter(p=>p.planContext.role==='CORE').length
  if(chosen.length===analysis.length&&new Set(chosen.map(p=>p.id)).size===chosen.length&&core>chosen.length-core){
    const remaining=ranked.filter(p=>!chosen.some(item=>item.id===p.id)&&(isPetSegment(segment)||isChristmasSegment(segment)&&christmasProductKind(p.title)==='THEME'))
    return [...chosen,...remaining.slice(0,Math.max(0,count-chosen.length)).map(p=>({...p,planContext:{role:'CORE',framing:'THEME',reason:'Produto do segmento, distinto dos demais produtos selecionados.'} as AffiliatePlanContext}))]
  }
  // When the AI is unavailable, do not invent relationships to complete a quota.
  return ranked.filter(p=>!isChristmasSegment(segment)||christmasProductKind(p.title)==='THEME').slice(0,count).map(p=>({...p,planContext:{role:'CORE',framing:'THEME',reason:'Produto do catálogo do segmento; seleção conservadora sem análise da IA.'} as AffiliatePlanContext}))
}
