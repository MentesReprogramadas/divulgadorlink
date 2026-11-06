import { groupAffiliateProducts } from './product-identity'
import { interleavePetCategories, petProductCategory } from './pet-products'
import { christmasProductKind, isChristmasSegment, isPetSegment, type AffiliateSegmentTheme, type AffiliatePlanContext, affiliateProductFitsSegment } from './segment-relevance'
import { z } from 'zod'
import { affiliateCatalogProvider, affiliateProductId, isShopeeProduct } from './shopee'
import { AffiliateError } from './contracts'
import type { DiscoveryProduct } from './evaluation'

export const dayPlanInput=z.object({
  idempotencyKey:z.uuid(),day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('09:00'),
  end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('21:00'),
  includeGiftIdeas:z.boolean().optional(),
  provider:affiliateCatalogProvider.optional(),
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
  const families=groupAffiliateProducts(distinct).flatMap(family=>{
    if(family.some(p=>!!p.pendingCount))return []
    const sentCount=family.reduce((total,p)=>total+(p.sentCount??0),0)
    const choices=family.filter(p=>p.decision!=='DISCARDED').map(p=>({...p,sentCount})).sort(compare)
    return choices.length?[choices]:[]
  })
  const providers=[0,0]
  const eligible=families.sort((a,b)=>compare(a[0],b[0])).map(choices=>{
    const discounted=productDiscount(choices[0])>0
    const best=choices.filter(p=>(productDiscount(p)>0)===discounted).sort((a,b)=>providers[Number(isShopeeProduct(a.id))]-providers[Number(isShopeeProduct(b.id))]||compare(a,b))[0]
    providers[Number(isShopeeProduct(best.id))]++
    return best
  })
  return eligible.sort(compare)
}

export function interleaveDayProviders<T extends {id:string}>(products:T[]):T[]{
  const buckets=[products.filter(p=>!isShopeeProduct(p.id)),products.filter(p=>isShopeeProduct(p.id))]
  const first=Number(!!products[0]&&isShopeeProduct(products[0].id)),result:T[]=[]
  for(let i=0;result.length<products.length;i++)for(const provider of [first,1-first])if(buckets[provider][i])result.push(buckets[provider][i])
  return result
}

// Cover the collected search contexts before the AI decides the final mix.
// Ranking the entire catalog first can fill the prompt with one high-discount category.
export function dayPlanCandidatePool<T extends DiscoveryProduct>(products:T[],limit=120):T[]{
  const buckets=new Map<string,T[]>()
  for(const product of interleaveDayProviders(products)){
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
// Select across the available categories, then spread scarce categories through the whole day.
export function diversePetDayProducts<T extends Pick<DiscoveryProduct,'id'|'title'>>(products:T[],count=products.length):T[]{
  const buckets=new Map<string,T[]>()
  for(const product of products){
    const key=petProductCategory(product.title),bucket=buckets.get(key)??[]
    bucket.push(product);buckets.set(key,bucket)
  }
  const chosen=interleavePetCategories([...buckets.values()].flatMap(bucket=>interleaveDayProviders(bucket))).slice(0,count)
  const selected=[...buckets.keys()].map(category=>chosen.filter(p=>petProductCategory(p.title)===category)),total=chosen.length
  const result:T[]=[],used=selected.map(()=>0),dominant=selected.findIndex(bucket=>bucket.length>total/2)
  for(let slot=0;slot<total;slot++){
    let next=-1,largestDeficit=-Infinity
    const dominantSlot=dominant>=0&&Math.round((slot+1)*selected[dominant].length/total)>Math.round(slot*selected[dominant].length/total)
    for(let i=0;i<selected.length;i++){
      if(dominant>=0&&(i===dominant)!==dominantSlot)continue
      const deficit=(slot+1)*selected[i].length/total-used[i]
      if(used[i]<selected[i].length&&deficit>largestDeficit){next=i;largestDeficit=deficit}
    }
    const bucket=selected[next],opposite=bucket.findIndex((p,i)=>i>=used[next]&&result.length>0&&isShopeeProduct(p.id)!==isShopeeProduct(result.at(-1)!.id))
    if(opposite>=0)[bucket[used[next]],bucket[opposite]]=[bucket[opposite],bucket[used[next]]]
    result.push(bucket[used[next]++])
  }
  return result
}
function nativeDayProduct(segment:AffiliateSegmentTheme,title:string){
  if(isPetSegment(segment))return affiliateProductFitsSegment(segment,title)
  if(isChristmasSegment(segment))return christmasProductKind(title)==='THEME'
  const words=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[a-z0-9]+/g)??[]
  const titleWords=new Set(words(title)),ignored=new Set(['para','com','dos','das','ofertas','oferta','produtos','produto','promocoes','promocao'])
  return [segment.name,...(segment.discovery?.terms??[])].some(term=>{
    const tokens=words(term).filter(word=>word.length>=3&&!ignored.has(word))
    return tokens.length>0&&tokens.every(word=>titleWords.has(word))
  })
}
export function selectDayProducts<T extends DiscoveryProduct & {sentCount?:number;pendingCount?:number}>(products:T[],segment:AffiliateSegmentTheme,count:number,analysis:DayProductSelection[]=[]){
  const ranked=rankDayProducts(products.filter(p=>affiliateProductFitsSegment(segment,p.title)))
  const byId=new Map(ranked.map(p=>[p.id,p]))
  const chosen=analysis.flatMap(item=>{
    const product=byId.get(item.id)
    if(!product)return []
    if(item.context.role==='CORE'&&item.context.framing!=='THEME'||item.context.role==='RELATED'&&item.context.framing==='THEME')return []
    return [{...product,planContext:item.context}]
  })
  const core=chosen.filter(p=>p.planContext.role==='CORE').length
  const validAnalysis=chosen.length===analysis.length&&new Set(chosen.map(p=>p.id)).size===chosen.length&&core>chosen.length-core
  if(isPetSegment(segment)){
    const contexts=new Map((validAnalysis?chosen:[]).map(p=>[p.id,p.planContext]))
    const ordered=rankDayProducts(ranked,validAnalysis?chosen.map(p=>p.id):[])
    const selected=diversePetDayProducts(ordered,count).map(p=>({...p,planContext:contexts.get(p.id)??{role:'CORE',framing:'THEME',reason:'Produto do segmento; seleção por variedade das categorias disponíveis.'} as AffiliatePlanContext}))
    let related=Math.max(0,selected.filter(p=>p.planContext.role==='CORE').length-1)
    return selected.filter(p=>p.planContext.role==='CORE'||related-->0)
  }
  if(validAnalysis){
    const relatedCount=Math.min(Math.floor(count*(chosen.length-core)/chosen.length),Math.floor((count-1)/2))
    const contextual=chosen.length<=count?chosen:interleaveDayProviders([...interleaveDayProviders(chosen.filter(p=>p.planContext.role==='CORE')).slice(0,count-relatedCount),...interleaveDayProviders(chosen.filter(p=>p.planContext.role==='RELATED')).slice(0,relatedCount)])
    const remaining=ranked.filter(p=>!contextual.some(item=>item.id===p.id)&&isChristmasSegment(segment)&&christmasProductKind(p.title)==='THEME')
    const initial=[...contextual,...remaining.slice(0,Math.max(0,count-contextual.length)).map(p=>({...p,planContext:{role:'CORE',framing:'THEME',reason:'Produto do segmento, distinto dos demais produtos selecionados.'} as AffiliatePlanContext}))]
    const contexts=new Map([...initial,...chosen].map(p=>[p.id,p.planContext]))
    const corePool=ranked.filter(p=>contexts.get(p.id)?.role==='CORE'||!contexts.has(p.id)&&nativeDayProduct(segment,p.title))
    const balanced=interleaveDayProviders(rankDayProducts(corePool,chosen.map(p=>p.id)))
    let position=0
    return initial.map(p=>{
      if(p.planContext.role!=='CORE')return p
      const replacement=balanced[position++]
      return {...replacement,planContext:contexts.get(replacement.id)??{role:'CORE',framing:'THEME',reason:'Produto temático identificado pelo título; alternância entre lojas disponíveis.'} as AffiliatePlanContext}
    })
  }
  // When the AI is unavailable, do not invent relationships to complete a quota.
  return interleaveDayProviders(ranked.filter(p=>!isChristmasSegment(segment)||christmasProductKind(p.title)==='THEME')).slice(0,count).map(p=>({...p,planContext:{role:'CORE',framing:'THEME',reason:'Produto do catálogo do segmento; seleção conservadora sem análise da IA.'} as AffiliatePlanContext}))
}
