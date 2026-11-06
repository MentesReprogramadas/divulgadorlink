import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, expect, it } from 'vitest'
import { issueLaunchOffer, activeLaunchOffer, dismissLaunchOffer, launchDto, launchPrices, reserveLaunchOffer } from './launch-offer'
import { PRICE_ROWS } from '@/domain/promotions/price-for'
import { ConfirmGatewayPaymentUseCase } from '@/use-cases/@Payments/confirm-gateway-payment'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import { PrismaConfigsRepository, setConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { prepareAutomaticPublication } from './launch-offer'
import { PrismaCheckoutStore } from './checkout-prisma'
const url = process.env.LAUNCH_OFFER_DATABASE_URL ?? process.env.CHECKOUT_DATABASE_URL
if (!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenantId: string, userId: string, linkId: string
beforeEach(async()=>{
 tenantId=randomUUID();userId='user-'+tenantId;linkId='link-'+tenantId
 await db.tenant.create({data:{id:tenantId,host:tenantId+'.test',name:'Launch fixture'}})
 await db.user.create({data:{id:userId,tenantId,name:'Publisher',passwordHash:'fixture'}})
 await db.network.create({data:{id:'network-'+tenantId,tenantId,name:'Site',slug:'site',knownHosts:[]}})
 await db.niche.create({data:{id:'niche-'+tenantId,tenantId,name:'Estudos',slug:'estudos'}})
 await db.link.create({data:{id:linkId,tenantId,ownerId:userId,name:'Comunidade de estudos',description:'Material de estudos',canonicalUrl:'https://example.com/'+linkId,networkId:'network-'+tenantId,nicheId:'niche-'+tenantId,status:'PUBLISHED'}})
})
afterAll(async()=>{await db.$disconnect()})
it('exit admite link antigo e recupera seleção após dispensa sem descontar novamente ou renovar prazo',async()=>{
 await db.link.update({where:{id:linkId},data:{createdAt:new Date(Date.now()-90*86400000)}})
 const options={source:'exit' as const,productCode:'SEARCH_NICHE' as const,durationDays:14 as const}
 const offer=await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,options)
 expect(offer).not.toBeNull()
 expect(launchDto(offer!)).toMatchObject({productCode:'SEARCH_NICHE',durationDays:14})
 await dismissLaunchOffer(tenantId,userId,offer!.id,db)
 expect(launchDto((await activeLaunchOffer(tenantId,userId,linkId,db))!)).toMatchObject({dismissed:true,productCode:'SEARCH_NICHE',durationDays:14})
 const again=await issueLaunchOffer(tenantId,userId,linkId,launchPrices(offer!),db,{...options,productCode:'SEARCH',durationDays:28})
 expect(again?.id).toBe(offer?.id);expect(again?.expiresAt).toEqual(offer?.expiresAt)
 expect(launchPrices(again!)).toEqual(launchPrices(offer!))
 expect(launchDto(again!)).toMatchObject({productCode:'SEARCH',durationDays:28})
})
it('exit respeita outra campanha e cooldown, sem renovar a campanha expirada',async()=>{
 const options={source:'exit' as const,productCode:'SEARCH' as const,durationDays:7 as const}
 const first=(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,options))!
 await db.link.create({data:{id:linkId+'-other',tenantId,ownerId:userId,name:'Outro link',description:'Material',canonicalUrl:'https://example.com/other/'+linkId,networkId:'network-'+tenantId,nicheId:'niche-'+tenantId,status:'PUBLISHED',createdAt:new Date(0)}})
 expect(await issueLaunchOffer(tenantId,userId,linkId+'-other',PRICE_ROWS,db,options)).toBeNull()
 await db.promotionLaunchOffer.update({where:{id:first.id},data:{expiresAt:new Date(0)}})
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,options)).toBeNull()
 expect(await issueLaunchOffer(tenantId,userId,linkId+'-other',PRICE_ROWS,db,options)).toBeNull()
})
it('permite uma nova oferta para o mesmo link depois do intervalo da conta', async () => {
 const selection = { source: 'exit' as const, productCode: 'SEARCH' as const, durationDays: 7 as const }
 const first = (await issueLaunchOffer(tenantId, userId, linkId, PRICE_ROWS, db, selection))!
 await db.promotionLaunchOffer.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 31 * 86400000), expiresAt: new Date(0) } })
 const next = await issueLaunchOffer(tenantId, userId, linkId, PRICE_ROWS, db, selection)
 expect(next).not.toBeNull()
 expect(next?.id).not.toBe(first.id)
})
it('valida duração e idade no servidor antes de emitir ou reutilizar',async()=>{
 const options={source:'exit' as const,productCode:'HOME' as const,durationDays:7 as const}
 await db.niche.update({where:{id:'niche-'+tenantId},data:{requiresAge:true}})
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,options)).toBeNull()
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,{...options,productCode:'SEARCH_NICHE_HOME'})).toBeNull()
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,{...options,productCode:'SEARCH',durationDays:8 as 7})).toBeNull()
 const valid=await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,{...options,productCode:'SEARCH'})
 expect(valid).not.toBeNull()
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,options)).toBeNull()
 expect(launchPrices(valid!).every(row=>row.code!=='HOME'&&row.code!=='SEARCH_NICHE_HOME')).toBe(true)
})
it('serializa emissões simultâneas, congela preços e preserva expiração/dismiss',async()=>{
 const [first,second]=await Promise.all([issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db),issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db)])
 expect(first?.id).toBe(second?.id);expect(first).not.toBeNull()
 expect(await db.promotionLaunchOffer.count({where:{tenantId}})).toBe(1)
 const again=await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS.map(r=>({...r,amountCents:r.amountCents+100})),db)
 expect(again?.expiresAt).toEqual(first?.expiresAt)
 expect(launchPrices(again!).find(p=>p.code==='SEARCH_NICHE'&&p.durationDays===7)).toMatchObject({amountCents:1432,referenceAmountCents:1790})
 await dismissLaunchOffer(tenantId,userId,first!.id,db)
 expect((await activeLaunchOffer(tenantId,userId,linkId,db))?.dismissedAt).not.toBeNull()
 expect(await activeLaunchOffer('another-tenant',userId,linkId,db)).toBeNull()
 expect(await issueLaunchOffer(tenantId,'another-user',linkId,PRICE_ROWS,db)).toBeNull()
 await db.promotionLaunchOffer.update({where:{id:first!.id},data:{expiresAt:new Date(0)}})
 expect(await activeLaunchOffer(tenantId,userId,linkId,db)).toBeNull()
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db)).toBeNull()
})
it('não emite para link antigo nem novo link durante cooldown',async()=>{
 await db.link.update({where:{id:linkId},data:{createdAt:new Date(Date.now()-86400001)}})
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db)).toBeNull()
 await db.link.update({where:{id:linkId},data:{createdAt:new Date()}})
 const first=await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db)
 await db.link.create({data:{id:linkId+'-new',tenantId,ownerId:userId,name:'Segundo link',description:'Outro material',canonicalUrl:'https://example.com/new/'+linkId,networkId:'network-'+tenantId,nicheId:'niche-'+tenantId,status:'PUBLISHED'}})
 expect(await issueLaunchOffer(tenantId,userId,linkId+'-new',PRICE_ROWS,db)).toBeNull()
 await db.promotionLaunchOffer.update({where:{id:first!.id},data:{createdAt:new Date(Date.now()-31*86400000),expiresAt:new Date(0)}})
 expect(await issueLaunchOffer(tenantId,userId,linkId+'-new',PRICE_ROWS,db)).not.toBeNull()
})
it('reserva uma única cobrança mesmo com superfícies diferentes e rejeita preço adulterado',async()=>{
 const offer=(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db))!
 const store=new PrismaCheckoutStore(db)
 const base={tenantId,userId,linkId,method:'PIX' as const,durationDays:7,savingsCents:0,idempotencyKey:null,renewal:false,pixExpiresAt:new Date(Date.now()+1800000),launchOfferId:offer.id}
 const outcomes=await Promise.allSettled([store.createPending({...base,surfaces:['SEARCH'],productCode:'SEARCH',amountCents:632}),store.createPending({...base,surfaces:['HOME'],productCode:'HOME',amountCents:1592})])
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1)
 expect(await db.order.count({where:{tenantId}})).toBe(1)
 const pending=(await db.order.findFirstOrThrow({where:{tenantId}}))
 const resumed=(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,{source:'exit',productCode:'NICHE',durationDays:14}))!
 expect(launchDto(resumed)).toMatchObject({productCode:pending.productCode,durationDays:pending.durationDays})
 const input={id:offer.id,tenantId,userId,linkId,orderId:'other',code:'NICHE',durationDays:7,amountCents:1}
 await expect(db.$transaction(tx=>reserveLaunchOffer(tx,input))).rejects.toThrow('oferta')
 await expect(db.$transaction(tx=>reserveLaunchOffer(tx,{...input,tenantId:'foreign',amountCents:952}))).rejects.toThrow('oferta')
 await db.promotionLaunchOffer.update({where:{id:offer.id},data:{expiresAt:new Date(0)}})
 await expect(db.$transaction(tx=>reserveLaunchOffer(tx,{...input,amountCents:952}))).rejects.toThrow('oferta')
})
it('pagamento confirmado ativa uma vez e encerra recuperação',async()=>{
 const offer=(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db))!, store=new PrismaCheckoutStore(db)
 const order=await store.createPending({tenantId,userId,linkId,method:'PIX',surfaces:['SEARCH','NICHE','HOME'],durationDays:7,productCode:'SEARCH_NICHE_HOME',amountCents:2632,savingsCents:0,idempotencyKey:'paid',renewal:false,pixExpiresAt:new Date(Date.now()+1800000),launchOfferId:offer.id})
 await db.order.update({where:{id:order.order.id},data:{status:'PAID'}})
 await store.activatePaid(order.order.id,new Date());await store.activatePaid(order.order.id,new Date())
 expect(await db.promotion.count({where:{linkId,status:'ACTIVE'}})).toBe(3)
 expect(await activeLaunchOffer(tenantId,userId,linkId,db)).toBeNull()
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db)).toBeNull()
})

it('retry após Pix expirado conserva uma compra ativa e estorna pagamento tardio antigo',async()=>{
 const offer=(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db))!, store=new PrismaCheckoutStore(db)
 const input={tenantId,userId,linkId,method:'PIX' as const,surfaces:['SEARCH' as const,'NICHE' as const],durationDays:7,productCode:'SEARCH_NICHE' as const,amountCents:1432,savingsCents:0,idempotencyKey:null,renewal:false,pixExpiresAt:new Date(Date.now()+1800000),launchOfferId:offer.id}
 const old=await store.createPending(input);await store.attachCharge(old.order.id,{gatewayChargeId:'old-'+old.order.id})
 await db.order.update({where:{id:old.order.id},data:{status:'EXPIRED',pixExpiresAt:new Date(0)}});await store.releasePending(old.order.id)
 const fresh=await store.createPending(input);await store.attachCharge(fresh.order.id,{gatewayChargeId:'fresh-'+fresh.order.id})
 const refunds:string[]=[]
 const confirm=new ConfirmGatewayPaymentUseCase({findById:async id=>(await store.findCommercial(id))?.order??null,save:o=>store.saveOrder(o)},{method:'PIX',getCharge:async()=>({status:'PAID',paidAt:new Date()}),refund:async()=>{throw new Error('scheduler only')}},{activateFromPaidOrder:id=>store.activatePaid(id,new Date())},{scheduleRetry:async id=>{refunds.push(id)}})
 expect((await confirm.execute({orderId:old.order.id,eventId:'late'})).activated).toBe(false)
 expect(refunds).toEqual([old.order.id]);expect((await store.findCommercial(old.order.id))?.order.status).toBe('PAID_LATE')
 expect((await confirm.execute({orderId:fresh.order.id,eventId:'paid'})).activated).toBe(true)
 expect(await db.promotion.count({where:{linkId,status:'ACTIVE'}})).toBe(2)
 expect(await activeLaunchOffer(tenantId,userId,linkId,db)).toBeNull()
})

it('publica sem espera do worker em limiar zero e preserva bloqueio de conteúdo e limiar diferente',async()=>{
 setLinksRepositoryForTest(new PrismaLinksRepository(db));setConfigsRepositoryForTest(new PrismaConfigsRepository(db))
 await db.link.update({where:{id:linkId},data:{status:'PENDING_MODERATION'}})
 await db.config.create({data:{tenantId,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'0.85'}})
 await prepareAutomaticPublication(tenantId,userId,linkId,db)
 expect((await db.link.findUniqueOrThrow({where:{id:linkId}})).status).toBe('PENDING_MODERATION')
 await db.config.updateMany({where:{tenantId,key:'MODERATION_AUTO_APPROVE_THRESHOLD'},data:{value:'0'}})
 await db.blocklistTerm.create({data:{tenantId,term:'proibido'}})
 await db.link.update({where:{id:linkId},data:{name:'Conteúdo proibido'}})
 await prepareAutomaticPublication(tenantId,userId,linkId,db)
 expect((await db.link.findUniqueOrThrow({where:{id:linkId}})).status).toBe('PENDING_MODERATION')
 await db.link.update({where:{id:linkId},data:{name:'Comunidade de estudos'}})
 await Promise.all([prepareAutomaticPublication(tenantId,userId,linkId,db),prepareAutomaticPublication(tenantId,userId,linkId,db)])
 expect((await db.link.findUniqueOrThrow({where:{id:linkId}})).status).toBe('PUBLISHED')
 expect(await db.auditLog.count({where:{tenantId,action:'moderation.ai'}})).toBe(1)
 expect(await db.order.count({where:{tenantId}})).toBe(0)
})

it('persiste clientSecret do cartão e restaura o mesmo pedido via nova instância do store',async()=>{
 const store=new PrismaCheckoutStore(db)
 const row=await store.createPending({tenantId,userId,linkId,method:'CARD',surfaces:['SEARCH','NICHE'],durationDays:7,productCode:'SEARCH_NICHE',amountCents:1432,savingsCents:0,idempotencyKey:'card-resume',renewal:false,pixExpiresAt:null})
 await store.attachCharge(row.order.id,{gatewayChargeId:'pi-'+row.order.id,clientSecret:'private-card-secret'})
 const restored=await new PrismaCheckoutStore(db).findByIdempotency(tenantId,userId,'card-resume')
 expect(restored?.clientSecret).toBe('private-card-secret');expect(restored?.order.id).toBe(row.order.id);expect(restored?.order.amountCents).toBe(1432)
 expect(await db.order.count({where:{tenantId}})).toBe(1)
})


it('não emite nem consome cooldown para espaços ativos ou com pedido externo pendente',async()=>{
 const selection={source:'exit' as const,productCode:'SEARCH' as const,durationDays:7 as const}
 const promotion=await db.promotion.create({data:{tenantId,linkId,status:'ACTIVE',surface:'SEARCH',activatedAt:new Date(),expiresAt:new Date(Date.now()+86400000)}})
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,selection)).toBeNull()
 expect(await db.promotionLaunchOffer.count({where:{tenantId}})).toBe(0)
 await db.promotion.delete({where:{id:promotion.id}})
 const store=new PrismaCheckoutStore(db)
 const pending=await store.createPending({tenantId,userId,linkId,method:'PIX',surfaces:['SEARCH'],durationDays:7,productCode:'SEARCH',amountCents:790,savingsCents:0,idempotencyKey:null,renewal:false,pixExpiresAt:new Date(Date.now()+1800000)})
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,selection)).toBeNull()
 expect(await db.promotionLaunchOffer.count({where:{tenantId}})).toBe(0)
 await db.order.update({where:{id:pending.order.id},data:{status:'EXPIRED'}});await store.releasePending(pending.order.id)
 expect(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,selection)).not.toBeNull()
})
it('recuperação perde elegibilidade com promoção ou pedido externo, preservando reserva própria',async()=>{
 const selection={source:'exit' as const,productCode:'SEARCH' as const,durationDays:7 as const}
 const offer=(await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,selection))!
 const promotion=await db.promotion.create({data:{tenantId,linkId,status:'ACTIVE',surface:'SEARCH',activatedAt:new Date(),expiresAt:new Date(Date.now()+86400000)}})
 expect(await activeLaunchOffer(tenantId,userId,linkId,db)).toBeNull()
 await db.promotion.delete({where:{id:promotion.id}})
 const store=new PrismaCheckoutStore(db)
 const data={tenantId,userId,linkId,method:'PIX' as const,surfaces:['SEARCH' as const],durationDays:7,productCode:'SEARCH' as const,amountCents:790,savingsCents:0,idempotencyKey:null,renewal:false,pixExpiresAt:new Date(Date.now()+1800000)}
 const external=await store.createPending(data)
 expect(await activeLaunchOffer(tenantId,userId,linkId,db)).toBeNull()
 await db.order.update({where:{id:external.order.id},data:{status:'EXPIRED'}});await store.releasePending(external.order.id)
 await store.createPending({...data,amountCents:632,launchOfferId:offer.id})
 expect((await activeLaunchOffer(tenantId,userId,linkId,db))?.id).toBe(offer.id)
 expect((await issueLaunchOffer(tenantId,userId,linkId,PRICE_ROWS,db,selection))?.id).toBe(offer.id)
})


it('valida o par final de pacote e duração em emissão e atualização parcial',async()=>{
 const prices=PRICE_ROWS.filter(row=>row.code==='SEARCH'&&row.durationDays===7||row.code==='NICHE'&&row.durationDays===14)
 expect(await issueLaunchOffer(tenantId,userId,linkId,prices,db,{source:'exit',durationDays:14})).toBeNull()
 expect(await db.promotionLaunchOffer.count({where:{tenantId}})).toBe(0)
 const offer=(await issueLaunchOffer(tenantId,userId,linkId,prices,db,{source:'exit',productCode:'SEARCH',durationDays:7}))!
 expect(await issueLaunchOffer(tenantId,userId,linkId,prices,db,{source:'exit',durationDays:14})).toBeNull()
 expect(launchDto((await activeLaunchOffer(tenantId,userId,linkId,db))!)).toMatchObject({id:offer.id,productCode:'SEARCH',durationDays:7})
})
