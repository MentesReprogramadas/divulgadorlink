import {api} from '@/lib/api'
export class ContactRequestError extends Error{constructor(message:string,public readonly status:number){super(message)}}
export async function contactRequest<T>(path:string,init?:RequestInit):Promise<T>{const response=await api<T&{message?:string}>(path,init).catch(()=>{throw new Error('Sem conexão. Seus dados foram mantidos; tente novamente.')});if(response.status<200||response.status>=300)throw new ContactRequestError(response.body.message??'Não foi possível carregar os contatos.',response.status);return response.body}
