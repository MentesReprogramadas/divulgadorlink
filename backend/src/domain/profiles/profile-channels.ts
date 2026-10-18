import {ProfileError,type ProfileContent} from './profile'
import {hostMatchesNetwork} from '@/domain/links/network-host'
import {canonicalUrl} from '@/domain/links/canonical-url'
export type ChannelBinding={id:string;networkId:string|null;handleId:string;revisionId:string;paused:boolean}
export type ChannelSettings={groups:Array<{id:string;channels:ChannelBinding[]}>}
export type ChannelNetwork={id:string;tenantId:string;name:string;slug:string;knownHosts:string[]}
export type ChannelDestination={id:string;tenantId:string;ownerId:string;handleId:string;activeRevisionId:string|null;status:string;disabled:boolean;ownerActive:boolean;destinationUrl:string;requiresAge:boolean}
export type ResolvedChannel={id:string;label:string;network:{name:string;slug:string};requiresAge:boolean;handleId:string;revisionId:string}
export type ProjectedChannelGroup={id:string;name:string;channels:ResolvedChannel[]}
export type PublicChannel={id:string;label:string;network:{name:string;slug:string};href:string}
export type PublicChannelGroup={id:string;name:string;channels:PublicChannel[]}
export type ChannelGroupSummary={id:string;name:string;channels:Array<{id:string;label:string;networkName:string;paused:boolean;sourceRevisionId:string;sourceVersion:number|null}>}
export type ChannelGroupEdit={id:string;name:string;visible:boolean;channels:Array<{id:string;label:string;destination:string;paused:boolean}>}
/** Network labeling only; F12 remains responsible for transport/content validation. */
export function channelNetwork(network:ChannelNetwork|null,destination:string):{name:string;slug:string}{
 let hostname:string
 try{hostname=new URL(destination).hostname}catch{throw new ProfileError(422,'Confira o destino do convite.')}
 if(!network)return{name:'Site',slug:'site'}
 if(!network.knownHosts.length||!hostMatchesNetwork(hostname,network.knownHosts))throw new ProfileError(422,'O destino não corresponde à rede escolhida. Selecione a rede correta ou Site.')
 return{name:network.name,slug:network.slug}
}
export function projectChannelGroups(content:ProfileContent,settings:ChannelSettings,destinations:ChannelDestination[],networks:ChannelNetwork[],scope:{tenantId:string;ownerId:string}):ProjectedChannelGroup[]{
 const seen=new Set<string>()
 return settings.groups.flatMap(group=>{
  const category=content.categories.find(row=>row.id===group.id&&row.visible);if(!category)return[]
  const channels=group.channels.flatMap(binding=>{
   const item=content.items.find(row=>row.id===binding.id&&row.categoryId===group.id&&row.visible&&!row.templateExample)
   const source=destinations.find(row=>row.id===binding.revisionId&&row.handleId===binding.handleId&&row.activeRevisionId===binding.revisionId&&row.status==='APPROVED'&&!row.disabled&&row.ownerActive&&row.tenantId===scope.tenantId&&row.ownerId===scope.ownerId)
   if(binding.paused||seen.has(binding.id)||!item||!source)return[]
   const selected=binding.networkId?networks.find(row=>row.id===binding.networkId&&row.tenantId===scope.tenantId):null
   if(binding.networkId&&!selected)return[]
   try{
    if(canonicalUrl(item.destination)!==canonicalUrl(source.destinationUrl))return[]
    const network=channelNetwork(selected??null,source.destinationUrl);seen.add(binding.id)
    return[{id:binding.id,label:item.label,network,requiresAge:source.requiresAge,handleId:source.handleId,revisionId:source.id}]
   }catch{return[]}
  })
  return[{id:category.id,name:category.name,channels}]
 })
}
export function mergeChannelGroup(content:ProfileContent,group:ChannelGroupEdit|null,groupId:string):ProfileContent{
 if(group&&group.id!==groupId)throw new ProfileError(400,'Confira o grupo de alternativas.')
 const ids=new Set(group?.channels.map(row=>row.id)??[])
 if(group&&(ids.size!==group.channels.length||content.items.some(item=>ids.has(item.id)&&item.categoryId!==groupId)))throw new ProfileError(400,'Cada canal precisa de um identificador próprio neste grupo.')
 const categories=group?(content.categories.some(row=>row.id===groupId)?content.categories.map(row=>row.id===groupId?{id:group.id,name:group.name,visible:group.visible}:row):[...content.categories,{id:group.id,name:group.name,visible:group.visible}]):content.categories.filter(row=>row.id!==groupId)
 const replacement:ProfileContent['items']=group?.channels.map(channel=>({...(content.items.find(row=>row.id===channel.id)??{}),id:channel.id,categoryId:groupId,type:'URL',label:channel.label,destination:channel.destination,visible:!channel.paused}))??[]
 let inserted=false
 const items=content.items.flatMap(item=>{if(item.categoryId!==groupId)return[item];if(inserted)return[];inserted=true;return replacement})
 if(!inserted)items.push(...replacement)
 return{...content,categories,items,primaryItemId:items.some(item=>item.id===content.primaryItemId)?content.primaryItemId:null}
}
