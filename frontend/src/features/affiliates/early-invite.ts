export type EarlyAffiliateInvite = {
  slug: string
  visitStarted: boolean
  state: 'pending' | 'redirected' | 'error'
  error?: string
  promise: Promise<void>
}

declare global {
  interface Window {
    __temlinkCsrfBootstrap?: Promise<string>
    __temlinkEarlyAffiliateInvite?: EarlyAffiliateInvite
  }
}

// Serialized into the nonced head script: keep every runtime dependency inside this function.
function startEarlyAffiliateInvite(slug: string) {
  const pathname = '/ofertas/entrar/' + encodeURIComponent(slug)
  if (window.location.pathname !== pathname || document.body?.dataset.support === 'true' || window.__temlinkEarlyAffiliateInvite?.slug === slug) return
  const operation: EarlyAffiliateInvite = { slug, visitStarted: false, state: 'pending', promise: Promise.resolve() }
  window.__temlinkEarlyAffiliateInvite = operation
  function cookieCsrf() {
    const value = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('csrf='))?.slice(5) ?? ''
    try { return decodeURIComponent(value) } catch { return '' }
  }
  function csrf(): Promise<string> {
    if (window.__temlinkCsrfBootstrap) return window.__temlinkCsrfBootstrap
    const existing = cookieCsrf()
    if (existing.length >= 32) return Promise.resolve(existing)
    const bootstrap = (async () => {
      const response = await fetch('/bff/v1/auth/csrf', { method: 'GET', credentials: 'include', cache: 'no-store' })
      if (!response.ok) throw new Error('Não foi possível preparar a sessão. Tente novamente.')
      const body = await response.json() as { csrfToken?: unknown }
      if (typeof body.csrfToken !== 'string' || body.csrfToken.length < 32) throw new Error('Não foi possível preparar a sessão. Tente novamente.')
      return body.csrfToken
    })().finally(() => { if (window.__temlinkCsrfBootstrap === bootstrap) delete window.__temlinkCsrfBootstrap })
    window.__temlinkCsrfBootstrap = bootstrap
    return bootstrap
  }
  async function post(path: string, body: unknown, keepalive = false): Promise<Response> {
    return fetch('/bff' + path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', 'x-csrf-token': await csrf(), 'x-workspace-owner': 'self' }, body: JSON.stringify(body), keepalive })
  }
  async function request(path: string, body: unknown, keepalive = false): Promise<Response> {
    let response = await post(path, body, keepalive)
    if (response.status === 401 && (await post('/v1/auth/refresh', {})).ok) response = await post(path, body, keepalive)
    return response
  }
  operation.promise = (async () => {
    try {
      // Start both consumers before awaiting either; visit failure must not delay the handoff.
      const base = '/v1/public/affiliates/' + encodeURIComponent(slug)
      if (typeof crypto.randomUUID === 'function') {
        operation.visitStarted = true
        void request(base + '/visit', { eventId: crypto.randomUUID() }, true).catch(() => undefined)
      }
      const response = await request(base + '/join', typeof crypto.randomUUID === 'function' ? { eventId: crypto.randomUUID(), source: 'AUTOMATIC' } : {})
      const body = await response.json() as { url?: unknown; message?: unknown }
      if (response.status !== 200) throw new Error(typeof body.message === 'string' ? body.message : 'Não foi possível encontrar um grupo agora. Tente novamente.')
      if (typeof body.url !== 'string' || !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{16,64}$/.test(body.url)) throw new Error('O convite retornado não é válido. Tente novamente.')
      const destination = new URL(body.url)
      if (destination.protocol !== 'https:' || destination.hostname !== 'chat.whatsapp.com' || destination.username || destination.password || destination.port) throw new Error('O convite retornado não é válido. Tente novamente.')
      if (window.location.pathname !== pathname) {
        if (window.__temlinkEarlyAffiliateInvite === operation) delete window.__temlinkEarlyAffiliateInvite
        return
      }
      window.location.replace(destination.href)
      operation.state = 'redirected'
    } catch (reason) {
      if (window.location.pathname !== pathname) {
        if (window.__temlinkEarlyAffiliateInvite === operation) delete window.__temlinkEarlyAffiliateInvite
        return
      }
      operation.state = 'error'
      operation.error = reason instanceof Error ? reason.message : 'Falha de conexão. Tente novamente.'
    }
  })()
}

export function buildEarlyAffiliateInviteScript(slug: string): string {
  if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return ''
  return `;(${startEarlyAffiliateInvite.toString()})(${JSON.stringify(slug)});`
}
