import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export function tenantHost(fallback: string): string {
  return process.env.TENANT_HOST || fallback
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
}): Promise<{ status: number; headers: NodeJS.Dict<string | string[]>; body: Buffer }> {
  const origin = new URL(process.env.API_ORIGIN || 'http://127.0.0.1:3333')
  const transport = origin.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = transport({
      hostname: origin.hostname,
      port: origin.port || (origin.protocol === 'https:' ? 443 : 80),
      family: 0,
      path: input.path,
      method: input.method,
      headers: {
        host: input.host,
        ...(input.cookie ? { cookie: input.cookie } : {}),
        ...(input.authorization ? { authorization: input.authorization } : {}),
        ...(input.idempotencyKey ? { 'idempotency-key': input.idempotencyKey } : {}),
        ...(input.csrf ? { 'x-csrf-token': input.csrf } : {}),
        ...(input.body ? { 'content-type': 'application/json', 'content-length': input.body.length } : {}),
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 500, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('error', reject)
    if (input.body) req.write(input.body)
    req.end()
  })
}
