import {personalHostTarget,personalHostOrigin} from '@/features/profile-hosts/host-routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { touchDecision } from '@/domain/campaign-touch'

function withPath(request: NextRequest): { headers: Headers; csp: string } {
  const requestHeaders = new Headers(request.headers)
  for(const name of ['x-profile-tenant-host','x-profile-hostname','x-profile-slug'])requestHeaders.delete(name)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-search', request.nextUrl.search)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  const googleScripts = 'https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com'
  const googleAds = `${googleScripts} https://www.google.com.br https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com`
  // CSP belongs to the initial document and survives client navigation from login to affiliates.
  const affiliateImages = ' https://mlstatic.com https://*.mlstatic.com'
  const csp = [
    "default-src 'self'",
    `script-src 'self'${devEval} 'nonce-${nonce}' https://js.stripe.com https://connect.facebook.net ${googleScripts}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://www.facebook.com ${googleAds}${affiliateImages}`,
    "font-src 'self'",
    `connect-src 'self' https://api.stripe.com https://www.facebook.com https://connect.facebook.net ${googleAds} https://ad.doubleclick.net`,
    "frame-src https://js.stripe.com https://hooks.stripe.com https://www.googletagmanager.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  return { headers: requestHeaders, csp }
}

function finish(request: NextRequest, response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp)
  const session = request.cookies.get('analyticsSession')?.value
  if (request.method === 'GET' && !(session && /^[0-9a-f-]{36}$/i.test(session))) {
    // Mint once on HTML, before visits and impressions can race to set cookies.
    response.cookies.set({ name: 'analyticsSession', value: crypto.randomUUID(), httpOnly: true, sameSite: 'lax', path: '/', secure: request.nextUrl.protocol === 'https:' })
  }
  return withTouch(request, response)
}

function withTouch(request: NextRequest, response: NextResponse): NextResponse {
  if (request.method !== 'GET') return response
  const decision = touchDecision({
    consent: request.cookies.get('tla_consent')?.value,
    existing: request.cookies.has('tla_touch'),
    pathname: request.nextUrl.pathname,
    source: request.nextUrl.searchParams.get('utm_source') ?? '',
    medium: request.nextUrl.searchParams.get('utm_medium') ?? '',
    campaign: request.nextUrl.searchParams.get('utm_campaign') ?? '',
    content: request.nextUrl.searchParams.get('utm_content') ?? '',
    term: request.nextUrl.searchParams.get('utm_term') ?? '',
  })
  if (decision.action === 'keep') return response
  response.cookies.set({
    name: 'tla_touch',
    value: decision.action === 'set' ? decision.value : '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: decision.action === 'set' ? 2_592_000 : 0,
    secure: request.nextUrl.protocol === 'https:',
  })
  return response
}

export async function middleware(request: NextRequest) {
  const { headers, csp } = withPath(request)

  const personal=personalHostTarget(request.headers.get('host')??'')
  if(personal){
    const denied=()=>finish(request,new NextResponse('Página indisponível.',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}}),csp)
    let response:Response;try{response=await fetch(new URL('/api/v1/profile-hosts/resolve?hostname='+encodeURIComponent(personal.hostname),process.env.API_ORIGIN||'http://127.0.0.1:3333'),{cache:'no-store',signal:AbortSignal.timeout(10000)})}catch{return finish(request,new NextResponse('Não foi possível carregar a página.',{status:503}),csp)}
    if(response.status===404||response.status===400)return denied();if(!response.ok)return finish(request,new NextResponse('Não foi possível carregar a página.',{status:503}),csp)
    const resolved=await response.json() as {mode:'PAGE'|'FALLBACK';slug:string;tenantHost:string};if(resolved.tenantHost!==personal.tenantHost||!/^[a-z0-9-]{3,40}$/.test(resolved.slug))return denied()
    const path=request.nextUrl.pathname,central=personalHostOrigin(personal.tenantHost,request.nextUrl.port)
    if(new RegExp('^/p/'+resolved.slug+'/(?:canais/(?:[a-f0-9-]{36}|estado)|midia-kit|c/[a-z0-9-]+)$').test(path)||['/divulgar','/termos','/privacidade'].includes(path)||/^\/(?:link|r|go)\/[a-zA-Z0-9_-]+$/.test(path))return finish(request,NextResponse.redirect(new URL(path+request.nextUrl.search,central),307),csp)
    if(path!=='/'&&path!=='/p/'+resolved.slug)return denied()
    if(resolved.mode==='FALLBACK')return finish(request,NextResponse.redirect(new URL('/p/'+resolved.slug,central),307),csp)
    headers.set('x-profile-tenant-host',personal.tenantHost);headers.set('x-profile-hostname',personal.hostname);headers.set('x-profile-slug',resolved.slug)
    const next=new URL('/p/'+resolved.slug+request.nextUrl.search,request.url)
    const output=NextResponse.rewrite(next,{request:{headers}});output.headers.set('cache-control','private, no-store');output.headers.set('x-robots-tag','noindex, follow');return finish(request,output,csp)
  }
  const hidden = request.nextUrl.pathname.startsWith('/admin')
    && request.cookies.get('catalogo_role')?.value !== 'ADMIN'
    // This only permits rendering the shell. AreaFrame and every API request
    // validate the selected membership; a cookie never grants admin rights.
    && !request.cookies.get('workspaceOwner')?.value
  if (hidden) {
    return finish(request, NextResponse.rewrite(new URL('/nao-encontrado', request.url), {
      status: 404,
      request: { headers },
    }), csp)
  }
  return finish(request, NextResponse.next({ request: { headers } }), csp)
}

export const config = {
  matcher: ['/((?!_next|bff|.*\\..*).*)'],
}
