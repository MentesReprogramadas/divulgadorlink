import { describe, expect, it } from 'vitest'
import { analyticsDay } from './day'
import { planTraffic, simulationConfig } from './traffic-simulation'
import { assertDevelopment } from '@/use-cases/@Analytics/simulate-traffic'

const config = simulationConfig.parse({ until: '2026-10-15T12:00:00.000Z' })
const link = { id: 'link', tenantId: 'tenant', createdAt: new Date('2026-08-01T18:23:00Z') }

describe('simulação de tráfego', () => {
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
