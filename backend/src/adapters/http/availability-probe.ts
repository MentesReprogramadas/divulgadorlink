import { promises as dns } from 'node:dns'
import { safeFetch, defaultPinnedConnect, type SafeFetchDeps } from './safe-fetch'

export async function probeAvailability(url: string, deps?: SafeFetchDeps): Promise<number | null> {
  try {
    // Test stub is only available outside production and only for the reserved fixture host.
    if (process.env.NODE_ENV !== 'production' && process.env.E2E_AVAILABILITY_STUB_URL && new URL(url).hostname === 'example.com') {
      const stub = new URL('/availability-probe', process.env.E2E_AVAILABILITY_STUB_URL)
      stub.searchParams.set('url', url)
      const result = await fetch(stub, { signal: AbortSignal.timeout(6000) })
      const data = await result.json() as { status: number | null }
      return data.status
    }
    const response = await safeFetch(url, deps ?? {
      resolve: async hostname => {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          const result = await Promise.race([dns.lookup(hostname, { all: true }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('dns timeout')), 5000); timer.unref() })])
          return result.map(row => row.address)
        } finally { clearTimeout(timer) }
      },
      connect: defaultPinnedConnect,
    })
    return response.status
  } catch (error) {
    if (error instanceof Error && /privado|somente https|porta|dns vazio|dns inválido|credenciais|corpo excede|redirect/.test(error.message)) return 0
    return null
  }
}
