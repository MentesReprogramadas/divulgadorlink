'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { SESSION_EVENT, type Session } from '@/domain/session'
import type { WorkspaceContext } from '@/features/workspace-team/workspace-access'
import { LaunchOfferReminder } from './launch-offer-reminder'

export function GlobalOfferReminder() {
  const pathname = usePathname()
  const allowedPath = !/^\/(?:admin|p)(?:\/|$)/.test(pathname) && !/\/(?:novo|destaque|previa)$/.test(pathname)
  return allowedPath ? <AuthorizedReminder key={pathname} /> : null
}

function AuthorizedReminder() {
  const [eligible, setEligible] = useState(false)
  useEffect(() => {
    let live = true
    let version = 0
    async function refresh() {
      const request = ++version
      setEligible(false)
      try {
        const session = await api<Partial<Session>>('/v1/auth/session')
        if (!live || request !== version || session.status !== 200 || session.body.status !== 'ACTIVE' || !session.body.canSubmit) return
        const workspace = await api<WorkspaceContext>('/v1/team/context')
        if (live && request === version) setEligible(workspace.status === 200 && workspace.body.ownerId === null)
      } catch { if (live && request === version) setEligible(false) }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener(SESSION_EVENT, refresh)
    window.addEventListener('workspace-access-changed', refresh)
    return () => { live = false; window.removeEventListener('focus', refresh); window.removeEventListener(SESSION_EVENT, refresh); window.removeEventListener('workspace-access-changed', refresh) }
  }, [])
  return eligible ? <LaunchOfferReminder enabled /> : null
}
