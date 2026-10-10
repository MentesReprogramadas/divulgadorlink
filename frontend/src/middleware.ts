import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOUCH_TOKEN = /^[a-zA-Z0-9._~-]{1,80}$/
const TOUCH_OPTIONAL = /^[a-zA-Z0-9._~-]{0,80}$/

function withPath(request: NextRequest): { headers: Headers; csp: string } {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.facebook.com",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://www.facebook.com https://connect.facebook.net",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
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
  return withAdShell(request, withTouch(request, response))
}

function withAdShell(request: NextRequest, response: NextResponse): NextResponse {
  if (request.method !== 'GET' || request.nextUrl.pathname !== '/divulgar') return response
  if (request.cookies.get('tla_shell')?.value === 'ad') return response
  response.cookies.set({
    name: 'tla_shell',
    value: 'ad',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: request.nextUrl.protocol === 'https:',
  })
  return response
}

function withTouch(request: NextRequest, response: NextResponse): NextResponse {
  if (request.method !== 'GET' || request.cookies.has('tla_touch')) return response
  const params = request.nextUrl.searchParams
  const source = params.get('utm_source') ?? ''
  const medium = params.get('utm_medium') ?? ''
  const campaign = params.get('utm_campaign') ?? ''
  const content = params.get('utm_content') ?? ''
  const term = params.get('utm_term') ?? ''
  if (request.nextUrl.pathname !== '/divulgar') return response
  if (!TOUCH_TOKEN.test(source) || !TOUCH_TOKEN.test(medium) || !TOUCH_TOKEN.test(campaign)) return response
  if (!TOUCH_OPTIONAL.test(content) || !TOUCH_OPTIONAL.test(term)) return response
  response.cookies.set({
    name: 'tla_touch',
    value: JSON.stringify({ source, medium, campaign, content, term, landingPath: '/divulgar' }),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 2_592_000,
    secure: request.nextUrl.protocol === 'https:',
  })
  return response
}

export function middleware(request: NextRequest) {
  const { headers, csp } = withPath(request)
  const hidden = request.nextUrl.pathname.startsWith('/admin')
    && request.cookies.get('catalogo_role')?.value !== 'ADMIN'
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
