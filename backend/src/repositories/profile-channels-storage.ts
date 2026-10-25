import type {Prisma} from '@prisma/client'
import {channelSettingsInput} from '@/domain/profiles/channel-input'
import {ProfileError,type ProfileContent} from '@/domain/profiles/profile'
import {channelNetwork,projectChannelGroups,type ChannelDestination,type ChannelNetwork,type ChannelSettings,type ChannelGroupSummary} from '@/domain/profiles/profile-channels'
export type ChannelProfile={id:string;tenantId:string;ownerId:string}
function settings(raw:unknown):ChannelSettings{
 const result=channelSettingsInput.safeParse(raw)
 if(!result.success)throw new ProfileError(503,'Não foi possível carregar as alternativas de acesso. Tente novamente.')
 return{groups:result.data.groups}
}
export function scopedChannelSettings(value:ChannelSettings,content:ProfileContent):ChannelSettings{
 return{groups:value.groups.filter(group=>content.categories.some(category=>category.id===group.id)).map(group=>({...group,channels:group.channels.filter(channel=>content.items.some(item=>item.id===channel.id&&item.categoryId===group.id))}))}
}
export async function readChannelDraft(tx:Prisma.TransactionClient,profile:ChannelProfile):Promise<ChannelSettings>{
 const row=await tx.profileChannelDraft.findFirst({where:{profileId:profile.id,tenantId:profile.tenantId,ownerId:profile.ownerId}})
 return row?settings(row.settings):{groups:[]}
}
export async function readChannelRevision(tx:Prisma.TransactionClient,profile:ChannelProfile,version:number):Promise<ChannelSettings>{
 const row=await tx.profileChannelRevision.findFirst({where:{profileId:profile.id,version,tenantId:profile.tenantId,ownerId:profile.ownerId}})
 return row?settings(row.settings):{groups:[]}
}
export async function putChannelDraft(tx:Prisma.TransactionClient,profile:ChannelProfile,value:ChannelSettings){
 const validated=channelSettingsInput.parse({schemaVersion:1,...value})
 await tx.profileChannelDraft.upsert({where:{profileId:profile.id},create:{profileId:profile.id,tenantId:profile.tenantId,ownerId:profile.ownerId,settings:validated},update:{settings:validated}})
}
export async function synchronizeChannelDraft(tx:Prisma.TransactionClient,profile:ChannelProfile,content:ProfileContent){
 const current=await readChannelDraft(tx,profile),next=scopedChannelSettings(current,content)
 if(JSON.stringify(current)!==JSON.stringify(next))await putChannelDraft(tx,profile,next)
}
export async function recordChannelRevision(tx:Prisma.TransactionClient,profile:ChannelProfile&{version:number},content:ProfileContent){
 const value=scopedChannelSettings(await readChannelDraft(tx,profile),content)
 if(value.groups.length)await tx.profileChannelRevision.createMany({data:[{profileId:profile.id,tenantId:profile.tenantId,ownerId:profile.ownerId,version:profile.version,settings:{schemaVersion:1,...value}}],skipDuplicates:true})
}
export async function restoreChannelDraft(tx:Prisma.TransactionClient,profile:ChannelProfile,version:number,content:ProfileContent){
 await putChannelDraft(tx,profile,scopedChannelSettings(await readChannelRevision(tx,profile,version),content))
}
export async function channelSources(tx:Prisma.TransactionClient,profile:ChannelProfile,value:ChannelSettings):Promise<{destinations:ChannelDestination[];networks:ChannelNetwork[]}>{
 const ids=value.groups.flatMap(group=>group.channels.map(channel=>channel.revisionId)),networks=value.groups.flatMap(group=>group.channels.flatMap(channel=>channel.networkId?[channel.networkId]:[]))
 const rows=ids.length?await tx.redirectDestination.findMany({where:{id:{in:ids},tenantId:profile.tenantId,handle:{tenantId:profile.tenantId,ownerId:profile.ownerId}},include:{handle:{include:{owner:{select:{status:true,tenantId:true}}}}}}):[]
 return{destinations:rows.map(row=>({id:row.id,tenantId:row.tenantId,ownerId:row.handle.ownerId,handleId:row.handleId,activeRevisionId:row.handle.activeRevisionId,status:row.status,disabled:row.handle.disabled,ownerActive:row.handle.owner.status==='ACTIVE'&&row.handle.owner.tenantId===profile.tenantId,destinationUrl:row.destinationUrl,requiresAge:row.requiresAge})),networks:networks.length?await tx.network.findMany({where:{id:{in:networks},tenantId:profile.tenantId,isPublicFacet:true},select:{id:true,tenantId:true,name:true,slug:true,knownHosts:true}}):[]}
}
/** Called inside the owner's existing publication transaction, including human approval. */
export async function assertChannelPublication(tx:Prisma.TransactionClient,profile:ChannelProfile,content:ProfileContent){
 const value=scopedChannelSettings(await readChannelDraft(tx,profile),content),facts=await channelSources(tx,profile,value)
 for(const group of value.groups){
  if(!content.categories.some(category=>category.id===group.id&&category.visible))continue
  for(const binding of group.channels){
   const item=content.items.find(row=>row.id===binding.id&&row.categoryId===group.id)
   if(binding.paused||!item?.visible)continue
   const source=facts.destinations.find(row=>row.id===binding.revisionId&&row.handleId===binding.handleId&&row.activeRevisionId===binding.revisionId&&row.status==='APPROVED'&&!row.disabled&&row.ownerActive)
   if(!source||source.destinationUrl!==item.destination)throw new ProfileError(422,'Um canal precisa de um link permanente próprio e aprovado na versão atual. Revise as alternativas antes de publicar.')
   const network=binding.networkId?facts.networks.find(row=>row.id===binding.networkId):null
   if(binding.networkId&&!network)throw new ProfileError(422,'A rede de um canal não está mais disponível. Revise as alternativas.')
   channelNetwork(network??null,source.destinationUrl)
  }
 }
}
export async function projectStoredChannels(tx:Prisma.TransactionClient,profile:ChannelProfile,content:ProfileContent,value:ChannelSettings){
 const facts=await channelSources(tx,profile,value)
 return projectChannelGroups(content,value,facts.destinations,facts.networks,profile)
}
/** Owner-only labels for version comparison/reporting; no destination or token is serialized. */
export async function channelSummary(tx:Prisma.TransactionClient,profile:ChannelProfile,content:ProfileContent,value:ChannelSettings):Promise<ChannelGroupSummary[]>{
 const ids=value.groups.flatMap(group=>group.channels.flatMap(channel=>channel.networkId?[channel.networkId]:[])),networks=ids.length?await tx.network.findMany({where:{tenantId:profile.tenantId,id:{in:ids}},select:{id:true,name:true}}):[]
 const revisionIds=value.groups.flatMap(group=>group.channels.map(channel=>channel.revisionId)),revisions=revisionIds.length?await tx.redirectDestination.findMany({where:{id:{in:revisionIds},tenantId:profile.tenantId,handle:{ownerId:profile.ownerId,tenantId:profile.tenantId}},select:{id:true,number:true,status:true,handle:{select:{activeRevisionId:true,disabled:true}}}}):[]
 return scopedChannelSettings(value,content).groups.map(group=>({id:group.id,name:content.categories.find(category=>category.id===group.id)!.name,channels:group.channels.map(channel=>{
  const item=content.items.find(candidate=>candidate.id===channel.id&&candidate.categoryId===group.id)!
  const revision=revisions.find(row=>row.id===channel.revisionId)
  return{id:item.id,label:item.label,status:revision?.status,available:Boolean(revision?.status==='APPROVED'&&!revision.handle.disabled&&revision.handle.activeRevisionId===revision.id),showLabel:channel.showLabel,networkName:channel.networkId?networks.find(network=>network.id===channel.networkId)?.name??'Rede removida':'Site',paused:channel.paused||!item.visible,sourceRevisionId:channel.revisionId,sourceVersion:revisions.find(revision=>revision.id===channel.revisionId)?.number??null}
 })}))
}
