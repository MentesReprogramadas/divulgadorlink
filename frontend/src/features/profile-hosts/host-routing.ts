export type PersonalHostTarget={hostname:string;tenantHost:string}
export function personalHostTarget(raw:string,basesRaw=process.env.PROFILE_HOST_BASES):PersonalHostTarget|null{
 const hostname=raw.toLowerCase().split(':')[0];if(!hostname||!/^[a-z0-9.-]+$/.test(hostname))return null
 let bases:unknown;try{bases=JSON.parse(basesRaw||'{}')}catch{throw new Error('PROFILE_HOST_BASES inválido.')}
 if(!bases||typeof bases!=='object'||Array.isArray(bases))throw new Error('PROFILE_HOST_BASES inválido.')
 for(const [base,tenantHost] of Object.entries(bases).sort((a,b)=>b[0].length-a[0].length)){if(typeof tenantHost!=='string'||!/^[a-z0-9.-]+$/.test(base)||!/^[a-z0-9.-]+$/.test(tenantHost))throw new Error('PROFILE_HOST_BASES inválido.');if(hostname.endsWith('.'+base)&&hostname!==base)return {hostname,tenantHost}}
 return null
}
export function personalHostApiAllowed(method:string,path:string,slug:string){
 const prefix='/v1/profiles/'+encodeURIComponent(slug),get=method==='GET';
 if(path==='/v1/auth/csrf')return get
 if(path===prefix)return get
 if(path.startsWith(prefix+'/')){const rest=path.slice(prefix.length);return get&&(/^\/(?:items|contact-form)$/.test(rest)||/^\/(?:avatar|media)\/[a-f0-9]{64}$/.test(rest)||/^\/events\/[a-f0-9-]{36}\/calendar\.ics$/.test(rest)||/^\/channels\/[a-f0-9-]{36}\/resolve$/.test(rest))||method==='POST'&&rest==='/contact-form/submissions'}
 return method==='POST'&&['/v1/age','/v1/analytics/consent','/v1/analytics/profiles/events'].includes(path)
}
export function personalHostOrigin(tenantHost:string,port:string){return tenantHost.endsWith('.localhost')?'http://'+tenantHost+(port?':'+port:''):'https://'+tenantHost}
export function publicHostCookies(raw:string){const allowed=new Set(['age','tla_consent','tla_touch','analyticsSession','csrf','tla_profile_measure']);return raw.split(';').map(v=>v.trim()).filter(v=>allowed.has(v.split('=')[0])).join('; ')}
