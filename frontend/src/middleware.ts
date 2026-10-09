import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  const hidden = request.nextUrl.pathname.startsWith('/admin')
    && request.cookies.get('catalogo_role')?.value !== 'ADMIN'
  if (hidden) {
    return NextResponse.rewrite(new URL('/nao-encontrado', request.url), {
      status: 404,
      request: { headers: requestHeaders },
    })
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next|bff|.*\\..*).*)'],
}
