const SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'authorization',
  'code',
  'apiKey',
  'secret',
  'cvv',
  'pan',
  'email',
  'phone',
])

export function sanitizeLog(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !SECRET_KEYS.has(key)))
}

export function logDomainEvent(event: string, fields: Record<string, unknown>): void {
  const safe = sanitizeLog({ event, ...fields })
  console.info(JSON.stringify(safe))
}
