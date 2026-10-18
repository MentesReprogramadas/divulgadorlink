'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionIcon } from '@/components/ui/action-icon'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { ProfileHistorySkeleton } from './components/profile-history-skeleton'
import { ProfileRevisionComparison } from './components/profile-revision-comparison'
import { emptyProfile, type ProfileRevision, type ProfileRevisionDetail, type ProfileState } from './profile-contract'
import { profileRequest } from './profile-api'
import styles from './components/profile-history.module.css'
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
export function ProfileHistoryScreen() {
  const [state, setState] = useState<ProfileState | null>(null), [revisions, setRevisions] = useState<ProfileRevision[]>([])
  const [selected, setSelected] = useState<ProfileRevisionDetail | null>(null), [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [dialogError, setDialogError] = useState(''), [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true), [opening, setOpening] = useState<string | null>(null), busy = useRef(false)
  const load = useCallback(async () => {
    setError('')
    try { const [profile, history] = await Promise.all([profileRequest<ProfileState>(''), profileRequest<{ revisions: ProfileRevision[] }>('/revisions')]); setState(profile); setRevisions(history.revisions) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function compare(id: string) {
    if (busy.current) return
    busy.current = true; setOpening(id); setError(''); setDialogError(''); setConfirm(false)
    try { setSelected(await profileRequest<ProfileRevisionDetail>('/revisions/' + id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível abrir esta versão.') }
    finally { busy.current = false; setOpening(null) }
  }
  async function restore() {
    if (busy.current || !selected || !state?.draft) return
    busy.current = true; setPending(true); setDialogError('')
    try {
      const next = await profileRequest<ProfileState & { warnings: string[] }>('/revisions/' + selected.id + '/restore', { method: 'POST', body: JSON.stringify({ expectedVersion: state.draft.version }) })
      setState(next); setSelected(null); setNotice(['Versão restaurada no rascunho. Confira a prévia antes de publicar.', ...(next.warnings ?? [])].join(' '))
    } catch (reason) { setDialogError(reason instanceof Error ? reason.message : 'Não foi possível restaurar. Seu rascunho foi mantido.') }
    finally { busy.current = false; setPending(false) }
  }
  if (loading) return <ProfileHistorySkeleton />
  return <section className={styles.page} aria-label="Histórico da minha página">
    <div className={styles.actions}><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back" />Voltar à edição</ButtonLink><RefreshButton disabled={pending || opening !== null} onClick={() => void load()} /></div>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    {notice ? <><p role="status" className={styles.notice}>{notice}</p><div className={styles.actions}><ButtonLink href="/painel/perfil/previa"><ActionIcon name="preview" />Ver prévia</ButtonLink></div></> : null}
    <p className={styles.policy}>Até 50 versões por 180 dias. A publicação atual é preservada. Fotos antigas removidas não são recuperadas.</p>
    {!revisions.length && !error ? <EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="edit" />Editar minha página</ButtonLink>}>Seu histórico começa na primeira publicação.</EmptyState> : null}
    <div className={styles.list}>{revisions.map(revision => <article className={styles.card} key={revision.id} aria-label={'Versão ' + revision.version}><div className={styles.heading}><h2>Versão {revision.version}</h2>{revision.current ? <Badge tone="ok">Publicada agora</Badge> : null}{revision.imported ? <Badge tone="neutral">Importada</Badge> : null}</div><p className={styles.name}>{revision.summary.name}</p><div className={styles.meta}><time dateTime={revision.createdAt}>{revision.imported ? 'Registrada em ' : ''}{date(revision.createdAt)}</time><span>{revision.summary.groups} {revision.summary.groups === 1 ? 'grupo' : 'grupos'} · {revision.summary.links} {revision.summary.links === 1 ? 'link' : 'links'}</span></div><div className={styles.actions}><Button variant="secondary" disabled={opening !== null || pending} loading={opening === revision.id} onClick={() => void compare(revision.id)}><ActionIcon name="preview" />Ver diferenças</Button></div></article>)}</div>
    <ProfileRevisionComparison revision={selected} draft={state?.draft ?? emptyProfile()} draftChannelGroups={state?.channelGroups} pending={pending} error={dialogError} confirm={confirm} onConfirm={() => setConfirm(true)} onRestore={() => void restore()} onClose={() => { if (!pending) setSelected(null) }} />
  </section>
}
