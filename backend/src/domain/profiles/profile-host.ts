import {isIP} from 'node:net'
import {ProfileError} from './profile'
export type ProfileHostBases=Record<string,string>
const reserved=new Set(['www','api','admin','painel','login','cadastro','suporte','support','help','links','app','mail','email','smtp','ftp','static','assets','cdn','status','docs','temlinkaqui','localhost','billing','pagamento','checkout','auth','oauth','autodiscover','webmail','ns1','ns2','root','robots','sitemap','dev','staging','preview'])
const domain=(value:string,production:boolean)=>!isIP(value)&&value.length<=253&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(value)&&(!production||!value.endsWith('.localhost')&&!value.endsWith('.local')&&value!=='localhost')
export function profileHostBases(raw:string|undefined,production=false):ProfileHostBases{
 if(!raw?.trim())return {};let input:unknown;try{input=JSON.parse(raw)}catch{throw new Error('PROFILE_HOST_BASES precisa ser um objeto JSON.')}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('PROFILE_HOST_BASES inválido.')
 const result:ProfileHostBases={};for(const [base,tenant] of Object.entries(input)){if(typeof tenant!=='string'||base!==base.toLowerCase()||tenant!==tenant.toLowerCase()||!domain(base,production)||!domain(tenant,production))throw new Error('Raiz de subdomínio ou tenant inválido.');result[base]=tenant}return result
}
export function profileHostname(value:string,base:string):string{
 const label=value.trim().toLowerCase();if(!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/.test(label)||label.startsWith('xn--')||label.includes('--')||reserved.has(label))throw new ProfileError(400,'Use 3 a 40 letras sem acentos, números ou hífens. Esse nome pode estar reservado.')
 return label+'.'+base
}
export function profileHostCovered(paid:boolean,published:boolean,tls:boolean){return paid&&published&&tls}
