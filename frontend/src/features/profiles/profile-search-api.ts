import {api} from '@/lib/api'
import {profileRequest,ProfileRequestError} from './profile-api'
import {profileSearchParams,type ProfileSearchPage,type ProfileSearchQuery,type ProfileSearchSource} from './profile-search-contract'
export async function loadProfileSearch(source:ProfileSearchSource,query:ProfileSearchQuery,signal?:AbortSignal):Promise<ProfileSearchPage>{
 const params=profileSearchParams(query)
 if(source.kind==='preview'){
  if(source.at)params.set('at',source.at)
  return profileRequest<ProfileSearchPage>('/preview/items'+(params.size?'?'+params:''),{signal,cache:'no-store'})
 }
 const response=await api<ProfileSearchPage&{message?:string}>('/v1/profiles/'+encodeURIComponent(source.slug)+'/items'+(params.size?'?'+params:''),{cache:'no-store',signal}).catch(()=>{throw new Error('Sem conexão. Tente novamente.')})
 if(response.status!==200)throw new ProfileRequestError(response.body.message??'Não foi possível atualizar os links.',response.status)
 return response.body
}
