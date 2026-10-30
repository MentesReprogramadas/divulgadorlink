// @vitest-environment node
import { expect, it } from 'vitest'
import { GET } from './route'

it('redirects on the public origin without deriving a hostname from the internal Next server', async () => {
  const response = GET()
  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('/ofertas/entrar/natal')
  expect(new URL(response.headers.get('location')!, 'https://temlinkaqui.com').href).toBe('https://temlinkaqui.com/ofertas/entrar/natal')
  expect(await response.text()).toBe('')
})
