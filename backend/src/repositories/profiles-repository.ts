import { ContentReviewRequired, reviewSummary } from '@/domain/moderation/content-review'
import { queueContentReview } from '@/use-cases/@Notifications/content-review-events'
import { Prisma, type PrismaClient } from '@prisma/client'
import { ProfileError, profileAt, visibleProfile, type ProfileContent } from '@/domain/profiles/profile'
import { profileInput } from '@/domain/profiles/profile-input'
import { assertPublicHttps } from '@/adapters/http/safe-fetch'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import { validateProfile, type ProfileValidationPorts } from '@/use-cases/@Profiles/validate-profile'
import { restoreProfileContent } from '@/domain/profiles/profile-history'
import { availableProfileRevisions, pruneProfileRevisions, recordProfileRevision } from './profile-revisions'
import { PrismaProfileMedia } from './profile-media'
import { profileSchedulingCoverage } from './profile-capability-coverage'
import { profileBillingRuntime } from '@/lib/profile-billing'
import { profileNow } from '@/lib/profile-clock'
import { createHash, randomUUID } from 'node:crypto'
import { applyProfileTemplate, protectTemplateExamples } from '@/domain/profiles/template-content'
import {planProfileImport,previewProfileImport,type ImportChoice} from '@/domain/profiles/profile-import'
import {readProfileImport,signProfileImport} from '@/lib/profile-import-token'
import {buildProfileChecklist} from '@/domain/profiles/profile-checklist'
import {assertProfilePublicationPresence,normalizeProfileDestinations} from '@/use-cases/@Profiles/publication-structure'
import {channelNetwork,mergeChannelGroup,type ChannelBinding,type ChannelSettings} from '@/domain/profiles/profile-channels'
import type {ChannelGroupInput} from '@/domain/profiles/channel-input'
import {readChannelDraft,readChannelRevision,putChannelDraft,scopedChannelSettings,synchronizeChannelDraft,assertChannelPublication,projectStoredChannels,restoreChannelDraft,channelSummary,type ChannelProfile} from './profile-channels-storage'
import {env} from '@/env'
import {signProfileChannel,readProfileChannel,PROFILE_CHANNEL_TOKEN_MS} from '@/lib/profile-channel-token'
import {resolveRedirect} from './redirects-repository'

type Actor = { tenantId: string; ownerId: string; age: boolean }
const include = { reviews: { orderBy: { version: 'desc' as const }, take: 1 }, categories: { orderBy: { position: 'asc' as const } }, items: { orderBy: { position: 'asc' as const } } }
type Stored = Prisma.ProfileGetPayload<{ include: typeof include }>
function draft(row: Stored): ProfileContent {
  return profileInput.parse({ ...(row.appearance ? { appearance: row.appearance } : {}), slug: row.slug, name: row.name, bio: row.bio, avatarAssetId: row.avatarAssetId, requiresAge: row.requiresAge, primaryItemId: row.items.some(i => i.id === row.primaryItemId) ? row.primaryItemId : null, categories: row.categories.map(c => ({ id: c.id, name: c.name, visible: c.visible })), items: row.items.map(i => ({ id: i.id, categoryId: i.categoryId, type: i.type, label: i.label, destination: i.destination, visible: i.visible, ...(i.templateExample ? { templateExample: true } : {}), ...(i.timeZone ? { schedule: { startsAt: i.startsAt?.toISOString() ?? null, endsAt: i.endsAt?.toISOString() ?? null, timeZone: i.timeZone, paused: i.paused } } : {}) })) })
}
async function owner(db: Prisma.TransactionClient, actor: Actor, publishing = false) {
  const user = await db.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId }, include: { identifiers: true } })
  const canSubmit=Boolean(user&&canSubmitLinkFromIdentifiers(user.status,user.identifiers))
  if (!user || user.status !== 'ACTIVE' || (publishing && !canSubmit)) throw new ProfileError(403, 'Esta conta não pode alterar ou publicar o perfil. Confirme seu e-mail e verifique o estado da conta.')
  return {canSubmit}
}
export {owner as assertProfileOwner}
async function locked<T>(db: PrismaClient, actor: Actor, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    await owner(tx, actor)
    return work(tx)
  })
}
async function read(db: Prisma.TransactionClient, actor: Actor) { return db.profile.findUnique({ where: { tenantId_ownerId: { tenantId: actor.tenantId, ownerId: actor.ownerId } }, include }) }
function version(row: Stored | null, expected: number) { if ((row?.version ?? 0) !== expected) throw new ProfileError(409, 'O perfil mudou em outra aba. Recarregue os dados antes de salvar.') }
async function response(db: Prisma.TransactionClient, actor: Actor, row: Stored | null) {
  const now = profileNow(), coverage = await profileSchedulingCoverage(db, actor, profileBillingRuntime().delivered, now)
  const channels=row?scopedChannelSettings(await readChannelDraft(db,row),draft(row)):{groups:[]},publishedChannels=row?.publishedVersion!==null&&row?.publishedVersion!==undefined?await readChannelRevision(db,row,row.publishedVersion):{groups:[]}
  return { draft: row ? { ...draft(row), version: row.version } : null, publishedVersion: row?.publishedVersion ?? null, publishedContent: row?.publication ? profileInput.parse(row.publishedDraft ?? row.publication) : null, review: reviewSummary(row?.reviews[0]), scheduling: { allowed: coverage.enabled, serverNow: now.toISOString() },...(row&&(channels.groups.length||publishedChannels.groups.length)?{channelGroups:await channelSummary(db,row,draft(row),channels),channelChanges:JSON.stringify(channels)!==JSON.stringify(publishedChannels)}:{}) }
}
async function checkAvatar(db: Prisma.TransactionClient, actor: Actor, content: ProfileContent) {
  if (content.avatarAssetId && !await new PrismaProfileMedia(db).get({ tenantId: actor.tenantId, ownerId: actor.ownerId, id: content.avatarAssetId })) throw new ProfileError(422, 'A foto não está disponível para esta conta. Envie a imagem novamente.')
}
async function checkProfileReferences(db: Prisma.TransactionClient, actor: Actor, content: ProfileContent) {
  const refs=[...new Set(content.items.filter(item=>item.type==='CATALOG').map(item=>item.destination))]
  if(await db.link.count({where:{id:{in:refs},tenantId:actor.tenantId,ownerId:actor.ownerId}})!==refs.length)throw new ProfileError(404,'Link do catálogo não encontrado para esta conta.')
}
async function pruneMedia(db: Prisma.TransactionClient, actor: Actor, keep: string[] = []) {
  const row = await read(db, actor)
  if (row?.avatarAssetId) keep.push(row.avatarAssetId)
  if (row?.publication) { const live = profileInput.parse(row.publication); if (live.avatarAssetId) keep.push(live.avatarAssetId) }
  await db.profileAsset.deleteMany({ where: { tenantId: actor.tenantId, ownerId: actor.ownerId, id: { notIn: keep } } })
}
async function writeProfileItems(tx: Prisma.TransactionClient, actor: Actor, profileId: string, content: ProfileContent) {
  const { categories, items } = content
  await tx.profileItem.deleteMany({ where: { profileId } }); await tx.profileCategory.deleteMany({ where: { profileId } })
  await tx.profileCategory.createMany({ data: categories.map((category, position) => ({ ...category, position, profileId, tenantId: actor.tenantId, ownerId: actor.ownerId })) })
  const catalog = await tx.link.findMany({ where: { tenantId: actor.tenantId, ownerId: actor.ownerId, id: { in: items.filter(item => item.type === 'CATALOG').map(item => item.destination) } }, select: { id: true } })
  const refs = new Set(catalog.map(link => link.id))
  await tx.profileItem.createMany({ data: items.map(({ schedule, ...item }, position) => ({ ...item, startsAt: schedule?.startsAt ? new Date(schedule.startsAt) : null, endsAt: schedule?.endsAt ? new Date(schedule.endsAt) : null, timeZone: schedule?.timeZone ?? null, paused: schedule?.paused ?? false, linkId: item.type === 'CATALOG' && refs.has(item.destination) ? item.destination : null, position, profileId, tenantId: actor.tenantId, ownerId: actor.ownerId })) })
  await synchronizeChannelDraft(tx,{id:profileId,tenantId:actor.tenantId,ownerId:actor.ownerId},content)
}
/** One projection for owner preview and public reads. Live catalog eligibility is never frozen into a snapshot. */
async function projection(db: Prisma.TransactionClient, actor: Actor, content: ProfileContent, publishedRevisionId: number,profile:ChannelProfile,source:'DRAFT'|'PUBLISHED', at?: Date) {
  const refs = content.items.filter(i => i.type === 'CATALOG').map(i => i.destination)
  const links = await db.link.findMany({ where: { tenantId: actor.tenantId, id: { in: refs }, status: 'PUBLISHED', OR: [{ ownerId: null }, { owner: { status: 'ACTIVE', tenantId: actor.tenantId } }] }, include: { niche: true, network: true } })
  const eligible = links.filter(l => l.niche.tenantId === actor.tenantId && l.network.tenantId === actor.tenantId)
  const now = profileNow(), coverage = await profileSchedulingCoverage(db, actor, profileBillingRuntime().delivered, now)
  if (at && !coverage.enabled) throw new ProfileError(403, 'Agendamento indisponível no seu plano atual.')
  const projected = profileAt(content, new Set(eligible.map(l => l.id)), at ?? now, coverage.enabled)
  const settings=scopedChannelSettings(source==='DRAFT'?await readChannelDraft(db,profile):await readChannelRevision(db,profile,publishedRevisionId),content),channelIds=new Set(settings.groups.flatMap(group=>group.channels.map(channel=>channel.id))),groupIds=new Set(settings.groups.map(group=>group.id))
  const channels=await projectStoredChannels(db,profile,{...projected.content,categories:content.categories.filter(category=>category.visible&&(groupIds.has(category.id)||projected.content.categories.some(row=>row.id===category.id)))},settings),activeIds=new Set(channels.flatMap(group=>group.channels.map(channel=>channel.id)))
  const items=projected.content.items.filter(item=>!channelIds.has(item.id)||activeIds.has(item.id))
  const output={...projected.content,items,categories:content.categories.filter(category=>category.visible&&(channels.some(group=>group.id===category.id)||items.some(item=>item.categoryId===category.id))),primaryItemId:items.some(item=>item.id===content.primaryItemId)?content.primaryItemId:null}
  const boundaries = [projected.nextBoundary, coverage.until].filter((value): value is Date => value !== null && value > now)
  if(source==='PUBLISHED'&&activeIds.size)boundaries.push(new Date(now.getTime()+PROFILE_CHANNEL_TOKEN_MS))
  const nextBoundary = boundaries.length ? new Date(Math.min(...boundaries.map(value => value.getTime()))) : null
  const adult = output.requiresAge || output.items.some(i => i.type === 'CATALOG' && eligible.some(l => l.id === i.destination && (l.niche.requiresAge || l.network.requiresAge)))||channels.some(group=>group.channels.some(channel=>channel.requiresAge))
  if (adult && !actor.age) return { restricted: true as const }
  for (const item of output.items) if (item.type !== 'CATALOG') { try { assertPublicHttps(item.destination); item.destination = canonicalUrl(item.destination) } catch { throw new ProfileError(422, 'Corrija os destinos antes de abrir a prévia.') } }
  const channelGroups=channels.map(group=>({id:group.id,name:group.name,channels:group.channels.map(channel=>({id:channel.id,label:channel.label,network:channel.network,href:source==='DRAFT'?output.items.find(item=>item.id===channel.id)!.destination:'/p/'+encodeURIComponent(content.slug)+'/canais/'+channel.id+'?token='+encodeURIComponent(signProfileChannel({tenantId:actor.tenantId,profileId:profile.id,revisionId:publishedRevisionId,channelId:channel.id,destinationRevisionId:channel.revisionId},env.JWT_SECRET,now))}))}))
  return { restricted: false as const, ...output, publishedRevisionId, serverNow: now.toISOString(), nextBoundary: at ? null : nextBoundary?.toISOString() ?? null, ...(at ? { previewAt: at.toISOString() } : {}),...(settings.groups.length?{channelGroups}:{}) }
}
export async function readProfile(db: PrismaClient, actor: Actor) {
  return db.$transaction(async tx => { await owner(tx, actor); return response(tx, actor, await read(tx, actor)) }, { isolationLevel: 'RepeatableRead' })
}
async function assertPublishedProfileReferences(tx:Prisma.TransactionClient,actor:Actor,content:ProfileContent){
 const ids=[...new Set(content.items.filter(item=>item.type==='CATALOG').map(item=>item.destination))]
 const count=await tx.link.count({where:{tenantId:actor.tenantId,ownerId:actor.ownerId,status:'PUBLISHED',id:{in:ids},niche:{tenantId:actor.tenantId},network:{tenantId:actor.tenantId}}})
 if(count!==ids.length)throw new ProfileError(422,'Escolha links publicados do seu catálogo ou use uma URL própria.')
}
const checklistActions={PREVIEW_REQUESTED:'profile.checklist.preview_requested',LINK_COPIED:'profile.checklist.link_copied'} as const
async function checklist(tx:Prisma.TransactionClient,actor:Actor){
 const {canSubmit}=await owner(tx,actor),row=await read(tx,actor),content=row?draft(row):null
 let publicationIssue:string|null=null
 if(content)try{assertProfilePublicationPresence(content);await assertPublishedProfileReferences(tx,actor,normalizeProfileDestinations(content));await assertChannelPublication(tx,row!,content)}catch(error){if(error instanceof ProfileError&&error.status===422)publicationIssue=error.message;else throw error}
 const scope=row?{tenantId:actor.tenantId,actorId:actor.ownerId,entityType:'Profile',entityId:row.id}:null
 const [preview,copied]=scope&&row?await Promise.all([
  tx.auditLog.findFirst({where:{...scope,action:checklistActions.PREVIEW_REQUESTED,after:{path:['profileVersion'],equals:row.version}},select:{id:true}}),
  row.publishedVersion===null?null:tx.auditLog.findFirst({where:{...scope,action:checklistActions.LINK_COPIED,after:{path:['publishedVersion'],equals:row.publishedVersion}},select:{id:true}}),
 ]):[null,null]
 return buildProfileChecklist({draft:content&&row?{...content,version:row.version}:null,publishedVersion:row?.publishedVersion??null,publishedSlug:row?.publication?profileInput.parse(row.publication).slug:null,review:reviewSummary(row?.reviews[0]),canSubmit,publicationIssue,milestones:{previewRequested:Boolean(preview),linkCopied:Boolean(copied)}})
}
export async function readProfileChecklist(db:PrismaClient,actor:Actor){return db.$transaction(tx=>checklist(tx,actor),{isolationLevel:'RepeatableRead'})}
export async function recordProfileChecklistAction(db:PrismaClient,actor:Actor,input:{action:keyof typeof checklistActions;expectedVersion:number}){
 return locked(db,actor,async tx=>{
  const row=await read(tx,actor);if(!row)throw new ProfileError(404,'Salve sua página antes de continuar.');version(row,input.expectedVersion)
  if(input.action==='LINK_COPIED'&&row.publishedVersion===null)throw new ProfileError(409,'Publique sua página antes de copiar o endereço.')
  const action=checklistActions[input.action],where={tenantId:actor.tenantId,actorId:actor.ownerId,entityType:'Profile',entityId:row.id,action}
  if(!await tx.auditLog.findFirst({where:{...where,after:{path:[input.action==='LINK_COPIED'?'publishedVersion':'profileVersion'],equals:input.action==='LINK_COPIED'?row.publishedVersion!:row.version}},select:{id:true}}))await tx.auditLog.create({data:{...where,after:{profileVersion:row.version,publishedVersion:row.publishedVersion}}})
  return checklist(tx,actor)
 })
}
async function writeDraft(tx:Prisma.TransactionClient,actor:Actor,current:Stored|null,content:ProfileContent){
  if (current?.publication && current.slug !== content.slug) throw new ProfileError(409, 'Retire o perfil do ar antes de mudar seu endereço.')
    const changedSchedules = content.items.some(item => item.schedule && JSON.stringify(item.schedule) !== JSON.stringify(current ? draft(current).items.find(old => old.id === item.id)?.schedule : null))
    if (changedSchedules && !(await profileSchedulingCoverage(tx, actor, profileBillingRuntime().delivered, profileNow())).enabled) throw new ProfileError(403, 'Seu plano atual não permite definir agendamentos. Você pode remover o agendamento e manter o link comum.')
    await checkAvatar(tx, actor, content)
    await checkProfileReferences(tx,actor,content)
    const fields = { slug: content.slug, name: content.name, bio: content.bio, avatarAssetId: content.avatarAssetId, requiresAge: content.requiresAge, primaryItemId: content.primaryItemId, appearance: content.appearance ?? Prisma.DbNull }
    const row = current ? await tx.profile.update({ where: { id: current.id }, data: { ...fields, version: { increment: 1 } } }) : await tx.profile.create({ data: { ...fields, tenantId: actor.tenantId, ownerId: actor.ownerId, version: 1 } })
    await writeProfileItems(tx, actor, row.id, content)
    await tx.contentReview.updateMany({ where: { profileId: row.id, status: { in: ['PENDING', 'REJECTED'] } }, data: { status: 'SUPERSEDED', resolvedAt: new Date() } })
    await pruneMedia(tx, actor)
    return response(tx, actor, await read(tx, actor))
}
export async function saveProfile(db: PrismaClient, actor: Actor, content: ProfileContent, expectedVersion: number) {
  return locked(db, actor, async tx => {
    const current = await read(tx, actor)
    content = protectTemplateExamples(current ? draft(current) : null, content)
    if (current && JSON.stringify(draft(current)) === JSON.stringify(content)) return response(tx, actor, current)
    version(current, expectedVersion)
    return writeDraft(tx,actor,current,content)
  })
}
export async function readProfileChannelGroups(db:PrismaClient,actor:Actor){
 return db.$transaction(async tx=>{
  await owner(tx,actor);const row=await read(tx,actor);if(!row)throw new ProfileError(404,'Crie e salve sua página antes de adicionar alternativas.')
  const content=draft(row),value=scopedChannelSettings(await readChannelDraft(tx,row),content)
  const ids=value.groups.flatMap(group=>group.channels.map(channel=>channel.revisionId)),networkIds=value.groups.flatMap(group=>group.channels.flatMap(channel=>channel.networkId?[channel.networkId]:[]))
  const [destinations,networks]=await Promise.all([
   tx.redirectDestination.findMany({where:{id:{in:ids},tenantId:actor.tenantId,handle:{tenantId:actor.tenantId,ownerId:actor.ownerId}},include:{handle:{select:{activeRevisionId:true,disabled:true}}}}),
   tx.network.findMany({where:{tenantId:actor.tenantId,isPublicFacet:true,OR:[{knownHosts:{isEmpty:false}},{id:{in:networkIds}}]},select:{id:true,name:true,slug:true,knownHosts:true},orderBy:{name:'asc'}}),
  ])
  const positions=new Map(content.categories.map((category,index)=>[category.id,index]))
  return{profileVersion:row.version,publishedVersion:row.publishedVersion,networks:networks.filter(network=>network.knownHosts.length).map(({id,name,slug})=>({id,name,slug})),groups:[...value.groups].sort((a,b)=>(positions.get(a.id)??0)-(positions.get(b.id)??0)).map(group=>{
   const category=content.categories.find(candidate=>candidate.id===group.id)!
   return{id:category.id,name:category.name,visible:category.visible,channels:group.channels.map(binding=>{
    const item=content.items.find(candidate=>candidate.id===binding.id&&candidate.categoryId===group.id)!,source=destinations.find(candidate=>candidate.id===binding.revisionId)
    const network=binding.networkId?networks.find(candidate=>candidate.id===binding.networkId):null
    let available=Boolean(source&&source.status==='APPROVED'&&!source.handle.disabled&&source.handle.activeRevisionId===source.id&&source.destinationUrl===item.destination)
    if(binding.networkId&&!network?.knownHosts.length)available=false
    if(available)try{channelNetwork(network?{...network,tenantId:actor.tenantId}:null,item.destination)}catch{available=false}
    return{id:item.id,label:item.label,networkId:binding.networkId,destinationRevisionId:binding.revisionId,paused:binding.paused||!item.visible,available,destinationLabel:source?.label??'Convite indisponível',network:network?{name:network.name,slug:network.slug}:binding.networkId?null:{name:'Site',slug:'site'}}
   })}
  })}
 },{isolationLevel:'RepeatableRead'})
}
export async function profileChannelDestinations(db:PrismaClient,actor:Actor,cursor?:string){
 return db.$transaction(async tx=>{
  await owner(tx,actor)
  const handles=await tx.redirectHandle.findMany({where:{tenantId:actor.tenantId,ownerId:actor.ownerId,disabled:false,activeRevisionId:{not:null},...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:'asc'},take:26,select:{id:true,activeRevisionId:true}}),page=handles.slice(0,25)
  const destinations=await tx.redirectDestination.findMany({where:{tenantId:actor.tenantId,status:'APPROVED',id:{in:page.flatMap(handle=>handle.activeRevisionId?[handle.activeRevisionId]:[])},handle:{tenantId:actor.tenantId,ownerId:actor.ownerId,disabled:false}},select:{id:true,handleId:true,label:true,destinationUrl:true,requiresAge:true}}),networks=await tx.network.findMany({where:{tenantId:actor.tenantId,isPublicFacet:true,knownHosts:{isEmpty:false}},select:{id:true,tenantId:true,name:true,slug:true,knownHosts:true}})
  return{items:page.flatMap(handle=>{const destination=destinations.find(row=>row.id===handle.activeRevisionId&&row.handleId===handle.id);return destination?[{...destination,networks:networks.flatMap(network=>{try{channelNetwork(network,destination.destinationUrl);return[{id:network.id,name:network.name,slug:network.slug}]}catch{return[]}})}]:[]}),nextCursor:handles.length>25?page[24].id:null}
 },{isolationLevel:'RepeatableRead'})
}
export async function saveProfileChannelGroup(db:PrismaClient,actor:Actor,id:string,input:ChannelGroupInput){
 return locked(db,actor,async tx=>{
  const row=await read(tx,actor);if(!row)throw new ProfileError(404,'Crie e salve sua página antes de adicionar alternativas.')
  const content=draft(row),current=scopedChannelSettings(await readChannelDraft(tx,row),content)
  if(content.categories.some(group=>group.id===id)&&!current.groups.some(group=>group.id===id))throw new ProfileError(409,'Este grupo já contém links comuns. Crie um novo grupo de alternativas.')
  const revisions=await tx.redirectDestination.findMany({where:{id:{in:input.channels.map(channel=>channel.destinationRevisionId)},tenantId:actor.tenantId,handle:{tenantId:actor.tenantId,ownerId:actor.ownerId,owner:{tenantId:actor.tenantId,status:'ACTIVE'}}},include:{handle:{select:{id:true,activeRevisionId:true,disabled:true}}}})
  const networks=await tx.network.findMany({where:{tenantId:actor.tenantId,isPublicFacet:true,id:{in:input.channels.flatMap(channel=>channel.networkId?[channel.networkId]:[])}}})
  const bindings:ChannelBinding[]=[],channels=input.channels.map(channel=>{
   const previous=current.groups.find(group=>group.id===id)?.channels.find(binding=>binding.id===channel.id&&binding.revisionId===channel.destinationRevisionId&&binding.networkId===channel.networkId),previousItem=content.items.find(item=>item.id===channel.id&&item.categoryId===id)
   if((channel.paused||!input.visible)&&previous&&previousItem){bindings.push({...previous,paused:channel.paused});return{id:channel.id,label:channel.label,destination:previousItem.destination,paused:channel.paused}}
   const source=revisions.find(revision=>revision.id===channel.destinationRevisionId&&revision.status==='APPROVED'&&!revision.handle.disabled&&revision.handle.activeRevisionId===revision.id)
   if(!source)throw new ProfileError(404,'Escolha um convite próprio com uma versão aprovada e ativa.')
   const network=channel.networkId?networks.find(candidate=>candidate.id===channel.networkId):null
   if(channel.networkId&&!network)throw new ProfileError(404,'Rede não encontrada para esta página.')
   channelNetwork(network??null,source.destinationUrl);bindings.push({id:channel.id,networkId:channel.networkId,handleId:source.handleId,revisionId:source.id,paused:channel.paused})
   return{id:channel.id,label:channel.label,destination:source.destinationUrl,paused:channel.paused}
  })
  const nextContent=profileInput.parse(mergeChannelGroup(content,{id,name:input.name,visible:input.visible,channels},id)),group={id,channels:bindings},next:ChannelSettings={groups:current.groups.some(candidate=>candidate.id===id)?current.groups.map(candidate=>candidate.id===id?group:candidate):[...current.groups,group]}
  if(JSON.stringify(nextContent)===JSON.stringify(content)&&JSON.stringify(next)===JSON.stringify(current))return response(tx,actor,row)
  version(row,input.expectedVersion);await putChannelDraft(tx,row,next);const result=await writeDraft(tx,actor,row,nextContent)
  await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'profile.channels.updated',entityType:'Profile',entityId:row.id,after:{groupId:id,channelCount:bindings.length,profileVersion:row.version+1}}})
  return result
 })
}
export async function removeProfileChannelGroup(db:PrismaClient,actor:Actor,id:string,expectedVersion:number){
 return locked(db,actor,async tx=>{
  const row=await read(tx,actor);if(!row)throw new ProfileError(404,'Página não encontrada.')
  const content=draft(row),current=scopedChannelSettings(await readChannelDraft(tx,row),content)
  if(!current.groups.some(group=>group.id===id))throw new ProfileError(404,'Grupo de alternativas não encontrado.')
  version(row,expectedVersion);await putChannelDraft(tx,row,{groups:current.groups.filter(group=>group.id!==id)});const result=await writeDraft(tx,actor,row,profileInput.parse(mergeChannelGroup(content,null,id)))
  await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'profile.channels.removed',entityType:'Profile',entityId:row.id,after:{groupId:id,profileVersion:row.version+1}}});return result
 })
}
export async function applyTemplateToProfile(db: PrismaClient, actor: Actor, input: { templateVersionId: string; preserveContent: boolean; expectedVersion: number; confirmedReplacement: boolean }) {
  return locked(db, actor, async tx => {
    const row = await read(tx, actor)
    if (!row) throw new ProfileError(404, 'Complete e salve o nome e o endereço da sua página antes de aplicar um modelo.')
    version(row, input.expectedVersion)
    const current=draft(row),content=profileInput.parse(applyProfileTemplate(current,input.templateVersionId,input.preserveContent,input.confirmedReplacement,randomUUID))
    if(JSON.stringify(content)===JSON.stringify(current))return response(tx,actor,row)
    await checkAvatar(tx,actor,content);await checkProfileReferences(tx,actor,content)
    await tx.profile.update({where:{id:row.id},data:{appearance:content.appearance??Prisma.DbNull,primaryItemId:content.primaryItemId,version:{increment:1}}})
    await writeProfileItems(tx,actor,row.id,content)
    await tx.contentReview.updateMany({where:{profileId:row.id,status:{in:['PENDING','REJECTED']}},data:{status:'SUPERSEDED',resolvedAt:new Date()}})
    await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'profile.template.applied',entityType:'Profile',entityId:row.id,after:{templateVersionId:input.templateVersionId,preserveContent:input.preserveContent,draftVersion:row.version+1}}})
    return response(tx,actor,await read(tx,actor))
  })
}
export async function previewImportProfile(db:PrismaClient,actor:Actor,lines:string[],expectedVersion:number){
  return locked(db,actor,async tx=>{
    const row=await read(tx,actor);if(!row)throw new ProfileError(404,'Salve o nome e o endereço da página antes de importar links.')
    version(row,expectedVersion)
    const current=draft(row),items=previewProfileImport(lines,current),key=randomUUID(),expiresAt=profileNow().getTime()+10*60*1000
    const reviewedLines=lines.map((line,index)=>line.trim()?items.find(item=>item.line===index+1)?.url??'invalid':'')
    return {previewId:signProfileImport({tenantId:actor.tenantId,ownerId:actor.ownerId,version:row.version,key,expiresAt,lines:reviewedLines}),items,idempotencyKey:key,expectedVersion:row.version,expiresAt:new Date(expiresAt).toISOString()}
  })
}
export async function confirmImportProfile(db:PrismaClient,actor:Actor,input:{previewId:string;expectedVersion:number;idempotencyKey:string;selectedItems:ImportChoice[]}){
  const ticket=readProfileImport(input.previewId,actor)
  if(ticket.key!==input.idempotencyKey||ticket.version!==input.expectedVersion)throw new ProfileError(422,'Esta revisão não corresponde à confirmação. Confira os endereços novamente.')
  const hash=createHash('sha256').update(JSON.stringify({ticket,selectedItems:input.selectedItems})).digest('hex'),receiptId='profile-import:'+ticket.key
  return locked(db,actor,async tx=>{
    const row=await read(tx,actor);if(!row)throw new ProfileError(404,'Página não encontrada.')
    const receipt=await tx.auditLog.findUnique({where:{id:receiptId}})
    if(receipt){
      const saved=receipt.after as {hash?:string;createdIds?:string[]}|null
      if(receipt.tenantId!==actor.tenantId||receipt.actorId!==actor.ownerId||receipt.entityId!==row.id||receipt.action!=='profile.import.confirmed'||saved?.hash!==hash||!Array.isArray(saved.createdIds))throw new ProfileError(409,'Esta confirmação já foi usada com outra seleção.')
      return {createdIds:saved.createdIds,alreadyApplied:true,profile:await response(tx,actor,row)}
    }
    if(ticket.expiresAt<=profileNow().getTime())throw new ProfileError(409,'A revisão expirou. Confira os endereços novamente; seus links foram mantidos.')
    version(row,input.expectedVersion)
    const current=draft(row),planned=planProfileImport(current,previewProfileImport(ticket.lines,current),input.selectedItems,randomUUID),content=profileInput.parse(planned.content)
    await checkProfileReferences(tx,actor,content)
    await tx.profile.update({where:{id:row.id},data:{version:{increment:1}}});await writeProfileItems(tx,actor,row.id,content)
    await tx.contentReview.updateMany({where:{profileId:row.id,status:{in:['PENDING','REJECTED']}},data:{status:'SUPERSEDED',resolvedAt:profileNow()}})
    await tx.auditLog.create({data:{id:receiptId,tenantId:actor.tenantId,actorId:actor.ownerId,entityType:'Profile',entityId:row.id,action:'profile.import.confirmed',after:{hash,createdIds:planned.createdIds,draftVersion:row.version+1}}})
    return {createdIds:planned.createdIds,alreadyApplied:false,profile:await response(tx,actor,await read(tx,actor))}
  })
}
export async function previewProfile(db: PrismaClient, actor: Actor, at?: Date) {
  return db.$transaction(async tx => {
    await owner(tx, actor); const row = await read(tx, actor)
    if (!row) throw new ProfileError(404, 'Salve seu perfil para abrir a prévia.')
    const content=draft(row),result=await projection(tx, actor, content, row.version,row,'DRAFT', at)
    if(result.restricted)return result
    const coverage=await profileSchedulingCoverage(tx,actor,profileBillingRuntime().delivered,profileNow())
    if(!coverage.enabled)return result
    const starts=content.items.flatMap(item=>item.schedule?.startsAt?[new Date(item.schedule.startsAt).getTime()]:[]),ends=content.items.flatMap(item=>item.schedule?.endsAt?[new Date(item.schedule.endsAt).getTime()]:[])
    return {...result,previewBounds:{before:starts.length?new Date(Math.min(...starts)-1).toISOString():null,after:ends.length?new Date(Math.max(...ends)).toISOString():null}}
  }, { isolationLevel: 'RepeatableRead' })
}
export async function publishProfile(db: PrismaClient, actor: Actor, expectedVersion: number, ports: ProfileValidationPorts) {
  await owner(db, actor, true)
  const row = await read(db, actor); version(row, expectedVersion)
  if (!row) throw new ProfileError(404, 'Salve seu perfil antes de publicar.')
  if (row.publishedVersion === row.version) return { publishedRevisionId: row.version }
  const content = draft(row)
  assertProfilePublicationPresence(content)
  const existing = row.reviews.find(review => review.version === row.version && review.status !== 'SUPERSEDED')
  if (existing) return { publishedRevisionId: row.publishedVersion, review: reviewSummary(existing) }
  let validated: ProfileContent
  let needsReview = false
  const approved = row.publication ? profileInput.parse(row.publishedDraft ?? row.publication) : undefined
  try { validated = await validateProfile(db, actor.tenantId, content, ports, false, approved) } catch (error) { if (!(error instanceof ContentReviewRequired)) throw error; needsReview = true; validated = content }
  return locked(db, actor, async tx => {
    await owner(tx, actor, true)
    const current = await read(tx, actor); version(current, expectedVersion)
    if (!current) throw new ProfileError(404, 'Perfil não encontrado.')
    if (current.publishedVersion === current.version) return { publishedRevisionId: current.version }
    const concurrent = await tx.contentReview.findUnique({ where: { profileId_version: { profileId: current.id, version: current.version } } })
    if (concurrent) return { publishedRevisionId: current.publishedVersion, review: reviewSummary(concurrent) }
    await checkAvatar(tx, actor, validated)
    await assertChannelPublication(tx,current,validated)
    if (needsReview) {
      const review = await tx.contentReview.create({ data: { tenantId: actor.tenantId, ownerId: actor.ownerId, kind: 'PROFILE', profileId: current.id, version: current.version, snapshot: validated } })
      await queueContentReview(tx, review.id)
      await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'content.review.submitted', entityType: 'ContentReview', entityId: review.id, after: { kind: 'PROFILE', version: current.version } } })
      return { publishedRevisionId: current.publishedVersion, review: reviewSummary(review) }
    }
    const refs = validated.items.filter(i => i.type === 'CATALOG')
    // Owner may only reference their own, already published catalog entries.
    await assertPublishedProfileReferences(tx,actor,validated)
    const live = visibleProfile(validated, new Set(refs.map(i => i.destination)))
    await tx.profile.update({ where: { id: current.id }, data: { publication: live, publishedDraft: draft(current), publishedVersion: current.version } })
    await recordProfileRevision(tx, current, draft(current))
    await pruneMedia(tx, actor)
    return { publishedRevisionId: current.version }
  })
}
export async function unpublishProfile(db: PrismaClient, actor: Actor, expectedVersion: number) {
  return locked(db, actor, async tx => { const row = await read(tx, actor); if (!row) throw new ProfileError(404, 'Perfil não encontrado.'); if (!row.publication) return response(tx, actor, row); version(row, expectedVersion); await tx.profile.update({ where: { id: row.id }, data: { publication: Prisma.DbNull, publishedDraft: Prisma.DbNull, publishedVersion: null, version: { increment: 1 } } }); await tx.contentReview.updateMany({ where: { profileId: row.id, status: { in: ['PENDING', 'REJECTED'] } }, data: { status: 'SUPERSEDED', resolvedAt: new Date() } }); await pruneMedia(tx, actor); return response(tx, actor, await read(tx, actor)) })
}
/** Restore authoring state atomically; this never changes the public snapshot. */
export async function discardProfile(db: PrismaClient, actor: Actor, expectedVersion: number) {
  return locked(db, actor, async tx => {
    const row = await read(tx, actor); version(row, expectedVersion)
    if (!row?.publication) throw new ProfileError(409, 'Ainda não há uma versão publicada para restaurar.')
    const content = profileInput.parse(row.publishedDraft ?? row.publication)
    await checkAvatar(tx, actor, content)
    await tx.profile.update({ where: { id: row.id }, data: { slug: content.slug, name: content.name, bio: content.bio, avatarAssetId: content.avatarAssetId, requiresAge: content.requiresAge, primaryItemId: content.primaryItemId, appearance: content.appearance ?? Prisma.DbNull, version: { increment: 1 } } })
    await restoreChannelDraft(tx,row,row.publishedVersion!,content)
    await writeProfileItems(tx, actor, row.id, content)
    await tx.contentReview.updateMany({ where: { profileId: row.id, status: { in: ['PENDING', 'REJECTED'] } }, data: { status: 'SUPERSEDED', resolvedAt: new Date() } })
    await pruneMedia(tx, actor)
    return response(tx, actor, await read(tx, actor))
  })
}
export async function publicProfile(db: PrismaClient, tenantId: string, slug: string, age: boolean) {
  return db.$transaction(tx=>publicProfileProjection(tx,tenantId,slug,age), { isolationLevel: 'RepeatableRead' })
}
export async function publicProfileProjection(tx:Prisma.TransactionClient,tenantId:string,slug:string,age:boolean){
 const row=await tx.profile.findUnique({where:{tenantId_slug:{tenantId,slug}},include:{owner:true}})
 if(!row?.publication||row.owner.status!=='ACTIVE'||row.owner.tenantId!==tenantId)throw new ProfileError(404,'Perfil não encontrado.')
 return projection(tx,{tenantId,ownerId:row.ownerId,age},profileInput.parse(row.publication),row.publishedVersion!,row,'PUBLISHED')
}
async function channelSelection(tx:Prisma.TransactionClient,tenantId:string,slug:string,channelId:string,token:string,age:boolean,now:Date){
 const row=await tx.profile.findUnique({where:{tenantId_slug:{tenantId,slug}},include:{owner:{select:{status:true,tenantId:true}}}})
 if(!row?.publication||row.publishedVersion===null||row.owner.status!=='ACTIVE'||row.owner.tenantId!==tenantId)return null
 const settings=await readChannelRevision(tx,row,row.publishedVersion),binding=settings.groups.flatMap(group=>group.channels).find(channel=>channel.id===channelId)
 if(!binding||!readProfileChannel(token,{tenantId,profileId:row.id,revisionId:row.publishedVersion,channelId,destinationRevisionId:binding.revisionId},env.JWT_SECRET,now))throw new ProfileError(422,'Atualize a página para escolher um canal disponível.')
 const projected=await publicProfileProjection(tx,tenantId,slug,age)
 if(projected.restricted)return{restricted:true as const}
 if(!projected.channelGroups?.some(group=>group.channels.some(channel=>channel.id===channelId)))return null
 return{restricted:false as const,binding,profileId:row.id,revisionId:row.publishedVersion}
}
export async function resolveProfileChannel(db:PrismaClient,tenantId:string,slug:string,channelId:string,token:string,age:boolean,ports:ProfileValidationPorts,viewerId:string|null){
 const selected=await db.$transaction(tx=>channelSelection(tx,tenantId,slug,channelId,token,age,profileNow()),{isolationLevel:'RepeatableRead'})
 if(!selected)return{available:false as const}
 if(selected.restricted)return{restricted:true as const}
 // F31 measures the choice by blockId with its existing consent. Do not add a second raw access count.
 const result=await resolveRedirect(db,tenantId,selected.binding.handleId,age,ports,viewerId,profileNow(),false)
 if('restricted' in result||!result.available)return result
 const current=await db.$transaction(tx=>channelSelection(tx,tenantId,slug,channelId,token,age,profileNow()),{isolationLevel:'RepeatableRead'})
 if(!current)return{available:false as const}
 if(current.restricted)return{restricted:true as const}
 if(current.profileId!==selected.profileId||current.revisionId!==selected.revisionId||current.binding.revisionId!==selected.binding.revisionId)return{available:false as const}
 return result
}
export async function profileAvatar(db: PrismaClient, actor: Actor, id: string, publicSlug?: string) {
  if (publicSlug) {
    const live = await publicProfile(db, actor.tenantId, publicSlug, actor.age)
    if (live.restricted || live.avatarAssetId !== id) throw new ProfileError(404, 'Foto não encontrada.')
    const row = await db.profile.findUniqueOrThrow({ where: { tenantId_slug: { tenantId: actor.tenantId, slug: publicSlug } } })
    actor = { ...actor, ownerId: row.ownerId }
  } else await owner(db, actor)
  const bytes = await new PrismaProfileMedia(db).get({ tenantId: actor.tenantId, ownerId: actor.ownerId, id })
  if (!bytes) throw new ProfileError(404, 'Foto não encontrada.')
  return bytes
}
export async function uploadProfileAvatar(db: PrismaClient, actor: Actor, base64: string) {
  return locked(db, actor, async tx => { const id = await new PrismaProfileMedia(tx).put({ ...actor, base64 }); await pruneMedia(tx, actor, [id]); return { avatarAssetId: id } })
}

export async function listProfileRevisions(db: PrismaClient, actor: Actor, now = new Date()) {
  return db.$transaction(async tx => {
    await owner(tx, actor)
    const row = await read(tx, actor)
    if (!row) return { revisions: [] }
    const revisions = await availableProfileRevisions(tx, row, now)
    return { revisions: revisions.map(revision => { const content = profileInput.parse(revision.snapshot); return { id: revision.id, version: revision.version, createdAt: revision.createdAt, imported: revision.imported, current: revision.version === row.publishedVersion, summary: { name: content.name, groups: content.categories.length, links: content.items.length } } }) }
  }, { isolationLevel: 'RepeatableRead' })
}
export async function readProfileRevision(db: PrismaClient, actor: Actor, id: string, now = new Date()) {
  return db.$transaction(async tx => {
    await owner(tx, actor); const row = await read(tx, actor)
    const revision = row && (await availableProfileRevisions(tx, row, now)).find(revision => revision.id === id)
    if (!revision) throw new ProfileError(404, 'Versão não encontrada ou fora do período de retenção.')
    const content = profileInput.parse(revision.snapshot)
    const photoAvailable = !content.avatarAssetId || Boolean(await tx.profileAsset.findUnique({ where: { tenantId_ownerId_id: { tenantId: actor.tenantId, ownerId: actor.ownerId, id: content.avatarAssetId } }, select: { id: true } }))
    const channels=await readChannelRevision(tx,row,revision.version)
    return { id: revision.id, version: revision.version, content, photoAvailable,...(channels.groups.length?{channelGroups:await channelSummary(tx,row,content,channels)}:{}) }
  }, { isolationLevel: 'RepeatableRead' })
}
export async function restoreProfileRevision(db: PrismaClient, actor: Actor, id: string, expectedVersion: number, ports: ProfileValidationPorts, now = new Date()) {
  const source = await readProfileRevision(db, actor, id, now)
  // Restoration validates technical safety only and creates a draft; publication still follows normal moderation.
  const validated = await validateProfile(db, actor.tenantId, source.content, ports, true)
  return locked(db, actor, async tx => {
    const row = await read(tx, actor); version(row, expectedVersion)
    if (!row || !(await availableProfileRevisions(tx, row, now)).some(revision => revision.id === id)) throw new ProfileError(404, 'Versão não encontrada ou fora do período de retenção.')
    const content = restoreProfileContent(validated, row.slug)
    const photoMissing = Boolean(content.avatarAssetId && !await tx.profileAsset.findUnique({ where: { tenantId_ownerId_id: { tenantId: actor.tenantId, ownerId: actor.ownerId, id: content.avatarAssetId! } }, select: { id: true } }))
    if (photoMissing) content.avatarAssetId = null
    const refs = [...new Set(content.items.filter(item => item.type === 'CATALOG').map(item => item.destination))]
    const eligible = await tx.link.count({ where: { id: { in: refs }, tenantId: actor.tenantId, ownerId: actor.ownerId, status: 'PUBLISHED', niche: { tenantId: actor.tenantId }, network: { tenantId: actor.tenantId } } })
    if (eligible !== refs.length) throw new ProfileError(422, 'Um link desta versão não está mais disponível no seu catálogo. A restauração não foi aplicada.')
    await tx.profile.update({ where: { id: row.id }, data: { slug: row.slug, name: content.name, bio: content.bio, avatarAssetId: content.avatarAssetId, requiresAge: content.requiresAge, primaryItemId: content.primaryItemId, appearance: content.appearance ?? Prisma.DbNull, version: { increment: 1 } } })
    await restoreChannelDraft(tx,row,source.version,content)
    await writeProfileItems(tx, actor, row.id, content)
    await tx.contentReview.updateMany({ where: { profileId: row.id, status: { in: ['PENDING', 'REJECTED'] } }, data: { status: 'SUPERSEDED', resolvedAt: now } })
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'profile.revision.restored', entityType: 'Profile', entityId: row.id, after: { revisionId: id, sourceVersion: source.version, draftVersion: row.version + 1 } } })
    await pruneMedia(tx, actor)
    return { ...await response(tx, actor, await read(tx, actor)), warnings: photoMissing ? ['A foto desta versão não está mais disponível. A página foi restaurada sem foto; você pode enviar outra.'] : [] }
  })
}
export async function purgeProfileHistory(db: PrismaClient, now = new Date()) {
  let cursor: string | undefined
  for (;;) {
    const rows = await db.profile.findMany({ where: cursor ? { id: { gt: cursor } } : {}, orderBy: { id: 'asc' }, take: 100, select: { id: true, tenantId: true, ownerId: true } })
    if (!rows.length) break
    for (const row of rows) await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${row.ownerId} AND "tenantId"=${row.tenantId} FOR UPDATE`
      const current = await tx.profile.findUnique({ where: { id: row.id } })
      if (current) { await pruneProfileRevisions(tx, current, now); await pruneMedia(tx, { ...row, age: false }) }
    })
    cursor = rows.at(-1)!.id
  }
}
