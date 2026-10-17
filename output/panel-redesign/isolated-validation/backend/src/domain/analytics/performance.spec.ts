import { describe, expect, it } from 'vitest'
import { performanceRange, performanceTotals, allocateSurfaceCents, proratedCents } from './performance'

describe('F01 resultado do destaque', () => {
  it('F01-U01/U02 usa totais agregados para CTR', () => {
    expect(performanceTotals([{ impressions: 100, clicks: 10 }, { impressions: 10, clicks: 1 }], 1000)).toEqual({ impressions: 110, clicks: 11, ctr: 10, investmentCents: 1000, cpcCents: 91 })
  })
  it('F01-U03/T03 não inventa CPC sem cliques ou investimento conhecido', () => {
    expect(performanceTotals([{ impressions: 100, clicks: 0 }], 1000).cpcCents).toBeNull()
    expect(performanceTotals([{ impressions: 100, clicks: 10 }], null).cpcCents).toBeNull()
  })
  it('F01-U04/T04 usa datas inclusivas e comparação equivalente em São Paulo', () => {
    const range = performanceRange({ from: '2026-10-01', to: '2026-10-07' }, new Date('2026-10-15T01:00:00Z'))
    expect(range).toMatchObject({ from: '2026-10-01', to: '2026-10-07', comparisonFrom: '2026-09-24', comparisonTo: '2026-09-30', days: 7 })
    expect(range.start.toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-10-08T03:00:00.000Z')
  })
  it('rejeita datas inexistentes, inversão, futuro e período excessivo', () => {
    const now = new Date('2026-10-15T12:00:00Z')
    for (const query of [{ from: '2026-02-30' }, { from: '2026-10-10', to: '2026-10-01' }, { to: '2026-10-16' }, { from: '2024-01-01' }]) {
      expect(() => performanceRange(query, now)).toThrow()
    }
  })
  it('F01-T05 distribui centavos uma vez sem depender da ordem das superfícies', () => {
    expect(allocateSurfaceCents(1000, ['SEARCH', 'HOME', 'NICHE'])).toEqual({ HOME: 334, NICHE: 333, SEARCH: 333 })
    expect(() => allocateSurfaceCents(-1, ['HOME'])).toThrow()
    expect(() => allocateSurfaceCents(1, ['HOME', 'HOME'])).toThrow()
  })
  it('F01-T05 calcula investimento do recorte sem duplicar valor ou perder precisão', () => {
    const start = new Date('2026-10-01T03:00:00Z'), end = new Date('2026-10-11T03:00:00Z')
    expect(proratedCents(1000, start, end, start, new Date('2026-10-06T03:00:00Z'))).toBe(500)
    expect(proratedCents(1000, start, end, new Date('2026-10-12T00:00:00Z'), new Date('2026-10-13T00:00:00Z'))).toBe(0)
  })
})
