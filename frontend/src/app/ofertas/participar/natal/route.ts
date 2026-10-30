import { NextResponse } from 'next/server'

export function GET(request: Request) {
  return NextResponse.redirect(new URL('/ofertas/entrar/natal', request.url), 307)
}
