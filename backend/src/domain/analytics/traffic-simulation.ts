import { createHash } from 'node:crypto'
import { z } from 'zod'
import { analyticsDay, analyticsDayStart, shiftAnalyticsDay } from './day'

export const simulationConfig = z.object({
  version: z.literal(1).default(1),
  seed: z.string().min(1).default('tem-link-dev-1'),
  until: z.string().datetime(),
  minViews: z.number().int().min(0).default(40),
  maxViews: z.number().int().min(1).max(100000).default(2500),
  medianViews: z.number().positive().default(650),
  sigma: z.number().min(0.05).max(3).default(0.95),
  minCtr: z.number().min(0).max(1).default(0.02),
  maxCtr: z.number().min(0).max(1).default(0.18),
  maturityDays: z.number().positive().default(30),
  weekendFactor: z.number().positive().default(1.2),
  spikeProbability: z.number().min(0).max(1).default(0.04),
  spikeMultiplier: z.number().min(1).max(20).default(4),
  mode: z.literal('top-up').optional(),
  commonMaxViews: z.number().int().positive().optional(),
  sponsoredMinViews: z.number().int().positive().optional(),
}).strict().refine(c => c.minViews <= c.maxViews && c.minCtr <= c.maxCtr, 'Limites invertidos')
  .refine(c => c.commonMaxViews === undefined || (c.commonMaxViews >= c.minViews && c.commonMaxViews < (c.sponsoredMinViews ?? c.maxViews)), 'Faixas comuns/patrocinados inválidas')
  .refine(c => c.sponsoredMinViews === undefined || (c.sponsoredMinViews >= c.minViews && c.sponsoredMinViews <= c.maxViews), 'Piso patrocinado inválido')

export function trafficConfigForLink(config: SimulationConfig, sponsored: boolean): SimulationConfig {
  if (sponsored && config.sponsoredMinViews !== undefined) return { ...config, minViews: config.sponsoredMinViews, medianViews: (config.sponsoredMinViews + config.maxViews) / 2 }
  return config.commonMaxViews === undefined ? config : { ...config, maxViews: config.commonMaxViews }
}

export type SimulationConfig = z.infer<typeof simulationConfig>
export type SimulationLink = { id: string; tenantId: string; createdAt: Date }
export type SimulatedVisit = { sessionId: string; at: Date; day: string; click: boolean }

export function simulationHash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function random(seed: string): () => number {
  let state = Number.parseInt(simulationHash(seed).slice(0, 8), 16)
  return () => {
    state += 0x6D2B79F5
    let n = Math.imul(state ^ state >>> 15, 1 | state)
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}

export function planTraffic(link: SimulationLink, config: SimulationConfig, prefix: string): SimulatedVisit[] {
  const end = Date.parse(config.until)
  const start = link.createdAt.getTime()
  if (start >= end) return []
  if ((end - start) / 86400000 > 36600) throw new Error('Histórico excede 100 anos')
  const rng = random(`${config.seed}:${link.tenantId}:${link.id}`)
  // Rejection sampling avoids artificial piles at the configured boundaries.
  let volume = 0
  for (let attempt = 0; attempt < 10000; attempt++) {
    const normal = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
    volume = Math.round(config.medianViews * Math.exp(config.sigma * normal))
    if (volume >= config.minViews && volume <= config.maxViews) break
    if (attempt === 9999) throw new Error('Distribuição incompatível com limites; ajuste mediana/sigma')
  }
  const age = (end - start) / 86400000
  const target = Math.min(config.maxViews, Math.max(config.minViews, Math.round(volume * (1 - Math.exp(-age / config.maturityDays)))))
  const ctr = config.minCtr + (config.maxCtr - config.minCtr) * rng()
  const phase = rng() * 2 * Math.PI
  const days: Array<{ day: string; start: number; end: number; cumulative: number; ctr: number }> = []
  let cumulative = 0
  for (let day = analyticsDay(link.createdAt); analyticsDayStart(day).getTime() < end; day = shiftAnalyticsDay(day, 1)) {
    const dayStart = analyticsDayStart(day).getTime()
    const weekday = new Date(day + 'T12:00:00Z').getUTCDay()
    const elapsed = Math.max(0, (dayStart - start) / 86400000)
    const lifecycle = (0.3 + 0.7 * (1 - Math.exp(-elapsed / 7))) * (0.35 + 0.65 * Math.exp(-elapsed / 180))
    const seasonal = 1 + 0.3 * Math.sin(elapsed * 2 * Math.PI / 30 + phase)
    const weekend = weekday === 0 || weekday === 6 ? config.weekendFactor : 1
    const spike = rng() < config.spikeProbability ? config.spikeMultiplier : 1
    const dailyNoise = 0.25 + 1.5 * rng()
    const nextDay = analyticsDayStart(shiftAnalyticsDay(day, 1)).getTime()
    // Hourly weights plus partial-hour duration preserve creation and cutoff boundaries.
    for (let hourStart = dayStart; hourStart < nextDay; hourStart += 3600000) {
      const from = Math.max(start, hourStart)
      const to = Math.min(end, hourStart + 3600000)
      if (to <= from) continue
      const hour = (hourStart - dayStart) / 3600000
      const hourly = hour < 6 ? 0.12 : hour < 9 ? 0.65 : hour < 18 ? 1 : hour < 23 ? 1.7 : 0.5
      cumulative += lifecycle * seasonal * weekend * spike * dailyNoise * hourly * (to - from) / 3600000
      days.push({ day, start: from, end: to, cumulative, ctr: Math.min(1, ctr * (0.7 + 0.6 * dailyNoise / 1.75)) })
    }
  }
  return Array.from({ length: target }, (_, index) => {
    const choice = rng() * cumulative
    let low = 0
    let high = days.length - 1
    while (low < high) {
      const mid = (low + high) >>> 1
      if (days[mid].cumulative < choice) low = mid + 1
      else high = mid
    }
    const slot = days[low]
    const at = new Date(slot.start + Math.floor(rng() * (slot.end - slot.start)))
    return { sessionId: `${prefix}${simulationHash(link.id).slice(0, 24)}:${index}`, at, day: slot.day, click: rng() < slot.ctr }
  }).sort((a, b) => a.at.getTime() - b.at.getTime() || a.sessionId.localeCompare(b.sessionId))
}
