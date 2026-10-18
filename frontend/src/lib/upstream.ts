import { request as httpRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import { request as httpsRequest } from 'node:https'
import { publicHost } from '@/domain/crawler-policy'

export function tenantHost(fallback: string): string {
  return publicHost(process.env.TENANT_HOST || fallback)
}

export function forward(input: {
  method: string
  path: string
  host: string
  cookie?: string
  authorization?: string
  body?: Buffer
  idempotencyKey?: string
  csrf?: string
  userAgent?: string
  dnt?: string
  gpc?: string
  analyticsTest?: string
  timeoutMs?: number
}): Promise<{ status: number; headers: NodeJS.Dict<string | string[]>; body: Buffer }> {
  // Match the API's existing Fastify 1 MiB body limit before writing to a socket.
  // An early upstream 413 may close that socket while a larger body is still being sent.
  if (input.body && input.body.length > 1024 * 1024) return Promise.resolve({
    status: 413,
    headers: { 'content-type': 'application/json' },
    body: Buffer.from(JSON.stringify({ code: 'validation', message: 'Corpo grande demais.', request_id: randomUUID() })),
  })
  const origin = new URL(process.env.API_ORIGIN || 'http://127.0.0.1:3333')
  const transport = origin.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = transport({
      hostname: origin.hostname,
      port: origin.port || (origin.protocol === 'https:' ? 443 : 80),
      family: 0,
      path: input.path,
      method: input.method,
      ...(input.timeoutMs ? { signal: AbortSignal.timeout(input.timeoutMs) } : {}),
      headers: {
        host: input.host,
        ...(input.cookie ? { cookie: input.cookie } : {}),
        ...(input.authorization ? { authorization: input.authorization } : {}),
        ...(input.idempotencyKey ? { 'idempotency-key': input.idempotencyKey } : {}),
        ...(input.csrf ? { 'x-csrf-token': input.csrf } : {}),
        ...(input.dnt === '1' ? { dnt: '1' } : {}),
        ...(input.gpc === '1' ? { 'sec-gpc': '1' } : {}),
        ...(input.analyticsTest === '1' ? { 'x-analytics-test': '1' } : {}),
        ...(input.userAgent ? { 'user-agent': input.userAgent.slice(0, 512) } : {}),
        ...(input.body ? { 'content-type': 'application/json', 'content-length': input.body.length } : {}),
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('error', reject)
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 500, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('error', (error) => {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'ERR'
      console.error(`upstream ${code} ${origin.hostname}:${origin.port || 80}`)
      reject(error)
    })
    if (input.body) req.write(input.body)
    req.end()
  })
}
