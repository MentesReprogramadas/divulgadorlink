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
import { Field, Select } from '@/components/ui/input'
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

type EditorSection = 'content' | 'groups' | 'identity' | 'photo' | 'appearance' | 'publish'
const managementSections: Array<{ id: EditorSection; label: string }> = [{ id: 'groups', label: 'Grupos e links' }, { id: 'identity', label: 'Sua página' }, { id: 'photo', label: 'Foto e acesso' }, { id: 'appearance', label: 'Aparência' }, { id: 'publish', label: 'Publicação' }]

export function ProfileEditor() {
  const router = useRouter()
  const [review, setReview] = useState<ContentReview | null>(null)
  const [step, setStep] = useState(0)
  const [section, setSection] = useState<EditorSection>('content')
  const [configured, setConfigured] = useState(false)
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
      setConfigured(state.draft !== null); setSection(state.draft ? 'groups' : 'content'); setStep(0)
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
          setPublished(result.publishedRevisionId); setReview(result.review ?? null); setConfigured(true); setSection('publish'); setNotice(result.review?.status === 'PENDING' ? 'Página enviada para revisão humana.' : result.review?.status === 'REJECTED' ? 'Esta versão foi recusada. Você pode contestar ou corrigir.' : 'Perfil publicado.')
        } else { setNotice('Rascunho salvo. Publique para atualizar sua página.'); if (!configured) { setConfigured(true); setSection('groups') } }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar. Seus dados foram mantidos.') }
    finally { busy.current = false; setPending(false) }
  }
  function change(content: ProfileContent) { setDraft({ ...content, version: draft.version }); setDirty(true); setNotice('') }
  const currentStep = configured ? section === 'identity' ? 0 : section === 'photo' ? 1 : section === 'groups' ? 2 : section === 'publish' ? 3 : -1 : step
  const sections: Array<{ id: EditorSection; label: string }> = configured ? managementSections : [{ id: 'content', label: 'Criar minha página' }, { id: 'appearance', label: 'Aparência' }]
  const publication = profileStatus(dirty, published, draft.version)
  return <section className={styles.editor} aria-label="Editor do perfil">
    <div className={styles.toolbar}>{phase === 'ready' && !['PENDING', 'REJECTED'].includes(review?.status ?? '') ? <Badge kind="status" tone={publication.tone}>{publication.label}</Badge> : null}<div className={styles.toolbarActions}><WorkspaceActions>{phase === 'ready' && published !== null ? <ButtonLink variant="secondary" href={'/p/' + draft.slug}><ActionIcon name="external" />Abrir minha página</ButtonLink> : null}<RefreshButton disabled={pending} onClick={() => phase === 'ready' ? setConfirmReload(true) : void load()} /></WorkspaceActions></div></div>
    {confirmReload ? <div className={styles.warning} role="group" aria-label="Recarregar perfil"><p>Recarregar descarta as alterações não salvas nesta aba.</p><div className={styles.actions}><Button onClick={() => void load()}><ActionIcon name="refresh" />Confirmar recarregamento</Button><Button variant="secondary" onClick={() => setConfirmReload(false)}><ActionIcon name="close" />Cancelar</Button></div></div> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}<p role="status" ref={status} tabIndex={-1} className={styles.status}>{notice}</p>
    <ReviewStatus review={review} pending={pending} onAppeal={async text => { if (busy.current || !review) throw new Error('Aguarde a operação atual.'); busy.current = true; setPending(true); try { setReview(await sendContentAppeal(review.id, text)); setNotice('Contestação enviada para revisão humana.') } finally { busy.current = false; setPending(false) } }} />
    {phase === 'loading' ? <ProfileEditorSkeleton /> : phase === 'error' ? <p>Atualize os dados para tentar novamente.</p> : <>
      <div className={styles.desktopSections}><TabNavigation value={section} onChange={setSection} label="Editar minha página" idPrefix="page-editor" items={sections} /></div>
      <div className={styles.mobileSections}><Field label="Editar minha página"><Select value={section} onChange={event => setSection(event.target.value as EditorSection)}>{sections.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field></div>
      <form id="profile-editor-form" aria-label="Editar perfil" className={styles.form} onSubmit={event => { event.preventDefault(); if (!configured && section === 'content' && step < 3) setStep(step + 1); else void action('save') }}>
        <div hidden={section === 'appearance'} role="tabpanel" id={'page-editor-panel-' + (section === 'appearance' ? 'fields-hidden' : section)} aria-labelledby={'page-editor-' + section} className={configured && currentStep === 2 ? styles.groupsFrame : styles.formFrame} data-layout="profile-form">
          <div className={styles.form}>
            {!configured ? <><header className={styles.intro}><h2>Crie sua página de links</h2><p className={styles.note}>Comece pela apresentação, organize seus grupos e confira antes de publicar.</p></header><FormSteps labels={['Sua página', 'Foto e acesso', 'Grupos e links', 'Revisar e publicar']} current={step} onBack={setStep} /></> : null}
            <fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Dados do perfil</legend><ProfileFields content={draft} onChange={change} published={published !== null} catalog={catalog} onPhoto={file => void action('save', file)} step={section === 'appearance' ? -1 : currentStep} />
              {currentStep === 3 ? <div className={styles.reviewActions}><Button type="button" variant="secondary" onClick={() => setSection('appearance')}>Personalizar aparência</Button><p className={styles.note}>Confira a prévia e publique quando tudo estiver pronto.</p></div> : null}
              {!configured ? <div className={styles.actions}>{step > 0 ? <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}><ActionIcon name="back" />Voltar</Button> : null}{step < 3 ? <Button type="submit"><ActionIcon name="next" />Continuar</Button> : null}</div> : null}
            </fieldset>
          </div>
        </div>
        {section === 'appearance' ? <section role="tabpanel" id="page-editor-panel-appearance" aria-labelledby="page-editor-appearance"><fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Aparência da página</legend>{!configured ? <div className={styles.sectionHeading}><Button type="button" variant="secondary" onClick={() => { setStep(3); setSection('content') }}><ActionIcon name="back" />Voltar à revisão</Button></div> : null}<ProfileAppearanceEditor content={draft} onChange={change} /></fieldset></section> : null}
      </form>
      {configured || step === 3 || section === 'appearance' ? <div className={styles.saveBar}><p className={styles.note}>{dirty ? 'Alterações só aparecem no público depois de publicar.' : 'Salve para continuar depois ou confira sua página antes de publicar.'}</p><fieldset disabled={pending} className={styles.saveActions}><legend className={styles.visuallyHidden}>Salvar e publicar</legend><Button type="submit" form="profile-editor-form" loading={pending}><ActionIcon name="save" />Salvar rascunho</Button><Button type="button" variant="secondary" onClick={() => { const form = document.getElementById('profile-editor-form') as HTMLFormElement | null; if (form?.reportValidity()) void action('preview') }}><ActionIcon name="preview" />Ver prévia</Button><Button type="button" onClick={() => { const form = document.getElementById('profile-editor-form') as HTMLFormElement | null; if (form?.reportValidity()) void action('publish') }}><ActionIcon name="publish" />Publicar perfil</Button></fieldset></div> : null}
      {published !== null ? <details className={styles.publicationManagement}><summary>Gerenciar publicação</summary>{confirmUnpublish ? <div className={styles.warning} role="group" aria-label="Retirar perfil"><p>Retirar seu perfil do ar? O rascunho continua salvo.</p><div className={styles.actions}><Button variant="danger" disabled={pending} onClick={() => void action('unpublish')}><ActionIcon name="disable" />Confirmar retirada</Button><Button variant="secondary" onClick={() => setConfirmUnpublish(false)}><ActionIcon name="close" />Cancelar retirada</Button></div></div> : <Button variant="danger" disabled={pending} onClick={() => setConfirmUnpublish(true)}><ActionIcon name="disable" />Retirar do ar</Button>}</details> : null}
    </>}
  </section>
}
