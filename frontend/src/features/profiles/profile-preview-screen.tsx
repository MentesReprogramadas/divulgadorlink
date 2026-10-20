'use client'
import { useEffect, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { ProfilePreviewShell } from './components/profile-preview-shell'
import { ProfilePreviewSkeleton } from './components/profile-preview-skeleton'
import { ProfileExplorer } from './profile-explorer'
import { ProfileAgeGate } from './profile-age-gate'
import { managedProfileId, profileRequest, profileScope } from './profile-api'
import type { ProfileSearchPage } from './profile-search-contract'
import { Field, Select } from '@/components/ui/input'

export function ProfilePreviewScreen() {
  const target=useRef(managedProfileId())
  const [profile, setProfile] = useState<ProfileSearchPage | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loading,setLoading]=useState(true)
  const [mode,setMode]=useState('now'),[at,setAt]=useState<string|null>(null),[bounds,setBounds]=useState<{before:string|null;after:string|null}|null>(null)
  useEffect(() => {
    let current = true
    setError(''); setLoading(true)
    void (target.current?profileRequest<ProfileSearchPage>('/preview/items'+(at?'?at='+encodeURIComponent(at):''),profileScope(undefined,target.current)):profileRequest<ProfileSearchPage>('/preview/items'+(at?'?at='+encodeURIComponent(at):''))).then(content => { if (current) {setProfile(content);if(!content.restricted)setBounds(content.previewBounds??null)} }).catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a prévia.') }).finally(()=>{if(current)setLoading(false)})
    return () => { current = false }
  }, [attempt,at])
  if (!profile && !error) return <ProfilePreviewSkeleton />
  const controls=bounds&&(bounds.before||bounds.after)?<Field label="Simular agendamento"><Select value={mode} onChange={event=>{const value=event.target.value;setMode(value);setAt(value==='before'?bounds.before:value==='after'?bounds.after:null)}}><option value="now">Agora</option><option value="before" disabled={!bounds.before}>Antes do início</option><option value="after" disabled={!bounds.after}>Depois do fim</option></Select></Field>:undefined
  return <ProfilePreviewShell backHref={managedProfileId()?'/painel/equipe/'+managedProfileId()+'/editar':undefined} backLabel={managedProfileId()?'Voltar à página compartilhada':undefined} controls={controls}>{error ? <><h1 className="entry-title">Prévia indisponível</h1><ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} /></> : profile?.restricted ? <ProfileAgeGate /> : profile ? <ProfileExplorer key={(profile.previewAt??'now')+'-'+profile.publishedRevisionId+'-'+attempt} initial={profile} source={{kind:'preview',at:at??undefined,profileId:target.current??undefined}} pending={loading}/> : null}</ProfilePreviewShell>
}
