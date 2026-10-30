import { randomUUID } from 'node:crypto'
import { Prisma, type AffiliateDiscovery, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AffiliateCatalogError, type CatalogProduct } from '@/domain/affiliates/mercado-livre'
import { expandAffiliateTerms } from '@/adapters/affiliates/openai-intelligence'
import { planAffiliateDiscoveryTerms } from '@/domain/affiliates/discovery-terms'
import { evaluateAffiliateProduct, refreshCachedAffiliateEvaluation, AFFILIATE_RULES, type DiscoveryProduct } from '@/domain/affiliates/evaluation'
import { refreshAffiliateCatalogProduct } from '@/use-cases/@Affiliates/catalog'
export { generateAffiliateTitle } from '@/adapters/affiliates/openai-intelligence'
import { searchAffiliateCatalog } from '@/use-cases/@Affiliates/catalog'

const INTERVAL = 15 * 60_000
const TTL = 24 * 60 * 60_000
const pageCursorsSchema=z.record(z.string(),z.number().int().min(1).max(50001))
const pageCursorsFor=(value:unknown)=>{const parsed=pageCursorsSchema.safeParse(value);return parsed.success?parsed.data:{}}
export const discoveryConfigSchema = z.object({ enabled: z.boolean(), terms: z.array(z.string().trim().min(2).max(120)).max(5) }).strict()
const cachedProductSchema = z.object({ id: z.string(), catalogId: z.string(), title: z.string(), productUrl: z.string(), priceCents: z.number().int().positive(), oldPriceCents: z.number().int().positive().nullable(), imageUrl: z.string().nullable(), checkedAt: z.iso.datetime() }).passthrough()
const countsSchema = z.object({ catalogsFound: z.number(), catalogsChecked: z.number(), withoutOffers: z.number(), failed: z.number() })
const unavailableSchema=z.object({id:z.string(),title:z.string(),reason:z.string(),kind:z.enum(['NO_LISTINGS','INELIGIBLE','PRICE_UNAVAILABLE','LOOKUP_FAILED']).optional()})

export function mergeDiscoveryProducts(previous: unknown, fresh: CatalogProduct[], now: Date): CatalogProduct[] {
  const old = z.array(cachedProductSchema).max(100).safeParse(previous)
  const rows = [...(old.success ? old.data : []), ...fresh]
  return [...new Map(rows.filter(row => new Date(row.checkedAt).getTime() > now.getTime() - TTL && new Date(row.checkedAt) <= now).map(row => [row.id, row])).values()].sort((a,b) => b.checkedAt.localeCompare(a.checkedAt)).slice(0,100)
}
const termsFor = (terms: string[], name: string) => terms.length ? terms : [name.trim().slice(0,120)]
async function segmentFor(db: PrismaClient, tenantId: string, segmentId: string) {
  const segment = await db.affiliateSegment.findFirst({ where: { id: segmentId, tenantId } })
  if (!segment) throw new AffiliateCatalogError(404, 'Segmentação não encontrada.')
  return segment
}
function state(row: AffiliateDiscovery | null, segment: { name: string; enabled: boolean }, now = new Date()) {
  const counts = countsSchema.safeParse(row?.countsJson)
  return { enabled: row?.enabled ?? true, usesSegmentName: !row?.terms.length, terms: termsFor(row?.terms ?? [],segment.name), products: mergeDiscoveryProducts(row?.productsJson ?? [],[],now), counts: counts.success ? counts.data : null, checkedAt: row?.checkedAt?.toISOString() ?? null, nextRunAt: segment.enabled && row?.enabled !== false ? row?.nextRunAt.toISOString() ?? null : null, status: !segment.enabled || row?.enabled === false ? 'PAUSED' : row?.status ?? 'QUEUED', error: row?.error ?? null }
}
export const discoveryQuerySchema=z.object({mode:z.enum(['MIXED','SOURCE']).optional(),term:z.string().trim().min(2).max(120).optional(),page:z.coerce.number().int().min(1).max(50001).optional(),view:z.enum(['ALL','SELECTED','REVIEW','DISCARDED']).default('ALL')}).strict()
export async function affiliateDiscoveryState(db: PrismaClient, tenantId: string, segmentId: string, query: z.infer<typeof discoveryQuerySchema>={view:'ALL'}) {
  const segment=await segmentFor(db,tenantId,segmentId),row=await db.affiliateDiscovery.findFirst({where:{segmentId,tenantId}})
  const terms=row?.expandedTerms.length?row.expandedTerms:termsFor(row?.terms??[],segment.name)
  const term=query.term??terms[0]
  if(!terms.includes(term))throw new AffiliateCatalogError(400,'Selecione um dos termos desta segmentação.')
  const page=query.page??1
  const mixed=query.mode==='MIXED'
  const cached=mixed?null:await db.affiliateDiscoveryPage.findUnique({where:{tenantId_segmentId_term_page:{tenantId,segmentId,term,page}}})
  const pages=mixed?await db.affiliateDiscoveryPage.findMany({where:{tenantId,segmentId,term:{in:terms},checkedAt:{gte:new Date(Date.now()-TTL)}},orderBy:[{checkedAt:'desc'},{term:'asc'},{page:'asc'}],take:500}):cached?[cached]:[]
  const newest=new Map<string,DiscoveryProduct>()
  for(const cachedPage of pages)for(const product of mergeDiscoveryProducts(cachedPage.productsJson,[],new Date()) as DiscoveryProduct[])if(!newest.has(product.id))newest.set(product.id,refreshCachedAffiliateEvaluation(product))
  const buckets=terms.map(value=>[...newest.values()].filter(product=>product.sourceTerm===value))
  const products:DiscoveryProduct[]=mixed?Array.from({length:Math.max(0,...buckets.map(bucket=>bucket.length))},(_,index)=>buckets.flatMap(bucket=>bucket[index]?[bucket[index]]:[])).flat():[...newest.values()]
  const decisions=await db.affiliateProductDecision.findMany({where:{tenantId,segmentId,itemId:{in:products.map(p=>p.id)}}})
  const visible=products.map(product=>{
    const decision=decisions.find(d=>d.itemId===product.id)
    return decision?{...product,decision:decision.decision,evaluation:{...product.evaluation,status:'DISCARDED' as const,reasons:[decision.decision==='SENT'?'Produto já enviado nesta segmentação.':`Descartado nesta segmentação: ${decision.reason}`,...product.evaluation.reasons]}}:product
  }).filter(product=>!mixed||product.decision!=='SENT')
  const statusCounts={SELECTED:0,REVIEW:0,DISCARDED:0}
  visible.forEach(p=>statusCounts[p.evaluation.status]++)
  const evidence=z.object({rejected:z.array(unavailableSchema).optional(),providerBoundaryReached:z.boolean().optional()}).safeParse(cached?.countsJson)
  const validCatalogs=new Set(products.map(product=>product.catalogId)),unavailableById=new Map<string,z.infer<typeof unavailableSchema>>()
  for(const cachedPage of pages){
    const parsed=z.object({rejected:z.array(unavailableSchema).optional()}).safeParse(cachedPage.countsJson)
    if(parsed.success)for(const item of parsed.data.rejected??[])if(!validCatalogs.has(item.id)&&!unavailableById.has(item.id))unavailableById.set(item.id,{...item,...(!item.kind?{reason:'A fonte não retornou um anúncio utilizável nesta consulta. Será conferido novamente nas próximas coletas.'}:{})})
  }
  const rejected=mixed?[...unavailableById.values()]:evidence.success?evidence.data.rejected??[]:[]
  const filtered=visible.filter(p=>query.view==='ALL'? !mixed||p.evaluation.status!=='DISCARDED':p.evaluation.status===query.view),rejections=!mixed&&query.view==='ALL'?rejected:[]
  const total=filtered.length+rejections.length,displayPage=mixed?Math.min(page,Math.max(1,Math.ceil(total/20))):page,offset=(displayPage-1)*20
  return {...state(row,segment),products:mixed?filtered.slice(offset,offset+20):filtered,rejected:rejections,unavailable:mixed?rejected.slice(0,20):[],collectionSummary:{available:statusCounts.SELECTED+statusCounts.REVIEW,unavailable:rejected.length,failed:rejected.filter(item=>item.kind==='LOOKUP_FAILED').length},expandedTerms:terms,statusCounts,policy:AFFILIATE_RULES,pagination:{mode:mixed?'MIXED':'SOURCE',term,page:displayPage,pageSize:20,total:mixed?total:cached?.total??0,hasPrevious:displayPage>1,hasNext:mixed?displayPage*20<total:cached? page*20<cached.total && !(evidence.success&&evidence.data.providerBoundaryReached):false,providerBoundaryReached:!mixed&&evidence.success&&evidence.data.providerBoundaryReached===true},pageStatus:pages.length?'READY':'NOT_COLLECTED',cycleIntervalMs:row?.checkedAt?Math.max(1,row.nextRunAt.getTime()-row.checkedAt.getTime()):INTERVAL,runStartedAt:row?.runStartedAt?.toISOString()??null,durationMs:row?.durationMs??null}
}
export async function configureAffiliateDiscovery(db: PrismaClient, tenantId: string, actorId: string, segmentId: string, input: z.infer<typeof discoveryConfigSchema>) {
  const value = discoveryConfigSchema.parse(input)
  await segmentFor(db,tenantId,segmentId)
  await db.$transaction(async tx => {
    await tx.affiliateDiscovery.upsert({ where: { segmentId }, create: { segmentId,tenantId,...value,status:value.enabled?'QUEUED':'PAUSED' }, update: { ...value,expandedTerms:[],pageCursors:{},requestedTerm:null,requestedPage:null,cursor:0,productsJson:[],countsJson:Prisma.DbNull,checkedAt:null,error:null,status:value.enabled?'QUEUED':'PAUSED',nextRunAt:new Date(),leaseToken:null,leaseExpiresAt:null,configVersion:{increment:1} } })
    await tx.affiliateDiscoveryPage.deleteMany({where:{tenantId,segmentId,checkedAt:{lt:new Date(Date.now()-TTL)}}})
    await tx.auditLog.create({ data:{tenantId,actorId,action:'affiliate.discovery.configure',entityType:'AffiliateDiscovery',entityId:segmentId,after:{enabled:value.enabled,termCount:value.terms.length}} })
  })
  return affiliateDiscoveryState(db,tenantId,segmentId)
}
export async function queueAffiliateDiscovery(db: PrismaClient, tenantId: string, actorId: string, segmentId: string, options?: {force?:boolean;term?:string;page?:number}) {
  const segment = await segmentFor(db,tenantId,segmentId)
  if (!segment.enabled) throw new AffiliateCatalogError(409,'Ative a segmentação antes de atualizar as sugestões.')
  await db.$transaction(async tx => {
    await tx.affiliateDiscovery.createMany({data:[{segmentId,tenantId}],skipDuplicates:true})
    const row = await tx.affiliateDiscovery.findFirst({where:{segmentId,tenantId}})
    if(!row?.enabled) throw new AffiliateCatalogError(409,'Ative a descoberta automática antes de atualizar as sugestões.')
    const now = new Date()
    const priorityAt=new Date(Math.max(now.getTime(),(row.checkedAt?.getTime()??0)+30_000))
    await tx.affiliateDiscovery.updateMany({ where:{segmentId,tenantId,enabled:true,AND:[{OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lte:now}}]},...(options?.force?[]:[{OR:[{checkedAt:null},{checkedAt:{lt:new Date(now.getTime()-30_000)}}]}])]},data:{nextRunAt:priorityAt,status:'QUEUED',error:null,...(options?.term?{requestedTerm:options.term,requestedPage:options.page??1}:{})} })
    if(options?.term)await tx.affiliateDiscovery.updateMany({where:{segmentId,tenantId,enabled:true},data:{requestedTerm:options.term,requestedPage:options.page??1}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.discovery.refresh',entityType:'AffiliateDiscovery',entityId:segmentId}})
  })
  return affiliateDiscoveryState(db,tenantId,segmentId)
}

type CatalogSearchResult=Awaited<ReturnType<typeof searchAffiliateCatalog>>
type Search = (db:PrismaClient,tenantId:string,term:string,options?:{offset?:number})=>Promise<Omit<CatalogSearchResult,'rejected'|'pagination'> & Partial<Pick<CatalogSearchResult,'rejected'|'pagination'>>>
const running = new WeakSet<PrismaClient>()
export async function runAffiliateDiscovery(db: PrismaClient, search: Search = searchAffiliateCatalog, now = new Date(), scope?: {tenantId:string;segmentId:string}) {
  if (running.has(db)) return 0
  running.add(db)
  try {
    const missing = await db.affiliateSegment.findMany({where:{enabled:true,discovery:null,...(scope?{id:scope.segmentId,tenantId:scope.tenantId}:{})},select:{id:true,tenantId:true},take:20,orderBy:{id:'asc'}})
    if(missing.length) await db.affiliateDiscovery.createMany({data:missing.map(segment=>({segmentId:segment.id,tenantId:segment.tenantId,nextRunAt:now})),skipDuplicates:true})
    const available = {...scope,enabled:true,segment:{enabled:true},nextRunAt:{lte:now},OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lte:now}}]} satisfies Prisma.AffiliateDiscoveryWhereInput
    const row = await db.affiliateDiscovery.findFirst({where:available,include:{segment:{select:{name:true,updatedAt:true}}},orderBy:[{nextRunAt:'asc'},{segmentId:'asc'}]})
    if(!row) return 0
    const leaseToken = randomUUID(), leaseExpiresAt = new Date(now.getTime()+240_000)
    const guard = {segmentId:row.segmentId,tenantId:row.tenantId,configVersion:row.configVersion,segment:{enabled:true,updatedAt:row.segment.updatedAt}}
    const claim = await db.affiliateDiscovery.updateMany({where:{...available,...guard},data:{leaseToken,leaseExpiresAt,status:'RUNNING',runStartedAt:now,error:null}})
    if(!claim.count) return 0
    const owner = {...guard,enabled:true,leaseToken,leaseExpiresAt:{gt:new Date()}}
    try {
      const seeds=termsFor(row.terms,row.segment.name)
      const terms = row.expandedTerms.length?row.expandedTerms:planAffiliateDiscoveryTerms(seeds,(await Promise.all(seeds.map(term=>expandAffiliateTerms(term).catch(()=>[])))).flat())
      if(!row.expandedTerms.length) {
        const saved=await db.affiliateDiscovery.updateMany({where:{...owner,leaseExpiresAt:{gt:new Date()}},data:{expandedTerms:terms}})
        if(!saved.count)return 1
      }
      const cursor=row.cursor%terms.length, pageCursors=pageCursorsFor(row.pageCursors)
      const term=row.requestedTerm??terms[cursor], page=row.requestedPage??pageCursors[term]??1
      if(!terms.includes(term))throw new AffiliateCatalogError(400,'O termo solicitado não pertence à segmentação.')
      const result=await search(db,row.tenantId,term,{offset:(page-1)*20})
      const finished=new Date()
      const observations=await db.affiliatePriceObservation.findMany({where:{tenantId:row.tenantId,itemId:{in:result.products.map(p=>p.id)},day:{gte:new Date(finished.getTime()-30*86400000),lt:new Date(finished.toISOString().slice(0,10))}}})
      const products:DiscoveryProduct[]=result.products.map(product=>({...product,evaluation:evaluateAffiliateProduct(product,observations.filter(o=>o.itemId===product.id),finished),sourceTerm:term,sourcePage:page}))
      const nextCursor=row.requestedTerm?row.cursor:(cursor+1)%terms.length
      const nextPages=row.requestedTerm?pageCursors:{...pageCursors,[term]:page*20<result.counts.catalogsFound && result.counts.catalogsChecked>0?page+1:1}
      await db.$transaction(async tx=>{
        const current=await tx.affiliateDiscovery.findUniqueOrThrow({where:{segmentId:row.segmentId}})
        const queued=current.requestedTerm!==row.requestedTerm || current.requestedPage!==row.requestedPage
        const initialPages=await tx.affiliateDiscoveryPage.findMany({where:{tenantId:row.tenantId,segmentId:row.segmentId,page:1,term:{in:terms}},select:{term:true}})
        const initialized=new Set([...initialPages.map(p=>p.term),...(page===1?[term]:[])])
        const warmup=terms.some(value=>!initialized.has(value))
        const saved=await tx.affiliateDiscovery.updateMany({where:{...owner,leaseExpiresAt:{gt:finished}},data:{expandedTerms:terms,productsJson:products as unknown as Prisma.InputJsonValue,countsJson:result.counts,status:queued||warmup?'QUEUED':'READY',error:null,checkedAt:finished,cursor:nextCursor,pageCursors:nextPages,durationMs:finished.getTime()-now.getTime(),nextRunAt:new Date(finished.getTime()+(queued||warmup?30_000:INTERVAL)),leaseToken:null,leaseExpiresAt:null,...(queued?{}:{requestedTerm:null,requestedPage:null})}})
        if(!saved.count)return
        await tx.affiliateDiscoveryPage.upsert({where:{tenantId_segmentId_term_page:{tenantId:row.tenantId,segmentId:row.segmentId,term,page}},create:{tenantId:row.tenantId,segmentId:row.segmentId,term,page,productsJson:products as unknown as Prisma.InputJsonValue,countsJson:{...result.counts,rejected:result.rejected??[]},total:result.counts.catalogsFound,checkedAt:finished},update:{productsJson:products as unknown as Prisma.InputJsonValue,countsJson:{...result.counts,rejected:result.rejected??[]},total:result.counts.catalogsFound,checkedAt:finished}})
        for(const product of products)await tx.affiliatePriceObservation.upsert({where:{tenantId_itemId_day:{tenantId:row.tenantId,itemId:product.id,day:new Date(finished.toISOString().slice(0,10))}},create:{tenantId:row.tenantId,itemId:product.id,day:new Date(finished.toISOString().slice(0,10)),priceCents:product.priceCents,observedAt:finished},update:{}})
      })
    } catch(error) {
      const message = error instanceof AffiliateCatalogError ? error.message : 'Não foi possível atualizar as sugestões. A coleta tentará novamente.'
      const boundary=error instanceof AffiliateCatalogError && error.status===400
      await db.$transaction(async tx=>{
        const current=await tx.affiliateDiscovery.findUniqueOrThrow({where:{segmentId:row.segmentId}})
        const terms=current.expandedTerms.length?current.expandedTerms:termsFor(row.terms,row.segment.name)
        const pages=pageCursorsFor(row.pageCursors),term=row.requestedTerm??terms[row.cursor%terms.length]
        const page=row.requestedPage??pages[term]??1
        const saved=await tx.affiliateDiscovery.updateMany({where:{...owner,leaseExpiresAt:{gt:new Date()}},data:{status:'ERROR',error:message,...(boundary?{cursor:row.requestedTerm?row.cursor:(row.cursor+1)%terms.length,pageCursors:row.requestedTerm?pages:{...pages,[term]:1},requestedTerm:null,requestedPage:null}:{}),nextRunAt:new Date(Date.now()+INTERVAL),leaseToken:null,leaseExpiresAt:null}})
        if(!saved.count||!boundary)return
        if(page<=1)return
        const key={tenantId:row.tenantId,segmentId:row.segmentId,term,page:page-1}
        const previous=await tx.affiliateDiscoveryPage.findUnique({where:{tenantId_segmentId_term_page:key}})
        if(previous)await tx.affiliateDiscoveryPage.update({where:{tenantId_segmentId_term_page:key},data:{countsJson:{...(previous.countsJson as Prisma.JsonObject),providerBoundaryReached:true}}})
      })
    }
    return 1
  } finally { running.delete(db) }
}

export async function findDiscoveryCandidate(db:PrismaClient,tenantId:string,segmentId:string,itemId:string):Promise<DiscoveryProduct> {
  await segmentFor(db,tenantId,segmentId)
  if(await db.affiliateProductDecision.findUnique({where:{tenantId_segmentId_itemId:{tenantId,segmentId,itemId}}}))throw new AffiliateCatalogError(409,'Este produto já foi enviado ou descartado nesta segmentação.')
  const rows=await db.affiliateDiscoveryPage.findMany({where:{tenantId,segmentId,checkedAt:{gte:new Date(Date.now()-TTL)}},orderBy:{checkedAt:'desc'},take:500})
  for(const row of rows){const product=mergeDiscoveryProducts(row.productsJson,[],new Date()).find(p=>p.id===itemId);if(product)return product as DiscoveryProduct}
  throw new AffiliateCatalogError(404,'Produto não encontrado no cache atual desta segmentação. Atualize os produtos.')
}
export async function refreshAffiliateCandidate(db:PrismaClient,tenantId:string,candidate:DiscoveryProduct):Promise<DiscoveryProduct> {
  const product=await refreshAffiliateCatalogProduct(db,tenantId,candidate),now=new Date()
  const observations=await db.affiliatePriceObservation.findMany({where:{tenantId,itemId:product.id,day:{gte:new Date(now.getTime()-30*86400000),lt:new Date(now.toISOString().slice(0,10))}}})
  return {...product,evaluation:evaluateAffiliateProduct(product,observations,now),sourceTerm:candidate.sourceTerm,sourcePage:candidate.sourcePage}
}
export async function queueAffiliateDiscoveryPage(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,input:{term:string;page:number}) {
  const current=await affiliateDiscoveryState(db,tenantId,segmentId)
  if(!current.expandedTerms.includes(input.term))throw new AffiliateCatalogError(400,'Selecione um dos termos desta segmentação.')
  return queueAffiliateDiscovery(db,tenantId,actorId,segmentId,{...input,force:true})
}
