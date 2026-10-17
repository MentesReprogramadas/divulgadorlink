'use client'
import { ReviewStatus } from '@/features/content-review/components/review-status'
import { sendContentAppeal } from '@/features/content-review/review-api'
import type { ContentReview } from '@/features/content-review/review-contract'

import { TabNavigation } from '@/components/ui/tabs'
import { ProfileAppearanceEditor } from './components/profile-appearance-editor'
import { ProfileEditorSkeleton } from './components/profile-editor-skeleton'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { FormSteps } from '@/components/ui/form-steps'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import { profileStatus } from './profile-status'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { ProfileFields } from './components/profile-fields'
import { emptyProfile, type ProfileContent, type ProfileDraft, type ProfileState } from './profile-contract'
import { profileCatalog, profileRequest } from './profile-api'
import { prepareAvatar } from './prepare-avatar'
import styles from './components/profiles.module.css'

export function ProfileEditor() {
  const router = useRouter()
  const [review, setReview] = useState<ContentReview | null>(null)
  const [step, setStep] = useState(0)
  const [section, setSection] = useState<'content' | 'appearance'>('content')
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile), [published, setPublished] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>([]), [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmReload, setConfirmReload] = useState(false), [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const busy = useRef(false), status = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => { if (notice) status.current?.focus() }, [notice])
  const [dirty, setDirty] = useState(false)
  const load = useCallback(async () => {
    setError('')
    try {
      const [state, links] = await Promise.all([profileRequest<ProfileState>(''), profileCatalog()])
      setReview(state.review ?? null); setDraft(state.draft ?? emptyProfile()); setPublished(state.publishedVersion); setCatalog(links); setDirty(false); setPhase('ready'); setConfirmReload(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar o perfil.'); setPhase(p => p === 'loading' ? 'error' : p) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function action(kind: 'save' | 'preview' | 'publish' | 'unpublish', photo?: File) {
    if (busy.current) return
    busy.current = true; setPending(true); setError(''); setNotice('')
    try {
      if (photo) {
        const base64 = await prepareAvatar(photo)
        const result = await profileRequest<{ avatarAssetId: string }>('/avatar', { method: 'POST', body: JSON.stringify({ base64 }) })
        setDraft(previous => ({ ...previous, avatarAssetId: result.avatarAssetId })); setDirty(true); setNotice('Foto recebida. Salve o rascunho e publique para colocá-la no ar.')
      } else if (kind === 'unpublish') {
        const state = await profileRequest<ProfileState>('/unpublish', { method: 'POST', body: JSON.stringify({ expectedVersion: draft.version }) }); setDraft(previous => ({ ...previous, version: state.draft?.version ?? previous.version })); setPublished(null); setConfirmUnpublish(false); setNotice('Perfil retirado do ar. O rascunho foi mantido.')
      } else {
        const { version, ...content } = draft
        const state = await profileRequest<ProfileState>('', { method: 'PATCH', body: JSON.stringify({ expectedVersion: version, content }) })
        if (!state.draft) throw new Error('O servidor não confirmou o rascunho.')
        setDraft(state.draft); setReview(state.review ?? null); setPublished(state.publishedVersion); setDirty(false)
        if (kind === 'preview') { router.push('/painel/perfil/previa') }
        else if (kind === 'publish') {
          const result = await profileRequest<{ publishedRevisionId: number | null; review?: ContentReview | null }>('/publish', { method: 'POST', body: JSON.stringify({ expectedVersion: state.draft.version }) })
          setPublished(result.publishedRevisionId); setReview(result.review ?? null); setNotice(result.review?.status === 'PENDING' ? 'Página enviada para revisão humana.' : result.review?.status === 'REJECTED' ? 'Esta versão foi recusada. Você pode contestar ou corrigir.' : 'Perfil publicado.')
        } else setNotice('Rascunho salvo. Publique para atualizar sua página.')
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar. Seus dados foram mantidos.') }
    finally { busy.current = false; setPending(false) }
  }
  function change(content: ProfileContent) { setDraft({ ...content, version: draft.version }); setDirty(true); setNotice('') }
  const publication = profileStatus(dirty, published, draft.version)
  return <section className={styles.editor} aria-label="Editor do perfil">
    <div className={styles.toolbar}>{phase === 'ready' && !['PENDING', 'REJECTED'].includes(review?.status ?? '') ? <Badge kind="status" tone={publication.tone}>{publication.label}</Badge> : null}<div className={styles.toolbarActions}><WorkspaceActions>{phase === 'ready' && published !== null ? <ButtonLink variant="secondary" href={'/p/' + draft.slug}><ActionIcon name="external" />Abrir minha página</ButtonLink> : null}<RefreshButton disabled={pending} onClick={() => phase === 'ready' ? setConfirmReload(true) : void load()} /></WorkspaceActions></div></div>
    {confirmReload ? <div role="group" aria-label="Recarregar perfil"><p>Recarregar descarta as alterações não salvas nesta aba.</p><div className={styles.actions}><Button onClick={() => void load()}><ActionIcon name="refresh" />Confirmar recarregamento</Button><Button variant="secondary" onClick={() => setConfirmReload(false)}><ActionIcon name="close" />Cancelar</Button></div></div> : null}
    {error ? <p role="alert">{error}</p> : null}<p role="status" ref={status} tabIndex={-1} className={styles.status}>{notice}</p>
    <ReviewStatus review={review} pending={pending} onAppeal={async text => { if (busy.current || !review) throw new Error('Aguarde a operação atual.'); busy.current = true; setPending(true); try { setReview(await sendContentAppeal(review.id, text)); setNotice('Contestação enviada para revisão humana.') } finally { busy.current = false; setPending(false) } }} />
    {phase === 'loading' ? <ProfileEditorSkeleton /> : phase === 'error' ? <p>Atualize os dados para tentar novamente.</p> : <>
      <TabNavigation value={section} onChange={setSection} label="Editar minha página" idPrefix="page-editor" items={[{ id: 'content', label: 'Conteúdo' }, { id: 'appearance', label: 'Aparência' }]} />
      <div hidden={section !== 'content'} role="tabpanel" id="page-editor-panel-content" aria-labelledby="page-editor-content" className={styles.formFrame} data-layout="profile-form"><form aria-label="Editar perfil" className={styles.form} onSubmit={e => { e.preventDefault(); if (step < 3) setStep(step + 1); else void action('save') }}>
        <p className={styles.note}>Crie uma página pública com seus links, foto e grupos.</p>
        <FormSteps labels={['Sua página', 'Foto e acesso', 'Grupos e links', 'Publicar']} current={step} onBack={setStep} />
        <fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Dados do perfil</legend><ProfileFields content={draft} onChange={change} published={published !== null} catalog={catalog} onPhoto={file => void action('save', file)} step={step} />
          <div className={styles.actions}>{step > 0 ? <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}><ActionIcon name="back" />Voltar</Button> : null}{step < 3 ? <Button type="submit"><ActionIcon name="next" />Continuar</Button> : <><Button type="submit" loading={pending}><ActionIcon name="save" />Salvar rascunho</Button><Button type="button" variant="secondary" onClick={e => { if (e.currentTarget.form?.reportValidity()) void action('preview') }}><ActionIcon name="preview" />Ver prévia</Button><Button type="button" onClick={e => { if (e.currentTarget.form?.reportValidity()) void action('publish') }}><ActionIcon name="publish" />Publicar perfil</Button></>}</div>
        </fieldset>
      </form></div>
      {section === 'appearance' ? <section role="tabpanel" id="page-editor-panel-appearance" aria-labelledby="page-editor-appearance"><fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Aparência da página</legend><ProfileAppearanceEditor content={draft} onChange={change} /><div className={styles.actions}><Button loading={pending} onClick={() => void action('save')}><ActionIcon name="save" />Salvar rascunho</Button><Button variant="secondary" onClick={() => void action('preview')}><ActionIcon name="preview" />Ver prévia</Button><Button onClick={() => void action('publish')}><ActionIcon name="publish" />Publicar perfil</Button></div></fieldset></section> : null}
      {published !== null ? confirmUnpublish ? <div role="group" aria-label="Retirar perfil"><p>Retirar seu perfil do ar? O rascunho continua salvo.</p><div className={styles.actions}><Button disabled={pending} onClick={() => void action('unpublish')}><ActionIcon name="trash" />Confirmar retirada</Button><Button variant="secondary" onClick={() => setConfirmUnpublish(false)}><ActionIcon name="trash" />Cancelar retirada</Button></div></div> : <Button variant="secondary" disabled={pending} onClick={() => setConfirmUnpublish(true)}><ActionIcon name="trash" />Retirar do ar</Button> : null}

    </>}
  </section>
}
