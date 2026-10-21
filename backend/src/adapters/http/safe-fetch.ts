import https from 'node:https'
import { isIP } from 'node:net'

import { assertPublicHttps, assertResolvedAddresses } from '@/domain/links/public-address'
export { assertPublicHttps, assertResolvedAddresses }

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
    address: [...addresses].sort((a, b) => isIP(a) - isIP(b))[0]!,
    servername: url.hostname,
  }
}

export function defaultPinnedConnect(target: PinnedTarget, outgoing?: { body: string; headers: Record<string,string> }): Promise<PinnedResponse> {
  const url = new URL(target.url)
  const family = isIP(target.address) === 6 ? 6 : 4

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: target.address,
        family,
        servername: target.servername,
        path: `${url.pathname}${url.search}`,
        method: outgoing ? 'POST' : 'GET',
        headers: { ...outgoing?.headers, host: target.hostname },
        timeout: SAFE_FETCH_TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = []
        let bytes = 0
        response.on('error', error => { clearTimeout(deadline); reject(error) })
        response.on('aborted', () => { clearTimeout(deadline); reject(new Error('resposta interrompida')) })
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.byteLength
          if (bytes > SAFE_FETCH_MAX_BODY_BYTES) {
            const error = new Error('corpo excede limite')
            clearTimeout(deadline)
            reject(error)
            response.destroy()
            req.destroy(error)
            return
          }
          chunks.push(chunk)
        })
        response.on('end', () => {
          clearTimeout(deadline)
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
    req.on('error', error => { clearTimeout(deadline); reject(error) })
    const deadline = setTimeout(() => req.destroy(new Error('timeout')), SAFE_FETCH_TIMEOUT_MS)
    deadline.unref()
    req.end(outgoing?.body)
  })
}

/** POST never follows redirects, so receiver credentials cannot cross origins. */
export async function safePost(raw:string,body:string,headers:Record<string,string>,resolve:DnsResolver,connect=defaultPinnedConnect):Promise<number>{
  const target=await resolvePinned(raw,resolve)
  const response=await connect(target,{body,headers:{...headers,'content-type':'application/json','content-length':String(Buffer.byteLength(body))}})
  if(response.status>=300&&response.status<400)throw new Error('redirect bloqueado')
  return response.status
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

    return new Response([204, 205].includes(response.status) ? null : Buffer.from(response.body), {
      status: response.status,
      headers: response.headers,
    })
  }
}
