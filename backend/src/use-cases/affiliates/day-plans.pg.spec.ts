import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
import { createAffiliateDayPlan, buildAffiliateDayPlan, approveAffiliateDayPlan, readAffiliateDayPlan, cancelAffiliateDayPlan, runAffiliateDayPlans, type DayPlanPorts } from './day-plans'
import { previewAffiliateProduct, sendAffiliateProduct } from './product-review'
import { affiliateDiscoveryState } from './discovery'
import { affiliateProductHistory } from './product-history'
import { runAffiliateDeliveries } from './deliveries'
import type { AffiliateWhatsApp } from '@/adapters/affiliates/evolution'

const url=process.env.AFFILIATE_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!new URL(url).pathname.includes('regression'))throw new Error('Disposable local regression database required')
const db=new PrismaClient({datasourceUrl:url}),other=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),otherTenant=randomUUID(),actorId=randomUUID()
let segmentId:string,instanceId:string
const product=(id='MLB123456',discount=true)=>{const p={id,catalogId:'MLB999999',title:'Árvore de Natal verde',productUrl:`https://www.mercadolivre.com.br/p/MLB999999?wid=${id}`,priceCents:2590,oldPriceCents:discount?3990:null,imageUrl:'https://http2.mlstatic.com/fixture.jpg',checkedAt:new Date().toISOString(),oldPriceSource:'MERCADO_LIVRE' as const,reputation:{status:'GREEN' as const,level:'5_green'}};return {...p,evaluation:evaluateAffiliateProduct(p,[]),sourceTerm:'Natal',sourcePage:1}}
const input=()=>({idempotencyKey:randomUUID(),day:new Date(Date.now()+86400000).toISOString().slice(0,10),start:'09:00',end:'21:00',count:2})
function dependencies():DayPlanPorts{
  const candidates=vi.fn(async()=>[product(),product('MLB234567',false)].map(p=>({...p,sentCount:0,pendingCount:0,lastSentAt:null})))
  return {candidates,order:vi.fn(async()=>['MLB234567','MLB123456']),refresh:vi.fn(async(_db,_tenant,p)=>{expect(p.catalogId).toBe('MLB999999');return {...p,checkedAt:new Date().toISOString()}}),prepare:vi.fn(async(client,tenant,actor,segment,itemId)=>{
    const p=(await candidates()).find(p=>p.id===itemId)!
    return previewAffiliateProduct(client,tenant,actor,segment,itemId,{candidate:async()=>p,refresh:async()=>p,link:async()=>({url:'https://meli.la/fixture',fullUrl:'https://meli.la/fixture',tag:'fixture',profile:'fixture'}),title:async()=>({title:p.title,source:'ORIGINAL'})})
  })}}
async function clean(){await db.affiliateScheduleBatch.deleteMany({where:{tenantId}});await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}})}
beforeAll(async()=>{await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'Planner'},{id:otherTenant,host:otherTenant+'.test',name:'Other'}]});await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',status:'ACTIVE',passwordHash:'fixture'}})})
beforeEach(async()=>{await clean();instanceId=(await db.affiliateInstance.create({data:{tenantId,name:'Fixture'}})).id;segmentId=(await db.affiliateSegment.create({data:{tenantId,name:'Natal',slug:'natal',instanceId}})).id;await db.affiliateSegmentInstance.create({data:{tenantId,segmentId,instanceId}});await db.affiliateGroup.createMany({data:[1,2].map(n=>({tenantId,segmentId,instanceId,jid:`${n}23@g.us`,name:`Natal #${n}`,sequence:n}))})})
afterAll(async()=>{await clean();await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect();await other.$disconnect()})
async function draft(ports=dependencies(),value=input()){
  const batch=await createAffiliateDayPlan(db,tenantId,actorId,segmentId,value)
  await buildAffiliateDayPlan(db,{tenantId,id:batch.id},ports)
  return {id:batch.id,ports,value,plan:await readAffiliateDayPlan(db,tenantId,segmentId,batch.id)}
}
it('prepara desconto primeiro e revisão exata sem gerar entregas; isola tenant e ator',async()=>{
  const {plan,id,value}=await draft()
  expect(plan.status).toBe('DRAFT');expect(plan.entries.map(e=>e.itemId)).toEqual(['MLB123456','MLB234567'])
  expect(plan.summary).toMatchObject({offers:2,groups:2,totalMessages:4,intervalMinutes:720})
  expect(plan.entries[0].message).toMatch(/^\*Árvore/);expect(plan.entries[0].message).toContain('🔥');expect(plan.entries[0].message).not.toContain('Preço e estoque')
  expect(await db.affiliateDelivery.count({where:{tenantId}})).toBe(0)
  await expect(readAffiliateDayPlan(db,otherTenant,segmentId,id)).rejects.toMatchObject({status:404})
  await expect(approveAffiliateDayPlan(db,tenantId,'other-actor',segmentId,id)).rejects.toMatchObject({status:403})
  expect((await createAffiliateDayPlan(db,tenantId,actorId,segmentId,value)).id).toBe(id)
  await expect(createAffiliateDayPlan(db,tenantId,actorId,segmentId,{...value,count:1})).rejects.toMatchObject({status:409})
  const approvals=await Promise.all([approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id),approveAffiliateDayPlan(other,tenantId,actorId,segmentId,id)])
  expect(approvals.map(a=>a.status)).toEqual(['APPROVED','APPROVED'])
  expect(await db.affiliateDelivery.count({where:{tenantId}})).toBe(0)
})
it('agenda seleção manual conjunta Shopee e ML preservando catálogo, percentual e links de cada fonte',async()=>{
  const ports=dependencies(),shoe={...product(),provider:'SHOPEE' as const,id:'SHP123_456',catalogId:'SHP123_456',productUrl:'https://shopee.com.br/product/123/456',priceCents:2130,oldPriceCents:3492,reportedDiscountPercent:39,oldPriceEstimated:true,oldPriceSource:'SHOPEE_ESTIMATED' as const,sentCount:0,pendingCount:0,lastSentAt:null}
  vi.mocked(ports.candidates).mockResolvedValue([shoe,{...product(),sentCount:0,pendingCount:0,lastSentAt:null}])
  ports.prepare=async(client,tenant,actor,segment,itemId)=>{
    const p=itemId===shoe.id?shoe:product()
    const link=itemId===shoe.id?'https://s.shopee.com.br/fixture':'https://meli.la/fixture'
    return previewAffiliateProduct(client,tenant,actor,segment,itemId,{candidate:async()=>p,refresh:async()=>p,link:async()=>({url:link,fullUrl:link,tag:'fixture',profile:'fixture'}),title:async()=>({title:p.title,source:'ORIGINAL'})})
  }
  ports.refresh=async(_client,_tenant,p)=>({...p,checkedAt:new Date().toISOString()})
  const value={...input(),itemIds:[shoe.id,product().id]}
  const {plan,id}=await draft(ports,value)
  expect(plan.entries.map(e=>e.itemId)).toEqual(value.itemIds)
  expect(plan.entries[0].message).toContain('*39% OFF*');expect(plan.entries[0].affiliateUrl).toBe('https://s.shopee.com.br/fixture')
  await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  await db.affiliateScheduledOffer.updateMany({where:{batchId:id},data:{scheduledAt:new Date()}})
  await runAffiliateDayPlans(db,ports,{tenantId,batchId:id})
  expect(await db.affiliateOffer.findFirst({where:{tenantId,itemId:shoe.id}})).toMatchObject({reportedDiscountPercent:39,oldPriceEstimated:true,affiliateUrl:'https://s.shopee.com.br/fixture'})
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(2)
})
it('retoma construção após lease perdido e permite remover antes de aceitar; cancelamento impede disparo',async()=>{
  const ports=dependencies(),batch=await createAffiliateDayPlan(db,tenantId,actorId,segmentId,input())
  await db.affiliateScheduleBatch.update({where:{id:batch.id},data:{leaseToken:'interrupted',leaseExpiresAt:new Date(Date.now()-1)}})
  await Promise.all([buildAffiliateDayPlan(db,{tenantId,id:batch.id},ports),buildAffiliateDayPlan(other,{tenantId,id:batch.id},ports)])
  expect(ports.prepare).toHaveBeenCalledTimes(2)
  const plan=await readAffiliateDayPlan(db,tenantId,segmentId,batch.id)
  await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,batch.id,plan.entries[1].id)
  await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,batch.id)
  await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,batch.id)
  expect(await runAffiliateDayPlans(db,ports,{tenantId,batchId:batch.id},new Date(Date.now()+86400000))).toBe(0)
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(0)
})
it('bloqueia mudança de preço e de destinatários, expiração e aprovação concorrente do mesmo produto',async()=>{
  const {id,ports}=await draft()
  await db.affiliateGroup.updateMany({where:{tenantId,sequence:2},data:{enabled:false}})
  await expect(approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)).rejects.toMatchObject({status:409})
  await db.affiliateGroup.updateMany({where:{tenantId},data:{enabled:true}})
  await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  const second=await draft()
  await expect(approveAffiliateDayPlan(db,tenantId,actorId,segmentId,second.id)).rejects.toMatchObject({status:409})
  await db.affiliateScheduleBatch.update({where:{id:second.id},data:{expiresAt:new Date(Date.now()-1)}})
  await expect(approveAffiliateDayPlan(db,tenantId,actorId,segmentId,second.id)).rejects.toMatchObject({status:409})
  await db.affiliateScheduledOffer.updateMany({where:{batchId:id},data:{scheduledAt:new Date()}})
  ports.refresh=vi.fn(async(_db,_tenant,p)=>({...p,priceCents:9999,checkedAt:new Date().toISOString()}))
  await runAffiliateDayPlans(db,ports,{tenantId,batchId:id})
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(0)
  expect((await readAffiliateDayPlan(db,tenantId,segmentId,id)).entries.every(e=>e.state==='FAILED'&&e.error?.includes('mudou'))).toBe(true)
})
it('reconfere no horário, enfileira uma única vez e conta envios confirmados sem sumir da lista',async()=>{
  const {id,ports}=await draft()
  await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  await db.affiliateScheduledOffer.updateMany({where:{batchId:id},data:{scheduledAt:new Date()}})
  await Promise.all([runAffiliateDayPlans(db,ports,{tenantId,batchId:id}),runAffiliateDayPlans(other,ports,{tenantId,batchId:id})])
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(2)
  expect(await db.affiliateDelivery.count({where:{tenantId}})).toBe(4)
  const pending=await affiliateProductHistory(db,tenantId,segmentId,[product()]);expect(pending[0]).toMatchObject({sentCount:0,pendingCount:1})
  const sent=vi.fn(async()=> 'fixture-message'),remote={status:async()=>({state:'open'}),group:async(jid:string)=>({jid,name:'Natal',participantCount:2,description:'',imageUrl:null}),send:sent} as unknown as AffiliateWhatsApp
  for(let i=0;i<4;i++){await db.affiliateInstance.update({where:{id:instanceId},data:{nextSendAt:new Date(Date.now()-1)}});await runAffiliateDeliveries(db,()=>remote,new Date())}
  expect(sent).toHaveBeenCalledTimes(4)
  const history=await affiliateProductHistory(db,tenantId,segmentId,[product()]);expect(history[0]).toMatchObject({sentCount:1,pendingCount:0})
  const discovery=await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})
  expect(discovery.products.find(p=>p.id===product().id)).toMatchObject({sentCount:1,decision:'SENT',catalogId:'MLB999999'})
  // A fresh review can intentionally resend, while old approvals remain idempotent.
  await new Promise(resolve=>setTimeout(resolve,5))
  const preview=await ports.prepare(db,tenantId,actorId,segmentId,product().id)
  await sendAffiliateProduct(db,tenantId,actorId,segmentId,preview.previewToken)
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(3)
  await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  expect(await db.affiliateDelivery.count({where:{tenantId,state:'SENT'}})).toBe(4)
})
