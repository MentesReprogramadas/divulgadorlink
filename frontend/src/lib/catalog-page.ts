import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { forward, tenantHost } from '@/lib/upstream'

export type CatalogResponse = { status: number; body: unknown | null }

export const loadCatalog = cache(async (path: string): Promise<CatalogResponse> => {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const age = (await cookies()).get('age')?.value
  const cookie = age === 'yes' || age === 'no' ? `age=${age}` : undefined
  try {
    const result = await forward({
      method: 'GET',
      path,
      host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
      cookie,
    })
    if (result.status !== 200) return { status: result.status, body: null }
    return { status: 200, body: JSON.parse(result.body.toString()) }
  } catch {
    return { status: 503, body: null }
  }
})

export function oneSlug(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^[a-z0-9-]{1,80}$/.test(raw)) return null
  return raw
}
