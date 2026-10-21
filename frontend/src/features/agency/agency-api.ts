import {api} from '@/lib/api'
export class AgencyError extends Error{constructor(message:string,public readonly status:number){super(message)}}
export async function agencyRequest<T>(path:string,init?:RequestInit,personal=false):Promise<T>{
 const result=await api<T&{message?:string}>('/v1/me/agency'+path,{...init,...(personal?{headers:{...Object.fromEntries(new Headers(init?.headers)),'x-workspace-owner':'self'}}:{})}).catch(()=>{throw new AgencyError('Sem conexão. Seus dados foram mantidos; tente novamente.',0)})
 if(result.status!==200)throw new AgencyError(result.body.message??'Não foi possível concluir.',result.status)
 return result.body
}

export type AgencyClient={id:string;name:string|null;version:number;available:boolean;role:string|null;profile:{id:string;name:string;slug:string;published:boolean}|null}
export type AgencyClients={clients:AgencyClient[];choices:Array<{id:string;name:string;slug:string}>;used:number;limit:number;personal:boolean}
export type AgencyAccessRequest={id:string;version:number;role:'EDITOR'|'VIEWER';status:string;page:{name:string;slug:string}|null;userName:string|null;incoming:boolean;expiresAt:string}
export type AgencyAccess={requests:AgencyAccessRequest[];clients:Array<{id:string;name:string;pageName:string}>;colleagues:Array<{id:string;name:string}>;personal:boolean}
export type PageTransfer={id:string;profileId:string;pageName:string;pageSlug:string;version:number;profileVersion:number;status:string;expiresAt:string;incoming:boolean}
export type PageTransfers={requests:PageTransfer[];page:{id:string;name:string;slug:string;version:number}|null;confirmed:boolean}
export const agencyStatuses:Record<string,string>={PENDING:'Aguardando decisão',APPROVED:'Aprovado',DECLINED:'Recusado',REVOKED:'Acesso encerrado',EXPIRED:'Expirado',ACCEPTED:'Transferência concluída',CANCELLED:'Cancelado'}
