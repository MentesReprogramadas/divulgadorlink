'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyProfile, type ProfileContent, type ProfileDraft, type ProfileState } from './profile-contract'
import { profileCanSave, profileKey, normalizedProfile } from './profile-diff'
import { isProfileVersionConflict, profileRequest, profileScope } from './profile-api'
import {registerWorkspaceSwitchGuard} from '@/lib/workspace-switch-guards'

type SaveState = 'saved' | 'waiting' | 'saving' | 'error' | 'incomplete'
/** One writer per editor. Responses advance the version without replacing newer edits. */
export function useProfileDraft(resourceId?:string) {
  const target=useRef(resourceId)
  const [state, setState] = useState<ProfileState>({ draft: null, publishedVersion: null, publishedContent: null })
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile), [saveState, setSaveState] = useState<SaveState>('saved'), [error, setError] = useState('')
  const latest = useRef<ProfileDraft>(emptyProfile()), saved = useRef(profileKey(latest.current)), ready = useRef(false)
  const writer = useRef<Promise<ProfileDraft> | null>(null), paused = useRef(false), failedKey = useRef(''), conflict = useRef(false), [epoch, setEpoch] = useState(0)
  const replace = useCallback((next: ProfileState) => {
    const value = next.draft ?? emptyProfile()
    latest.current = value; saved.current = profileKey(value); failedKey.current = ''; conflict.current = false; ready.current = true
    setState(next); setDraft(value); setSaveState('saved'); setError('')
  }, [])
  const change = useCallback((content: ProfileContent) => {
    latest.current = { ...content, version: latest.current.version }; setDraft(latest.current)
    setSaveState(conflict.current ? 'error' : profileKey(content) === saved.current ? 'saved' : profileCanSave(content) ? 'waiting' : 'incomplete')
    if (!conflict.current) setError('')
  }, [])
  const flush = useCallback(async (): Promise<ProfileDraft> => {
    if (writer.current) { await writer.current; return flush() }
    if (paused.current || profileKey(latest.current) === saved.current) return latest.current
    if (conflict.current) throw new Error('O perfil mudou em outra aba. Recarregue antes de continuar.')
    if (!profileCanSave(latest.current)) throw new Error('Complete o nome e o endereço da sua página.')
    const work = async () => {
      setError(''); setSaveState('saving')
      try {
        while (profileKey(latest.current) !== saved.current) {
          const snapshot = latest.current, key = profileKey(snapshot)
          const result = await profileRequest<ProfileState>('', profileScope({ method: 'PATCH', body: JSON.stringify({ expectedVersion: snapshot.version, content: normalizedProfile(snapshot) }) },target.current))
          if (!result.draft) throw new Error('O servidor não confirmou o rascunho.')
          const unchanged = profileKey(latest.current) === key
          latest.current = unchanged ? result.draft : { ...latest.current, version: result.draft.version }
          saved.current = profileKey(result.draft); failedKey.current = ''
          setDraft(latest.current); setState(result)
          if (paused.current || !profileCanSave(latest.current)) break
        }
        setSaveState(profileKey(latest.current) === saved.current ? 'saved' : 'incomplete')
        return latest.current
      } catch (reason) {
        failedKey.current = profileKey(latest.current); conflict.current = isProfileVersionConflict(reason)
        setSaveState('error'); setError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Suas alterações foram mantidas.')
        throw reason
      }
    }
    const promise = work(); writer.current = promise
    try { return await promise } finally { if (writer.current === promise) writer.current = null }
  }, [])
  useEffect(()=>registerWorkspaceSwitchGuard(()=>flush()),[flush])
  useEffect(() => {
    if (!ready.current || paused.current || conflict.current || !profileCanSave(draft) || profileKey(draft) === saved.current || profileKey(draft) === failedKey.current) return
    const timer = setTimeout(() => {
      // An explicit save may have failed after this timer was scheduled.
      if (profileKey(latest.current) === failedKey.current) return
      void flush().catch(() => {})
    }, 700)
    return () => clearTimeout(timer)
  }, [draft, epoch, flush])
  useEffect(() => {
    const online = () => { if (!conflict.current) { failedKey.current = ''; setEpoch(value => value + 1) } }
    const leaving = (event: BeforeUnloadEvent) => { if (ready.current && profileKey(latest.current) !== saved.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('online', online); window.addEventListener('beforeunload', leaving)
    return () => { window.removeEventListener('online', online); window.removeEventListener('beforeunload', leaving) }
  }, [])
  useEffect(() => () => { if (ready.current && !paused.current && !conflict.current && profileCanSave(latest.current) && profileKey(latest.current) !== saved.current && profileKey(latest.current) !== failedKey.current) void flush().catch(() => {}) }, [flush])
  const discard = useCallback(async () => {
    paused.current = true
    try {
      try { await writer.current } catch { /* Use the last confirmed version; the server still checks it. */ }
      const result = await profileRequest<ProfileState>('/discard', profileScope({ method: 'POST', body: JSON.stringify({ expectedVersion: latest.current.version }) },target.current))
      replace(result)
    } finally { paused.current = false }
  }, [replace])
  return { draft, state, saveState, error, setError, change, replace, flush, discard, markConflict: () => { conflict.current = true; setSaveState('error') }, setReview: (review: ProfileState['review']) => setState(previous => ({ ...previous, review })), isConflict: () => conflict.current }
}
