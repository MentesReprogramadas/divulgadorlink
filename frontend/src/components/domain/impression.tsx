'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'

export function Impression({ linkId, surfaceToken }: { linkId: string; surfaceToken: string }) {
  useEffect(() => {
    if (!surfaceToken) return
    void api('/v1/analytics/impressions', {
      method: 'POST',
      body: JSON.stringify({ linkId, surfaceToken }),
    })
  }, [linkId, surfaceToken])
  return null
}
