import {randomUUID,createHash} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {beforeAll,beforeEach,afterAll,describe,it,expect,vi} from 'vitest'
const key=vi.hoisted(()=>Buffer.alloc(32,42).toString('base64'))
vi.mock('@/env',()=>({env:{WEBHOOK_ENCRYPTION_KEY:key}}))
import {recordConversionIntent,drainConversionOutbox,prepareConversionAliases} from './conversions'
import {baselineAffiliateMembership,recordAffiliateMembership} from './membership'
import {openWebhookSecret} from '@/lib/webhook-secret'
import {baselineProvisionedConversionGroup} from './conversion-baseline'
import type {AffiliateWhatsApp} from '@/adapters/affiliates/evolution'
import {membershipIdentity} from '@/domain/affiliates/membership'
const url=process.env.AFFILIATE_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable local AFFILIATE_DATABASE_URL required')
const db=new PrismaClient({datasourceUrl:url}),tenant={id:randomUUID(),host:randomUUID()+'.test'},other={id:randomUUID(),host:randomUUID()+'.test'}
let segmentId:string,groupId:string,instanceId:string,secondId:string
const origin='https://'+tenant.host,baseline=new Date('2026-10-30T12:00:00Z'),touch=new Date('2026-10-30T12:01:00Z'),joined=new Date('2026-10-30T12:02:00Z')
const input=(phone='11999991234')=>({phone,marketingConsent:true,sourceUrl:origin+'/ofertas/participar/pets?fbclid=fixture',fbclid:'real-click-fixture'})
const where={tenantId:tenant.id}
async function intent(phone='11999991234',now=touch,extra={}) {return recordConversionIntent(db,tenant,'pets',{...input(phone),...extra},'fixture-agent',origin,now)}
async function config(enabled=true) {const value=JSON.stringify({enabled,pixelId:'123',segmentIds:[segmentId],allowedOrigins:[origin]});await db.config.upsert({where:{tenantId_key:{tenantId:tenant.id,key:'AFFILIATE_META_CONVERSIONS'}},create:{tenantId:tenant.id,key:'AFFILIATE_META_CONVERSIONS',value},update:{value}})}
const event=(identity:string,at=joined,name='one')=>({instance:name,jid:'123@g.us',action:'add' as const,participants:[identity],occurredAt:at})
async function add(identity:string,at=joined,instance=instanceId,name='one') {return recordAffiliateMembership(db,tenant.id,instance,event(identity,at,name),key,at)}
const sent=()=>vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({events_received:1}))
async function boxes() {return db.affiliateConversionOutbox.findMany({orderBy:{kind:'asc'}})}
beforeAll(async()=>{
 process.env.META_PIXEL_ID='123';process.env.META_CAPI_TOKEN='test-token-never-real'
 await db.tenant.createMany({data:[{...tenant,name:'fixture'},{...other,name:'other'}]})
 instanceId=(await db.affiliateInstance.create({data:{tenantId:tenant.id,name:'one'}})).id
 secondId=(await db.affiliateInstance.create({data:{tenantId:tenant.id,name:'two'}})).id
 segmentId=(await db.affiliateSegment.create({data:{tenantId:tenant.id,name:'Pets',slug:'pets',instanceLinks:{create:[{instanceId},{instanceId:secondId}]}}})).id
 groupId=(await db.affiliateGroup.create({data:{tenantId:tenant.id,segmentId,instanceId,jid:'123@g.us',name:'Pets',sequence:1}})).id
})
beforeEach(async()=>{
 await db.affiliateConversionIntent.deleteMany({where});await config()
 await baselineAffiliateMembership(db,tenant.id,groupId,key,async()=>['5511999995678@s.whatsapp.net'],baseline)
})
afterAll(async()=>{await db.config.deleteMany({where});await db.affiliateGroup.deleteMany({where});await db.affiliateSegment.deleteMany({where});await db.affiliateInstance.deleteMany({where});await db.tenant.deleteMany({where:{id:{in:[tenant.id,other.id]}}});await db.$disconnect();delete process.env.META_PIXEL_ID;delete process.env.META_CAPI_TOKEN})
describe('consented lead capture and real group qualification',()=>{
 it('allows no consent without persistence; isolates tenant, origin, source path and pixel',async()=>{
  expect(await intent('',touch,{marketingConsent:false})).toEqual({joinUrl:origin+'/ofertas/entrar/pets',tracked:false})
  expect(await db.affiliateConversionIntent.count({where})).toBe(0);expect(await boxes()).toEqual([])
  await expect(recordConversionIntent(db,other,'pets',input(),'agent',origin,touch)).rejects.toThrow('Segmentação')
  await expect(recordConversionIntent(db,tenant,'pets',input(),'agent','https://evil.test',touch)).rejects.toThrow('Origem')
  await expect(intent('11999991234',touch,{sourceUrl:origin+'/arbitrary-private-path'})).rejects.toThrow('Origem')
  process.env.META_PIXEL_ID='999';expect((await intent()).tracked).toBe(false);process.env.META_PIXEL_ID='123'
 })
 it('atomically records one INITIAL_LEAD, preserves first touch and never stores raw phone',async()=>{
  await Promise.all([intent(),intent()]);await intent('11999991234',new Date(touch.getTime()+1000),{fbclid:'later-click'})
  const row=await db.affiliateConversionIntent.findFirstOrThrow({where})
  expect(row.consentAt).toEqual(touch);expect(JSON.stringify(row)).not.toContain('5511999991234')
  const meta=JSON.parse(openWebhookSecret(row.encryptedMeta!,key,`affiliate-conversion:${tenant.id}:${segmentId}`))
  expect(meta.fbc).toContain('real-click-fixture');expect(meta.fbc).not.toContain('later-click')
  expect(meta.sourceUrl).toBe(origin+'/ofertas/participar/pets')
  expect(await boxes()).toEqual([expect.objectContaining({kind:'INITIAL_LEAD',groupId:null,occurredAt:touch})])
  await expect(db.affiliateConversionOutbox.create({data:{id:randomUUID(),kind:'QUALIFIED_GROUP_LEAD',intentId:row.id,occurredAt:joined}})).rejects.toThrow()
 })
 it('ignores unmatched LID, baseline participants and entries older than the consent',async()=>{
  await intent();await add('5511999991234@lid')
  await intent('11999995678');await add('5511999995678@s.whatsapp.net')
  await intent('11999992222');await add('5511999992222@s.whatsapp.net',new Date(touch.getTime()-1000))
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(0)
 })
 it('qualifies legacy mobile PNs and trusted LID aliases once, then sends both stages',async()=>{
  await intent()
  await add('551199991234@s.whatsapp.net')
  await intent('11988881234')
  const joinedEvent=event('123@lid')
  const aliases=await prepareConversionAliases(db,tenant.id,instanceId,joinedEvent,async()=>[{id:'123@lid',phoneNumber:'551188881234@s.whatsapp.net'}],joined)
  await recordAffiliateMembership(db,tenant.id,instanceId,joinedEvent,key,joined,aliases)
  await recordAffiliateMembership(db,tenant.id,instanceId,joinedEvent,key,joined,aliases)
  expect(await db.affiliateConversionIntent.count({where:{...where,confirmedAt:joined}})).toBe(2)
  expect(await boxes()).toHaveLength(4)
  const fetchImpl=sent();await drainConversionOutbox(db,{now:joined,fetchImpl})
  expect(fetchImpl).toHaveBeenCalledTimes(4)
  expect((await boxes()).every(row=>row.state==='SENT')).toBe(true)
 })
 it('does not qualify an existing baseline PN under a legacy mobile LID alias',async()=>{
  await intent('11999995678')
  const joinedEvent=event('123@lid')
  const aliases=await prepareConversionAliases(db,tenant.id,instanceId,joinedEvent,async()=>[{id:'123@lid',phoneNumber:'551199995678@s.whatsapp.net'}],joined)
  await recordAffiliateMembership(db,tenant.id,instanceId,joinedEvent,key,joined,aliases)
  await add('551199995678@s.whatsapp.net')
  expect(await db.affiliateConversionOutbox.count({where:{intent:{tenantId:tenant.id},kind:'QUALIFIED_GROUP_LEAD'}})).toBe(0)
 })
 it('deduplicates instances/workers, retries with stable event id/time, and orders qualification after initial acceptance',async()=>{
  await intent()
  await Promise.all([add('5511999991234@s.whatsapp.net'),add('5511999991234@s.whatsapp.net',joined,secondId,'two')])
  expect(await boxes()).toHaveLength(2)
  const fetchImpl=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}',{status:503})).mockImplementation(async()=>Response.json({events_received:1}))
  await Promise.all([drainConversionOutbox(db,{now:joined,fetchImpl}),drainConversionOutbox(db,{now:joined,fetchImpl})])
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  expect(await boxes()).toEqual([expect.objectContaining({kind:'INITIAL_LEAD',state:'PENDING',attempts:1}),expect.objectContaining({kind:'QUALIFIED_GROUP_LEAD',state:'PENDING',attempts:0})])
  await drainConversionOutbox(db,{now:new Date(joined.getTime()+60001),fetchImpl})
  expect(fetchImpl).toHaveBeenCalledTimes(3)
  const payloads=fetchImpl.mock.calls.map(call=>JSON.parse(String(call[1]?.body)).data[0])
  expect(payloads[0]).toEqual(payloads[1])
  expect(payloads[1]).toMatchObject({event_name:'SubmitGroupRegistration',action_source:'website',event_source_url:origin+'/ofertas/participar/pets',event_time:Math.floor(touch.getTime()/1000),user_data:{client_user_agent:'fixture-agent'}})
  expect(payloads[2]).toMatchObject({event_name:'QualifiedGroupLead',action_source:'system_generated',event_time:Math.floor(joined.getTime()/1000),custom_data:{event_source:'crm',lead_event_source:'Tem Link Aqui',segment_id:segmentId}})
  const row=await db.affiliateConversionIntent.findFirstOrThrow({where})
  expect(payloads[1].user_data.external_id).toEqual([createHash('sha256').update(row.id).digest('hex')])
  expect(payloads[2].user_data.external_id).toEqual(payloads[1].user_data.external_id)
  expect(payloads[2]).not.toHaveProperty('event_source_url');expect(payloads[2].user_data).not.toHaveProperty('client_user_agent')
  expect(JSON.stringify(payloads)).not.toContain('5511999991234')
  expect((await boxes()).every(row=>row.state==='SENT')).toBe(true)
  expect((await db.affiliateConversionIntent.findFirstOrThrow({where})).encryptedMeta).toBeNull()
  await intent('11999991234',new Date('2026-11-08T12:00:00Z'));await add('5511999991234@s.whatsapp.net',new Date('2026-11-08T12:02:00Z'))
  expect(await boxes()).toHaveLength(2)
 })
 it('retains attribution after Lead SENT for later qualification; never extends the original seven-day TTL',async()=>{
  await intent('11999991234',touch,{sourceUrl:origin+'/'})
  const fetchImpl=sent();await drainConversionOutbox(db,{now:touch,fetchImpl})
  const before=await db.affiliateConversionIntent.findFirstOrThrow({where});expect(before.encryptedMeta).not.toBeNull()
  await add('5511999991234@s.whatsapp.net',new Date(touch.getTime()+86400_000))
  await drainConversionOutbox(db,{now:new Date(touch.getTime()+86400_000),fetchImpl})
  expect(fetchImpl).toHaveBeenCalledTimes(2)
  const after=await db.affiliateConversionIntent.findFirstOrThrow({where});expect(after.expiresAt).toEqual(before.expiresAt);expect(after.encryptedMeta).toBeNull()
 })
 it('excludes the baseline read window and expired intents, and renews only a genuinely new initial capture',async()=>{
  await intent();let finish!:(value:unknown)=>void
  const pending=new Promise<unknown>(resolve=>{finish=resolve})
  const reading=baselineAffiliateMembership(db,tenant.id,groupId,key,()=>pending,touch)
  await vi.waitFor(async()=>expect(await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})).toMatchObject({status:'BASELINING'}))
  await add('5511999991234@s.whatsapp.net');finish(['5511999991234@s.whatsapp.net']);await reading
  await add('5511999991234@s.whatsapp.net',new Date(joined.getTime()+1000))
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(0)
  await intent('11999992222')
  const expired=new Date(touch.getTime()+7*86400_000+1)
  await add('5511999992222@s.whatsapp.net',expired)
  const fetchImpl=sent();await drainConversionOutbox(db,{now:expired,fetchImpl});expect(fetchImpl).not.toHaveBeenCalled()
  expect(await db.affiliateConversionIntent.count({where})).toBe(0)
  await intent('11999992222',expired);expect(await boxes()).toEqual([expect.objectContaining({kind:'INITIAL_LEAD',occurredAt:expired})])
 })
 it('looks up explicit aliases only after scoped READY/config/intent checks, retries failures and preserves baseline identities',async()=>{
  await intent('11999998888')
  const incoming=event('888@lid'),load=vi.fn().mockResolvedValue([{id:'888@lid',phoneNumber:'5511999998888@s.whatsapp.net'}])
  expect(await prepareConversionAliases(db,other.id,instanceId,incoming,load,joined)).toBeNull();expect(load).not.toHaveBeenCalled()
  await db.affiliateMembershipTracking.update({where:{groupId},data:{status:'BASELINING'}})
  expect(await prepareConversionAliases(db,tenant.id,instanceId,incoming,load,joined)).toBeNull();expect(load).not.toHaveBeenCalled()
  await db.affiliateMembershipTracking.update({where:{groupId},data:{status:'READY'}})
  await config(false);expect(await prepareConversionAliases(db,tenant.id,instanceId,incoming,load,joined)).toBeNull();expect(load).not.toHaveBeenCalled();await config()
  await expect(prepareConversionAliases(db,tenant.id,instanceId,incoming,vi.fn().mockRejectedValue(new Error('private error')),joined)).rejects.toThrow()
  expect(await db.affiliateMembershipState.count({where:{...where,identityHash:membershipIdentity(key,tenant.id,'123@g.us','888@lid')}})).toBe(0)
  const aliases=await prepareConversionAliases(db,tenant.id,instanceId,incoming,load,joined)
  await recordAffiliateMembership(db,tenant.id,instanceId,incoming,key,joined,aliases)
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(1)
  // PN baseline membership cannot become a new conversion by switching to its explicit LID alias.
  await intent('11999995678')
  const known=event('5678@lid'),knownAliases=await prepareConversionAliases(db,tenant.id,instanceId,known,async()=>[{id:'5678@lid',phoneNumber:'5511999995678@s.whatsapp.net'}],joined)
  await recordAffiliateMembership(db,tenant.id,instanceId,known,key,joined,knownAliases)
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(1)
 })
 it('rejects alias scope, stale mappings and baseline replacement inside the membership transaction',async()=>{
  await intent('11999990000')
  const incoming=event('000@lid'),resolved=await prepareConversionAliases(db,tenant.id,instanceId,incoming,async()=>[{id:'000@lid',phoneNumber:'5511999990000@s.whatsapp.net'}],joined)
  expect(resolved).not.toBeNull()
  await recordAffiliateMembership(db,tenant.id,instanceId,incoming,key,joined,{...resolved!,tenantId:other.id})
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(0)
  await intent('11999990001')
  await recordAffiliateMembership(db,tenant.id,instanceId,event('001@lid'),key,joined,{...resolved!,resolvedAt:new Date(joined.getTime()-5001),aliases:[{id:'001@lid',phoneNumber:'5511999990001@s.whatsapp.net'}]})
  await intent('11999990002')
  await recordAffiliateMembership(db,tenant.id,instanceId,event('002@lid'),key,joined,{...resolved!,baselineAt:new Date(baseline.getTime()-1),aliases:[{id:'002@lid',phoneNumber:'5511999990002@s.whatsapp.net'}]})
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(0)
 })
 it('stops after five initial failures, cancels qualification and purges attribution without undoing the domain join',async()=>{
  await intent();await add('5511999991234@s.whatsapp.net')
  const fetchImpl=vi.fn<typeof fetch>().mockRejectedValue(new Error('private upstream failure'))
  for(let attempt=0;attempt<6;attempt++)await drainConversionOutbox(db,{now:new Date(joined.getTime()+attempt*3600_000),fetchImpl})
  expect(fetchImpl).toHaveBeenCalledTimes(5)
  expect(await boxes()).toEqual([expect.objectContaining({kind:'INITIAL_LEAD',state:'FAILED',attempts:5}),expect.objectContaining({kind:'QUALIFIED_GROUP_LEAD',state:'CANCELLED',attempts:0})])
  const row=await db.affiliateConversionIntent.findFirstOrThrow({where});expect(row.confirmedAt).toEqual(joined);expect(row.encryptedMeta).toBeNull()
 })
 it('baselines a newly provisioned opted-in group without counting its existing members as qualification',async()=>{
  const group=await db.affiliateGroup.create({data:{tenantId:tenant.id,segmentId,instanceId,jid:'456@g.us',name:'Autoexpanded',sequence:2}})
  const participants=vi.fn().mockResolvedValue(['888@lid'])
  await baselineProvisionedConversionGroup(db,tenant.id,segmentId,group.id,group.jid,{participants} as unknown as AffiliateWhatsApp)
  expect(participants).toHaveBeenCalledWith('456@g.us')
  const tracking=await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId:group.id}})
  expect(tracking.status).toBe('READY');expect(await db.affiliateConversionOutbox.count()).toBe(0)
  const consentAt=new Date(tracking.baselineAt!.getTime()+1000),eventAt=new Date(consentAt.getTime()+1000)
  await intent('11999998888',consentAt)
  const incoming={...event('888@lid',eventAt),jid:group.jid}
  const aliases=await prepareConversionAliases(db,tenant.id,instanceId,incoming,async()=>[{id:'888@lid',phoneNumber:'5511999998888@s.whatsapp.net'}],eventAt)
  await recordAffiliateMembership(db,tenant.id,instanceId,incoming,key,eventAt,aliases)
  expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD'}})).toBe(0)
  await db.affiliateGroup.delete({where:{id:group.id}})
 })
 it('revokes and pauses sending, purges sensitive data, and deletes minimum receipts after ninety days',async()=>{
  await intent();await add('5511999991234@s.whatsapp.net')
  await db.affiliateConversionIntent.updateMany({where,data:{revokedAt:joined}})
  const fetchImpl=sent();await drainConversionOutbox(db,{now:joined,fetchImpl});expect(fetchImpl).not.toHaveBeenCalled()
  expect((await boxes()).every(row=>row.state==='CANCELLED')).toBe(true)
  expect((await db.affiliateConversionIntent.findFirstOrThrow({where})).encryptedMeta).toBeNull()
  await intent('11999992222');await config(false);await drainConversionOutbox(db,{now:joined,fetchImpl});expect(fetchImpl).not.toHaveBeenCalled()
  expect(await db.affiliateConversionIntent.count({where:{...where,encryptedMeta:{not:null}}})).toBe(0)
  await drainConversionOutbox(db,{now:new Date(joined.getTime()+91*86400_000),fetchImpl})
  expect(await db.affiliateConversionIntent.count({where})).toBe(0);expect(await boxes()).toEqual([])
 })
})
