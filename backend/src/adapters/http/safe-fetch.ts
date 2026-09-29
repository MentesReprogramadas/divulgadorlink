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
  if (addresses.some(isPrivate)) throw new Error('destino privado')
  return true
}

/** Limite de engenharia para o corpo da resposta (1 MiB). */
export const SAFE_FETCH_MAX_BODY_BYTES = 1024 * 1024

const SAFE_FETCH_TIMEOUT_MS = 5000
const SAFE_FETCH_MAX_REDIRECTS = 3

export type DnsResolver = (hostname: string) => Promise<string[]>

export type SafeFetchDeps = {
  resolve: DnsResolver
  fetch: typeof fetch
}

async function assertReachablePublicHttps(raw: string, resolve: DnsResolver): Promise<void> {
  assertPublicHttps(raw)
  const { hostname } = new URL(raw)
  const addresses = await resolve(hostname)
  assertResolvedAddresses(addresses)
}

async function readBodyWithCap(response: Response, maxBytes: number): Promise<ArrayBuffer> {
  const reader = response.body?.getReader()
  if (!reader) return new ArrayBuffer(0)

  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) throw new Error('corpo excede limite')
    chunks.push(value)
  }

  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out.buffer
}

export async function safeFetch(raw: string, deps: SafeFetchDeps, init?: RequestInit): Promise<Response> {
  let currentUrl = raw
  let redirectsFollowed = 0

  while (true) {
    await assertReachablePublicHttps(currentUrl, deps.resolve)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SAFE_FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await deps.fetch(currentUrl, {
        ...init,
        signal: controller.signal,
        redirect: 'manual',
      })
    } finally {
      clearTimeout(timeout)
    }

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

    const body = await readBodyWithCap(response, SAFE_FETCH_MAX_BODY_BYTES)
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}
