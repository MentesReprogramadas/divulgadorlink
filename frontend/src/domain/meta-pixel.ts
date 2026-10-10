type Fbq = (...args: unknown[]) => void

const STANDARD = new Set(['PageView', 'CompleteRegistration'])

export function trackMeta(name: string, eventId?: string): boolean {
  if (typeof window === 'undefined') return false
  const fbq = (window as Window & { fbq?: Fbq }).fbq
  if (!fbq) return false
  const method = STANDARD.has(name) ? 'track' : 'trackCustom'
  if (eventId) fbq(method, name, {}, { eventID: eventId })
  else fbq(method, name)
  return true
}
