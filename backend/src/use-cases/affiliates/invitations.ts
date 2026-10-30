import type { AffiliateInstance, PrismaClient } from '@prisma/client'
import { AffiliateError, groupName } from '@/domain/affiliates/contracts'
import type { AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { affiliateEvolution } from './instances'
import { resolveStoredAffiliateImage } from './images'
import { resolveStoredAffiliateInvite } from './stored-invite'

type Factory = (instance:AffiliateInstance)=>AffiliateWhatsApp
export async function prepareFirstAffiliateGroup(db:PrismaClient,tenantId:string,actorId:string,id:string,factory:Factory=affiliateEvolution) {
  const segment = await db.affiliateSegment.findFirst({where:{id,tenantId},select:{slug:true,enabled:true}})
  if (!segment) throw new AffiliateError(404,'Segmentação não encontrada.')
  if (!segment.enabled) throw new AffiliateError(409,'Ative a segmentação antes de criar seu primeiro grupo.')
  return joinAffiliateSegment(db,tenantId,segment.slug,factory,{actorId,initialGroup:true})
}
export async function joinAffiliateSegment(db:PrismaClient,tenantId:string,slug:string,factory:Factory=affiliateEvolution,intent?:{initialGroup:true;actorId:string}) {
  const segment = await db.affiliateSegment.findFirst({where:{tenantId,slug,enabled:true},include:{instance:true,instanceLinks:{include:{instance:true},orderBy:[{lastUsedAt:'asc'},{instanceId:'asc'}]},groups:{where:{enabled:true},include:{instance:true},orderBy:{sequence:'desc'},take:1}}})
  if (!segment) throw new AffiliateError(404,'Segmentação indisponível.')
  if (intent?.initialGroup && await db.affiliateGroup.count({where:{tenantId,segmentId:segment.id}})) throw new AffiliateError(409,'Esta segmentação já tem um grupo. Confira os grupos antes de criar outro.')
  let template:{description:string;imageUrl:string|null}|null = null
  let source:{whatsapp:AffiliateWhatsApp;jid:string}|null = null
  const accounts = segment.instanceLinks.length ? segment.instanceLinks.map(link=>link.instance).filter(instance=>instance.enabled):segment.instance?.enabled?[segment.instance]:[]
  // Unknown occupancy never justifies creating another group; try only selected accounts.
  for (const group of segment.groups) {
    const saved=await resolveStoredAffiliateInvite(db,tenantId,segment,group)
    if(saved)return saved
    let checked = false
    const candidates = segment.instanceLinks.length ? accounts:group.instance.enabled?[group.instance]:accounts
    for (const instance of candidates) {
      try {
        const whatsapp = factory(instance)
        if(whatsapp.status && (await whatsapp.status()).state!=='open') continue
        const live = await whatsapp.group(group.jid)
        template = live;source = {whatsapp,jid:group.jid}
        await db.affiliateGroup.updateMany({where:{id:group.id,tenantId},data:{name:live.name,participantCount:live.participantCount,syncedAt:new Date()}})
        if (live.participantCount < Math.min(group.capacity,segment.capacity)) {
          const url = await whatsapp.invite(group.jid)
          const stillEnabled = await db.affiliateGroup.count({where:{id:group.id,tenantId,enabled:true,segment:{enabled:true}}})
          if (!stillEnabled) throw new AffiliateError(409,'O grupo foi pausado. Tente novamente.')
          if(!await db.affiliateInstance.count({where:{id:instance.id,tenantId,enabled:true}})) continue
          await db.affiliateGroup.updateMany({where:{id:group.id,tenantId},data:{inviteUrl:url}})
          return {url}
        }
        checked = true;break
      } catch(error) {if(error instanceof AffiliateError && error.status===409) throw error}
    }
    if(!checked) throw new AffiliateError(503,'Não foi possível conferir vagas e permissões do grupo. Tente novamente mais tarde.')
  }
  if (!segment.autoExpand && !intent?.initialGroup) throw new AffiliateError(409,'Não há vagas disponíveis neste momento.')
  let provisioner:AffiliateInstance|null = null
  for(const instance of accounts.filter(row=>row.ownerPhone)) {
    try {const port=factory(instance);if(!port.status || (await port.status({fresh:true})).state==='open') {provisioner=instance;break}} catch { /* Try another selected account before any create request. */ }
  }
  if (!provisioner) throw new AffiliateError(503,'A expansão aguarda uma conexão ativa com o WhatsApp do participante inicial configurado.')
  if (segment.nextSequence>=2_147_483_647) throw new AffiliateError(409,'A sequência de grupos atingiu o limite. Crie outra segmentação.')
  if (!segment.imageUrl && !template?.imageUrl && source?.whatsapp.avatar) {
    template = {...template!,imageUrl:await source.whatsapp.avatar(source.jid)}
  }
  const startedAt = new Date()
  const claimed = await db.affiliateSegment.updateMany({where:{id:segment.id,tenantId,enabled:true,...(intent?.initialGroup?{groups:{none:{}}}:{autoExpand:true}),OR:[{instanceLinks:{some:{instanceId:provisioner.id,instance:{enabled:true}}}},{instanceLinks:{none:{}},instance:{id:provisioner.id,enabled:true}}],provisionState:'IDLE',updatedAt:segment.updatedAt},data:{provisionState:'CREATING',provisionStartedAt:startedAt,instanceId:provisioner.id}})
  if (!claimed.count) throw new AffiliateError(409,'Outro convite está preparando o grupo. Aguarde e tente novamente.')
  const whatsapp = factory(provisioner)
  await db.affiliateSegmentInstance.updateMany({where:{tenantId,segmentId:segment.id,instanceId:provisioner.id},data:{lastUsedAt:startedAt}})
  let createdJid:string|null = null
  try {
    const name = groupName(segment.groupName ?? segment.name,segment.nextSequence), description = segment.description || template?.description || ''
    const picture = await resolveStoredAffiliateImage(db,tenantId,segment.imageUrl || template?.imageUrl || null)
    createdJid = await whatsapp.create(name,description)
    if (description) await whatsapp.describe(createdJid,description)
    if (picture) await whatsapp.picture(createdJid,picture)
    const live = await whatsapp.group(createdJid),url = await whatsapp.invite(createdJid)
    await db.$transaction(async tx => {
      const current = await tx.affiliateSegment.findFirstOrThrow({where:{id:segment.id,tenantId}})
      await tx.affiliateGroup.create({data:{tenantId,segmentId:segment.id,instanceId:provisioner.id,jid:createdJid!,name,sequence:segment.nextSequence,participantCount:live.participantCount,capacity:segment.capacity,inviteUrl:url,syncedAt:new Date(),enabled:current.enabled}})
      await tx.affiliateSegment.update({where:{id:segment.id},data:{nextSequence:{increment:1},provisionState:'IDLE',provisionStartedAt:null}})
      await tx.auditLog.create({data:{tenantId,actorId:intent?.actorId,action:'affiliate.group.provisioned',entityType:'AffiliateSegment',entityId:segment.id,after:{sequence:segment.nextSequence,jid:createdJid}}})
    })
    const current = await db.affiliateSegment.findFirst({where:{id:segment.id,tenantId,enabled:true,instance:{enabled:true}}})
    if (!current) throw new AffiliateError(409,'A segmentação foi pausada. Tente novamente mais tarde.')
    return {url}
  } catch (error) {
    // No retry after the remote create may have succeeded; operator must reconcile.
    await db.affiliateSegment.updateMany({where:{id:segment.id,tenantId,provisionState:'CREATING'},data:{provisionState:'UNCERTAIN'}})
    await db.auditLog.create({data:{tenantId,actorId:intent?.actorId,action:'affiliate.group.provision_uncertain',entityType:'AffiliateSegment',entityId:segment.id,after:{jid:createdJid,sequence:segment.nextSequence}}})
    if (error instanceof AffiliateError && error.status < 500) throw error
    throw new AffiliateError(503,'Estamos conferindo a criação do grupo. Tente novamente mais tarde.')
  }
}

export async function reconcileAffiliateSegment(db:PrismaClient,tenantId:string,actorId:string,id:string,input:{jid?:string;confirmAbsent?:boolean},factory:Factory=affiliateEvolution) {
  const segment = await db.affiliateSegment.findFirst({where:{id,tenantId},include:{instance:true}})
  if (!segment?.instance || !['CREATING','UNCERTAIN'].includes(segment.provisionState)) throw new AffiliateError(409,'Não existe criação pendente para conferir.')
  if (segment.provisionState==='CREATING' && segment.provisionStartedAt && Date.now()-segment.provisionStartedAt.getTime()<120_000) throw new AffiliateError(409,'A criação ainda está em andamento. Aguarde dois minutos.')
  const whatsapp = factory(segment.instance)
  const expected = groupName(segment.groupName ?? segment.name,segment.nextSequence)
  let live = input.jid ? await whatsapp.group(input.jid):null
  if (!live) {
    if (!input.confirmAbsent) throw new AffiliateError(400,'Informe o grupo criado ou confirme que ele não existe.')
    const matches = (await whatsapp.groups()).filter(group=>group.name===expected)
    if (matches.length) throw new AffiliateError(409,'Há um grupo com o nome esperado. Importe esse grupo antes de liberar nova criação.')
  } else {
    if (live.name !== expected) throw new AffiliateError(409,`O nome esperado é ${expected}.`)
    const previous = await db.affiliateGroup.findFirst({where:{tenantId,segmentId:id},orderBy:{sequence:'desc'},include:{instance:true}})
    const source = previous ? factory(previous.instance):null
    const template = previous && source ? await source.group(previous.jid):null
    const description = segment.description || template?.description || ''
    const picture = await resolveStoredAffiliateImage(db,tenantId,segment.imageUrl || template?.imageUrl || (previous && source?.avatar ? await source.avatar(previous.jid):null))
    if (description) await whatsapp.describe(live.jid,description)
    if (picture) await whatsapp.picture(live.jid,picture)
    live = {...live}
  }
  const inviteUrl = live ? await whatsapp.invite(live.jid):null
  return db.$transaction(async tx => {
    const changed = await tx.affiliateSegment.updateMany({where:{id,tenantId,updatedAt:segment.updatedAt},data:{provisionState:'IDLE',provisionStartedAt:null,...(live?{nextSequence:{increment:1}}:{})}})
    if (!changed.count) throw new AffiliateError(409,'A segmentação mudou. Atualize a página.')
    if (live) await tx.affiliateGroup.create({data:{tenantId,segmentId:id,instanceId:segment.instanceId!,jid:live.jid,name:live.name,sequence:segment.nextSequence,participantCount:live.participantCount,capacity:segment.capacity,inviteUrl,syncedAt:new Date()}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.group.reconciled',entityType:'AffiliateSegment',entityId:id,after:{jid:live?.jid ?? null,confirmedAbsent:input.confirmAbsent ?? false}}})
    return {saved:true}
  })
}
