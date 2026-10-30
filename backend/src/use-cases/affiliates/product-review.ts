import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { env } from '@/env'
import { AffiliateError, imageUrl, marketUrl, offerMessage } from '@/domain/affiliates/contracts'
import { affiliateProductId, affiliateProductUrl, isShopeeProduct } from '@/domain/affiliates/shopee'
import { generateCatalogAffiliate } from '@/use-cases/@Affiliates/catalog'
import { findDiscoveryCandidate, generateAffiliateTitle, refreshAffiliateCandidate } from './discovery'
import { affiliateEligibleGroupWhere, affiliateGroupFingerprint, approveAffiliateBroadcast } from './deliveries'

const itemIdSchema = affiliateProductId
const previewSchema = z.object({
  version:z.literal(1),id:z.uuid(),tenantId:z.string(),actorId:z.string(),segmentId:z.string(),segmentRevision:z.string(),affiliateRevision:z.string(),
  expiresAt:z.number().int(),title:z.string().min(3).max(250),headline:z.string().min(8).max(140).optional(),productUrl:marketUrl,affiliateUrl:marketUrl,
  itemId:itemIdSchema,priceCents:z.number().int().positive().max(100_000_000),oldPriceCents:z.number().int().positive().max(100_000_000).nullable(),imageUrl,
  reportedDiscountPercent:z.number().int().min(1).max(100).nullable().optional(),
  oldPriceEstimated:z.boolean().optional(),
  checkedAt:z.iso.datetime(),message:z.string().min(1).max(4000),
  groupHash:z.string().regex(/^[a-f0-9]{64}$/),
}).strict()
type Preview = z.infer<typeof previewSchema>
const signature = (value:string) => createHmac('sha256',env.JWT_SECRET).update('affiliate-preview:v1:'+value).digest('base64url')

export function readAffiliateProductPreview(token:string,tenantId:string,actorId:string,segmentId:string):Preview {
  if(token.length>24000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new AffiliateError(400,'A prévia não é válida. Abra o produto novamente.')
  const [body,mac]=token.split('.'),expected=signature(body)
  if(mac.length!==expected.length || !timingSafeEqual(Buffer.from(mac),Buffer.from(expected))) throw new AffiliateError(400,'A prévia foi alterada. Abra o produto novamente.')
  let value:Preview
  try {value=previewSchema.parse(JSON.parse(Buffer.from(body,'base64url').toString('utf8')))} catch {throw new AffiliateError(400,'A prévia não é válida. Abra o produto novamente.')}
  if(value.tenantId!==tenantId || value.actorId!==actorId || value.segmentId!==segmentId) throw new AffiliateError(403,'A prévia pertence a outra operação.')
  return value
}
async function affiliateRevision(db:Pick<PrismaClient,'affiliateConnection'>,tenantId:string,itemId:string) {
  const provider=isShopeeProduct(itemId)?'SHOPEE':'MERCADO_LIVRE_SESSION'
  const row=await db.affiliateConnection.findUnique({where:{tenantId_provider:{tenantId,provider}}})
  const value=row?`${row.id}:${row.credentials}:${['CONFIGURED','CONNECTED'].includes(row.status)?'usable':row.status}`:`central:${process.env.AFFILIATE_TAG??''}:${process.env.AFFILIATE_PROFILE??''}:${process.env.AFFILIATE_SERVICE_KEY??''}`
  return createHash('sha256').update(value).digest('hex')
}
const defaults={candidate:findDiscoveryCandidate,refresh:refreshAffiliateCandidate,link:generateCatalogAffiliate,title:generateAffiliateTitle}
export async function previewAffiliateProduct(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,itemId:string,ports=defaults) {
  itemIdSchema.parse(itemId)
  const segment=await db.affiliateSegment.findFirst({where:{id:segmentId,tenantId,enabled:true}})
  if(!segment) throw new AffiliateError(404,'Segmentação ativa não encontrada.')
  const revision=await affiliateRevision(db,tenantId,itemId),candidate=await ports.candidate(db,tenantId,segmentId,itemId)
  const [product,link]=await Promise.all([ports.refresh(db,tenantId,candidate),ports.link(db,tenantId,actorId,affiliateProductUrl(candidate.productUrl).href)])
  if(product.id!==itemId || affiliateProductUrl(product.productUrl).href!==affiliateProductUrl(candidate.productUrl).href) throw new AffiliateError(409,'O anúncio mudou durante a consulta. Abra o produto novamente.')
  const generated=await ports.title(db,tenantId,product)
  const [current,groups,revisionAfter]=await Promise.all([
    db.affiliateSegment.findFirst({where:{id:segmentId,tenantId,enabled:true}}),
    db.affiliateGroup.findMany({where:affiliateEligibleGroupWhere(tenantId,segmentId),select:{id:true,name:true},orderBy:{sequence:'asc'}}),
    affiliateRevision(db,tenantId,itemId),
  ])
  if(!current || current.updatedAt.getTime()!==segment.updatedAt.getTime() || revisionAfter!==revision) throw new AffiliateError(409,'A segmentação ou a conta de afiliados mudou. Atualize a prévia.')
  const checkedAt=new Date(product.checkedAt),now=Date.now()
  if(!Number.isFinite(checkedAt.getTime()) || checkedAt.getTime()>now || now-checkedAt.getTime()>5*60_000) throw new AffiliateError(409,'Não foi possível confirmar um preço recente. Atualize a prévia.')
  const headline=generated.headline??'Confira esta opção para você ✨'
  const reportedDiscountPercent=isShopeeProduct(product.id)?product.reportedDiscountPercent??null:null
  const message=offerMessage({...product,reportedDiscountPercent,title:generated.title,headline,affiliateUrl:link.url,note:''})
  const payload=previewSchema.parse({version:1,id:randomUUID(),tenantId,actorId,segmentId,segmentRevision:current.updatedAt.toISOString(),affiliateRevision:revision,expiresAt:now+5*60_000,title:generated.title,headline,productUrl:product.productUrl,affiliateUrl:link.url,itemId,priceCents:product.priceCents,oldPriceCents:product.oldPriceCents,reportedDiscountPercent,oldPriceEstimated:product.oldPriceEstimated??false,imageUrl:product.imageUrl,checkedAt:product.checkedAt,message,groupHash:affiliateGroupFingerprint(groups)})
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url'),previewToken=body+'.'+signature(body)
  return {previewToken,expiresAt:new Date(payload.expiresAt).toISOString(),product,title:generated.title,headline,titleSource:generated.source,message,affiliateUrl:link.url,fullUrl:link.fullUrl,destinations:{segmentId,name:current.name,groups,count:groups.length},analysis:product.evaluation,priceChanged:candidate.priceCents!==product.priceCents}
}

export async function regenerateAffiliateProductTitle(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,token:string,ports=defaults) {
  const preview=readAffiliateProductPreview(token,tenantId,actorId,segmentId)
  const validate=async()=>{
    const [segment,revision,groups,decision]=await Promise.all([
      db.affiliateSegment.findFirst({where:{id:segmentId,tenantId,enabled:true}}),
      affiliateRevision(db,tenantId,preview.itemId),
      db.affiliateGroup.findMany({where:affiliateEligibleGroupWhere(tenantId,segmentId),select:{id:true,name:true},orderBy:{sequence:'asc'}}),
      db.affiliateProductDecision.findUnique({where:{tenantId_segmentId_itemId:{tenantId,segmentId,itemId:preview.itemId}}}),
    ])
    if(preview.expiresAt<=Date.now() || !segment || segment.updatedAt.toISOString()!==preview.segmentRevision) throw new AffiliateError(409,'A prévia expirou ou a segmentação mudou. Abra o produto novamente.')
    if(revision!==preview.affiliateRevision) throw new AffiliateError(409,'A conta de afiliados mudou. Abra o produto novamente.')
    if(affiliateGroupFingerprint(groups)!==preview.groupHash) throw new AffiliateError(409,'Os destinos mudaram. Abra o produto novamente.')
    if(decision) throw new AffiliateError(409,'Este produto já foi enviado ou descartado nesta segmentação.')
  }
  await validate()
  const candidate=await ports.candidate(db,tenantId,segmentId,preview.itemId)
  if(candidate.id!==preview.itemId || affiliateProductUrl(candidate.productUrl).href!==affiliateProductUrl(preview.productUrl).href) throw new AffiliateError(409,'O anúncio mudou. Abra o produto novamente.')
  const generated=await ports.title(db,tenantId,candidate,undefined,{title:preview.title,headline:preview.headline})
  if(generated.source!=='OPENAI' || (generated.title===preview.title && (!generated.headline || generated.headline===preview.headline))) throw new AffiliateError(503,'A IA não conseguiu gerar outra chamada. A prévia anterior foi mantida. Tente novamente.')
  await validate()
  const headline=generated.headline??preview.headline
  const message=offerMessage({...preview,title:generated.title,headline,note:''})
  const payload=previewSchema.parse({...preview,id:randomUUID(),title:generated.title,headline,message})
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url')
  return {previewToken:body+'.'+signature(body),title:payload.title,headline,titleSource:generated.source,message,expiresAt:new Date(payload.expiresAt).toISOString()}
}

export async function sendAffiliateProduct(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,token:string) {
  const preview=readAffiliateProductPreview(token,tenantId,actorId,segmentId)
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id = ${segmentId} AND "tenantId" = ${tenantId} FOR UPDATE`
    const existing=await tx.affiliateBroadcast.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:preview.id}},include:{_count:{select:{deliveries:true}}}})
    if(existing) return {broadcastId:existing.id,offerId:existing.offerId,groups:existing._count.deliveries}
    const segment=await tx.affiliateSegment.findFirst({where:{id:segmentId,tenantId,enabled:true}})
    if(!segment || segment.updatedAt.toISOString()!==preview.segmentRevision || preview.expiresAt<=Date.now()) throw new AffiliateError(409,'A prévia expirou ou a segmentação mudou. Atualize antes de enviar.')
    if(await affiliateRevision(tx,tenantId,preview.itemId)!==preview.affiliateRevision) throw new AffiliateError(409,'A conta de afiliados mudou. Atualize a prévia antes de enviar.')
    if(await tx.affiliateProductDecision.findUnique({where:{tenantId_segmentId_itemId:{tenantId,segmentId,itemId:preview.itemId}}})) throw new AffiliateError(409,'Este produto já foi enviado ou descartado nesta segmentação.')
    const offer=await tx.affiliateOffer.create({data:{tenantId,segmentId,title:preview.title,productUrl:preview.productUrl,affiliateUrl:preview.affiliateUrl,priceCents:preview.priceCents,oldPriceCents:preview.oldPriceCents,reportedDiscountPercent:preview.reportedDiscountPercent??null,oldPriceEstimated:preview.oldPriceEstimated??false,imageUrl:preview.imageUrl,note:'',checkedAt:new Date(preview.checkedAt)}})
    if(offerMessage({...offer,headline:preview.headline})!==preview.message) throw new AffiliateError(409,'A mensagem mudou. Atualize a prévia antes de enviar.')
    const broadcast=await approveAffiliateBroadcast(tx,tenantId,actorId,offer.id,{idempotencyKey:preview.id,expectedGroupHash:preview.groupHash,approvedMessage:preview.message})
    await tx.affiliateProductDecision.create({data:{tenantId,segmentId,itemId:preview.itemId,decision:'SENT',reason:'Envio aprovado pelo administrador.',actorId,broadcastId:broadcast.id,priceCents:preview.priceCents}})
    const groups=await tx.affiliateDelivery.count({where:{tenantId,broadcastId:broadcast.id}})
    return {broadcastId:broadcast.id,offerId:offer.id,groups}
  })
}

export async function decideAffiliateProduct(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,itemId:string,restore=false,reason='Descartado pelo administrador.') {
  itemIdSchema.parse(itemId)
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id = ${segmentId} AND "tenantId" = ${tenantId} FOR UPDATE`
    if(!await tx.affiliateSegment.count({where:{id:segmentId,tenantId}})) throw new AffiliateError(404,'Segmentação não encontrada.')
    const decision=await tx.affiliateProductDecision.findUnique({where:{tenantId_segmentId_itemId:{tenantId,segmentId,itemId}}})
    if(decision?.decision==='SENT') throw new AffiliateError(409,'O produto já possui um envio aprovado. Confira o histórico.')
    if(restore) await tx.affiliateProductDecision.deleteMany({where:{tenantId,segmentId,itemId,decision:'DISCARDED'}})
    else await tx.affiliateProductDecision.upsert({where:{tenantId_segmentId_itemId:{tenantId,segmentId,itemId}},create:{tenantId,segmentId,itemId,decision:'DISCARDED',reason,actorId},update:{decision:'DISCARDED',reason,actorId}})
    await tx.auditLog.create({data:{tenantId,actorId,action:restore?'affiliate.product.restored':'affiliate.product.discarded',entityType:'AffiliateProductDecision',entityId:itemId,after:{segmentId}}})
    return {saved:true}
  })
}
