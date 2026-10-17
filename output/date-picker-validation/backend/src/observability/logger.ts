import { writeSync } from 'node:fs'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'

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

const telemetryLog = logs.getLogger('divulgador-links')

function telemetryAttributes(fields: Record<string, unknown>): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') attributes[key] = value.length > 4_000 ? value.slice(0, 4_000) : value
    else if (typeof value === 'number' && Number.isFinite(value)) attributes[key] = value
    else if (typeof value === 'boolean') attributes[key] = value
  }
  return attributes
}

function emitTelemetry(event: string, fields: Record<string, unknown>): void {
  const failed = event.endsWith('failed')
    || fields.status === 'failure'
    || (typeof fields.status === 'number' && fields.status >= 500)
  try {
    telemetryLog.emit({
      severityNumber: failed ? SeverityNumber.ERROR : SeverityNumber.INFO,
      severityText: failed ? 'ERROR' : 'INFO',
      body: event,
      attributes: telemetryAttributes(fields),
    })
  } catch {
    // exportação remota não pode derrubar a request
  }
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
  emitTelemetry(event, safe)
}
