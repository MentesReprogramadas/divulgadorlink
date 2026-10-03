import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hidden = request.nextUrl.pathname.startsWith('/admin')
    && request.cookies.get('catalogo_role')?.value !== 'ADMIN'
  if (hidden) {
    return NextResponse.rewrite(new URL('/nao-encontrado', request.url), { status: 404 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
