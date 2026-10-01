import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function missingLink(request: NextRequest): Promise<boolean> {
  const id = request.nextUrl.pathname.slice('/link/'.length).split('/')[0]
  if (!id) return true
  const host = process.env.TENANT_HOST || request.headers.get('host')?.split(':')[0] || 'localhost'
  const origin = process.env.API_ORIGIN || 'http://127.0.0.1:3333'
  const response = await fetch(`${origin}/api/v1/links/${encodeURIComponent(id)}`, { headers: { host } })
  return response.status === 404
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const hidden = path.startsWith('/admin') && request.cookies.get('catalogo_role')?.value !== 'ADMIN'
  const absent = path.startsWith('/link/') && await missingLink(request)
  if (hidden || absent) {
    return NextResponse.rewrite(new URL('/nao-encontrado', request.url), { status: 404 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/link/:path*', '/admin/:path*'],
}
