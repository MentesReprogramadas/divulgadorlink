import https from 'node:https'
import { isIP } from 'node:net'

function isPrivateIPv4(host: string): boolean {
  const [a, b] = host.split('.').map(Number)
  return (
    a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  )
}

function isPrivate(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.local')) return true

  const lower = host.toLowerCase()
  if (lower.startsWith('::ffff:')) {
    const embedded = lower.slice('::ffff:'.length)
    if (isIP(embedded) === 4) return isPrivateIPv4(embedded)
  }

  if (isIP(host) === 4) return isPrivateIPv4(host)

  if (isIP(host) === 6) {
    return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')
  }

  return false
}

export function assertPublicHttps(raw: string): true {
  const url = new URL(raw)
  if (url.protocol !== 'https:') throw new Error('somente https')
  if (url.port && url.port !== '443') throw new Error('porta')
  if (isPrivate(url.hostname)) throw new Error('destino privado')
  return true
}

export function assertResolvedAddresses(addresses: string[]): true {
  if (addresses.length === 0) throw new Error('dns vazio')
  if (addresses.some(isPrivate)) throw new Error('destino privado')
  return true
}

/** Limite de engenharia para o corpo da resposta (1 MiB). */
export const SAFE_FETCH_MAX_BODY_BYTES = 1024 * 1024

const SAFE_FETCH_TIMEOUT_MS = 5000
const SAFE_FETCH_MAX_REDIRECTS = 3

export type DnsResolver = (hostname: string) => Promise<string[]>

export type PinnedTarget = {
  url: string
  hostname: string
  address: string
  servername: string
}

export type PinnedResponse = {
  status: number
  headers: Headers
  body: Uint8Array
}

export type SafeFetchDeps = {
  resolve: DnsResolver
  connect: (target: PinnedTarget) => Promise<PinnedResponse>
}

async function resolvePinned(raw: string, resolve: DnsResolver): Promise<PinnedTarget> {
  assertPublicHttps(raw)
  const url = new URL(raw)
  const addresses = await resolve(url.hostname)
  assertResolvedAddresses(addresses)
  return {
    url: url.href,
    hostname: url.hostname,
    address: addresses[0]!,
    servername: url.hostname,
  }
}

export function defaultPinnedConnect(target: PinnedTarget): Promise<PinnedResponse> {
  const url = new URL(target.url)
  const family = isIP(target.address) === 6 ? 6 : 4

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: target.hostname,
        servername: target.servername,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { host: target.hostname },
        timeout: SAFE_FETCH_TIMEOUT_MS,
        lookup: (_hostname, options, callback) => {
          const done = typeof options === 'function' ? options : callback
          done(null, target.address, family)
        },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const headers = new Headers()
          for (const [key, value] of Object.entries(response.headers)) {
            if (typeof value === 'string') headers.set(key, value)
            else if (Array.isArray(value)) headers.set(key, value.join(', '))
          }
          resolve({
            status: response.statusCode ?? 0,
            headers,
            body: new Uint8Array(Buffer.concat(chunks)),
          })
        })
      },
    )
    req.on('timeout', () => {
      req.destroy(new Error('timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}

export async function safeFetch(raw: string, deps: SafeFetchDeps): Promise<Response> {
  let currentUrl = raw
  let redirectsFollowed = 0

  while (true) {
    const target = await resolvePinned(currentUrl, deps.resolve)
    const response = await deps.connect(target)

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error('redirect sem location')
      }
      if (redirectsFollowed >= SAFE_FETCH_MAX_REDIRECTS) {
        throw new Error('redirects demais')
      }
      redirectsFollowed += 1
      currentUrl = new URL(location, currentUrl).href
      continue
    }

    if (response.body.byteLength > SAFE_FETCH_MAX_BODY_BYTES) {
      throw new Error('corpo excede limite')
    }

    return new Response(Buffer.from(response.body), {
      status: response.status,
      headers: response.headers,
    })
  }
}
