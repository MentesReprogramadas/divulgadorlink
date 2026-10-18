import {api} from '@/lib/api'
import {profileRequest} from '@/features/profiles/profile-api'
import type {ProfileState} from '@/features/profiles/profile-contract'
import type {ProfileTemplate} from './template-contract'
export async function loadProfileTemplates():Promise<ProfileTemplate[]>{
  const response=await api<{templates:ProfileTemplate[];message?:string}>('/v1/profile-templates').catch(()=>{throw new Error('Sem conexão. Tente novamente.')})
  if(response.status!==200)throw new Error(response.body.message??'Não foi possível carregar os modelos.')
  return response.body.templates
}
export function applyProfileTemplate(templateVersionId:string,preserveContent:boolean,expectedVersion:number,confirmedReplacement:boolean){return profileRequest<ProfileState>('/apply-template',{method:'POST',body:JSON.stringify({templateVersionId,preserveContent,expectedVersion,confirmedReplacement})})}
