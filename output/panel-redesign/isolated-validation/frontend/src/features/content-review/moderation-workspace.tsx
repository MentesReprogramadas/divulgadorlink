'use client'
import { useState, type ReactNode } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { AdminContentReviewQueue } from './admin-review-queue'
export function ModerationWorkspace({ links }: { links: ReactNode }) {
  const [tab, setTab] = useState('links')
  return <Tabs label="Tipo de publicação" value={tab} onChange={setTab} items={[
    { id: 'links', label: 'Links', content: links },
    { id: 'profiles', label: 'Minha página', content: <AdminContentReviewQueue kind="PROFILE" /> },
    { id: 'redirects', label: 'Convites', content: <AdminContentReviewQueue kind="REDIRECT" /> },
  ]} />
}
