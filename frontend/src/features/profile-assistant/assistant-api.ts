import {api} from '@/lib/api'
export class AssistantRequestError extends Error{constructor(message:string,readonly status:number){super(message)}}
export async function assistantRequest<T>(path='',init?:RequestInit):Promise<T>{const r=await api<T&{message?:string}>('/v1/me/profile/suggestions'+path,init).catch(()=>{throw new AssistantRequestError('Sem conexão. Seus dados foram mantidos; tente novamente.',0)});if(r.status!==200)throw new AssistantRequestError(r.body.message??'Não foi possível usar o assistente.',r.status);return r.body}
