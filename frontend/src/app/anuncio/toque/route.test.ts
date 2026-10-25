import { beforeEach, expect, it, vi } from 'vitest'
import { POST } from './route'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined, has: (key: string) => jar.has(key) }) }))

beforeEach(() => jar.clear())
const referer = 'https://site.test/cadastro?tla_landing=%2Fdivulgar&utm_source=ig&utm_medium=paid&utm_campaign=outubro&utm_term=Publico+aberto'
function post(from = referer) {
  return POST(new Request('https://site.test/anuncio/toque', { method: 'POST', headers: { referer: from } }))
}

it('captura no cadastro apenas depois do aceite e limpa opcionais inválidos', async () => {
  expect((await post()).cookies.get('tla_touch')).toBeUndefined()
  jar.set('tla_consent', 'marketing')
  const response = await post()
  expect(await response.json()).toEqual({ stored: true })
  expect(JSON.parse(response.cookies.get('tla_touch')!.value)).toMatchObject({ source: 'ig', campaign: 'outubro', term: '', landingPath: '/divulgar' })
  expect(response.cookies.get('tla_touch')).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', maxAge: 2592000 })
})

it('preserva primeiro toque e remove o cookie na recusa', async () => {
  jar.set('tla_consent', 'marketing')
  jar.set('tla_touch', 'anterior')
  expect((await post()).cookies.get('tla_touch')).toBeUndefined()
  jar.set('tla_consent', 'denied')
  expect((await post()).cookies.get('tla_touch')?.maxAge).toBe(0)
})

it('não atribui referer externo nem cadastro sem contexto da landing', async () => {
  jar.set('tla_consent', 'marketing')
  expect((await post(referer.replace('site.test', 'other.test'))).cookies.get('tla_touch')).toBeUndefined()
  expect((await post(referer.replace('tla_landing=%2Fdivulgar&', ''))).cookies.get('tla_touch')).toBeUndefined()
})
