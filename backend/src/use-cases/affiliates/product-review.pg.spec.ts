import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
import type { AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { affiliateBroadcastHistory, affiliateBroadcastStatus } from './broadcast-history'
import { decideAffiliateProduct, previewAffiliateProduct, readAffiliateProductPreview, regenerateAffiliateProductTitle, sendAffiliateProduct } from './product-review'
import { runAffiliateDeliveries } from './deliveries'

const url=process.env.AFFILIATE_DATABASE_URL
if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname) || new URL(url).pathname!=='/affiliate_ops_regression_20261028') throw new Error('Disposable affiliate review regression database required')
const db=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),otherTenant=randomUUID(),actorId=randomUUID()
let segmentId:string,instanceId:string,groupId:string
const baseProduct=()=>({id:'MLB123456',catalogId:'MLB123',title:'Árvore de Natal verde',productUrl:'https://www.mercadolivre.com.br/p/MLB123?wid=MLB123456',priceCents:2590,oldPriceCents:3990,imageUrl:'https://http2.mlstatic.com/fixture.jpg',checkedAt:new Date().toISOString(),oldPriceSource:'MERCADO_LIVRE' as const,reputation:{status:'GREEN' as const,level:'5_green'}})
const candidate=()=>{const product=baseProduct();return {...product,evaluation:evaluateAffiliateProduct(product,[]),sourceTerm:'Natal',sourcePage:1}}
const ports=()=>({candidate:vi.fn(async()=>({...candidate(),priceCents:2990})),refresh:vi.fn(async()=>candidate()),link:vi.fn(async()=>({url:'https://meli.la/fixture',fullUrl:'https://www.mercadolivre.com.br/social/test?matt_word=test&matt_tool=test&ref=test',tag:'test',profile:'test'})),title:vi.fn(async()=>({title:'Árvore de Natal verde',headline:'Uma árvore de Natal para sua sala 🎄',source:'OPENAI' as const}))})
const preview=()=>previewAffiliateProduct(db,tenantId,actorId,segmentId,'MLB123456',ports())
beforeAll(async()=>{
  await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'Review fixture'},{id:otherTenant,host:otherTenant+'.test',name:'Other fixture'}]})
  await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',passwordHash:'fixture'}})
})
beforeEach(async()=>{
  await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}});await db.affiliateConnection.deleteMany({where:{tenantId}})
  instanceId=(await db.affiliateInstance.create({data:{tenantId,name:'Fixture'}})).id
  segmentId=(await db.affiliateSegment.create({data:{tenantId,name:'Natal',slug:'natal',instanceId}})).id
  await db.affiliateSegmentInstance.create({data:{tenantId,segmentId,instanceId}})
  groupId=(await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId,jid:'123@g.us',name:'Natal #1',sequence:1}})).id
})
afterAll(async()=>{
  await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}});await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect()
})

describe('prévia e envio único no PostgreSQL',()=>{
  it('envia exatamente o título e a mensagem regenerados; prévia anterior não reaprova produto enviado',async()=>{
    const initial=await preview(),dependencies=ports()
    dependencies.title.mockResolvedValue({title:'Árvore verde de Natal',headline:'Sua sala com uma árvore de Natal 🎄',source:'OPENAI'})
    const regenerated=await regenerateAffiliateProductTitle(db,tenantId,actorId,segmentId,initial.previewToken,dependencies)
    expect(regenerated.message.startsWith('Sua sala com uma árvore de Natal 🎄\n*Árvore verde de Natal*')).toBe(true)
    const sent=await sendAffiliateProduct(db,tenantId,actorId,segmentId,regenerated.previewToken)
    expect(dependencies.refresh).not.toHaveBeenCalled();expect(dependencies.link).not.toHaveBeenCalled()
    expect((await db.affiliateBroadcast.findUniqueOrThrow({where:{id:sent.broadcastId}})).message).toBe(regenerated.message)
    expect((await db.affiliateOffer.findUniqueOrThrow({where:{id:sent.offerId}})).title).toBe(regenerated.title)
    await expect(sendAffiliateProduct(db,tenantId,actorId,segmentId,initial.previewToken)).rejects.toMatchObject({status:409})
    await expect(regenerateAffiliateProductTitle(db,tenantId,actorId,segmentId,regenerated.previewToken,dependencies)).rejects.toMatchObject({status:409})
    expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(1)
  })
  it('reconsulta preço e compõe prévia fiel sem salvar oferta ou aprovar envio',async()=>{
    const result=await preview()
    expect(result).toMatchObject({priceChanged:true,titleSource:'OPENAI',product:{priceCents:2590,oldPriceCents:3990},destinations:{count:1}})
    expect(result.message).toContain('25,90');expect(result.message).toContain('39,90');expect(result.message).toContain(result.affiliateUrl)
    expect(await db.affiliateOffer.count({where:{tenantId}})).toBe(0);expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(0)
    expect(()=>readAffiliateProductPreview(result.previewToken+'x',tenantId,actorId,segmentId)).toThrow()
    expect(()=>readAffiliateProductPreview(result.previewToken,otherTenant,actorId,segmentId)).toThrow()
    expect(()=>readAffiliateProductPreview(result.previewToken,tenantId,'other-admin',segmentId)).toThrow()
  })
  it('duplo clique aprova uma única mensagem para os destinos revisados; replay expirado não duplica',async()=>{
    await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId,jid:'456@g.us',name:'Natal #2',sequence:2}})
    const result=await preview()
    const [first,second]=await Promise.all([sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken),sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)])
    expect(first).toEqual(second);expect(first.groups).toBe(2)
    expect(await db.affiliateOffer.count({where:{tenantId}})).toBe(1);expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(1)
    expect((await db.affiliateBroadcast.findUniqueOrThrow({where:{id:first.broadcastId}})).message).toBe(result.message)
    expect((await db.affiliateProductDecision.findFirstOrThrow({where:{tenantId}})).decision).toBe('SENT')
    const now=vi.spyOn(Date,'now').mockReturnValue(Date.now()+600_000)
    try {expect(await sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)).toEqual(first)} finally {now.mockRestore()}
  })
  it('recusa destinos ativados depois da prévia sem deixar oferta ou distribuição órfã',async()=>{
    const group=await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId,jid:'456@g.us',name:'Natal #2',sequence:2,enabled:false}})
    const result=await preview()
    await db.affiliateGroup.update({where:{id:group.id},data:{enabled:true}})
    await expect(sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)).rejects.toMatchObject({status:409})
    expect(await db.affiliateOffer.count({where:{tenantId}})).toBe(0);expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(0)
  })
  it('descartar invalida envio, restaurar permite revisão e envio; enviado não pode ser restaurado',async()=>{
    const result=await preview()
    await decideAffiliateProduct(db,tenantId,actorId,segmentId,'MLB123456')
    await expect(sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)).rejects.toMatchObject({status:409})
    await decideAffiliateProduct(db,tenantId,actorId,segmentId,'MLB123456',true)
    await sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)
    await expect(decideAffiliateProduct(db,tenantId,actorId,segmentId,'MLB123456',true)).rejects.toMatchObject({status:409})
  })
  it('expiração, pausa e mudança da conta recusam a aprovação',async()=>{
    const result=await preview()
    const now=vi.spyOn(Date,'now').mockReturnValue(Date.now()+600_000)
    try {await expect(sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)).rejects.toMatchObject({status:409})} finally {now.mockRestore()}
    await db.affiliateSegment.update({where:{id:segmentId},data:{enabled:false}})
    await expect(sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)).rejects.toMatchObject({status:409})
    await db.affiliateSegment.update({where:{id:segmentId},data:{enabled:true}})
    const current=await preview()
    await db.affiliateConnection.create({data:{tenantId,provider:'MERCADO_LIVRE_SESSION',credentials:'fixture',status:'DISCONNECTED'}})
    await expect(sendAffiliateProduct(db,tenantId,actorId,segmentId,current.previewToken)).rejects.toMatchObject({status:409})
    expect(await db.affiliateOffer.count({where:{tenantId}})).toBe(0)
  })
  it('histórico é imutável após editar a oferta e o processamento respeita o escopo do envio',async()=>{
    const result=await preview(),sent=await sendAffiliateProduct(db,tenantId,actorId,segmentId,result.previewToken)
    const remote={status:async()=>({state:'open'}),group:async(jid:string)=>({jid,name:'Natal',participantCount:1,description:'',imageUrl:null}),groups:async()=>[],invite:async()=>'',create:async()=>'',picture:async()=>{},describe:async()=>{},send:vi.fn(async()=> 'provider-message')} satisfies AffiliateWhatsApp
    await runAffiliateDeliveries(db,()=>remote,new Date(),{tenantId,broadcastId:'not-this-broadcast'})
    expect(remote.send).not.toHaveBeenCalled()
    await runAffiliateDeliveries(db,()=>remote,new Date(),{tenantId,broadcastId:sent.broadcastId})
    expect(remote.send).toHaveBeenCalledOnce();expect(remote.send).toHaveBeenCalledWith('123@g.us',result.message,result.product.imageUrl)
    expect((await affiliateBroadcastStatus(db,tenantId,sent.broadcastId)).counts).toMatchObject({sent:1,pending:0})
    await db.affiliateOffer.update({where:{id:sent.offerId},data:{title:'Título alterado',priceCents:999,imageUrl:null}})
    const history=await affiliateBroadcastHistory(db,tenantId,{limit:1,segmentId})
    expect(history.broadcasts[0]).toMatchObject({snapshotAvailable:true,offer:{title:result.title,priceCents:2590,imageUrl:result.product.imageUrl}})
    await expect(affiliateBroadcastStatus(db,otherTenant,sent.broadcastId)).rejects.toMatchObject({status:404})
    await expect(affiliateBroadcastHistory(db,otherTenant,{limit:1,cursor:sent.broadcastId})).rejects.toMatchObject({status:400})
    expect((await db.affiliateDelivery.findFirstOrThrow({where:{tenantId,groupId}})).state).toBe('SENT')
  })
})
