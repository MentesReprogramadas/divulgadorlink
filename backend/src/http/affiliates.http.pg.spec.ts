import sharp from 'sharp'
import { recordInviteEvent, purgeInviteEvents } from '@/use-cases/affiliates/invite-metrics'
import { randomUUID } from 'node:crypto'

// Snapshot tests keep jobs pending; the integrated flow exercises immediate delivery.
vi.mock('@/use-cases/affiliates/deliveries',async original=>({...await original<typeof import('@/use-cases/affiliates/deliveries')>(),requestAffiliateDeliveryDrain:vi.fn(async()=>0)}))
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'
import { registerAffiliateRoutes } from './controllers/@Admin/affiliates'
import { prisma as db } from '@/lib/prisma'

vi.mock('@/lib/prisma',async()=>{
  const {PrismaClient}=await import('@prisma/client'),url=process.env.AFFILIATE_DATABASE_URL
  if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable AFFILIATE_DATABASE_URL required')
  return {prisma:new PrismaClient({datasourceUrl:url})}
})
const app=Fastify(),tenantId=randomUUID(),actorId=randomUUID(),host=tenantId+'.test',key=env.WEBHOOK_ENCRYPTION_KEY
const networkFetch=globalThis.fetch
let instanceId:string,segmentId:string,offerId:string
let connectionState='open'
beforeAll(async()=>{
  env.WEBHOOK_ENCRYPTION_KEY=Buffer.alloc(32,31).toString('base64')
  env.AFFILIATE_EVOLUTION_BASE_URL='https://evolution.test'
  await db.tenant.create({data:{id:tenantId,host,name:'HTTP fixture'}})
  await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',passwordHash:'fixture'}})
  setTenantsRepositoryForTest(new InMemoryTenantsRepository([{id:tenantId,host,name:'HTTP fixture'}]))
  await app.register(cookie);await app.register(jwt,{secret:'affiliates-http-fixture-secret'});await app.register(registerAffiliateRoutes,{prefix:'/api/v1'});await app.ready()
  vi.stubGlobal('fetch',vi.fn(async(input:URL)=>{
    if(input.pathname.includes('connectionState'))return Response.json({instance:{state:connectionState}})
    if(input.pathname.includes('findGroupInfos'))return Response.json({id:input.searchParams.get('groupJid')??'123@g.us',subject:'Natal #1',size:2,desc:'Natal'})
    if(input.pathname.includes('inviteCode'))return Response.json({inviteCode:'AbCdEf0123456789AbCdEf'})
    if(input.pathname.includes('/group/create/'))return Response.json({id:'456@g.us'})
    throw new Error('Unexpected fixture request')
  }))
})
afterAll(async()=>{
  vi.unstubAllGlobals();env.WEBHOOK_ENCRYPTION_KEY=key
  await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}});await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.delete({where:{id:tenantId}});await app.close();await db.$disconnect()
})
const headers=()=>({host,authorization:'Bearer '+app.jwt.sign({sub:actorId,tenantId,typ:'access',role:'ADMIN'})})
describe('HTTP e persistência afiliados',()=>{
  it('nega anônimo, tenant incorreto e role revogado no banco',async()=>{
    expect((await app.inject({url:'/api/v1/admin/affiliates',headers:{host}})).statusCode).toBe(401)
    const wrong={host,authorization:'Bearer '+app.jwt.sign({sub:actorId,tenantId:'wrong',typ:'access',role:'ADMIN'})}
    expect((await app.inject({url:'/api/v1/admin/affiliates',headers:wrong})).statusCode).toBe(403)
    await db.user.update({where:{id:actorId},data:{role:'USER'}})
    expect((await app.inject({url:'/api/v1/admin/affiliates',headers:headers()})).statusCode).toBe(403)
    await db.user.update({where:{id:actorId},data:{role:'ADMIN'}})
  })
  it('cadastra instância cifrada, segmentação, grupo e oferta, aprova sem duplicar',async()=>{
    const instance=await app.inject({method:'POST',url:'/api/v1/admin/affiliates/instances',headers:headers(),payload:{name:'Natal 01',apiKey:'private-instance-fixture',ownerPhone:'5511999999999'}})
    expect(instance.statusCode).toBe(200);expect(instance.body).not.toContain('private-instance-fixture');expect(instance.body).not.toContain('secret')
    instanceId=instance.json().id
    const segment=await app.inject({method:'POST',url:'/api/v1/admin/affiliates/segments',headers:headers(),payload:{name:'Natal',groupName:'Ofertas de Natal',slug:'natal',instanceId,autoExpand:true}})
    expect(segment.statusCode).toBe(200);segmentId=segment.json().id
    const group=await app.inject({method:'POST',url:'/api/v1/admin/affiliates/groups',headers:headers(),payload:{segmentId,instanceId,jid:'123@g.us'}})
    expect(group.statusCode).toBe(200)
    const offer=await app.inject({method:'POST',url:'/api/v1/admin/affiliates/offers',headers:headers(),payload:{segmentId,title:'Presente de Natal',productUrl:'https://meli.la/product',affiliateUrl:'https://meli.la/affiliate',priceCents:1990}})
    expect(offer.statusCode).toBe(200);offerId=offer.json().id
    const idempotencyKey=randomUUID(),request={method:'POST' as const,url:`/api/v1/admin/affiliates/offers/${offerId}/send`,headers:headers(),payload:{idempotencyKey}}
    expect((await app.inject(request)).statusCode).toBe(200);expect((await app.inject(request)).statusCode).toBe(200)
    expect(await db.affiliateDelivery.count({where:{tenantId}})).toBe(1)
    const snapshot=await app.inject({url:'/api/v1/admin/affiliates',headers:headers()})
    expect(snapshot.statusCode).toBe(200);expect(snapshot.json().summary.pending).toBe(1);expect(snapshot.body).not.toContain('secret')
  })
  it('GET destino entrega convite sem sincronizar grupo e conta uma navegação por evento',async()=>{
    const before=await db.affiliateGroup.findFirstOrThrow({where:{tenantId}})
    const eventId=randomUUID(),visitor={host,'user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate'}
    const url='/api/v1/public/affiliates/natal/destination?eventId='+eventId
    expect((await app.inject({url,headers:visitor})).json()).toEqual({url:'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'})
    expect((await app.inject({url,headers:visitor})).statusCode).toBe(200)
    expect((await app.inject({url,headers:{...visitor,'sec-fetch-mode':'cors','x-affiliate-fetch-mode':'navigate'}})).json()).toEqual({url:'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'})
    expect((await app.inject({url,headers:{...visitor,'sec-fetch-mode':'cors'}})).json()).toEqual({url:null})
    expect(await db.affiliateGroup.findUniqueOrThrow({where:{id:before.id}})).toEqual(before)
    expect(await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})).toMatchObject({views:1,automaticRedirects:1,buttonClicks:0,buttonRedirects:0})
    for(const extra of [{'user-agent':'facebookexternalhit'},{purpose:'prefetch'},{'sec-purpose':'prefetch;prerender'},{'next-router-prefetch':'1'},{'sec-fetch-mode':''}])expect((await app.inject({url,headers:{...visitor,...extra}})).json()).toEqual({url:null})
    expect((await app.inject({method:'HEAD',url,headers:visitor})).statusCode).toBe(200)
    expect(await db.affiliateInviteEvent.count({where:{tenantId,segmentId}})).toBe(2)
    await db.affiliateInviteEvent.deleteMany({where:{tenantId,segmentId}});await db.affiliateInviteMetrics.deleteMany({where:{tenantId,segmentId}})
  })
  it('GET destino recebe o modo validado pelo frontend mesmo quando fetch real reescreve Sec-Fetch-Mode',async()=>{
    const address=await app.listen({port:0,host:'127.0.0.1'})
    const url=address+'/api/v1/public/affiliates/natal/destination?eventId='+randomUUID()
    const visitor={host,'user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate','x-analytics-test':'1'}
    expect(await (await networkFetch(url,{headers:visitor})).json()).toEqual({url:null})
    expect(await (await networkFetch(url,{headers:{...visitor,'x-affiliate-fetch-mode':'navigate'}})).json()).toEqual({url:'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'})
    expect(await db.affiliateInviteMetrics.findUnique({where:{segmentId}})).toBeNull()
  })
  it('GET destino mantém SCREEN/pausas/cheio sem provisionar e exclui DNT da medição',async()=>{
    const visitor={host,'user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate'}
    const url='/api/v1/public/affiliates/natal/destination?eventId='+randomUUID()
    for(const patch of [{joinMode:'SCREEN' as const},{enabled:false}]){
      await db.affiliateSegment.update({where:{id:segmentId},data:patch})
      expect((await app.inject({url,headers:visitor})).json()).toEqual({url:null})
      await db.affiliateSegment.update({where:{id:segmentId},data:{enabled:true,joinMode:'REDIRECT'}})
    }
    await db.affiliateSegment.update({where:{id:segmentId},data:{capacity:1}})
    expect((await app.inject({url,headers:visitor})).json()).toEqual({url:null})
    await db.affiliateSegment.update({where:{id:segmentId},data:{capacity:10}})
    for(const extra of [{dnt:'1'},{'sec-gpc':'1'},{'x-analytics-test':'1'},headers()])expect((await app.inject({url,headers:{...visitor,...extra}})).json()).toHaveProperty('url','https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
    expect((await app.inject({url,headers:{...visitor,cookie:'supportSession=fixture'}})).json()).toEqual({url:null})
    expect(await db.affiliateInviteMetrics.findUnique({where:{segmentId}})).toBeNull()
    expect(await db.affiliateGroup.count({where:{tenantId}})).toBe(1)
  })
  it('GET destino revalida pausa e mudança de modo durante a consulta do provedor',async()=>{
    const transport=vi.mocked(fetch),original=transport.getMockImplementation()!
    const visitor={host,'user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate'}
    try {
      for(const change of ['group','instance','mode','instance-config','capacity'] as const){
        transport.mockImplementation(async(input,init)=>{
          if(new URL(String(input)).pathname.includes('findGroupInfos')){
            if(change==='group')await db.affiliateGroup.updateMany({where:{tenantId},data:{enabled:false}})
            if(change==='instance')await db.affiliateInstance.update({where:{id:instanceId},data:{enabled:false}})
            if(change==='mode')await db.affiliateSegment.update({where:{id:segmentId},data:{joinMode:'SCREEN'}})
            if(change==='instance-config')await db.affiliateInstance.update({where:{id:instanceId},data:{name:'Outra conexão'}})
            if(change==='capacity')await db.affiliateGroup.updateMany({where:{tenantId},data:{capacity:1}})
          }
          return original(input,init)
        })
        const url='/api/v1/public/affiliates/natal/destination?eventId='+randomUUID()
        expect((await app.inject({url,headers:visitor})).json()).toEqual({url:null})
        await db.affiliateGroup.updateMany({where:{tenantId},data:{enabled:true,capacity:10}})
        await db.affiliateInstance.update({where:{id:instanceId},data:{enabled:true,name:'Natal 01'}})
        await db.affiliateSegment.update({where:{id:segmentId},data:{joinMode:'REDIRECT'}})
      }
      expect(await db.affiliateInviteMetrics.findUnique({where:{segmentId}})).toBeNull()
    } finally {transport.mockImplementation(original)}
  })
  it('GET público é inerte e POST consulta grupo real sem autenticação',async()=>{
    expect((await app.inject({url:'/api/v1/public/affiliates/natal',headers:{host}})).json()).toMatchObject({name:'Ofertas de Natal',available:true,joinMode:'REDIRECT'})
    expect(await db.affiliateGroup.count({where:{tenantId}})).toBe(1)
    const join=await app.inject({method:'POST',url:'/api/v1/public/affiliates/natal/join',headers:{host},payload:{}})
    expect(join.statusCode).toBe(200);expect(join.json().url).toContain('https://chat.whatsapp.com/')
    expect(await db.affiliateGroup.count({where:{tenantId}})).toBe(1)
  })
  it('permite escolher tela de convite e rejeita modo inválido',async()=>{
    const update=(joinMode:string)=>app.inject({method:'PATCH',url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:headers(),payload:{joinMode}})
    expect((await update('SCREEN')).statusCode).toBe(200)
    expect((await app.inject({url:'/api/v1/public/affiliates/natal',headers:{host}})).json().joinMode).toBe('SCREEN')
    expect((await update('INVALID')).statusCode).toBe(400)
    expect((await update('REDIRECT')).statusCode).toBe(200)
  })
  it('serve apenas a foto vinculada à segmentação pública ativa deste tenant',async()=>{
    const id=randomUUID(),bytes=await sharp({create:{width:16,height:16,channels:3,background:'#147d65'}}).webp().toBuffer()
    await db.affiliateImage.create({data:{id,tenantId,bytes}})
    try {
      await db.affiliateSegment.update({where:{id:segmentId},data:{imageUrl:`affiliate-image:${id}`}})
      const meta=(await app.inject({url:'/api/v1/public/affiliates/natal',headers:{host}})).json()
      expect(meta.imageUrl).toBe('/bff/v1/public/affiliates/natal/image')
      expect(meta.shareImageUrl).toMatch(/^\/ofertas\/entrar\/natal\/imagem\?v=[a-f0-9]{16}$/)
      const preview=await app.inject({url:'/api/v1/public/affiliates/natal/preview-image',headers:{host,'user-agent':'facebookexternalhit'}})
      expect(preview.statusCode).toBe(200);expect(preview.headers['content-type']).toBe('image/jpeg')
      expect(await sharp(preview.rawPayload).metadata()).toMatchObject({format:'jpeg',width:600,height:600})
      expect(await db.affiliateInviteMetrics.findUnique({where:{segmentId}})).toBeNull()
      const image=await app.inject({url:'/api/v1/public/affiliates/natal/image',headers:{host}})
      expect(image.statusCode).toBe(200);expect(image.headers['content-type']).toBe('image/webp');expect(image.rawPayload).toEqual(bytes)
      expect((await app.inject({url:'/api/v1/public/affiliates/ausente/image',headers:{host}})).statusCode).toBe(404)
      await db.affiliateSegment.update({where:{id:segmentId},data:{enabled:false}})
      expect((await app.inject({url:'/api/v1/public/affiliates/natal/image',headers:{host}})).statusCode).toBe(404)
    } finally {
      await db.affiliateSegment.update({where:{id:segmentId},data:{imageUrl:null,enabled:true}})
      await db.affiliateImage.delete({where:{id}})
    }
  })
  it('conta visitas e cliques de forma idempotente, sem alterar a versão da segmentação',async()=>{
    const before=await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})
    const eventId=randomUUID(),visitor={host,'user-agent':'Mozilla/5.0 Safari/537.36'}
    const visits=await Promise.all(Array.from({length:5},()=>app.inject({method:'POST',url:'/api/v1/public/affiliates/natal/visit',headers:visitor,payload:{eventId}})))
    expect(visits.every(result=>result.statusCode===200)).toBe(true)
    expect(visits.every(result=>result.headers['set-cookie']===undefined)).toBe(true)
    const clickId=randomUUID(),join={method:'POST' as const,url:'/api/v1/public/affiliates/natal/join',headers:visitor,payload:{eventId:clickId,source:'BUTTON'}}
    expect((await app.inject(join)).statusCode).toBe(200);expect((await app.inject(join)).statusCode).toBe(200)
    expect((await app.inject({...join,payload:{eventId:randomUUID(),source:'AUTOMATIC'}})).statusCode).toBe(200)
    const metrics=await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})
    expect(metrics).toMatchObject({tenantId,views:1,buttonClicks:1,buttonRedirects:1,automaticRedirects:1})
    expect((await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).updatedAt).toEqual(before.updatedAt)
    const data=(await app.inject({url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:headers()})).json()
    expect(data.segments[0].inviteMetrics.views).toBe(1)
    const excluded=[{'user-agent':'facebookexternalhit'},{'user-agent':'WhatsApp/2.24'},{dnt:'1'},{'sec-gpc':'1'},{'x-analytics-test':'1'},headers()]
    for(const extra of excluded){expect((await app.inject({method:'POST',url:'/api/v1/public/affiliates/natal/visit',headers:{...visitor,...extra},payload:{eventId:randomUUID()}})).statusCode).toBe(200)}
    expect((await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})).views).toBe(1)
    expect((await app.inject({method:'POST',url:'/api/v1/public/affiliates/natal/visit',headers:visitor,payload:{eventId:'bad'}})).statusCode).toBe(400)
  })
  it('conta o clique com erro no WhatsApp, sem inventar encaminhamento',async()=>{
    connectionState='close'
    const before=await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})
    try {
      const result=await app.inject({method:'POST',url:'/api/v1/public/affiliates/natal/join',headers:{host,'user-agent':'Mozilla/5.0'},payload:{eventId:randomUUID(),source:'BUTTON'}})
      expect(result.statusCode).toBe(503)
      expect(await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})).toMatchObject({buttonClicks:before.buttonClicks+1,buttonRedirects:before.buttonRedirects})
    } finally {connectionState='open'}
  })
  it('isola métricas por tenant e expurga apenas chaves temporárias',async()=>{
    const metrics=await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})
    await expect(recordInviteEvent(db,'other-tenant',segmentId,randomUUID(),'VIEW')).rejects.toThrow()
    await db.affiliateInviteEvent.updateMany({where:{tenantId,segmentId},data:{createdAt:new Date(Date.now()-4*86400000)}})
    await purgeInviteEvents(db)
    expect(await db.affiliateInviteEvent.count({where:{tenantId,segmentId}})).toBe(0)
    expect(await db.affiliateInviteMetrics.findUniqueOrThrow({where:{segmentId}})).toEqual(metrics)
  })
  it('abre a segmentação exata com dados, totais e histórico isolados',async()=>{
    const extra=await db.affiliateInstance.create({data:{tenantId,name:'Outra conta'}})
    const second=await db.affiliateSegment.create({data:{tenantId,name:'Outro tema',slug:'outro-tema',instanceId:extra.id}})
    const otherTenant=randomUUID(),foreignId=randomUUID()
    await db.tenant.create({data:{id:otherTenant,host:otherTenant+'.test',name:'Foreign fixture'}})
    await db.affiliateSegment.create({data:{id:foreignId,tenantId:otherTenant,name:'Segredo',slug:'segredo'}})
    let secondBroadcast:string|undefined
    try {
      const group=await db.affiliateGroup.create({data:{tenantId,segmentId:second.id,instanceId:extra.id,jid:'999@g.us',name:'Outro #1',sequence:1}})
      const offer=await db.affiliateOffer.create({data:{tenantId,segmentId:second.id,title:'Outra oferta',productUrl:'https://meli.la/product',affiliateUrl:'https://meli.la/affiliate',priceCents:2000}})
      const broadcast=await db.affiliateBroadcast.create({data:{tenantId,segmentId:second.id,offerId:offer.id,idempotencyKey:randomUUID(),message:'Outro envio',offerUpdatedAt:offer.updatedAt}})
      secondBroadcast=broadcast.id
      const delivery=await db.affiliateDelivery.create({data:{tenantId,broadcastId:broadcast.id,groupId:group.id}})
      const scoped=await app.inject({url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:headers()})
      expect(scoped.statusCode,scoped.body).toBe(200)
      expect(scoped.json().segments.map((row:{id:string})=>row.id)).toEqual([segmentId])
      expect(scoped.json().instances.map((row:{id:string})=>row.id)).toEqual([instanceId])
      expect(scoped.json().summary).toMatchObject({segments:1,instances:1,groups:1,offers:1,pending:1})
      expect(scoped.json().readiness).toEqual({activeGroups:1,currentOffers:1,approvedDeliveries:1,nextOffer:null})
      expect(scoped.body).not.toContain('Outra oferta');expect(scoped.body).not.toContain('private-instance-fixture');expect(scoped.body).not.toContain('secret')
      const history=await app.inject({url:`/api/v1/admin/affiliates/deliveries?segmentId=${segmentId}`,headers:headers()})
      expect(history.json().deliveries).toHaveLength(1);expect(history.body).not.toContain(delivery.id)
      expect((await app.inject({url:`/api/v1/admin/affiliates/deliveries?segmentId=${segmentId}&cursor=${delivery.id}`,headers:headers()})).statusCode).toBe(400)
      expect((await app.inject({url:`/api/v1/admin/affiliates/segments/${foreignId}`,headers:headers()})).statusCode).toBe(404)
      expect((await app.inject({url:`/api/v1/admin/affiliates/deliveries?segmentId=${foreignId}`,headers:headers()})).statusCode).toBe(404)
      expect((await app.inject({url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:{host}})).statusCode).toBe(401)
    } finally {
      if(secondBroadcast)await db.affiliateDelivery.deleteMany({where:{broadcastId:secondBroadcast}})
      await db.affiliateBroadcast.deleteMany({where:{segmentId:second.id}});await db.affiliateOffer.deleteMany({where:{segmentId:second.id}});await db.affiliateGroup.deleteMany({where:{segmentId:second.id}});await db.affiliateSegment.delete({where:{id:second.id}});await db.affiliateInstance.delete({where:{id:extra.id}})
      await db.affiliateSegment.delete({where:{id:foreignId}});await db.tenant.delete({where:{id:otherTenant}})
    }
  })
  it('recomenda oferta nova fora do limite da lista mesmo depois de envio anterior',async()=>{
    const fresh=await db.affiliateOffer.create({data:{tenantId,segmentId,title:'Oferta nova para revisar',productUrl:'https://meli.la/product',affiliateUrl:'https://meli.la/new',priceCents:2000}})
    const archiveIds=Array.from({length:201},()=>randomUUID())
    let broadcastId:string|undefined
    await db.affiliateDelivery.updateMany({where:{tenantId,broadcast:{offerId}},data:{state:'SENT'}})
    try {
      await db.affiliateOffer.createMany({data:archiveIds.map(id=>({id,tenantId,segmentId,title:'Arquivo descartável',productUrl:'https://meli.la/product',affiliateUrl:'https://meli.la/old',priceCents:2000,status:'ARCHIVED',createdAt:new Date(Date.now()+10000)}))})
      const response=await app.inject({url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:headers()})
      expect(response.statusCode,response.body).toBe(200)
      expect(response.json().offers.some((offer:{id:string})=>offer.id===fresh.id)).toBe(false)
      expect(response.json().readiness).toMatchObject({approvedDeliveries:1,nextOffer:{id:fresh.id,title:fresh.title,affiliateUrl:fresh.affiliateUrl,segment:{id:segmentId,name:'Natal'}}})
      const group=await db.affiliateGroup.findFirstOrThrow({where:{tenantId,segmentId}})
      const broadcast=await db.affiliateBroadcast.create({data:{tenantId,segmentId,offerId:fresh.id,idempotencyKey:randomUUID(),message:'Nova oferta aprovada',offerUpdatedAt:fresh.updatedAt}})
      broadcastId=broadcast.id
      await db.affiliateDelivery.create({data:{tenantId,broadcastId:broadcast.id,groupId:group.id,state:'UNCERTAIN'}})
      const after=await app.inject({url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:headers()})
      expect(after.json().readiness.nextOffer).toBeNull()
    } finally {
      if(broadcastId){await db.affiliateDelivery.deleteMany({where:{broadcastId}});await db.affiliateBroadcast.delete({where:{id:broadcastId}})}
      await db.affiliateOffer.deleteMany({where:{id:{in:[fresh.id,...archiveIds]}}})
      await db.affiliateDelivery.updateMany({where:{tenantId,broadcast:{offerId}},data:{state:'PENDING'}})
    }
  })
  it('prepara o primeiro grupo com autorização e confirmação explícita sem ativar expansão',async()=>{
    const segment=await db.affiliateSegment.create({data:{tenantId,name:'Inicial',groupName:'Grupo inicial',slug:'inicial',instanceId,autoExpand:false}})
    const path=`/api/v1/admin/affiliates/segments/${segment.id}/prepare-group`
    try {
      expect((await app.inject({method:'POST',url:path,headers:{host},payload:{}})).statusCode).toBe(401)
      expect((await app.inject({method:'POST',url:path,headers:headers(),payload:{unexpected:true}})).statusCode).toBe(400)
      const preview=await app.inject({url:`/api/v1/admin/affiliates/segments/${segment.id}`,headers:headers()})
      expect(preview.statusCode).toBe(200);expect(await db.affiliateGroup.count({where:{segmentId:segment.id}})).toBe(0)
      expect((await app.inject({method:'POST',url:'/api/v1/public/affiliates/inicial/join',headers:{host},payload:{}})).statusCode).toBe(409)
      const result=await app.inject({method:'POST',url:path,headers:headers(),payload:{}})
      expect(result.statusCode,result.body).toBe(200);expect(result.json().url).toContain('https://chat.whatsapp.com/')
      expect(await db.affiliateSegment.findUniqueOrThrow({where:{id:segment.id}})).toMatchObject({autoExpand:false,nextSequence:2})
      expect(await db.auditLog.count({where:{tenantId,actorId,entityId:segment.id,action:'affiliate.group.provisioned'}})).toBe(1)
      expect((await app.inject({method:'POST',url:path,headers:headers(),payload:{}})).statusCode).toBe(409)
      expect(await db.affiliateGroup.count({where:{segmentId:segment.id}})).toBe(1)
    } finally {await db.affiliateGroup.deleteMany({where:{segmentId:segment.id}});await db.affiliateSegment.delete({where:{id:segment.id}})}
  })
  it('exige conexão pronta, compartilha contas entre segmentações e preserva seleção ao pausar',async()=>{
    const request={method:'POST' as const,url:'/api/v1/admin/affiliates/segments',headers:headers(),payload:{name:'Outra campanha',slug:'outra-campanha',instanceIds:[instanceId]}}
    connectionState='close'
    expect((await app.inject(request)).statusCode).toBe(409)
    connectionState='open'
    const result=await app.inject(request)
    expect(result.statusCode).toBe(200)
    expect(result.json().instanceIds).toEqual([instanceId])
    expect(result.json().groupName).toBe('Outra campanha')
    expect(await db.affiliateSegmentInstance.count({where:{tenantId,instanceId}})).toBe(2)
    expect((await app.inject({...request,payload:{...request.payload,slug:'wrong',instanceIds:['foreign']}})).statusCode).toBe(400)
    expect((await app.inject({...request,payload:{...request.payload,slug:'empty',instanceIds:[]}})).statusCode).toBe(400)
    await app.inject({method:'PATCH',url:`/api/v1/admin/affiliates/segments/${result.json().id}`,headers:headers(),payload:{name:'Tema renomeado',enabled:false}})
    const snapshot=await app.inject({url:'/api/v1/admin/affiliates',headers:headers()})
    expect(snapshot.json().segments.find((row:{id:string})=>row.id===result.json().id)).toMatchObject({name:'Tema renomeado',groupName:'Outra campanha',instanceIds:[instanceId],instances:[{id:instanceId,name:'Natal 01',enabled:true}]})
  })
  it('pausa preserva metadados e edição invalida envios pendentes',async()=>{
    const before=await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})
    expect((await app.inject({method:'PATCH',url:`/api/v1/admin/affiliates/segments/${segmentId}`,headers:headers(),payload:{enabled:false}})).statusCode).toBe(200)
    const after=await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})
    expect(after).toMatchObject({capacity:before.capacity,description:before.description,autoExpand:before.autoExpand,groupName:before.groupName})
    expect((await app.inject({method:'PATCH',url:`/api/v1/admin/affiliates/offers/${offerId}`,headers:headers(),payload:{note:'Revisada'}})).statusCode).toBe(200)
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'PENDING'}})).toBe(0)
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'CANCELLED'}})).toBe(1)
  })
  it('paginação das pendências preserva acesso às antigas e rejeita cursor de outro tenant',async()=>{
    const result=await app.inject({url:'/api/v1/admin/affiliates/deliveries?limit=1',headers:headers()})
    expect(result.statusCode).toBe(200);expect(result.json().deliveries).toHaveLength(1)
    expect((await app.inject({url:'/api/v1/admin/affiliates/deliveries?cursor=wrong',headers:headers()})).statusCode).toBe(400)
  })
})


describe('Renomeação e descoberta por nome',()=>{
  it('invalida cache/lease implícito e preserva termos explícitos',async()=>{
    const segment=await db.affiliateSegment.create({data:{tenantId,name:'Natal original',slug:'discovery-rename'}})
    try {
      await db.affiliateDiscovery.create({data:{segmentId:segment.id,tenantId,productsJson:[{id:'old'}],status:'RUNNING',leaseToken:'old-lease',leaseExpiresAt:new Date(Date.now()+120000),checkedAt:new Date()}})
      const patch=(name:string)=>app.inject({method:'PATCH',url:`/api/v1/admin/affiliates/segments/${segment.id}`,headers:headers(),payload:{name}})
      expect((await patch('Verão')).statusCode).toBe(200)
      expect(await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId:segment.id}})).toMatchObject({productsJson:[],checkedAt:null,cursor:0,leaseToken:null,configVersion:1,status:'QUEUED'})
      await db.affiliateDiscovery.update({where:{segmentId:segment.id},data:{terms:['Presentes'],productsJson:[{id:'explicit'}],status:'READY'}})
      expect((await patch('Inverno')).statusCode).toBe(200)
      expect(await db.affiliateDiscovery.findUniqueOrThrow({where:{segmentId:segment.id}})).toMatchObject({terms:['Presentes'],productsJson:[{id:'explicit'}],configVersion:1,status:'READY'})
    } finally {await db.affiliateSegment.delete({where:{id:segment.id}})}
  })
})
