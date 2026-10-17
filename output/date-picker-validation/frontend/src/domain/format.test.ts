import { describe, expect, it } from 'vitest'
import { formatCents } from './money'
import { formatRate, formatWhen } from './format'
import { linkStatusLabel, orderStatusLabel } from './labels'

describe('apresentação', () => {
  it('traduz dinheiro, taxa, data e status', () => {
    expect(formatCents(3290)).toBe('R$ 32,90')
    expect(formatRate(34.2)).toBe('34,2%')
    expect(formatWhen('2026-09-30T17:32:00.000Z')).toMatch(/30\/09\/2026/)
    expect(linkStatusLabel('PUBLISHED')).toBe('Publicado')
    expect(orderStatusLabel('PAID')).toBe('Pago')
    expect(linkStatusLabel('DESCONHECIDO')).toBe('Status desconhecido')
  })
})
