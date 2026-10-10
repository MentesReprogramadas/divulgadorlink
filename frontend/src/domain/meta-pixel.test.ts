import { afterEach, describe, expect, it } from 'vitest'
import { trackMeta } from './meta-pixel'

const host = window as Window & { fbq?: (...args: unknown[]) => void }

afterEach(() => {
  delete host.fbq
})

describe('pixel da Meta no navegador', () => {
  it('não faz nada sem o pixel instalado pelo aceite', () => {
    expect(trackMeta('SubmitLink', 'l1')).toBe(false)
  })

  it('usa track no evento padrão e trackCustom no próprio, com o eventID do backend', () => {
    const calls: unknown[][] = []
    host.fbq = (...args) => { calls.push(args) }
    trackMeta('CompleteRegistration', 'u1')
    trackMeta('SubmitLink', 'l1')
    trackMeta('PageView')
    expect(calls).toEqual([
      ['track', 'CompleteRegistration', {}, { eventID: 'u1' }],
      ['trackCustom', 'SubmitLink', {}, { eventID: 'l1' }],
      ['track', 'PageView'],
    ])
  })
})
