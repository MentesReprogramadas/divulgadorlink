import {forward} from '@/lib/upstream'
import {personalHostTarget} from '../host-routing'
export type ResolvedHost={hostname:string;tenantHost:string;slug:string;mode:'PAGE'|'FALLBACK'}
export async function resolvePersonalHost(raw:string,challenge?:string):Promise<ResolvedHost|{proof:string}|null>{const target=personalHostTarget(raw);if(!target)return null;const result=await forward({method:'GET',path:'/api/v1/profile-hosts/resolve?hostname='+encodeURIComponent(target.hostname)+(challenge?'&challenge='+encodeURIComponent(challenge):''),host:target.tenantHost,timeoutMs:10000});if([400,404].includes(result.status))return null;if(result.status!==200)throw new Error('Não foi possível verificar o endereço da página.');return JSON.parse(result.body.toString()) as ResolvedHost|{proof:string}}
