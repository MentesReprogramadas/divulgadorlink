import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { buildEarlyAffiliateInviteScript } from './early-invite'

const invite = 'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'
const token = 'a'.repeat(64)
const location = { pathname: '/ofertas/entrar/natal', replace: vi.fn() }
const earlyWindow = new Proxy(window, { get(target, key) { return key === 'location' ? location : Reflect.get(target, key) } })
let event = 0

function execute(slug = 'natal') {
  runInNewContext(buildEarlyAffiliateInviteScript(slug), { window: earlyWindow, document, fetch, crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++event).padStart(12, '0')}` }, URL, Promise, Error })
}
function response(status = 200, body: unknown = {}): Response { return Response.json(body, { status }) }

beforeEach(() => {
  document.cookie = 'csrf=; Path=/; Max-Age=0'
  location.pathname = '/ofertas/entrar/natal'
  location.replace.mockClear()
  event = 0
})
afterEach(() => {
  delete window.__temlinkEarlyAffiliateInvite
  delete window.__temlinkCsrfBootstrap
  delete document.body.dataset.support
  document.cookie = 'csrf=; Path=/; Max-Age=0'
  vi.unstubAllGlobals()
})

it('inicia antes da hidratação, compartilha CSRF com api concorrente e não espera visita', async () => {
  let release!: (value: Response) => void
  const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(async path => {
    if (path.endsWith('/csrf')) return new Promise(resolve => { release = resolve })
    if (path.endsWith('/visit')) return new Promise(() => {})
    return response(200, path.endsWith('/join') ? { url: invite } : {})
  })
  vi.stubGlobal('fetch', fetchMock)
  execute()
  const concurrent = api('/v1/analytics/site-visits', { method: 'POST', body: '{}' })
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/bff/v1/auth/csrf'])
  document.cookie = 'csrf=' + token + '; Path=/'
  release(response(200, { csrfToken: token }))
  await Promise.all([window.__temlinkEarlyAffiliateInvite!.promise, concurrent])
  expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/csrf'))).toHaveLength(1)
  expect(location.replace).toHaveBeenCalledExactlyOnceWith(invite)
  expect(window.__temlinkEarlyAffiliateInvite).toMatchObject({ slug: 'natal', visitStarted: true, state: 'redirected' })
  const visit = fetchMock.mock.calls.find(([path]) => path.endsWith('/visit'))!
  const join = fetchMock.mock.calls.find(([path]) => path.endsWith('/join'))!
  expect(visit[1]).toMatchObject({ keepalive: true, credentials: 'include', headers: { 'x-csrf-token': token, 'x-workspace-owner': 'self' } })
  expect(join[1]).toMatchObject({ method: 'POST', credentials: 'include', headers: { 'x-csrf-token': token, 'x-workspace-owner': 'self' } })
  expect(JSON.parse(join[1]!.body as string)).toMatchObject({ source: 'AUTOMATIC' })
  expect(JSON.parse(join[1]!.body as string).eventId).not.toBe(JSON.parse(visit[1]!.body as string).eventId)
  expect(window.__temlinkCsrfBootstrap).toBeUndefined()
})

it('adota também bootstrap iniciado pela api, sem segundo nonce', async () => {
  let release!: (value: Response) => void
  const fetchMock = vi.fn(async (path: string): Promise<Response> => path.endsWith('/csrf') ? new Promise(resolve => { release = resolve }) : response(200, { url: invite }))
  vi.stubGlobal('fetch', fetchMock)
  const concurrent = api('/v1/analytics/site-visits', { method: 'POST', body: '{}' })
  execute()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  document.cookie = 'csrf=' + token + '; Path=/'
  release(response(200, { csrfToken: token }))
  await Promise.all([concurrent, window.__temlinkEarlyAffiliateInvite!.promise])
  expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/csrf'))).toHaveLength(1)
  expect(location.replace).toHaveBeenCalledOnce()
})

it('reutiliza cookie existente, ignora visita indisponível e não repete operação do head', async () => {
  document.cookie = 'csrf=' + token + '; Path=/'
  const fetchMock = vi.fn(async (path: string): Promise<Response> => {
    if (path.endsWith('/visit')) throw new Error('medição indisponível')
    return response(200, { url: invite })
  })
  vi.stubGlobal('fetch', fetchMock)
  execute(); execute()
  await window.__temlinkEarlyAffiliateInvite!.promise
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/bff/v1/public/affiliates/natal/visit', '/bff/v1/public/affiliates/natal/join'])
  expect(location.replace).toHaveBeenCalledExactlyOnceWith(invite)
})

it.each(['https://evil.test/AbCdEf0123456789AbCdEf', 'https://chat.whatsapp.com@evil.test/AbCdEf0123456789AbCdEf', 'https://user@chat.whatsapp.com/AbCdEf0123456789AbCdEf', 'https://chat.whatsapp.com:443/AbCdEf0123456789AbCdEf', 'https://chat.whatsapp.com/short', invite + '?next=evil', invite + '#evil', 'whatsapp://chat?code=AbCdEf0123456789AbCdEf'])('bloqueia destino inválido %s', async url => {
  document.cookie = 'csrf=' + token + '; Path=/'
  vi.stubGlobal('fetch', vi.fn(async () => response(200, { url })))
  execute()
  await window.__temlinkEarlyAffiliateInvite!.promise
  expect(window.__temlinkEarlyAffiliateInvite).toMatchObject({ state: 'error', error: 'O convite retornado não é válido. Tente novamente.' })
  expect(location.replace).not.toHaveBeenCalled()
})

it('preserva falha do backend para retry manual e limpa bootstrap falho', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response(503)))
  execute()
  await window.__temlinkEarlyAffiliateInvite!.promise
  expect(window.__temlinkEarlyAffiliateInvite).toMatchObject({ state: 'error', error: 'Não foi possível preparar a sessão. Tente novamente.' })
  expect(window.__temlinkCsrfBootstrap).toBeUndefined()
  expect(location.replace).not.toHaveBeenCalled()
})

it('não navega após troca de rota nem inicia em suporte ou em outra rota', async () => {
  const fetchMock = vi.fn(async (): Promise<Response> => response(200, { url: invite }))
  vi.stubGlobal('fetch', fetchMock)
  document.body.dataset.support = 'true'; execute()
  expect(fetchMock).not.toHaveBeenCalled()
  delete document.body.dataset.support
  location.pathname = '/'; execute()
  expect(fetchMock).not.toHaveBeenCalled()
  location.pathname = '/ofertas/entrar/natal'
  document.cookie = 'csrf=' + token + '; Path=/'
  execute(); location.pathname = '/'
  const operation = window.__temlinkEarlyAffiliateInvite!
  await operation.promise
  expect(location.replace).not.toHaveBeenCalled()
  expect(window.__temlinkEarlyAffiliateInvite).toBeUndefined()
  location.pathname = '/ofertas/entrar/natal'
  execute()
  await window.__temlinkEarlyAffiliateInvite!.promise
  expect(location.replace).toHaveBeenCalledExactlyOnceWith(invite)
})

it('limpa falha depois de sair da rota e permite nova tentativa ao voltar', async () => {
  document.cookie = 'csrf=' + token + '; Path=/'
  let fail!: (reason: Error) => void
  let first = true
  vi.stubGlobal('fetch', vi.fn(async (path: string): Promise<Response> => {
    if (path.endsWith('/join') && first) {
      first = false
      return new Promise((_resolve, reject) => { fail = reject })
    }
    return response(200, { url: invite })
  }))
  execute()
  const operation = window.__temlinkEarlyAffiliateInvite!
  await vi.waitFor(() => expect(fail).toBeTypeOf('function'))
  location.pathname = '/'
  fail(new Error('offline'))
  await operation.promise
  expect(window.__temlinkEarlyAffiliateInvite).toBeUndefined()
  location.pathname = '/ofertas/entrar/natal'
  execute()
  await window.__temlinkEarlyAffiliateInvite!.promise
  expect(location.replace).toHaveBeenCalledExactlyOnceWith(invite)
})

it('não serializa slug inválido ou marcação executável', () => {
  expect(buildEarlyAffiliateInviteScript('</script><script>alert(1)</script>')).toBe('')
  expect(buildEarlyAffiliateInviteScript('x'.repeat(81))).toBe('')
})
