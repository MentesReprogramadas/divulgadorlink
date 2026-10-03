import { writeSync } from 'node:fs'

const SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'csrf',
  'clientSecret',
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

export function logJob(fields: {
  queue: string
  job_id: string
  name: string
  attempt: number
  duration_ms: number
  status: 'success' | 'failure'
  error?: string
  correlation_id?: string
}): void {
  logDomainEvent('job.completed', fields)
}

export const logSink = {
  write(line: string): void {
    writeSync(1, `${line}\n`)
  },
}

export function logDomainEvent(event: string, fields: Record<string, unknown>): void {
  const safe = sanitizeLog({
    event,
    request_id: fields.request_id ?? fields.requestId,
    tenant: fields.tenant ?? fields.tenantId,
    entity: fields.entity ?? fields.orderId ?? fields.linkId,
    duration_ms: fields.duration_ms ?? fields.durationMs,
    ...fields,
  })
  logSink.write(JSON.stringify(safe))
}
