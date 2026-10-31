import { groupAffiliateProducts } from './product-identity'
import { christmasProductKind, isChristmasSegment, type AffiliateSegmentTheme } from './segment-relevance'
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

export function selectDayProducts<T extends DiscoveryProduct & {sentCount?:number;pendingCount?:number}>(products:T[],segment:AffiliateSegmentTheme,count:number,includeGiftIdeas=false,aiOrder:string[]=[]){
  const ranked=rankDayProducts(products,aiOrder)
  if(!isChristmasSegment(segment))return ranked.slice(0,count)
  const theme=ranked.filter(p=>christmasProductKind(p.title)==='THEME')
  const giftLimit=includeGiftIdeas?Math.floor(count/5):0
  const categories=new Set<string>()
  const gifts=ranked.filter(p=>christmasProductKind(p.title)==='GIFT').filter(p=>{const title=p.title.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),category=title.match(/caixa de som|fones?|tenis|relogio|smartwatch|perfume|caneca|console|jogos?|livro|bolsa|carteira|mochila|panelas?|brinquedo|smartphone|celular|tablet|ipad|notebook/)?.[0]??title;const key=/^(?:smartphone|celular)$/.test(category)?'celular':/^(?:tablet|ipad)$/.test(category)?'tablet':category.replace(/s$/,'');if(categories.has(key))return false;categories.add(key);return true}).slice(0,giftLimit)
  const selected=theme.slice(0,count-gifts.length)
  // Gifts stay a minority even if the catalog has very few Christmas products.
  const safeGifts=gifts.slice(0,Math.floor(selected.length/4))
  const result:T[]=[]
  for(let i=0;i<selected.length;i++){result.push(selected[i]);if((i+1)%4===0&&safeGifts.length)result.push(safeGifts.shift()!)}
  return result
}
