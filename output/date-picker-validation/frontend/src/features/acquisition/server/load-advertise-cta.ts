import 'server-only'
import { cookies, headers } from 'next/headers'
import { advertiseCta } from '@/domain/advertise'
import { forward, tenantHost } from '@/lib/upstream'

export async function loadAdvertiseCta(): Promise<{ href: string; label: string }> {
  const jar = await cookies()
  if (!jar.get('catalogo_role')) return advertiseCta(null)
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  try {
    const result = await forward({
      method: 'GET',
      path: '/api/v1/auth/session',
      host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
      cookie: jar.toString(),
    })
    if (result.status !== 200) return advertiseCta(null)
    const body = JSON.parse(result.body.toString()) as { canSubmit?: boolean }
    return advertiseCta({ canSubmit: body.canSubmit === true })
  } catch {
    return advertiseCta(null)
  }
}
