import {browserPageLocale} from '@/domain/public-page-locale'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { forward, tenantHost } from '@/lib/upstream'
import type { PublicProfile,ProfileLocale } from '../profile-contract'
export const loadPublicProfile = cache(async (slug: string,locale?:ProfileLocale): Promise<PublicProfile | null> => {
  const h = await headers(), jar = await cookies()
  locale??=browserPageLocale(h.get('accept-language'))
  const r = await forward({ method: 'GET', path: '/api/v1/profiles/' + encodeURIComponent(slug)+(locale?'?locale='+locale:''), host:h.get('x-profile-tenant-host')??tenantHost(h.get('host')??'localhost'), cookie: jar.get('age')?.value === 'yes' ? 'age=yes' : undefined, timeoutMs: 10000 })
  if (r.status === 404 || r.status === 400) return null
  if (r.status !== 200) throw new Error('Não foi possível carregar o perfil público.')
  return JSON.parse(r.body.toString()) as PublicProfile
})
