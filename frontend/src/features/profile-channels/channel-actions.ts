import {profileRequest,ProfileRequestError,managedProfileId,profileScope} from '@/features/profiles/profile-api'
import type {ProfileDraft,ProfileState} from '@/features/profiles/profile-contract'
import type {ChannelGroupsResponse} from './channel-contract'

export async function setProfileChannelPaused(flush:()=>Promise<ProfileDraft>,groupId:string,channelId:string,paused:boolean){
 const target=managedProfileId(),request=<T>(path:string,init?:RequestInit)=>target?profileRequest<T>(path,profileScope(init,target)):init===undefined?profileRequest<T>(path):profileRequest<T>(path,init)
 const current=await flush(),data=await request<ChannelGroupsResponse>('/channel-groups'),group=data.groups.find(row=>row.id===groupId)
 if(data.profileVersion!==current.version)throw new ProfileRequestError('O perfil mudou em outra aba. Recarregue antes de continuar.',409)
 if(!group?.channels.some(channel=>channel.id===channelId))throw new Error('Este convite não está mais disponível. Atualize o grupo.')
 return request<ProfileState>('/channel-groups/'+groupId,{method:'PUT',body:JSON.stringify({expectedVersion:current.version,name:group.name,visible:group.visible,channels:group.channels.map(({id,label,networkId,destinationRevisionId,paused:wasPaused,showLabel})=>({id,label,networkId,destinationRevisionId,paused:id===channelId?paused:wasPaused,showLabel}))})})
}
