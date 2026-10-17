'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { api } from '@/lib/api'

const ENTRY_KEY = 'tla_entry'

function firstOfSession(): boolean {
  try {
    if (sessionStorage.getItem(ENTRY_KEY)) return false
    sessionStorage.setItem(ENTRY_KEY, '1')
    return true
  } catch {
    return false
  }
}

export function visitPayload(pathname: string, search: string, entry: boolean) {
  const params = new URLSearchParams(search)
  return {
    path: pathname,
    entry,
    ...(entry ? {
      source: params.get('utm_source') ?? '',
      medium: params.get('utm_medium') ?? '',
      campaign: params.get('utm_campaign') ?? '',
    } : {}),
  }
}

export function SiteVisits() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    const body = visitPayload(pathname, location.search, firstOfSession())
    void api('/v1/analytics/visits', { method: 'POST', body: JSON.stringify(body) }).catch(() => undefined)
  }, [pathname])

  return null
}
