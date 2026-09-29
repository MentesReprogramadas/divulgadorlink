import { describe, expect, it } from 'vitest'
import { decideSubmission, assertCanSubmitLink } from '@/use-cases/@Links/submit-link'
import { hitsBlocklist } from '@/domain/links/blocklist'

describe('envio', () => {
  it('manda Outro para o admin sem IA e ocupa vaga', () => {
    expect(decideSubmission({
      openSlots: 4, networkSlug: 'outro', nicheSlug: 'jogos', blocklisted: false, preRefused: false,
    })).toEqual({ status: 'PENDING_MODERATION', runAi: false, occupiesSlot: true })
  })

  it('recusa o quinto', () => {
    expect(() => decideSubmission({
      openSlots: 0, networkSlug: 'telegram', nicheSlug: 'jogos', blocklisted: false, preRefused: false,
    })).toThrow(/cota/)
  })

  it('trata menção a outro nicho, URL e telefone como lista fechada', () => {
    expect(hitsBlocklist({
      text: 'entra no nicho de Apostas https://x.test 11999999999',
      selectedNiche: 'Jogos',
      nicheNames: ['Jogos', 'Apostas'],
      terms: [],
    })).toBe(true)
  })

  it('lista de termos vazia não marca texto limpo e não publica', () => {
    expect(hitsBlocklist({
      text: 'grupo de jogos',
      selectedNiche: 'Jogos',
      nicheNames: ['Jogos', 'Apostas'],
      terms: [],
    })).toBe(false)
    expect(decideSubmission({
      openSlots: 4,
      networkSlug: 'telegram',
      nicheSlug: 'jogos',
      blocklisted: true,
      preRefused: false,
    }).status).toBe('PENDING_MODERATION')
  })

  it('não ocupa vaga quando a conta não pode enviar', () => {
    expect(() =>
      assertCanSubmitLink({
        emailConfirmed: false,
        phoneConfirmed: true,
        status: 'ACTIVE',
      }),
    ).toThrow()
    expect(decideSubmission({
      openSlots: 4,
      networkSlug: 'telegram',
      nicheSlug: 'jogos',
      blocklisted: false,
      preRefused: false,
    }).occupiesSlot).toBe(true)
  })
})
