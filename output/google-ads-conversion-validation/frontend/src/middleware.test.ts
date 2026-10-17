import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, middleware } from '@/middleware'

function run(path: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined
  return middleware(new NextRequest(`http://localhost${path}`, { headers }))
}

afterEach(() => vi.unstubAllEnvs())

describe('middleware', () => {
  it('não intercepta a ficha: o 404 fica na página', () => {
    expect(config.matcher).toEqual(['/((?!_next|bff|.*\\..*).*)'])
    expect(run('/link/nao-existe').headers.get('x-middleware-rewrite')).toBeNull()
    expect(run('/').headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(run('/').headers.get('content-security-policy')).toContain("'nonce-")
  })

  it('a landing do anúncio não abre uma sessão diferente', () => {
    expect(run('/divulgar').headers.get('set-cookie') ?? '').not.toContain('tla_shell')
  })

  it('só grava o toque de campanha depois do aceite', () => {
    const campaign = '/divulgar?utm_source=meta&utm_medium=cpc&utm_campaign=maio'
    expect(run(campaign).headers.get('set-cookie') ?? '').not.toContain('tla_touch')
    const accepted = run(campaign, 'tla_consent=marketing').headers.get('set-cookie') ?? ''
    expect(accepted).toContain('tla_touch=')
    const revoked = run('/', 'tla_consent=denied; tla_touch=antigo').headers.get('set-cookie') ?? ''
    expect(revoked).toContain('tla_touch=')
    expect(revoked).toMatch(/Max-Age=0|tla_touch=;/i)
  })

  it('só libera eval no servidor de desenvolvimento', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(run('/').headers.get('content-security-policy')).toContain("'unsafe-eval'")
    vi.stubEnv('NODE_ENV', 'production')
    expect(run('/').headers.get('content-security-policy') ?? '').not.toContain('unsafe-eval')
  })

  it('permite as origens da tag e das medições Google Ads sem liberar scripts inline', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const policy = run('/').headers.get('content-security-policy') ?? ''
    const directives = new Map(policy.split('; ').map(directive => {
      const [name, ...sources] = directive.split(' ')
      return [name, sources]
    }))
    expect(directives.get('script-src')).toContain('https://www.googletagmanager.com')
    expect(directives.get('script-src')).toContain('https://www.googleadservices.com')
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'")
    expect(directives.get('connect-src')).toContain('https://googleads.g.doubleclick.net')
    expect(directives.get('img-src')).toContain('https://www.google.com.br')
    expect(directives.get('frame-src')).toContain('https://www.googletagmanager.com')
  })

  it('admin sem papel continua na página escondida', () => {
    const hidden = run('/admin/moderacao')
    expect(hidden.status).toBe(404)
    expect(hidden.headers.get('x-middleware-rewrite')).toContain('/nao-encontrado')
    expect(run('/admin/moderacao', 'catalogo_role=ADMIN').headers.get('x-middleware-rewrite')).toBeNull()
  })
})
