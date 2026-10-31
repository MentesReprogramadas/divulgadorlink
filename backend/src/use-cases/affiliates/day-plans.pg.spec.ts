import { randomUUID,createHmac } from 'node:crypto'
import { PrismaClient, type Prisma } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { offerMessage } from '@/domain/affiliates/contracts'
import type { DayPlanInput } from '@/domain/affiliates/day-plan'
import { evaluateAffiliateProduct } from '@/domain/affiliates/evaluation'
import { createAffiliateDayPlan, buildAffiliateDayPlan, approveAffiliateDayPlan, readAffiliateDayPlan, cancelAffiliateDayPlan, runAffiliateDayPlans, retryAffiliateDayPlan, type DayPlanPorts } from './day-plans'
import { previewAffiliateProduct, readAffiliateProductPreview, sendAffiliateProduct } from './product-review'
import { affiliateDiscoveryState } from './discovery'
import { affiliateProductHistory } from './product-history'
import { runAffiliateDeliveries } from './deliveries'
import type { AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'

const url=process.env.AFFILIATE_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!new URL(url).pathname.includes('regression'))throw new Error('Disposable local regression database required')
const db=new PrismaClient({datasourceUrl:url}),other=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),otherTenant=randomUUID(),actorId=randomUUID()
let segmentId:string,instanceId:string
const product=(id='MLB123456',discount=true)=>{const p={id,catalogId:id==='MLB123456'?'MLB999999':'MLB888888',title:id==='MLB123456'?'Árvore de Natal verde':'Cascata de Natal 100 LEDs',productUrl:`https://www.mercadolivre.com.br/p/MLB999999?wid=${id}`,priceCents:2590,oldPriceCents:discount?3990:null,imageUrl:'https://http2.mlstatic.com/fixture.jpg',checkedAt:new Date().toISOString(),oldPriceSource:'MERCADO_LIVRE' as const,reputation:{status:'GREEN' as const,level:'5_green'}};return {...p,evaluation:evaluateAffiliateProduct(p,[]),sourceTerm:'Natal',sourcePage:1}}
const input=()=>({idempotencyKey:randomUUID(),day:new Date(Date.now()+86400000).toISOString().slice(0,10),start:'09:00',end:'21:00',count:2})
function dependencies():DayPlanPorts{
  const candidates=vi.fn(async()=>[product(),product('MLB234567',false)].map(p=>({...p,sentCount:0,pendingCount:0,lastSentAt:null})))
  return {candidates,order:vi.fn(async()=>['MLB234567','MLB123456']),refresh:vi.fn(async(_db,_tenant,p)=>{expect(p.catalogId).toBe(p.id==='MLB123456'?'MLB999999':'MLB888888');return {...p,checkedAt:new Date().toISOString()}}),prepare:vi.fn(async(client,tenant,actor,segment,itemId)=>{
    const p=(await candidates()).find(p=>p.id===itemId)!
    return previewAffiliateProduct(client,tenant,actor,segment,itemId,{candidate:async()=>p,refresh:async()=>p,link:async()=>({url:'https://meli.la/fixture',fullUrl:'https://meli.la/fixture',tag:'fixture',profile:'fixture'}),title:async()=>({title:p.title,source:'ORIGINAL'})})
  })}}
async function clean(){await db.affiliateScheduleBatch.deleteMany({where:{tenantId}});await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}})}
beforeAll(async()=>{await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'Planner'},{id:otherTenant,host:otherTenant+'.test',name:'Other'}]});await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',status:'ACTIVE',passwordHash:'fixture'}})})
beforeEach(async()=>{await clean();instanceId=(await db.affiliateInstance.create({data:{tenantId,name:'Fixture'}})).id;segmentId=(await db.affiliateSegment.create({data:{tenantId,name:'Natal',slug:'natal',instanceId}})).id;await db.affiliateSegmentInstance.create({data:{tenantId,segmentId,instanceId}});await db.affiliateGroup.createMany({data:[1,2].map(n=>({tenantId,segmentId,instanceId,jid:`${n}23@g.us`,name:`Natal #${n}`,sequence:n}))})})
afterAll(async()=>{await clean();await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect();await other.$disconnect()})
async function draft(ports=dependencies(),value:DayPlanInput=input()){
  const batch=await createAffiliateDayPlan(db,tenantId,actorId,segmentId,value)
  await buildAffiliateDayPlan(db,{tenantId,id:batch.id},ports)
  return {id:batch.id,ports,value,plan:await readAffiliateDayPlan(db,tenantId,segmentId,batch.id)}
}
it('repete apenas falha transitória, prepara sem rajada e mantém a foto do item não conferido',async()=>{
  const ports=dependencies(),prepare=ports.prepare,attempts=new Map<string,number>();let active=0,maxActive=0
  ports.prepare=async(...args)=>{
    active++;maxActive=Math.max(maxActive,active)
    const itemId=args[4],count=(attempts.get(itemId)??0)+1;attempts.set(itemId,count)
    try{
      if(itemId==='MLB234567')throw new AffiliateCatalogError(409,'A loja não confirmou um preço atual deste produto.')
      if(count===1)throw new AffiliateCatalogError(429,'A loja limitou as consultas. Aguarde alguns instantes.')
      return await prepare(...args)
    }finally{active--}
  }
  const {plan}=await draft(ports)
  expect(maxActive).toBe(1);expect(attempts.get('MLB123456')).toBe(2);expect(attempts.get('MLB234567')).toBe(1)
  const failed=plan.entries.find(e=>e.state==='FAILED')!
  expect(failed.product?.imageUrl).toBe(product().imageUrl)
  expect(failed.error).toContain('preço atual');expect(failed.message).toBeUndefined();expect(plan.summary.offers).toBe(1)
})
it('reconfere uma falha ou todas sem refazer itens prontos, trocar identidade ou aprovar envios',async()=>{
  const ports=dependencies(),prepare=ports.prepare
  ports.prepare=vi.fn<DayPlanPorts['prepare']>(async(...args)=>{if(args[4]==='MLB234567')throw new AffiliateCatalogError(409,'Falha temporária');return prepare(...args)})
  const {id,plan}=await draft(ports),failed=plan.entries.find(e=>e.state==='FAILED')!,ready=plan.entries.find(e=>e.state==='READY')!
  const before=await db.affiliateScheduledOffer.findUniqueOrThrow({where:{id:ready.id}})
  await expect(retryAffiliateDayPlan(db,otherTenant,actorId,segmentId,id,failed.id)).rejects.toMatchObject({status:404})
  await expect(retryAffiliateDayPlan(db,tenantId,'other-admin',segmentId,id,failed.id)).rejects.toMatchObject({status:403})
  vi.mocked(prepare).mockClear();ports.prepare=prepare
  await retryAffiliateDayPlan(db,tenantId,actorId,segmentId,id,failed.id)
  await retryAffiliateDayPlan(db,tenantId,actorId,segmentId,id,failed.id)
  await buildAffiliateDayPlan(db,{tenantId,id},ports)
  expect(ports.prepare).toHaveBeenCalledTimes(1)
  expect(ports.order).toHaveBeenCalledTimes(1)
  const after=await readAffiliateDayPlan(db,tenantId,segmentId,id)
  expect(after.status).toBe('DRAFT');expect(after.summary.offers).toBe(2)
  expect(after.entries.map(e=>e.id)).toEqual(plan.entries.map(e=>e.id))
  expect((await db.affiliateScheduledOffer.findUniqueOrThrow({where:{id:ready.id}})).snapshot).toEqual(before.snapshot)
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(0)
  await db.affiliateScheduledOffer.updateMany({where:{batchId:id},data:{state:'FAILED'}})
  await retryAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  await buildAffiliateDayPlan(db,{tenantId,id},ports)
  expect((await readAffiliateDayPlan(db,tenantId,segmentId,id)).summary.offers).toBe(2)
})
it('envia produto pet pelo título integral mesmo quando o título curto não contém a espécie',async()=>{
  await db.affiliateSegment.update({where:{id:segmentId},data:{name:'Pets'}})
  const ports=dependencies(),p={...product(),title:'Brinquedo Interativo Bola Mordedor Resistente Borracha Natural para cachorro',sentCount:0,pendingCount:0,lastSentAt:null}
  vi.mocked(ports.candidates).mockResolvedValue([p])
  ports.prepare=async(client,tenant,actor,segment,itemId)=>previewAffiliateProduct(client,tenant,actor,segment,itemId,{candidate:async()=>p,refresh:async()=>p,link:async()=>({url:'https://meli.la/fixture',fullUrl:'https://meli.la/fixture',tag:'fixture',profile:'fixture'}),title:async()=>({title:'Brinquedo Interativo Bola Mordedor',source:'ORIGINAL'})})
  const {id}=await draft(ports)
  await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  await db.affiliateScheduledOffer.updateMany({where:{batchId:id},data:{scheduledAt:new Date()}})
  await runAffiliateDayPlans(db,ports,{tenantId,batchId:id})
  const sent=vi.fn(async()=> 'fixture-message'),remote={status:async()=>({state:'open'}),group:async(jid:string)=>({jid,name:'Pets',participantCount:2,description:'',imageUrl:null}),send:sent} as unknown as AffiliateWhatsApp
  for(let i=0;i<2;i++){await db.affiliateInstance.update({where:{id:instanceId},data:{nextSendAt:new Date(Date.now()-1)}});await runAffiliateDeliveries(db,()=>remote,new Date())}
  expect(sent).toHaveBeenCalledTimes(2)
  expect((await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})).products.some(item=>item.id===p.id)).toBe(true)
})
it('deduplica anúncios no automático sem substituir a escolha manual de um vendedor',async()=>{
 const ports=dependencies(),a=product(),b={...a,id:'MLB345678',catalogId:'MLB777777',priceCents:3000}
 vi.mocked(ports.candidates).mockResolvedValue([{...a,sentCount:0,pendingCount:0,lastSentAt:null},{...b,sentCount:0,pendingCount:0,lastSentAt:null}])
 const auto=await draft(ports)
 expect(auto.plan.entries).toHaveLength(1)
 await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,auto.id)
 const manual=await draft(ports,{...input(),count:1,itemIds:[b.id]})
 expect(manual.plan.entries.map(e=>e.itemId)).toEqual([b.id])
 await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,manual.id)
 const repeated=await draft(ports,{...input(),itemIds:[a.id,b.id]})
 expect(repeated.plan.status).toBe('FAILED');expect(repeated.plan.error).toContain('mesmo produto')
})
it('revalida produtos equivalentes entre dois rascunhos dentro do bloqueio da aprovação',async()=>{
 const first=await draft()
 const ports=dependencies(),original=product(),variant={...original,id:'MLB345678',catalogId:'MLB777777',sentCount:0,pendingCount:0,lastSentAt:null}
 vi.mocked(ports.candidates).mockResolvedValue([variant])
 const second=await draft(ports,{...input(),count:1})
 expect(second.plan.status).toBe('DRAFT')
 await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,first.id)
 await expect(approveAffiliateDayPlan(db,tenantId,actorId,segmentId,second.id)).rejects.toMatchObject({status:409})
})
it('continua enviando a mensagem antiga assinada sem acrescentar chamada após a atualização',async()=>{
 const {id,ports}=await draft(),entry=await db.affiliateScheduledOffer.findFirstOrThrow({where:{batchId:id,itemId:product().id}})
 const saved=entry.snapshot as Prisma.JsonObject,payload=readAffiliateProductPreview(String(saved.previewToken),tenantId,actorId,segmentId)
 delete payload.showHeadline;payload.message=offerMessage({...payload,note:''})
 const body=Buffer.from(JSON.stringify(payload)).toString('base64url'),mac=createHmac('sha256',process.env.JWT_SECRET!).update('affiliate-preview:v1:'+body).digest('base64url')
 await db.affiliateScheduledOffer.update({where:{id:entry.id},data:{snapshot:{...saved,previewToken:body+'.'+mac,message:payload.message}}})
 await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
 await db.affiliateScheduledOffer.updateMany({where:{batchId:id},data:{scheduledAt:new Date()}})
 await runAffiliateDayPlans(db,ports,{tenantId,batchId:id})
 expect((await db.affiliateBroadcast.findFirstOrThrow({where:{tenantId,offer:{itemId:product().id}}})).message).toBe(payload.message)
 expect(payload.message.startsWith('*')).toBe(true)
})
it('mantém presentes em até 20% das ofertas prontas mesmo quando uma oferta natalina falha',async()=>{
 const ports=dependencies(),candidates=[1,2,3,4,5].map(i=>({...product('MLB90000'+i),catalogId:'MLB90000'+i,title:i===5?'Fone Bluetooth JBL':'Enfeite de Natal modelo '+i,sentCount:0,pendingCount:0,lastSentAt:null}))
 vi.mocked(ports.candidates).mockResolvedValue(candidates)
 const prepare=ports.prepare
 ports.prepare=async(...args)=>{if(args[4]==='MLB900001')throw new AffiliateCatalogError(409,'Não foi possível confirmar este anúncio.');return prepare(...args)}
 const {plan}=await draft(ports,{...input(),count:5,includeGiftIdeas:true})
 const ready=plan.entries.filter(e=>e.state==='READY')
 expect(ready).toHaveLength(3);expect(ready.every(e=>e.kind==='THEME')).toBe(true)
 expect(plan.entries.find(e=>e.itemId==='MLB900005')?.state).toBe('CANCELLED')
})
it('não transforma um item natalino em presente genérico quando o catálogo muda o título',async()=>{
 const ports=dependencies(),candidates=await ports.candidates(db,tenantId,segmentId)
 ports.prepare=async(client,tenant,actor,segment,itemId)=>{
  const p=candidates.find(p=>p.id===itemId)!,fresh=itemId===product().id?{...p,title:'Fone Bluetooth JBL'}:p
  return previewAffiliateProduct(client,tenant,actor,segment,itemId,{candidate:async()=>p,refresh:async()=>fresh,link:async()=>({url:'https://meli.la/fixture',fullUrl:'https://meli.la/fixture',tag:'fixture',profile:'fixture'}),title:async()=>({title:fresh.title,source:'ORIGINAL'})})
 }
 const {plan}=await draft(ports)
 expect(plan.entries.find(e=>e.itemId===product().id)).toMatchObject({state:'FAILED',error:expect.stringContaining('mudou de contexto')})
 expect(plan.summary.offers).toBe(1)
})
it('revalida a proporção de presentes quando o administrador remove itens natalinos da revisão',async()=>{
 const ports=dependencies(),candidates=[1,2,3,4,5].map(i=>({...product('MLB95000'+i),catalogId:'MLB95000'+i,title:i===5?'Fone Bluetooth JBL':'Enfeite de Natal modelo '+i,sentCount:0,pendingCount:0,lastSentAt:null}))
 vi.mocked(ports.candidates).mockResolvedValue(candidates)
 const {id,plan}=await draft(ports,{...input(),count:5,includeGiftIdeas:true})
 expect(plan.summary.offers).toBe(5)
 const native=plan.entries.find(e=>e.kind==='THEME')!
 await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,id,native.id)
 await expect(approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)).rejects.toThrow('20%')
 expect(await db.affiliateDelivery.count({where:{tenantId}})).toBe(0)
})
it('remove infantis de rascunhos antigos e impede o processamento de um lote antigo já aprovado',async()=>{
  await db.affiliateSegment.update({where:{id:segmentId},data:{name:'Geral'}})
  const ports=dependencies()
  vi.mocked(ports.candidates).mockResolvedValue([{...product(),title:'Ração para gato',sentCount:0,pendingCount:0,lastSentAt:null},{...product('MLB234567'),title:'Chocalho multifuncional para bebês e brinquedo para morder',sentCount:0,pendingCount:0,lastSentAt:null}])
  const {id}=await draft(ports)
  const segment=await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})
  await db.affiliateSegment.update({where:{id:segmentId},data:{name:'Pets',updatedAt:segment.updatedAt}})
  const read=await readAffiliateDayPlan(db,tenantId,segmentId,id)
  expect(read.entries.map(e=>e.itemId)).toEqual(['MLB123456']);expect(read.summary.offers).toBe(1)
  await approveAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  expect((await db.affiliateScheduledOffer.findFirstOrThrow({where:{batchId:id,itemId:'MLB234567'}})).state).toBe('CANCELLED')
  await db.affiliateScheduledOffer.updateMany({where:{batchId:id,itemId:'MLB234567'},data:{state:'PENDING',scheduledAt:new Date()}})
  await runAffiliateDayPlans(db,ports,{tenantId,batchId:id})
  expect((await db.affiliateScheduledOffer.findFirstOrThrow({where:{batchId:id,itemId:'MLB234567'}})).state).toBe('FAILED')
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(0)
})
it('prepara desconto primeiro e revisão exata sem gerar entregas; isola tenant e ator',async()=>{
  const {plan,id,value}=await draft()
  expect(plan.status).toBe('DRAFT');expect(plan.entries.map(e=>e.itemId)).toEqual(['MLB123456','MLB234567'])
  expect(plan.summary).toMatchObject({offers:2,groups:2,totalMessages:4,intervalMinutes:720})
  expect(plan.entries[0].message?.split('\n')[1]).toMatch(/^\*Árvore/);expect(plan.entries[0].message).toContain('🔥');expect(plan.entries[0].message).not.toContain('Preço e estoque')
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
  const ports=dependencies(),shoe={...product(),title:'Tênis feminino casual',provider:'SHOPEE' as const,id:'SHP123_456',catalogId:'SHP123_456',productUrl:'https://shopee.com.br/product/123/456',priceCents:2130,oldPriceCents:3492,reportedDiscountPercent:39,oldPriceEstimated:true,oldPriceSource:'SHOPEE_ESTIMATED' as const,sentCount:0,pendingCount:0,lastSentAt:null}
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
  const legacy=await db.affiliateBroadcast.findFirstOrThrow({where:{tenantId,offer:{itemId:product().id}}})
  const oldSnapshot={...legacy.productSnapshot as Prisma.JsonObject}
  delete oldSnapshot.itemId;delete oldSnapshot.productUrl;delete oldSnapshot.checkedAt
  await db.affiliateBroadcast.update({where:{id:legacy.id},data:{productSnapshot:oldSnapshot}})
  // Exercise the shipped backfill against a legacy snapshot, including its timestamp format.
  await db.$executeRawUnsafe(readFileSync(resolve('prisma/migrations/20261031011000_affiliate_product_snapshot_identity/migration.sql'),'utf8'))
  const migrated=await db.affiliateBroadcast.findUniqueOrThrow({where:{id:legacy.id}})
  expect((migrated.productSnapshot as Prisma.JsonObject).checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.+Z$/)
  expect(migrated.message).toBe(legacy.message)
  await db.affiliateOffer.updateMany({where:{tenantId,itemId:product().id},data:{itemId:null,title:'Outra oferta editada',productUrl:'https://www.mercadolivre.com.br/p/MLB888888?wid=MLB777777',priceCents:9999}})
  expect((await affiliateProductHistory(db,tenantId,segmentId,[product()]))[0]).toMatchObject({sentCount:1,pendingCount:0})
  const discovery=await affiliateDiscoveryState(db,tenantId,segmentId,{mode:'MIXED',view:'ALL'})
  expect(discovery.products.find(p=>p.id===product().id)).toMatchObject({sentCount:1,decision:'SENT',catalogId:'MLB999999',priceCents:2590,title:product().title})
  // A fresh review can intentionally resend, while old approvals remain idempotent.
  await new Promise(resolve=>setTimeout(resolve,5))
  const preview=await ports.prepare(db,tenantId,actorId,segmentId,product().id)
  await sendAffiliateProduct(db,tenantId,actorId,segmentId,preview.previewToken)
  expect(await db.affiliateBroadcast.count({where:{tenantId}})).toBe(3)
  await cancelAffiliateDayPlan(db,tenantId,actorId,segmentId,id)
  expect(await db.affiliateDelivery.count({where:{tenantId,state:'SENT'}})).toBe(4)
})
