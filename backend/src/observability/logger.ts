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
