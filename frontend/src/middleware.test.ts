import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, middleware } from '@/middleware'
import { videoEmbedUrl } from '@/features/profiles/content-block'

function run(path: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined
  return middleware(new NextRequest(`http://localhost${path}`, { headers }))
}

afterEach(() => {vi.unstubAllEnvs();vi.unstubAllGlobals()})

it('o contexto de consulta vem da URL e substitui cabeçalho forjado',async()=>{
 const response=await middleware(new NextRequest('http://localhost/descobrir/ofertas-telegram?languageTag=pt&cursor=abc',{headers:{'x-search':'?languageTag=en'}}))
 expect(response.headers.get('x-middleware-request-x-search')).toBe('?languageTag=pt&cursor=abc')
})

it('a paleta pessoal usa apenas o slug resolvido pelo host, nunca um cabeçalho forjado',async()=>{
 const forged=await middleware(new NextRequest('http://localhost/login',{headers:{'x-profile-slug':'evil'}}))
 expect(forged.headers.get('x-middleware-request-x-profile-slug')).toBeNull()
 vi.stubEnv('PROFILE_HOST_BASES','{"pages.test":"tenant.test"}')
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({mode:'PAGE',slug:'ana',tenantHost:'tenant.test'})))
 const personal=await middleware(new NextRequest('https://ana.pages.test/',{headers:{host:'ana.pages.test','x-profile-slug':'evil'}}))
 expect(personal.headers.get('x-middleware-request-x-profile-slug')).toBe('ana')
})

describe('middleware', () => {
  it('prepara CSRF no HTML do convite sem ida adicional ao backend', async () => {
    const response = await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal'))
    expect(response.cookies.get('csrf')).toMatchObject({ value: expect.stringMatching(/^[a-f0-9]{64}$/), httpOnly: false, secure: true, sameSite: 'lax', path: '/' })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const existing = 'a'.repeat(64)
    expect((await run('/ofertas/entrar/natal', 'csrf=' + existing)).cookies.get('csrf')).toBeUndefined()
    expect((await run('/ofertas/entrar/natal', 'csrf=short')).cookies.get('csrf')?.value).toMatch(/^[a-f0-9]{64}$/)
    expect((await run('/')).cookies.get('csrf')).toBeUndefined()
    const mutation = await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal', { method: 'POST' }))
    expect(mutation.cookies.get('csrf')).toBeUndefined()
  })

  it('redireciona navegação de navegador no primeiro HTTP e repassa contexto para métricas', async () => {
    const destination='https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'
    const fetchMock=vi.fn().mockResolvedValue(Response.json({url:destination}))
    vi.stubGlobal('fetch',fetchMock)
    const response=await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal',{headers:{host:'temlink.test','user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate','x-affiliate-tenant-host':'evil.test','x-affiliate-fetch-mode':'cors',cookie:'csrf=existing; tla_consent=denied',dnt:'1','sec-gpc':'1'}}))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(destination)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url,options]=fetchMock.mock.calls[0]!
    expect(new URL(url).pathname).toBe('/api/v1/public/affiliates/natal/destination')
    expect(options).toMatchObject({method:'GET',cache:'no-store',redirect:'error'})
    expect(Object.fromEntries(options.headers as Headers)).toMatchObject({host:'temlink.test','x-affiliate-tenant-host':'temlink.test','user-agent':'Mozilla/5.0 Chrome/130.0','x-affiliate-fetch-mode':'navigate',cookie:'csrf=existing; tla_consent=denied',dnt:'1','sec-gpc':'1'})
  })
  it('preserva HTML OG para crawler, HEAD, prefetch, suporte e requests sem navegação explícita', async () => {
    const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock)
    const browser={'user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate'}
    const excluded:Record<string,string>[]=[{'user-agent':'facebookexternalhit/1.1'},{'user-agent':'WhatsApp/2.0'},{purpose:'prefetch'},{'sec-purpose':'prefetch;prerender'},{'next-router-prefetch':'1'},{cookie:'supportSession=fixture'},{'sec-fetch-mode':''},{'sec-fetch-mode':'cors','x-affiliate-fetch-mode':'navigate'}]
    for(const extra of excluded){
      expect((await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal',{headers:{...browser,...extra}}))).status).toBe(200)
    }
    expect((await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal',{method:'HEAD',headers:browser}))).status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('mantém fallback HTML quando resolver falha, está cheio/SCREEN ou devolve URL inválida', async () => {
    const browser={'user-agent':'Mozilla/5.0 Chrome/130.0','sec-fetch-dest':'document','sec-fetch-mode':'navigate'}
    for(const result of [Response.json({url:'https://evil.test/'}),Response.json({url:null}),Response.json({}, {status:503})]){
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(result))
      expect((await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal',{headers:browser}))).status).toBe(200)
    }
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')))
    expect((await middleware(new NextRequest('https://temlink.test/ofertas/entrar/natal',{headers:browser}))).status).toBe(200)
  })

  it('permite fotos do ML desde o documento inicial para navegação cliente sem ampliar scripts ou conexões', async () => {
    for (const path of ['/login', '/', '/painel', '/admin/visao', '/admin/afiliados', '/admin/afiliados/segmentacoes/natal']) {
      const policy = (await run(path, 'catalogo_role=ADMIN')).headers.get('content-security-policy') ?? ''
      const directives = new Map(policy.split('; ').map(value => { const [name, ...sources] = value.split(' '); return [name, sources] }))
      expect(directives.get('img-src')).toContain('https://*.mlstatic.com')
      expect(directives.get('script-src')).not.toContain('https://*.mlstatic.com')
      expect(directives.get('connect-src')).not.toContain('https://*.mlstatic.com')
    }
  })

  it('inicializa a sessão operacional antes dos pedidos paralelos de analytics', async () => {
    const response = (await run('/link/publico'))
    const cookie = response.cookies.get('analyticsSession')
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/i)
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    expect(response.cookies.get('tla_touch')).toBeUndefined()
  })
  it('conserva a sessão existente, protege HTTPS e não cria sessão em mutações', async () => {
    const existing = '11111111-1111-1111-1111-111111111111'
    expect((await run('/link/publico', 'analyticsSession=' + existing)).cookies.get('analyticsSession')).toBeUndefined()
    const https = await middleware(new NextRequest('https://temlink.test/link/publico'))
    expect(https.cookies.get('analyticsSession')?.secure).toBe(true)
    const mutation = await middleware(new NextRequest('http://localhost/link/publico', { method: 'POST' }))
    expect(mutation.cookies.get('analyticsSession')).toBeUndefined()
    expect((await run('/link/publico', 'analyticsSession=invalid')).cookies.get('analyticsSession')?.value).toMatch(/^[0-9a-f-]{36}$/i)
  })
  it('não intercepta a ficha: o 404 fica na página', async () => {
    expect(config.matcher).toEqual(['/((?!_next|bff|.*\\..*).*)'])
    expect((await run('/link/nao-existe')).headers.get('x-middleware-rewrite')).toBeNull()
    expect((await run('/')).headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect((await run('/')).headers.get('content-security-policy')).toContain("'nonce-")
  })

  it('a landing do anúncio não abre uma sessão diferente', async () => {
    expect((await run('/divulgar')).headers.get('set-cookie') ?? '').not.toContain('tla_shell')
  })

  it('só grava o toque de campanha depois do aceite', async () => {
    const campaign = '/divulgar?utm_source=meta&utm_medium=cpc&utm_campaign=maio'
    expect((await run(campaign)).headers.get('set-cookie') ?? '').not.toContain('tla_touch')
    const accepted = (await run(campaign, 'tla_consent=marketing')).headers.get('set-cookie') ?? ''
    expect(accepted).toContain('tla_touch=')
    const revoked = (await run('/', 'tla_consent=denied; tla_touch=antigo')).headers.get('set-cookie') ?? ''
    expect(revoked).toContain('tla_touch=')
    expect(revoked).toMatch(/Max-Age=0|tla_touch=;/i)
  })

  it('só libera eval no servidor de desenvolvimento', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect((await run('/')).headers.get('content-security-policy')).toContain("'unsafe-eval'")
    vi.stubEnv('NODE_ENV', 'production')
    expect((await run('/')).headers.get('content-security-policy') ?? '').not.toContain('unsafe-eval')
  })

  it('permite as origens da tag e das medições Google Ads sem liberar scripts inline', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const policy = (await run('/')).headers.get('content-security-policy') ?? ''
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

  it('permite somente os players exatos dos provedores VIDEO validados, sem liberar scripts ou conexões da página', async () => {
    const policy = (await run('/p/comunidade')).headers.get('content-security-policy') ?? ''
    const directives = new Map(policy.split('; ').map(directive => {
      const [name, ...sources] = directive.split(' ')
      return [name, sources]
    }))
    const players = ['https://youtu.be/dQw4w9WgXcQ', 'https://vimeo.com/123456789'].map(input => new URL(videoEmbedUrl(input)!).origin)
    expect(players).toEqual(['https://www.youtube-nocookie.com', 'https://player.vimeo.com'])
    expect(directives.get('frame-src')).toEqual([
      'https://js.stripe.com', 'https://hooks.stripe.com', 'https://www.googletagmanager.com', ...players,
    ])
    for (const origin of players) {
      expect(directives.get('script-src')).not.toContain(origin)
      expect(directives.get('connect-src')).not.toContain(origin)
    }
    expect(directives.get('frame-src')).not.toContain('*')
    expect(directives.get('frame-src')).not.toContain('https:')
  })

  it('admin sem papel continua na página escondida', async () => {
    const hidden = (await run('/admin/moderacao'))
    expect(hidden.status).toBe(404)
    expect(hidden.headers.get('x-middleware-rewrite')).toContain('/nao-encontrado')
    expect((await run('/admin/moderacao', 'catalogo_role=ADMIN')).headers.get('x-middleware-rewrite')).toBeNull()
  })
  it('delega a validação do contexto compartilhado à sessão e à API, preservando o cargo original',async()=>{
    expect((await run('/admin/assinaturas','catalogo_role=USER; workspaceOwner=owner')).headers.get('x-middleware-rewrite')).toBeNull()
    expect((await run('/admin/assinaturas','catalogo_role=USER')).status).toBe(404)
  })
})

it('F10-I01 host pessoal reescreve só a página mapeada e elimina contexto forjado',async()=>{vi.stubEnv('PROFILE_HOST_BASES','{"pages.test":"tenant.test"}');vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({mode:'PAGE',slug:'ana',tenantHost:'tenant.test'})));const response=await middleware(new NextRequest('https://ana.pages.test/',{headers:{host:'ana.pages.test','x-profile-tenant-host':'evil.test','x-profile-hostname':'evil.test'}}));expect(response.headers.get('x-middleware-rewrite')).toBe('https://ana.pages.test/p/ana');expect(response.headers.get('x-middleware-request-x-profile-tenant-host')).toBe('tenant.test');expect(response.headers.get('x-middleware-request-x-profile-hostname')).toBe('ana.pages.test');expect(response.headers.get('set-cookie')).not.toMatch(/accessToken|refreshToken|Domain=/i);expect((await middleware(new NextRequest('https://ana.pages.test/p/bia',{headers:{host:'ana.pages.test'}}))).status).toBe(404);expect((await middleware(new NextRequest('https://ana.pages.test/login',{headers:{host:'ana.pages.test'}}))).status).toBe(404)})
it('F10-T06 host sem cobertura redireciona para básico sem destino arbitrário',async()=>{vi.stubEnv('PROFILE_HOST_BASES','{"pages.test":"tenant.test"}');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({mode:'FALLBACK',slug:'ana',tenantHost:'tenant.test'})));const response=await middleware(new NextRequest('https://ana.pages.test/',{headers:{host:'ana.pages.test'}}));expect(response.status).toBe(307);expect(response.headers.get('location')).toBe('https://tenant.test/p/ana')})
it('F10-I02 host desconhecido fecha em 404; falha externa não cai no catálogo',async()=>{vi.stubEnv('PROFILE_HOST_BASES','{"pages.test":"tenant.test"}');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:404})));expect((await middleware(new NextRequest('https://unknown.pages.test/',{headers:{host:'unknown.pages.test'}}))).status).toBe(404);vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));expect((await middleware(new NextRequest('https://unknown.pages.test/',{headers:{host:'unknown.pages.test'}}))).status).toBe(503)})
