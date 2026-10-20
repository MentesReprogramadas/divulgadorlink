import {api} from '@/lib/api'
export type NicheFollowState={preferences:{emailDigest:boolean;frequency:'WEEKLY'|'MONTHLY';expectedVersion:number;nextDigestAt:string|null};niches:Array<{id:string;name:string;followed:boolean}>}
export async function nicheRequest<T=NicheFollowState>(path:string,init?:RequestInit):Promise<T>{
 const response=await api<T&{message?:string}>('/v1/'+path,init).catch(()=>{throw new Error('Sem conexão. Tente de novo.')})
 if(response.status!==200)throw new Error(response.body.message??'Não foi possível concluir. Tente de novo.')
 return response.body
}
