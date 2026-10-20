from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
def put(p,s):
 p=r/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
put('frontend/src/features/profile-hosts/host-routing.ts','''export type PersonalHostTarget={hostname:string;tenantHost:string}
export function personalHostTarget(raw:string,basesRaw=process.env.PROFILE_HOST_BASES):PersonalHostTarget|null{
 const hostname=raw.toLowerCase().split(':')[0];if(!hostname||!/^[a-z0-9.-]+$/.test(hostname))return null
 let bases:unknown;try{bases=JSON.parse(basesRaw||'{}')}catch{throw new Error('PROFILE_HOST_BASES inválido.')}
 if(!bases||typeof bases!=='object'||Array.isArray(bases))throw new Error('PROFILE_HOST_BASES inválido.')
 for(const [base,tenantHost] of Object.entries(bases)){if(typeof tenantHost!=='string'||!/^[a-z0-9.-]+$/.test(base)||!/^[a-z0-9.-]+$/.test(tenantHost))throw new Error('PROFILE_HOST_BASES inválido.');if(hostname.endsWith('.'+base)&&hostname!==base)return {hostname,tenantHost}}
 return null
}
export function personalHostApiAllowed(method:string,path:string,slug:string){
 const prefix='/v1/profiles/'+encodeURIComponent(slug),get=method==='GET';
 if(path===prefix)return get
 if(path.startsWith(prefix+'/')){const rest=path.slice(prefix.length);return get&&(/^\\/(?:items|contact-form)$/.test(rest)||/^\\/avatar\\/[a-f0-9]{64}$/.test(rest)||/^\\/events\\/[a-f0-9-]{36}\\/calendar\\.ics$/.test(rest)||/^\\/channels\\/[a-f0-9-]{36}\\/resolve$/.test(rest))||method==='POST'&&rest==='/contact-form/submissions'}
 return method==='POST'&&['/v1/age','/v1/analytics/consent','/v1/analytics/profiles/events'].includes(path)
}
export function personalHostOrigin(tenantHost:string,port:string){return tenantHost.endsWith('.localhost')?'http://'+tenantHost+(port?':'+port:''):'https://'+tenantHost}
export function publicHostCookies(raw:string){const allowed=new Set(['age','tla_consent','tla_touch','analyticsSession','csrf','profile_measurement']);return raw.split(';').map(v=>v.trim()).filter(v=>allowed.has(v.split('=')[0])).join('; ')}
''')
put('frontend/src/features/profile-hosts/server/resolve-host.ts','''import {forward} from '@/lib/upstream'
import {personalHostTarget} from '../host-routing'
export type ResolvedHost={hostname:string;tenantHost:string;slug:string;mode:'PAGE'|'FALLBACK'}
export async function resolvePersonalHost(raw:string,challenge?:string):Promise<ResolvedHost|{proof:string}|null>{const target=personalHostTarget(raw);if(!target)return null;const result=await forward({method:'GET',path:'/api/v1/profile-hosts/resolve?hostname='+encodeURIComponent(target.hostname)+(challenge?'&challenge='+encodeURIComponent(challenge):''),host:target.tenantHost,timeoutMs:10000});if([400,404].includes(result.status))return null;if(result.status!==200)throw new Error('Não foi possível verificar o endereço da página.');return JSON.parse(result.body.toString()) as ResolvedHost|{proof:string}}
''')
put('frontend/src/app/.well-known/temlink-page/[challenge]/route.ts','''import {resolvePersonalHost} from '@/features/profile-hosts/server/resolve-host'
export const dynamic='force-dynamic'
export async function GET(request:Request,{params}:{params:Promise<{challenge:string}>}){const {challenge}=await params;if(!/^[a-f0-9]{64}$/.test(challenge))return new Response(null,{status:404});const proof=await resolvePersonalHost(request.headers.get('host')??'',challenge);if(!proof||!('proof' in proof))return new Response(null,{status:404});return new Response(proof.proof,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
''')
p=r/'frontend/src/middleware.ts';s=p.read_text(encoding='utf-8');s="import {personalHostTarget,personalHostOrigin} from '@/features/profile-hosts/host-routing'\n"+s;s=s.replace("  requestHeaders.set('x-pathname'", "  for(const name of ['x-profile-tenant-host','x-profile-hostname'])requestHeaders.delete(name)\n  requestHeaders.set('x-pathname'");s=s.replace('export function middleware(request: NextRequest)', 'export async function middleware(request: NextRequest)');s=s.replace("  const hidden = request.nextUrl.pathname",'''
  const personal=personalHostTarget(request.headers.get('host')??'')
  if(personal){
    const denied=()=>finish(request,new NextResponse('Página indisponível.',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}}),csp)
    let response:Response;try{response=await fetch(new URL('/api/v1/profile-hosts/resolve?hostname='+encodeURIComponent(personal.hostname),process.env.API_ORIGIN||'http://127.0.0.1:3333'),{headers:{host:personal.tenantHost},cache:'no-store',signal:AbortSignal.timeout(10000)})}catch{return finish(request,new NextResponse('Não foi possível carregar a página.',{status:503}),csp)}
    if(response.status===404||response.status===400)return denied();if(!response.ok)return finish(request,new NextResponse('Não foi possível carregar a página.',{status:503}),csp)
    const resolved=await response.json() as {mode:'PAGE'|'FALLBACK';slug:string;tenantHost:string};if(resolved.tenantHost!==personal.tenantHost||!/^[a-z0-9-]{3,40}$/.test(resolved.slug))return denied()
    const path=request.nextUrl.pathname,central=personalHostOrigin(personal.tenantHost,request.nextUrl.port)
    if(['/divulgar','/termos','/privacidade'].includes(path)||/^\\/(?:link|r|go)\\/[a-zA-Z0-9_-]+$/.test(path))return finish(request,NextResponse.redirect(new URL(path+request.nextUrl.search,central),307),csp)
    if(path!=='/'&&path!=='/p/'+resolved.slug)return denied()
    if(resolved.mode==='FALLBACK')return finish(request,NextResponse.redirect(new URL('/p/'+resolved.slug,central),307),csp)
    headers.set('x-profile-tenant-host',personal.tenantHost);headers.set('x-profile-hostname',personal.hostname)
    const next=new URL('/p/'+resolved.slug+request.nextUrl.search,request.url)
    const output=NextResponse.rewrite(next,{request:{headers}});output.headers.set('cache-control','private, no-store');output.headers.set('x-robots-tag','noindex, follow');return finish(request,output,csp)
  }
  const hidden = request.nextUrl.pathname''');p.write_text(s,encoding='utf-8')
p=r/'frontend/src/app/bff/[...path]/route.ts';s=p.read_text(encoding='utf-8');s="import {personalHostTarget,personalHostApiAllowed,publicHostCookies} from '@/features/profile-hosts/host-routing'\nimport {resolvePersonalHost} from '@/features/profile-hosts/server/resolve-host'\n"+s;s=s.replace("  const raw = request.method",'''
  const personal=personalHostTarget(hostHeader),resolved=personal?await resolvePersonalHost(hostHeader):null
  if(personal&&(!resolved||!('mode' in resolved)||resolved.mode!=='PAGE'||!personalHostApiAllowed(request.method,'/'+params.path.join('/'),resolved.slug)))return Response.json({message:'Página indisponível.'},{status:404,headers:{'cache-control':'no-store'}})
  const raw = request.method''');s=s.replace("host: tenantHost(hostHeader.split(':')[0] || 'localhost'),","host:personal?.tenantHost??tenantHost(hostHeader.split(':')[0] || 'localhost'),");s=s.replace("cookie: request.headers.get('cookie') ?? '',","cookie:personal?publicHostCookies(request.headers.get('cookie')??''):request.headers.get('cookie')??'',");
for key,header in [('authorization','authorization'),('profileTarget','x-profile-id'),('workspaceTarget','x-workspace-owner')]:
 if key=='profileTarget':s=s.replace("profileTarget:request.headers.get('x-profile-id')??avatarTarget??'',","profileTarget:personal?'':request.headers.get('x-profile-id')??avatarTarget??'',")
 elif key=='workspaceTarget':s=s.replace("workspaceTarget:request.headers.get('x-workspace-owner')??'',","workspaceTarget:personal?'':request.headers.get('x-workspace-owner')??'',")
 else:s=s.replace("authorization: request.headers.get('authorization') ?? '',","authorization:personal?'':request.headers.get('authorization')??'',")
s=s.replace("  const setCookie = result.headers['set-cookie']", "  const rawSetCookie = result.headers['set-cookie']\n  const setCookie=personal?(Array.isArray(rawSetCookie)?rawSetCookie:rawSetCookie?[rawSetCookie]:[]).filter(value=>/^(?:age|tla_consent|tla_touch|analyticsSession|csrf|profile_measurement)=/.test(value)&&!/(?:^|;)\\s*domain=/i.test(value)):rawSetCookie");p.write_text(s,encoding='utf-8')
# All SSR profile fetches forward only age; central tenant identity comes only from sanitized middleware context.
for name in ['load-profile.ts','load-profile-items.ts']:
 p=r/'frontend/src/features/profiles/server'/name;s=p.read_text(encoding='utf-8').replace("host: tenantHost(h.get('host') ?? 'localhost')","host:h.get('x-profile-tenant-host')??tenantHost(h.get('host')??'localhost')").replace("host:tenantHost(h.get('host')??'localhost')","host:h.get('x-profile-tenant-host')??tenantHost(h.get('host')??'localhost')");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/app/p/[slug]/page.tsx';s=p.read_text(encoding='utf-8');s=s.replace("  return { title: content.restricted", "  const requestHeaders=await headers(),personal=requestHeaders.get('x-profile-hostname')\n  return { title: content.restricted",1);s=s.replace("canonical: 'https://' + tenantHost((await headers()).get('host') ?? 'localhost') + '/p/' + encodeURIComponent(slug)","canonical:personal?'https://'+personal+'/':'https://'+tenantHost(requestHeaders.get('host')??'localhost')+'/p/'+encodeURIComponent(slug)");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/app/layout.tsx';s=p.read_text(encoding='utf-8');s="import {headers} from 'next/headers'\nimport {personalHostTarget} from '@/features/profile-hosts/host-routing'\n"+s;s=s.replace('  const jar = await cookies()','  const personalHost=Boolean(personalHostTarget((await headers()).get(\'host\')??\'\'))\n  const jar = await cookies()');s=s.replace("<body data-support={support ? 'true' : undefined}>","<body data-personal-host={personalHost?'true':undefined} data-support={!personalHost&&support?'true':undefined}>");s=s.replace('<SiteShell role={role} support={support}>','<SiteShell personalHost={personalHost} role={personalHost?undefined:role} support={!personalHost&&support}>');s=s.replace('<SiteVisits />','{personalHost?null:<SiteVisits />}');p.write_text(s,encoding='utf-8')
p=r/'frontend/src/components/layout/site-shell.tsx';s=p.read_text(encoding='utf-8').replace('role, support = false, children','role, support = false, personalHost=false, children').replace('support?: boolean; children:', 'support?: boolean; personalHost?:boolean; children:').replace("  if (/^\\/p", "  if (personalHost)return <>{children}</>\n  if (/^\\/p");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/profiles/profile-explorer.tsx';s=p.read_text(encoding='utf-8').replace("url.pathname='/p/'+encodeURIComponent(slug)","url.pathname=document.body.dataset.personalHost==='true'?'/':'/p/'+encodeURIComponent(slug)");p.write_text(s,encoding='utf-8')
for name in ['robots.ts','sitemap.ts']:
 p=r/'frontend/src/app'/name;s=p.read_text(encoding='utf-8');s="import {personalHostTarget} from '@/features/profile-hosts/host-routing'\n"+s;s=s.replace("  const host = requestHost", "  if(personalHostTarget(headerStore.get('host')??''))return "+("{rules:{userAgent:'*',disallow:'/'}}" if name=='robots.ts' else '[]')+"\n  const host = requestHost");p.write_text(s,encoding='utf-8')
# Capa reuses appearance tokens in the same renderer and preview.
p=r/'frontend/src/features/profiles/profile-appearance.ts';s=p.read_text(encoding='utf-8').replace('  searchEnabled?: boolean',"  coverStyle?:'none'|'banner'\n  searchEnabled?: boolean");s=s.replace("{ searchEnabled: false, background:","{ coverStyle:'none',searchEnabled: false, background:");s=s.replace("['backgroundStyle', 'buttonStyle'", "['coverStyle','backgroundStyle', 'buttonStyle'");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/profiles/components/profile-view.tsx';s=p.read_text(encoding='utf-8').replace('    <header className={styles.identity}>',"    {appearance.coverStyle==='banner'?<div className={styles.cover} aria-hidden=\"true\"/>:null}\n    <header className={styles.identity}>");p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/profiles/components/personal-page.module.css';s=p.read_text(encoding='utf-8');s+='\n.cover { width:100%; height:clamp(96px,22vw,160px); border-radius:var(--page-radius); background:linear-gradient(125deg,var(--button-bg),color-mix(in srgb,var(--button-bg),var(--page-bg) 65%)); }\n';p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/profiles/components/profile-appearance-editor.tsx';s=p.read_text(encoding='utf-8').replace("searchEnabled:appearance.searchEnabled }", "searchEnabled:appearance.searchEnabled,coverStyle:appearance.coverStyle }");s=s.replace('<p className={styles.hint}>O texto', '<ChangedField changed={changes.appearance(\'coverStyle\',appearance.coverStyle)}><Field label="Capa da página"><Select value={appearance.coverStyle??\'none\'} onChange={event=>change({coverStyle:event.target.value as \'none\'|\'banner\'})}><option value="none">Sem capa</option><option value="banner">Faixa com as cores do tema</option></Select></Field></ChangedField><p className={styles.hint}>O texto');p.write_text(s,encoding='utf-8')
