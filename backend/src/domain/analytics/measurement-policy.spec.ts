import { expect, it } from 'vitest'
import { measurementTrafficAllowed } from './measurement-policy'

it('exclui prévias de compartilhamento sem excluir o navegador aberto pelo WhatsApp', () => {
  for (const userAgent of ['facebookexternalhit/1.1', 'WhatsApp/2.24', 'meta-externalagent/1.1', 'meta-externalfetcher/1.1', 'HeadlessChrome']) expect(measurementTrafficAllowed({ userAgent })).toBe(false)
  expect(measurementTrafficAllowed({ userAgent: 'Mozilla/5.0 Safari/537.36 WhatsApp' })).toBe(true)
  for (const input of [{ dnt: '1' }, { gpc: '1' }, { testTraffic: '1' }]) expect(measurementTrafficAllowed(input)).toBe(false)
})
