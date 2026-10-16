import { describe, expect, it } from 'vitest'
import { investmentServiceWindows, investmentConsumedCents, remainingPaidMilliseconds } from './paid-time'

const at = (day: number) => new Date(Date.UTC(2026, 9, day))
const investment = { amountCents: 1001, startsAt: at(1), endsAt: at(11), pauseRevision: 0 }
describe('F07 D08 tempo pago preservado', () => {
  it('F07-T05 pausa corta o consumo no instante da retirada, sem consumir o saldo', () => {
    const pauses = [{ revision: 1, startsAt: at(4), endsAt: null }]
    expect(remainingPaidMilliseconds(at(11), at(4))).toBe(7 * 86400000)
    expect(investmentServiceWindows(investment, pauses)).toEqual([{ startsAt: at(1), endsAt: at(4) }])
    expect(investmentConsumedCents(investment, pauses, at(1), at(31))).toBe(300)
    expect(investmentConsumedCents(investment, pauses, at(4), at(31))).toBe(0)
  })
  it('F07-T05 retoma sete dias após aprovar; intervalo suspenso não entra no custo', () => {
    const pauses = [{ revision: 1, startsAt: at(4), endsAt: at(14) }]
    expect(investmentServiceWindows(investment, pauses)).toEqual([{ startsAt: at(1), endsAt: at(4) }, { startsAt: at(14), endsAt: at(21) }])
    expect(investmentConsumedCents(investment, pauses, at(1), at(31))).toBe(1001)
    expect(investmentConsumedCents(investment, pauses, at(4), at(14))).toBe(0)
  })
  it('F07-T05 pausas repetidas e renovação comprada após retomada não duplicam extensão', () => {
    const pauses = [{ revision: 1, startsAt: at(4), endsAt: at(14) }, { revision: 2, startsAt: at(16), endsAt: at(18) }]
    expect(investmentServiceWindows(investment, pauses).at(-1)?.endsAt).toEqual(at(23))
    const renewal = { amountCents: 700, startsAt: at(21), endsAt: at(28), pauseRevision: 1 }
    expect(investmentServiceWindows(renewal, pauses)).toEqual([{ startsAt: at(23), endsAt: at(30) }])
    expect(investmentConsumedCents(renewal, pauses, at(1), at(31))).toBe(700)
  })
  it('F07-T05 não concede saldo a destaque expirado e recusa intervalo inválido', () => {
    expect(remainingPaidMilliseconds(at(3), at(4))).toBe(0)
    expect(() => investmentServiceWindows({ ...investment, endsAt: at(1) }, [])).toThrow()
  })
})
