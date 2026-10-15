import { createHmac, timingSafeEqual } from 'node:crypto'

const ORIGINS = ['search', 'niche-home', 'network-home', 'home', 'organic'] as const

export type AnalyticsOrigin = (typeof ORIGINS)[number]

function surfaceKey(serverSecret: string): Buffer {
  return createHmac('sha256', serverSecret).update('catalogo.surface.v1').digest()
}

function payload(tenantId: string, linkId: string, origin: string): string {
  return `${tenantId}.${linkId}.${origin}`
}

export function signSurface(
  tenantId: string,
  linkId: string,
  origin: AnalyticsOrigin,
  serverSecret: string,
): string {
  const mac = createHmac('sha256', surfaceKey(serverSecret))
    .update(payload(tenantId, linkId, origin))
    .digest('base64url')
  return `${origin}.${mac}`
}

export function readSurface(
  tenantId: string,
  linkId: string,
  token: string | undefined,
  serverSecret: string,
): AnalyticsOrigin | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const origin = token.slice(0, dot)
  const mac = token.slice(dot + 1)
  if (!ORIGINS.includes(origin as AnalyticsOrigin)) return null
  const expected = createHmac('sha256', surfaceKey(serverSecret))
    .update(payload(tenantId, linkId, origin))
    .digest('base64url')
  const left = Buffer.from(mac)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return null
  if (!timingSafeEqual(left, right)) return null
  return origin as AnalyticsOrigin
}
