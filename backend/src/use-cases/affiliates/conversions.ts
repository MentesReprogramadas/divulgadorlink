import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { env } from '@/env'
import { sealWebhookSecret, openWebhookSecret } from '@/lib/webhook-secret'
import { AffiliateError } from '@/domain/affiliates/contracts'
import { conversionConfig, conversionConfigKey, conversionConsentVersion, conversionIntentInput, conversionMeta, conversionMetaPayload, conversionParticipantPhone, conversionPhoneHash, conversionPhoneSha, conversionRetentionMs, normalizeConversionPhone } from '@/domain/affiliates/conversions'
import { createParticipantAliasCache, parseParticipantPhoneAliases, type ParticipantPhoneAlias } from '@/domain/affiliates/participant-phone-aliases'
import type { parseMembershipEvent } from '@/domain/affiliates/membership'

type Store=Prisma.TransactionClient
const context=(tenantId:string,segmentId:string)=>`affiliate-conversion:${tenantId}:${segmentId}`
const cachedAliases=createParticipantAliasCache()
export type ScopedParticipantAliases={tenantId:string;groupId:string;segmentId:string;baselineAt:Date;resolvedAt:Date;aliases:ParticipantPhoneAlias[]}
export async function prepareConversionAliases(db:PrismaClient,tenantId:string,instanceId:string,event:NonNullable<ReturnType<typeof parseMembershipEvent>>,fetchAliases:()=>Promise<ParticipantPhoneAlias[]>,now?:Date):Promise<ScopedParticipantAliases|null> {
  const checkedAt=now??new Date()
  if(event.action!=='add'||!event.participants.some(identity=>/^\d+@lid$/.test(identity)))return null
  const group=await db.affiliateGroup.findFirst({where:{tenantId,jid:event.jid,enabled:true,segment:{enabled:true},OR:[{instanceId},{segment:{instanceId}},{segment:{instanceLinks:{some:{instanceId,tenantId}}}}]},include:{membershipTracking:true}})
  if(!group||!await db.affiliateInstance.count({where:{id:instanceId,tenantId,name:event.instance,enabled:true}}))return null
  const tracking=group.membershipTracking
  if(tracking?.status!=='READY'||!tracking.baselineAt||!tracking.expiresAt||tracking.expiresAt<=checkedAt||event.occurredAt<=tracking.baselineAt||event.occurredAt.getTime()>checkedAt.getTime()+5*60_000)return null
  const config=await readConversionConfig(db,tenantId)
  if(!config?.enabled||!config.segmentIds.includes(group.segmentId)||config.pixelId!==process.env.META_PIXEL_ID)return null
  if(!await db.affiliateConversionIntent.count({where:{tenantId,segmentId:group.segmentId,confirmedAt:null,revokedAt:null,encryptedMeta:{not:null},consentAt:{lt:event.occurredAt},expiresAt:{gt:checkedAt}}}))return null
  const scope=JSON.stringify([tenantId,instanceId,group.id,group.updatedAt.toISOString(),tracking.baselineAt.toISOString(),[...event.participants].sort()])
  const aliases=await cachedAliases(scope,async()=>{
    const parsed=parseParticipantPhoneAliases({participants:await fetchAliases()})
    if(!parsed)throw new AffiliateError(503,'Não foi possível validar a entrada no grupo.')
    return parsed
  })
  return {tenantId,groupId:group.id,segmentId:group.segmentId,baselineAt:tracking.baselineAt,resolvedAt:now??new Date(),aliases:aliases.filter(row=>event.participants.includes(row.id))}
}
export async function readConversionConfig(db:Pick<Store,'config'>,tenantId:string) {
  const row=await db.config.findUnique({where:{tenantId_key:{tenantId,key:conversionConfigKey}}})
  if(!row)return null
  try {const parsed=conversionConfig.safeParse(JSON.parse(row.value));return parsed.success?parsed.data:null} catch{return null}
}
export async function recordConversionIntent(db:PrismaClient,tenant:{id:string;host:string},slug:string,raw:unknown,userAgent:string,origin:string|undefined,now=new Date()) {
  const parsed=conversionIntentInput.safeParse(raw)
  if(!parsed.success)throw new AffiliateError(400,'Confira os dados de entrada.')
  const input=parsed.data
  const segment=await db.affiliateSegment.findFirst({where:{tenantId:tenant.id,slug,enabled:true},select:{id:true}})
  if(!segment)throw new AffiliateError(404,'Segmentação não encontrada.')
  const result={joinUrl:`https://${tenant.host}/ofertas/entrar/${encodeURIComponent(slug)}`,tracked:false}
  if(!input.marketingConsent)return result
  const config=await readConversionConfig(db,tenant.id)
  if(!config?.enabled||!config.segmentIds.includes(segment.id)||config.pixelId!==process.env.META_PIXEL_ID)return result
  let source:URL
  try {source=new URL(input.sourceUrl)} catch {throw new AffiliateError(400,'Confira a origem da entrada.')}
  if(!origin||!config.allowedOrigins.includes(origin)||source.origin!==origin||source.username||source.password||!['/',"/ofertas/participar/"+encodeURIComponent(slug)].includes(source.pathname))throw new AffiliateError(403,'Origem não autorizada.')
  const phone=normalizeConversionPhone(input.phone)
  if(!phone||!userAgent.trim())throw new AffiliateError(400,'Informe um WhatsApp válido.')
  const master=env.WEBHOOK_ENCRYPTION_KEY
  if(!master)throw new AffiliateError(503,'Mensuração temporariamente indisponível.')
  const phoneHash=conversionPhoneHash(master,tenant.id,segment.id,phone)
  const meta={phoneSha:conversionPhoneSha(phone),userAgent:userAgent.slice(0,512),sourceUrl:source.origin+source.pathname,pixelId:config.pixelId,...(input.fbp?{fbp:input.fbp}:{}),...(input.fbclid?{fbc:`fb.1.${now.getTime()}.${input.fbclid}`}:{})}
  const tracked=await db.$transaction(async tx=>{
    // Same lock as membership correlation: the first valid touch wins across concurrent requests.
    await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id=${segment.id} AND "tenantId"=${tenant.id} FOR UPDATE`
    const currentConfig=await readConversionConfig(tx,tenant.id)
    if(!currentConfig?.enabled||currentConfig.pixelId!==config.pixelId||!currentConfig.segmentIds.includes(segment.id)||!currentConfig.allowedOrigins.includes(origin)||!await tx.affiliateSegment.count({where:{id:segment.id,tenantId:tenant.id,enabled:true}}))return false
    const where={tenantId_segmentId_phoneHash:{tenantId:tenant.id,segmentId:segment.id,phoneHash}}
    const previous=await tx.affiliateConversionIntent.findUnique({where})
    if(previous?.confirmedAt||previous?.revokedAt)return false
    if(previous&&previous.expiresAt>now)return true
    if(previous)await tx.affiliateConversionIntent.delete({where:{id:previous.id}})
    const data={encryptedMeta:sealWebhookSecret(JSON.stringify(meta),master,context(tenant.id,segment.id)),consentVersion:conversionConsentVersion,consentAt:now,expiresAt:new Date(now.getTime()+conversionRetentionMs)}
    const saved=await tx.affiliateConversionIntent.upsert({where,create:{tenantId:tenant.id,segmentId:segment.id,phoneHash,...data},update:data})
    await tx.affiliateConversionOutbox.upsert({where:{intentId_kind:{intentId:saved.id,kind:'INITIAL_LEAD'}},create:{id:"initial-lead:"+saved.id,intentId:saved.id,kind:'INITIAL_LEAD',occurredAt:now,nextAttemptAt:now},update:{}})
    return true
  })
  return {...result,tracked}
}
export async function correlateConversionJoin(tx:Store,input:{tenantId:string;segmentId:string;groupId:string;identity:string;occurredAt:Date;receivedAt:Date;master:string|undefined;phoneAlias?:string}) {
  const phone=conversionParticipantPhone(input.identity)??(/^\d+@lid$/.test(input.identity)&&input.phoneAlias?conversionParticipantPhone(input.phoneAlias):null)
  if(!phone||!input.master)return
  const config=await readConversionConfig(tx,input.tenantId)
  if(!config?.enabled||!config.segmentIds.includes(input.segmentId)||config.pixelId!==process.env.META_PIXEL_ID)return
  await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id=${input.segmentId} AND "tenantId"=${input.tenantId} FOR UPDATE`
  const phoneHash=conversionPhoneHash(input.master,input.tenantId,input.segmentId,phone)
  const intent=await tx.affiliateConversionIntent.findUnique({where:{tenantId_segmentId_phoneHash:{tenantId:input.tenantId,segmentId:input.segmentId,phoneHash}}})
  if(!intent||intent.confirmedAt||intent.revokedAt||!intent.encryptedMeta||intent.consentAt>=input.occurredAt||intent.expiresAt<=input.receivedAt||intent.expiresAt<=input.occurredAt)return
  await tx.affiliateConversionIntent.update({where:{id:intent.id},data:{confirmedAt:input.occurredAt}})
  await tx.affiliateConversionOutbox.create({data:{id:"qualified-group-lead:"+intent.id,intentId:intent.id,kind:'QUALIFIED_GROUP_LEAD',groupId:input.groupId,occurredAt:input.occurredAt,nextAttemptAt:input.receivedAt}})
}
export async function drainConversionOutbox(db:PrismaClient,options:{now?:Date;fetchImpl?:typeof fetch}={}) {
  const now=options.now??new Date(),token=process.env.META_CAPI_TOKEN,master=env.WEBHOOK_ENCRYPTION_KEY
  const scopes=await db.affiliateConversionIntent.findMany({where:{encryptedMeta:{not:null}},distinct:['tenantId'],select:{tenantId:true}})
  for(const scope of scopes) {
    const config=await readConversionConfig(db,scope.tenantId)
    await db.affiliateConversionIntent.updateMany({where:{tenantId:scope.tenantId,encryptedMeta:{not:null},...(!config?.enabled||config.pixelId!==process.env.META_PIXEL_ID?{}:{segmentId:{notIn:config.segmentIds}})},data:{encryptedMeta:null,revokedAt:now}})
  }
  await db.affiliateConversionIntent.updateMany({where:{OR:[{expiresAt:{lte:now}},{revokedAt:{not:null}}]},data:{encryptedMeta:null}})
  await db.affiliateConversionIntent.deleteMany({where:{expiresAt:{lte:now},confirmedAt:null}})
  await db.affiliateConversionIntent.deleteMany({where:{confirmedAt:{lte:new Date(now.getTime()-90*24*60*60*1000)}}})
  const rows=await db.affiliateConversionOutbox.findMany({where:{state:{in:['PENDING','SENDING']},nextAttemptAt:{lte:now},OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lte:now}}]},take:25,orderBy:[{kind:'asc'},{createdAt:'asc'}]})
  for(const candidate of rows) {
    const initial=candidate.kind==='INITIAL_LEAD'
    if(!initial) {
      const first=await db.affiliateConversionOutbox.findUnique({where:{intentId_kind:{intentId:candidate.intentId,kind:'INITIAL_LEAD'}}})
      if(first&&['PENDING','SENDING'].includes(first.state))continue
      if(first?.state!=='SENT') {
        await db.affiliateConversionOutbox.updateMany({where:{id:candidate.id,state:'PENDING'},data:{state:'CANCELLED'}})
        continue
      }
    }
    const leaseToken=randomUUID()
    const claimed=await db.affiliateConversionOutbox.updateMany({where:{id:candidate.id,state:{in:['PENDING','SENDING']},nextAttemptAt:{lte:now},OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lte:now}}]},data:{state:'SENDING',leaseToken,leaseExpiresAt:new Date(now.getTime()+30_000),attempts:{increment:1}}})
    if(!claimed.count)continue
    const intent=await db.affiliateConversionIntent.findUniqueOrThrow({where:{id:candidate.intentId}})
    const config=await readConversionConfig(db,intent.tenantId)
    const segment=await db.affiliateSegment.count({where:{id:intent.segmentId,tenantId:intent.tenantId,enabled:true}})
    const tracking=initial?true:candidate.groupId?await db.affiliateMembershipTracking.findFirst({where:{tenantId:intent.tenantId,groupId:candidate.groupId,status:'READY',expiresAt:{gt:now},group:{enabled:true,segmentId:intent.segmentId}}}):null
    const finish=async(state:string)=>{
      const finished=await db.affiliateConversionOutbox.updateMany({where:{id:candidate.id,leaseToken},data:{state,leaseToken:null,leaseExpiresAt:null}})
      if(!finished.count)return
      // The initial capture retains encrypted attribution for qualification, within the original seven-day TTL.
      if(!initial||state!=='SENT')await db.affiliateConversionIntent.updateMany({where:{id:intent.id},data:{encryptedMeta:null}})
      if(initial&&state!=='SENT')await db.affiliateConversionOutbox.updateMany({where:{intentId:intent.id,kind:'QUALIFIED_GROUP_LEAD',state:'PENDING'},data:{state:'CANCELLED'}})
    }
    if(intent.revokedAt||intent.expiresAt<=now||!intent.encryptedMeta||!config?.enabled||!config.segmentIds.includes(intent.segmentId)||config.pixelId!==process.env.META_PIXEL_ID||!segment||!tracking||!token||!master) {await finish('CANCELLED');continue}
    let success=false,permanent=false
    try {
      const meta=conversionMeta.parse(JSON.parse(openWebhookSecret(intent.encryptedMeta,master,context(intent.tenantId,intent.segmentId))))
      if(meta.pixelId!==config.pixelId||!config.allowedOrigins.includes(new URL(meta.sourceUrl).origin)) {await finish('CANCELLED');continue}
      const response=await(options.fetchImpl??fetch)(`https://graph.facebook.com/v26.0/${config.pixelId}/events`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:token,data:[conversionMetaPayload(meta,candidate.id,intent.segmentId,candidate.occurredAt,initial?'INITIAL_LEAD':'QUALIFIED_GROUP_LEAD',intent.id)]}),signal:AbortSignal.timeout(5_000)})
      const body:unknown=await response.json().catch(()=>null)
      success=response.ok&&typeof body==='object'&&body!==null&&'events_received' in body&&body.events_received===1
      permanent=response.status>=400&&response.status<500&&response.status!==429
    } catch { /* Provider bodies, identity and secrets must never enter logs. */ }
    if(success)await finish('SENT')
    else if(permanent||candidate.attempts+1>=5)await finish('FAILED')
    else await db.affiliateConversionOutbox.updateMany({where:{id:candidate.id,leaseToken},data:{state:'PENDING',leaseToken:null,leaseExpiresAt:null,nextAttemptAt:new Date(now.getTime()+Math.min(3600_000,60_000*2**candidate.attempts))}})
  }
}
