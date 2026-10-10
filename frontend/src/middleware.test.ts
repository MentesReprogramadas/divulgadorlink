import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { config, middleware } from '@/middleware'

function run(path: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined
  return middleware(new NextRequest(`http://localhost${path}`, { headers }))
}

describe('middleware', () => {
  it('não intercepta a ficha: o 404 fica na página', () => {
    expect(config.matcher).toEqual(['/((?!_next|bff|.*\\..*).*)'])
    expect(run('/link/nao-existe').headers.get('x-middleware-rewrite')).toBeNull()
    expect(run('/').headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(run('/').headers.get('content-security-policy')).toContain("'nonce-")
  })

  it('a landing do anúncio marca a sessão fora do catálogo', () => {
    const shell = run('/divulgar').headers.get('set-cookie') ?? ''
    expect(shell).toContain('tla_shell=ad')
    expect(run('/').headers.get('set-cookie') ?? '').not.toContain('tla_shell')
  })

  it('admin sem papel continua na página escondida', () => {
    const hidden = run('/admin/moderacao')
    expect(hidden.status).toBe(404)
    expect(hidden.headers.get('x-middleware-rewrite')).toContain('/nao-encontrado')
    expect(run('/admin/moderacao', 'catalogo_role=ADMIN').headers.get('x-middleware-rewrite')).toBeNull()
  })
})
