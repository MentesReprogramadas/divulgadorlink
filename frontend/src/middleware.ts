import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { touchDecision } from '@/domain/campaign-touch'

function withPath(request: NextRequest): { headers: Headers; csp: string } {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  const csp = [
    "default-src 'self'",
    `script-src 'self'${devEval} 'nonce-${nonce}' https://js.stripe.com https://connect.facebook.net`,
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
