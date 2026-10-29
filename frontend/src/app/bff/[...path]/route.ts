import {personalHostTarget,personalHostApiAllowed,publicHostCookies} from '@/features/profile-hosts/host-routing'
import {resolvePersonalHost} from '@/features/profile-hosts/server/resolve-host'
import { tenantHost, forward } from '@/lib/upstream'

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  const url = new URL(request.url)
  const avatarTarget=/^v1\/me\/profile\/avatar\/[a-f0-9]{64}$/.test(params.path.join('/'))?url.searchParams.get('profileId'):null
  if(avatarTarget)url.searchParams.delete('profileId')
  const hostHeader = request.headers.get('host') ?? 'localhost'

  const personal=personalHostTarget(hostHeader),resolved=personal?await resolvePersonalHost(hostHeader):null
  if(personal&&(!resolved||!('mode' in resolved)||resolved.mode!=='PAGE'||!personalHostApiAllowed(request.method,'/'+params.path.join('/'),resolved.slug)))return Response.json({message:'Página indisponível.'},{status:404,headers:{'cache-control':'no-store'}})
  const raw = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : Buffer.from(await request.arrayBuffer())
  const body = raw && raw.length > 0 ? raw : undefined
  const result = await forward({
    method: request.method,
    path: `/api/${params.path.join('/')}${url.search}`,
    host:personal?.tenantHost??tenantHost(hostHeader.split(':')[0] || 'localhost'),
    cookie:personal?publicHostCookies(request.headers.get('cookie')??''):request.headers.get('cookie')??'',
    authorization:personal?'':request.headers.get('authorization')??'',
    idempotencyKey: request.headers.get('idempotency-key') ?? '',
    profileTarget:personal?'':request.headers.get('x-profile-id')??avatarTarget??'',
    workspaceTarget:personal?'':request.headers.get('x-workspace-owner')??'',
    csrf: request.headers.get('x-csrf-token') ?? '',
    userAgent: request.headers.get('user-agent') ?? '',
    dnt: request.headers.get('dnt') ?? '',
    gpc: request.headers.get('sec-gpc') ?? '',
    analyticsTest: request.headers.get('x-analytics-test') ?? '',
    body,
  })
  const headers = new Headers()
  const location = result.headers.location
  if (result.status >= 300 && result.status < 400 && typeof location === 'string' && location.startsWith('/') && !/^\/[\\/]/.test(location) && !/[\\\r\n]/.test(location)) headers.set('location', location)
  const cacheControl = result.headers['cache-control']
  headers.set('cache-control', typeof cacheControl === 'string' ? cacheControl : 'private, no-store')
  const nosniff = result.headers['x-content-type-options']
  if (typeof nosniff === 'string') headers.set('x-content-type-options', nosniff)
  const disposition = result.headers['content-disposition']
  if (typeof disposition === 'string') headers.set('content-disposition', disposition)
  const rawSetCookie = result.headers['set-cookie']
  const setCookie=personal?(Array.isArray(rawSetCookie)?rawSetCookie:rawSetCookie?[rawSetCookie]:[]).filter(value=>/^(?:age|tla_consent|tla_touch|analyticsSession|csrf|tla_profile_measure)=/.test(value)&&!/(?:^|;)\s*domain=/i.test(value)):rawSetCookie
  if (Array.isArray(setCookie)) setCookie.forEach((cookie) => headers.append('set-cookie', cookie))
  else if (typeof setCookie === 'string') headers.set('set-cookie', setCookie)
  if (result.status === 204) return new Response(null, { status: 204, headers })
  headers.set('content-type', String(result.headers['content-type'] ?? 'application/json'))
  return new Response(new Uint8Array(result.body), { status: result.status, headers })
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const PUT = handle
export const DELETE = handle
