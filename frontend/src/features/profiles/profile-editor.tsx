'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TabNavigation } from '@/components/ui/tabs'
import { Button, ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { ReviewStatus } from '@/features/content-review/components/review-status'
import { sendContentAppeal } from '@/features/content-review/review-api'
import { ProfileAppearanceEditor } from './components/profile-appearance-editor'
import { ProfileEditorSkeleton } from './components/profile-editor-skeleton'
import { ProfileFields } from './components/profile-fields'
import { ProfileChanges } from './components/profile-changes'
import { useProfileDraft } from './use-profile-draft'
import { hasUnpublishedProfile, profileCanSave } from './profile-diff'
import { isProfileVersionConflict, profileCatalog, profileRequest } from './profile-api'
import type { ProfileState } from './profile-contract'
import { prepareAvatar } from './prepare-avatar'
import styles from './components/profiles.module.css'

type Section = 'groups' | 'identity' | 'appearance'
const sections: Array<{ id: Section; label: string }> = [{ id: 'groups', label: 'Grupos e links' }, { id: 'identity', label: 'Página' }, { id: 'appearance', label: 'Aparência' }]
export function ProfileEditor() {
  const router = useRouter(), model = useProfileDraft()
  const [section, setSection] = useState<Section>('identity'), [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading'), [pending, setPending] = useState(false), [notice, setNotice] = useState('')
  const [confirmReload, setConfirmReload] = useState(false), [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [pageUrl, setPageUrl] = useState('')
  const retry = useRef<(() => void) | null>(null)
  const busy = useRef(false), status = useRef<HTMLParagraphElement>(null), pageOptions = useRef<HTMLDetailsElement>(null)
  const { replace, setError } = model
  useLayoutEffect(() => { if (notice) status.current?.focus() }, [notice])
  const load = useCallback(async () => {
    try {
      const [state, links] = await Promise.all([profileRequest<ProfileState>(''), profileCatalog()])
      replace(state); setSection(state.draft ? 'groups' : 'identity'); setCatalog(links); setPhase('ready'); setConfirmReload(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar.'); setPhase(previous => previous === 'loading' ? 'error' : previous) }
  }, [replace, setError])
  useEffect(() => { void load() }, [load])
  const { draft, state } = model, published = state.publishedContent ?? null
  useEffect(() => { setPageUrl(state.publishedVersion !== null ? new URL('/p/' + (published?.slug ?? draft.slug), window.location.origin).href : '') }, [state.publishedVersion, published?.slug, draft.slug])
  const changed = hasUnpublishedProfile(draft, published), review = state.review
  async function action(kind: 'preview' | 'publish' | 'discard' | 'unpublish' | 'photo' | 'copy', file?: File) {
    if (busy.current) return
    busy.current = true; retry.current = null; setPending(true); setError(''); setNotice('')
    try {
      if (kind === 'copy') {
        try { await navigator.clipboard.writeText(pageUrl) } catch { throw new Error('Não foi possível copiar. Selecione o link da página e copie manualmente.') }
        setNotice('Link da página copiado.')
      }
      else if (kind === 'discard') { await model.discard(); setNotice('Alterações descartadas. A versão publicada foi restaurada.') }
      else if (kind === 'photo' && file) {
        const base64 = await prepareAvatar(file)
        const result = await profileRequest<{ avatarAssetId: string }>('/avatar', { method: 'POST', body: JSON.stringify({ base64 }) })
        model.change({ ...draft, avatarAssetId: result.avatarAssetId })
      } else {
        const saved = await model.flush()
        if (kind === 'preview') router.push('/painel/perfil/previa')
        else if (kind === 'unpublish') {
          replace(await profileRequest<ProfileState>('/unpublish', { method: 'POST', body: JSON.stringify({ expectedVersion: saved.version }) }))
          setConfirmUnpublish(false); setNotice('Perfil retirado do ar. O rascunho foi mantido.')
        } else if (kind === 'publish') {
          const result = await profileRequest<{ review?: ProfileState['review'] }>('/publish', { method: 'POST', body: JSON.stringify({ expectedVersion: saved.version }) })
          replace(await profileRequest<ProfileState>(''))
          setNotice(result.review?.status === 'PENDING' ? 'Página enviada para revisão humana.' : result.review?.status === 'REJECTED' ? 'Esta versão foi recusada. Você pode contestar ou corrigir.' : 'Perfil publicado.')
        }
      }
    } catch (reason) { retry.current = () => void action(kind, file); if (isProfileVersionConflict(reason)) model.markConflict(); setError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Suas alterações foram mantidas.') }
    finally { busy.current = false; setPending(false) }
  }
  const saveLabel = model.saveState === 'saving' ? 'Salvando…' : model.saveState === 'incomplete' ? 'Complete os dados da página para salvar' : ''
  return <ProfileChanges published={published}><section className={styles.editor} aria-label="Editor do perfil" data-save-state={model.saveState}>
    {model.error ? <div className={styles.error} role="alert"><span>{model.error}</span><Button variant="secondary" disabled={pending} onClick={() => phase === 'error' ? void load() : model.isConflict() ? setConfirmReload(true) : retry.current ? retry.current() : void model.flush().catch(() => {})}>{model.isConflict() ? 'Recarregar' : 'Tentar novamente'}</Button></div> : null}
    <p role="status" ref={status} tabIndex={-1} className={styles.operationNotice}>{notice}</p>
    {phase === 'loading' ? <ProfileEditorSkeleton /> : phase === 'ready' ? <>
      {pageUrl ? <div className={styles.publicAddress} role="group" aria-label="Link da sua página"><div><span>Link da sua página</span><a href={pageUrl} target="_blank" rel="noopener noreferrer">{pageUrl}</a></div><Button variant="secondary" aria-label="Copiar link da página" disabled={pending} onClick={() => void action('copy')}><ActionIcon name="copy" />Copiar</Button></div> : null}
      {changed ? <section className={styles.changeBanner} aria-label="Alterações não publicadas"><strong>Tem alterações não publicadas</strong><div className={styles.bannerActions}><span title={!published ? 'Disponível depois da primeira publicação' : undefined}><Button variant="secondary" disabled={pending || !published} onClick={() => void action('discard')}>Descartar</Button></span><Button disabled={pending || !profileCanSave(draft) || review?.status === 'PENDING'} loading={pending} onClick={() => void action('publish')}>Publicar</Button></div></section> : null}
      <ReviewStatus review={review} pending={pending} onAppeal={async text => { if (busy.current || !review) throw new Error('Aguarde a operação atual.'); busy.current = true; setPending(true); try { await model.flush(); model.setReview(await sendContentAppeal(review.id, text)); setNotice('Contestação enviada para revisão humana.') } finally { busy.current = false; setPending(false) } }} />
      <div className={styles.editorTools}><div className={styles.simpleNavigation}><TabNavigation value={section} onChange={setSection} label="Seções da minha página" idPrefix="page-editor" items={sections} /></div><div className={styles.toolsActions}><Button disabled={pending || !profileCanSave(draft)} onClick={() => void action('preview')}><ActionIcon name="preview" />Ver prévia</Button><RefreshButton disabled={pending} onClick={() => setConfirmReload(true)} />{state.publishedVersion !== null ? <details ref={pageOptions} className={styles.pageOptions}><summary aria-label="Mais opções da página">⋯</summary><div>{state.publishedVersion !== null ? <><ButtonLink variant="ghost" href={'/p/' + (published?.slug ?? draft.slug)}>Abrir minha página</ButtonLink><Button variant="danger" disabled={pending} onClick={() => { if (pageOptions.current) pageOptions.current.open = false; setConfirmUnpublish(true) }}>Retirar do ar</Button></> : null}</div></details> : null}</div></div>
      {saveLabel ? <p className={styles.autosave} role="status" aria-live="polite">{saveLabel}</p> : null}
      {confirmReload ? <div className={styles.warning} role="group" aria-label="Recarregar perfil"><p>Recarregar substitui o que ainda não foi salvo nesta aba.</p><div className={styles.actions}><Button disabled={pending} onClick={() => void load()}>Confirmar recarregamento</Button><Button variant="secondary" onClick={() => setConfirmReload(false)}>Cancelar</Button></div></div> : null}
      {confirmUnpublish ? <div className={styles.warning} role="group" aria-label="Retirar perfil"><p>Retirar sua página do ar? O rascunho continua salvo.</p><div className={styles.actions}><Button variant="danger" disabled={pending} onClick={() => void action('unpublish')}>Confirmar retirada</Button><Button variant="secondary" onClick={() => setConfirmUnpublish(false)}>Cancelar retirada</Button></div></div> : null}

      <form aria-label="Editar perfil" data-layout="profile-form" className={styles.form} onSubmit={event => { event.preventDefault(); void model.flush().catch(() => {}) }}>
        <div hidden={section === 'appearance'} role="tabpanel" id={'page-editor-panel-' + (section === 'appearance' ? 'fields-hidden' : section)} aria-labelledby={'page-editor-' + section} className={section === 'groups' ? styles.groupsFrame : styles.formFrame} ><fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Dados da página</legend><ProfileFields content={draft} onChange={content => { retry.current = null; model.change(content); setNotice('') }} published={state.publishedVersion !== null} catalog={catalog} onPhoto={file => void action('photo', file)} step={section === 'groups' ? 2 : section === 'identity' ? 0 : -1} /></fieldset></div>
        {section === 'appearance' ? <section role="tabpanel" id="page-editor-panel-appearance" aria-labelledby="page-editor-appearance"><fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Aparência da página</legend><ProfileAppearanceEditor content={draft} onChange={content => { retry.current = null; model.change(content); setNotice('') }} /></fieldset></section> : null}
      </form>
    </> : null}
  </section></ProfileChanges>
}
