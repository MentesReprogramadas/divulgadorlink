'use client'
import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { ProfilePreviewShell } from './components/profile-preview-shell'
import { ProfilePreviewSkeleton } from './components/profile-preview-skeleton'
import { ProfileView } from './components/profile-view'
import { ProfileAgeGate } from './profile-age-gate'
import { profileRequest } from './profile-api'
import type { PublicProfile } from './profile-contract'

export function ProfilePreviewScreen() {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    setError(''); setProfile(null)
    void profileRequest<PublicProfile>('/preview').then(content => { if (current) setProfile(content) }).catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a prévia.') })
    return () => { current = false }
  }, [attempt])
  if (!profile && !error) return <ProfilePreviewSkeleton />
  return <ProfilePreviewShell>{error ? <><h1 className="entry-title">Prévia indisponível</h1><ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} /></> : profile?.restricted ? <ProfileAgeGate /> : profile ? <ProfileView content={profile} avatarUrl={profile.avatarAssetId ? '/bff/v1/me/profile/avatar/' + profile.avatarAssetId : undefined} /> : null}</ProfilePreviewShell>
}
