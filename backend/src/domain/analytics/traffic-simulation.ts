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
  sponsoredCeilingMinViews: z.number().int().positive().optional(),
  growth: z.object({
    since: z.string().datetime(),
    dailyMedian: z.number().positive().max(1000).default(40),
    dailyMax: z.number().int().positive().max(2000).default(160),
    dailyMin: z.number().int().min(0).max(2000).optional(),
    warmupDays: z.number().positive().default(14),
    sponsoredMultiplier: z.number().min(1).max(5).default(1.6),
  }).strict().optional(),
}).strict().refine(c => c.minViews <= c.maxViews && c.minCtr <= c.maxCtr, 'Limites invertidos')
  .refine(c => c.commonMaxViews === undefined || (c.commonMaxViews >= c.minViews && c.commonMaxViews < (c.sponsoredMinViews ?? c.maxViews)), 'Faixas comuns/patrocinados inválidas')
  .refine(c => c.sponsoredMinViews === undefined || (c.sponsoredMinViews >= c.minViews && c.sponsoredMinViews <= c.maxViews), 'Piso patrocinado inválido')
  .refine(c => c.sponsoredCeilingMinViews === undefined || (c.sponsoredCeilingMinViews >= Math.max(c.minViews, c.sponsoredMinViews ?? 0) && c.sponsoredCeilingMinViews < c.maxViews), 'Faixa de teto patrocinado inválida')
  .refine(c => !c.growth || (Date.parse(c.growth.since) < Date.parse(c.until) && !c.mode && c.sponsoredMinViews === undefined), 'Crescimento exige since < until, sem top-up ou piso patrocinado')
  .refine(c => c.growth?.dailyMin === undefined || c.growth.dailyMin <= c.growth.dailyMax, 'Piso diário maior que o teto')

export function trafficConfigForLink(config: SimulationConfig, sponsored: boolean, link?: SimulationLink): SimulationConfig {
  if (sponsored && config.sponsoredCeilingMinViews !== undefined) {
    if (!link) throw new Error('Link necessário para calcular teto individual')
    const rng = random(`${config.seed}:${link.tenantId}:${link.id}:capacity`)
    const age = Math.max(0, (Date.parse(config.until) - link.createdAt.getTime()) / 86400000)
    const maturity = 1 - Math.exp(-age / 7)
    const maxViews = Math.floor(config.sponsoredCeilingMinViews + (config.maxViews - config.sponsoredCeilingMinViews) * (0.25 + 0.75 * maturity ** 2) * (0.35 + 0.65 * rng()))
    config = { ...config, maxViews }
  }
  if (sponsored && config.sponsoredMinViews !== undefined) return { ...config, minViews: config.sponsoredMinViews, medianViews: (config.sponsoredMinViews + config.maxViews) / 2 }
  if (sponsored) return config
  return config.commonMaxViews === undefined ? config : { ...config, maxViews: config.commonMaxViews }
}

// Day plans use complete local days so advancing a cutoff never reallocates past events.
export function planGrowthTraffic(link: SimulationLink, config: SimulationConfig, prefix: string, sponsored: boolean): SimulatedVisit[] {
  const growth = config.growth
  if (!growth) throw new Error('Configuração de crescimento ausente')
  const since = Math.max(Date.parse(growth.since), link.createdAt.getTime())
  const until = Date.parse(config.until)
  if (since >= until) return []
  if ((until - since) / 86400000 > 366) throw new Error('Crescimento limitado a 366 dias por lote')
  const popularityRandom = random(`${config.seed}:${link.tenantId}:${link.id}:growth-popularity`)
  const normal = Math.sqrt(-2 * Math.log(1 - popularityRandom())) * Math.cos(2 * Math.PI * popularityRandom())
  const popularity = Math.max(0.3, Math.min(2.5, Math.exp(0.55 * normal)))
  const visits: SimulatedVisit[] = []
  for (let day = analyticsDay(new Date(since)); analyticsDayStart(day).getTime() < until; day = shiftAnalyticsDay(day, 1)) {
    const start = analyticsDayStart(day).getTime()
    const end = analyticsDayStart(shiftAnalyticsDay(day, 1)).getTime()
    const first = Math.max(start, link.createdAt.getTime())
    const age = Math.max(0, (start - link.createdAt.getTime()) / 86400000)
    const maturity = 0.12 + 0.88 * (1 - Math.exp(-age / growth.warmupDays))
    const weekday = new Date(day + 'T12:00Z').getUTCDay()
    const weekend = weekday === 0 || weekday === 6 ? config.weekendFactor : 1
    const rng = random(`${config.seed}:${link.tenantId}:${link.id}:${day}:growth`)
    const spike = rng() < config.spikeProbability ? config.spikeMultiplier : 1
    const boost = sponsored ? growth.sponsoredMultiplier : 1
    const fraction = (end - first) / 86400000
    const isCreationDay = first === link.createdAt.getTime()
    const bounded = growth.dailyMin !== undefined
    const dayFraction = (end - first) / (end - start)
    const rate = bounded ? Math.max(growth.dailyMin!, Math.min(growth.dailyMax, growth.dailyMedian * popularity * (0.85 + 0.15 * maturity) * weekend * spike * boost)) : 0
    const dailyConfig = {
      ...config, seed: `${config.seed}:growth-${bounded ? 'v2' : 'v1'}:${day}`, until: new Date(end).toISOString(),
      minViews: Math.max(isCreationDay ? 1 : 0, bounded ? Math.floor(growth.dailyMin! * dayFraction) : 0),
      maxViews: bounded ? Math.max(1, Math.ceil(growth.dailyMax * dayFraction)) : Math.max(1, Math.min(growth.dailyMax, Math.ceil(growth.dailyMax * maturity * boost * fraction))),
      medianViews: bounded ? Math.max(0.1, rate * dayFraction) : growth.dailyMedian * popularity * maturity * weekend * spike * boost * fraction,
      maturityDays: 0.000001,
    }
    const daily = planTraffic({ ...link, createdAt: new Date(first) }, dailyConfig, `${prefix}${day}:`)
    if (isCreationDay && daily.length) {
      // One initial visit after 5–45 minutes; no floor of hundreds for new links.
      daily[0].at = new Date(first + Math.min(end - first - 1, Math.floor((5 + 40 * rng()) * 60000)))
      daily.sort((a, b) => a.at.getTime() - b.at.getTime() || a.sessionId.localeCompare(b.sessionId))
    }
    visits.push(...daily.filter(visit => visit.at.getTime() >= since && visit.at.getTime() < until))
  }
  return visits
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
