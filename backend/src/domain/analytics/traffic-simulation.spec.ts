import { describe, expect, it } from 'vitest'
import { analyticsDay } from './day'
import { planTraffic, planGrowthTraffic, simulationConfig, trafficConfigForLink, trafficRecoveryFactor } from './traffic-simulation'
import { assertDevelopment } from '@/use-cases/@Analytics/simulate-traffic'

const config = simulationConfig.parse({ until: '2026-10-15T12:00:00.000Z' })
const link = { id: 'link', tenantId: 'tenant', createdAt: new Date('2026-08-01T18:23:00Z') }

describe('simulação de tráfego', () => {
  it('desacelera por poucos dias e recupera sem reiniciar o ciclo a cada consulta', () => {
    const crossedAt = new Date('2026-10-01T12:00Z')
    const factor = (days: number) => trafficRecoveryFactor(link, config.seed, crossedAt, new Date(crossedAt.getTime() + days * 86400000))
    expect(factor(-1)).toBe(1)
    expect(factor(1)).toBeGreaterThanOrEqual(0.08)
    expect(factor(1)).toBeLessThanOrEqual(0.18)
    expect(factor(3)).toBeLessThanOrEqual(factor(5))
    expect(factor(5)).toBeLessThanOrEqual(factor(8))
    expect(factor(8)).toBe(1)
    expect(factor(20)).toBe(1)
    expect(factor(1)).toBe(factor(1))
    const variations = Array.from({ length: 20 }, (_, index) => trafficRecoveryFactor({ ...link, id: `recovery-${index}` }, config.seed, crossedAt, new Date('2026-10-02T12:00Z')))
    expect(new Set(variations).size).toBe(20)
    const soft = simulationConfig.parse({ ...config, maxViews: 4000, sponsoredCeilingMinViews: 3501, growth: { since: '2026-10-14T00:00:00.000Z', softLimit: true } })
    expect(trafficConfigForLink(soft, true, link).maxViews).toBe(trafficConfigForLink({ ...soft, until: '2026-10-20T12:00:00.000Z' }, true, link).maxViews)
  })
  it('usa tetos individuais reproduzíveis para destaques sem acumular no limite global', () => {
    const settings = simulationConfig.parse({ ...config, minViews: 0, maxViews: 4000, commonMaxViews: 3500, sponsoredCeilingMinViews: 3501 })
    const ceilings = Array.from({ length: 30 }, (_, index) => trafficConfigForLink(settings, true, { ...link, id: `capacity-${index}` }).maxViews)
    expect(new Set(ceilings).size).toBeGreaterThan(25)
    expect(ceilings.every(n => n >= 3501 && n < 4000)).toBe(true)
    expect(trafficConfigForLink(settings, true, link)).toEqual(trafficConfigForLink(settings, true, link))
    expect(trafficConfigForLink(settings, true, { ...link, createdAt: new Date('2026-10-15T11:00Z') }).maxViews).toBeLessThan(trafficConfigForLink(settings, true, link).maxViews)
    expect(trafficConfigForLink(settings, false, link).maxViews).toBe(3500)
    expect(() => simulationConfig.parse({ ...settings, sponsoredCeilingMinViews: 4000 })).toThrow()
  })
  it('respeita a faixa diária e distribui volume proporcional a poucas horas de vida', () => {
    const bounded = simulationConfig.parse({ until: '2026-10-15T03:00:00.000Z', minViews: 0, sigma: 0.35, growth: { since: '2026-10-14T03:00:00.000Z', dailyMin: 180, dailyMedian: 240, dailyMax: 300 } })
    for (let index = 0; index < 30; index++) {
      for (const sponsored of [false, true]) {
        const all = planGrowthTraffic({ ...link, id: `daily-${index}` }, bounded, 'test:', sponsored)
        expect(all.length).toBeGreaterThanOrEqual(180)
        expect(all.length).toBeLessThanOrEqual(300)
      }
    }
    const recent = { ...link, createdAt: new Date('2026-10-14T03:00:00.000Z') }
    const partial = planGrowthTraffic(recent, { ...bounded, until: '2026-10-14T06:00:00.000Z' }, 'test:', false)
    expect(partial.length).toBeGreaterThan(1)
    expect(partial.length).toBeLessThan(60)
    expect(partial.every(v => v.at >= recent.createdAt && v.at < new Date('2026-10-14T06:00:00Z'))).toBe(true)
    const first = planGrowthTraffic(link, { ...bounded, until: '2026-10-14T15:00:00.000Z' }, 'test:', false)
    const second = planGrowthTraffic(link, { ...bounded, growth: { ...bounded.growth!, since: '2026-10-14T15:00:00.000Z' } }, 'test:', false)
    expect([...first, ...second]).toEqual(planGrowthTraffic(link, bounded, 'test:', false))
    expect(() => simulationConfig.parse({ ...bounded, growth: { ...bounded.growth, dailyMin: 301 } })).toThrow()
  })
  it('crescimento diário não redistribui o passado ao avançar o corte', () => {
    const full = simulationConfig.parse({ until: '2026-10-15T00:00:00.000Z', minViews: 0, growth: { since: '2026-10-14T00:00:00.000Z' } })
    const middle = '2026-10-14T12:00:00.000Z'
    const all = planGrowthTraffic(link, full, 'growth:', false)
    const first = planGrowthTraffic(link, { ...full, until: middle }, 'growth:', false)
    const second = planGrowthTraffic(link, { ...full, growth: { ...full.growth!, since: middle } }, 'growth:', false)
    expect([...first, ...second]).toEqual(all)
    expect(new Set(all.map(v => v.sessionId)).size).toBe(all.length)
    expect(all.every(v => v.at >= new Date(full.growth!.since) && v.at < new Date(full.until))).toBe(true)
    expect(all.length).toBeLessThanOrEqual(full.growth!.dailyMax)
    expect(() => simulationConfig.parse({ ...full, mode: 'top-up' })).toThrow()
    expect(() => simulationConfig.parse({ ...full, growth: { ...full.growth, since: full.until } })).toThrow()
  })

  it('links recentes recebem bem menos tráfego e destaque dá vantagem estatística sem piso alto', () => {
    const daily = simulationConfig.parse({ until: '2026-10-15T00:00:00.000Z', minViews: 0, spikeProbability: 0, growth: { since: '2026-10-14T00:00:00.000Z' } })
    let young = 0, mature = 0, promoted = 0
    for (let index = 0; index < 40; index++) {
      const old = { ...link, id: `cohort-${index}` }
      const recent = { ...old, createdAt: new Date(daily.growth!.since) }
      young += planGrowthTraffic(recent, daily, 'test:', false).length
      mature += planGrowthTraffic(old, daily, 'test:', false).length
      promoted += planGrowthTraffic(old, daily, 'test:', true).length
    }
    expect(mature).toBeGreaterThan(young * 4)
    expect(promoted).toBeGreaterThan(mature * 1.2)
    const future = { ...link, createdAt: new Date(daily.until) }
    expect(planGrowthTraffic(future, daily, 'test:', false)).toEqual([])
  })

  it('reproduz eventos e preserva limites temporais e deduplicação', () => {
    const visits = planTraffic(link, config, 'test:')
    expect(planTraffic(link, config, 'test:')).toEqual(visits)
    expect(visits.length).toBeGreaterThanOrEqual(config.minViews)
    expect(visits.length).toBeLessThanOrEqual(config.maxViews)
    expect(new Set(visits.map(v => v.sessionId)).size).toBe(visits.length)
    expect(visits.every(v => v.at >= link.createdAt && v.at < new Date(config.until) && v.day === analyticsDay(v.at))).toBe(true)
    expect(visits.filter(v => v.click).length).toBeLessThanOrEqual(visits.length)
    const changed = planTraffic(link, { ...config, seed: 'other' }, 'test:')
    expect(changed).not.toEqual(visits)
  })

  it('gera diversidade e cauda assimétrica em uma população', () => {
    const volumes = Array.from({ length: 200 }, (_, i) => planTraffic({ ...link, id: `l${i}` }, config, 'test:').length)
    expect(new Set(volumes).size).toBeGreaterThan(150)
    expect(volumes.some(n => n >= 1500)).toBe(true)
    expect(volumes.some(n => n >= 700 && n <= 1200)).toBe(true)
    expect(volumes.some(n => n < 300)).toBe(true)
    const sorted = [...volumes].sort((a, b) => a - b)
    expect(volumes.reduce((a, b) => a + b) / volumes.length).toBeGreaterThan(sorted[100])
  })

  it('respeita links novos, futuros e limites inválidos', () => {
    expect(planTraffic({ ...link, createdAt: new Date(config.until) }, config, 'test:')).toEqual([])
    const newLink = { ...link, createdAt: new Date('2026-10-15T11:59:59Z') }
    expect(planTraffic(newLink, config, 'test:').every(v => v.at >= newLink.createdAt)).toBe(true)
    expect(() => simulationConfig.parse({ ...config, minViews: 2501 })).toThrow()
    expect(() => simulationConfig.parse({ ...config, minCtr: 0.9 })).toThrow()
  })

  it('recusa produção e banco remoto', () => {
    expect(() => assertDevelopment('production', 'postgresql://localhost/dev')).toThrow()
    expect(() => assertDevelopment('development', 'postgresql://remote.example/dev')).toThrow()
    expect(() => assertDevelopment('development', 'postgresql://localhost/dev')).not.toThrow()
    expect(() => assertDevelopment('development', 'postgresql://remote.example/dev', true)).not.toThrow()
    expect(() => assertDevelopment('production', 'postgresql://remote.example/dev', true)).toThrow()
    expect(() => assertDevelopment('development', 'postgresql://remote.example/dev', false, true)).not.toThrow()
    expect(() => assertDevelopment('production', 'postgresql://remote.example/dev', false, true)).toThrow()
  })
})
