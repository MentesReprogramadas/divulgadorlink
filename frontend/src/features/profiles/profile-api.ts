import { api } from '@/lib/api'
import type { PublicProfile } from './profile-contract'
export async function publicProfileRequest(slug: string): Promise<PublicProfile> {
  const response=await api<PublicProfile>('/v1/profiles/'+encodeURIComponent(slug),{cache:'no-store'}).catch(()=>{throw new Error('Sem conexão. Tente novamente.')})
  if(response.status!==200)throw new Error('Não foi possível atualizar os links. Tente novamente.')
  return response.body
}
export class ProfileRequestError extends Error { constructor(message: string, public readonly status: number) { super(message) } }
export const isProfileVersionConflict = (reason: unknown) => reason instanceof ProfileRequestError && reason.status === 409 && reason.message.toLowerCase().includes('outra aba')
export function managedProfileId(){return typeof window==='undefined'?null:/^\/painel\/equipe\/([^/]+)\/(?:editar|previa|metricas)$/.exec(window.location.pathname)?.[1]??null}
export function profileWorkspacePath(path:string,id:string|null=managedProfileId()){return id&&path==='previa'?'/painel/equipe/'+id+'/previa':'/painel/perfil/'+path}
export async function profileRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await api<T & { message?: string }>('/v1/me/profile' + path, init).catch(() => { throw new Error('Sem conexão. Seus dados foram mantidos; tente novamente.') })
  if (r.status !== 200) throw new ProfileRequestError(r.body.message ?? 'Não foi possível carregar o perfil. Tente novamente.', r.status)
  return r.body
}
export function profileScope(init:RequestInit|undefined,target?:string|null){return target?{...init,headers:{...Object.fromEntries(new Headers(init?.headers).entries()),'x-profile-id':target}}:init}
export async function profileCatalog(target?:string) {
  if(target)return (await profileRequest<{links:Array<{id:string;name:string;status:string}>}>('/catalog',profileScope(undefined,target))).links
  return (await profileRequest<{links:Array<{id:string;name:string;status:string}>}>('/catalog')).links
}

export function privateProfileAvatar(id:string){const target=managedProfileId();return '/bff/v1/me/profile/avatar/'+id+(target?'?profileId='+encodeURIComponent(target):'')}
