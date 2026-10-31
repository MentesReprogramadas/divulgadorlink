import { groupAffiliateProducts } from './product-identity'
import { christmasProductKind, isChristmasSegment, type AffiliateSegmentTheme, type AffiliatePlanContext, affiliateProductFitsSegment } from './segment-relevance'
import { z } from 'zod'
import { affiliateProductId } from './shopee'
import { AffiliateError } from './contracts'
import type { DiscoveryProduct } from './evaluation'

export const dayPlanInput=z.object({
  idempotencyKey:z.uuid(),day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('09:00'),
  end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('21:00'),
  includeGiftIdeas:z.boolean().optional(),
  count:z.number().int().min(1).max(24).default(12),
  itemIds:z.array(affiliateProductId).min(1).max(24).refine(ids=>new Set(ids).size===ids.length).optional(),
}).strict()
export type DayPlanInput=z.infer<typeof dayPlanInput>
export function dayPlanSlots(input:Pick<DayPlanInput,'day'|'start'|'end'>,count:number,now=new Date()):Date[]{
  const start=new Date(`${input.day}T${input.start}:00-03:00`),end=new Date(`${input.day}T${input.end}:00-03:00`)
  if(!Number.isFinite(start.getTime())||new Date(start.getTime()-3*3600000).toISOString().slice(0,10)!==input.day||!Number.isFinite(end.getTime())||end<start||start<=now||end.getTime()>now.getTime()+30*86400000)throw new AffiliateError(400,'Escolha um período futuro, no mesmo dia, nos próximos 30 dias (horário de Brasília).')
  if(!Number.isInteger(count)||count<1||count>24||count>1&&(end.getTime()-start.getTime())/(count-1)<15*60000)throw new AffiliateError(400,'Use até 24 ofertas e pelo menos 15 minutos entre elas. Amplie o período ou reduza a quantidade.')
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
  if(chosen.length===analysis.length&&new Set(chosen.map(p=>p.id)).size===chosen.length&&core>chosen.length-core)return chosen
  // When the AI is unavailable, do not invent relationships to complete a quota.
  return ranked.filter(p=>!isChristmasSegment(segment)||christmasProductKind(p.title)==='THEME').slice(0,count).map(p=>({...p,planContext:{role:'CORE',framing:'THEME',reason:'Produto do catálogo do segmento; seleção conservadora sem análise da IA.'} as AffiliatePlanContext}))
}
