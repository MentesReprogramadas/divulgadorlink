import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOUCH_TOKEN = /^[a-zA-Z0-9._~-]{1,80}$/
const TOUCH_OPTIONAL = /^[a-zA-Z0-9._~-]{0,80}$/

function withPath(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  return requestHeaders
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
  const requestHeaders = withPath(request)
  const hidden = request.nextUrl.pathname.startsWith('/admin')
    && request.cookies.get('catalogo_role')?.value !== 'ADMIN'
  if (hidden) {
    return withTouch(request, NextResponse.rewrite(new URL('/nao-encontrado', request.url), {
      status: 404,
      request: { headers: requestHeaders },
    }))
  }
  return withTouch(request, NextResponse.next({ request: { headers: requestHeaders } }))
}

export const config = {
  matcher: ['/((?!_next|bff|.*\\..*).*)'],
}
