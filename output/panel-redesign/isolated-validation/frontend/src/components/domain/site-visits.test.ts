import { describe, expect, it } from 'vitest'
import { visitPayload } from './site-visits'

describe('visita interna', () => {
  it('leva a campanha só na entrada da sessão', () => {
    expect(visitPayload('/divulgar', '?utm_source=meta&utm_medium=paid&utm_campaign=outubro', true)).toEqual({
      path: '/divulgar', entry: true, source: 'meta', medium: 'paid', campaign: 'outubro',
    })
    expect(visitPayload('/divulgar', '?utm_source=meta', false)).toEqual({ path: '/divulgar', entry: false })
  })
})
