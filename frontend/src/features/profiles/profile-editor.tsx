'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {ErrorState} from '@/components/feedback/error-state'
import {DiscoverySettings} from '@/features/profile-discovery/discovery-settings'
import type {ContactDefinition,ContactFormDescriptor} from '@/features/contact-forms/contact-contract'
import {ContactSettingsPanel} from '@/features/contact-forms/contact-settings-panel'
import {useWorkspaceIdentity} from '@/features/workspace-team/workspace-access'
import {ProfileEditingLayout} from './components/profile-editing-layout'
import {ProfileCreationChoice} from './components/profile-creation-choice'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { ReviewStatus } from '@/features/content-review/components/review-status'
import { sendContentAppeal } from '@/features/content-review/review-api'
import { ProfileAppearanceEditor } from './components/profile-appearance-editor'
import { ProfileEditorSkeleton } from './components/profile-editor-skeleton'
import { ProfileFields } from './components/profile-fields'
import { ProfileChanges } from './components/profile-changes'
import { useProfileDraft } from './use-profile-draft'
import { hasUnpublishedProfile, profileCanSave } from './profile-diff'
import { isProfileVersionConflict, profileCatalog, profileRequest, profileWorkspacePath, profileScope } from './profile-api'
import type { ProfileState,PublicProfile } from './profile-contract'
import { prepareAvatar } from './prepare-avatar'
import { QrDialog } from '@/features/permanent-qr/qr-dialog'
import { stableQrTarget, type StableQrTarget } from '@/features/permanent-qr/qr-target'
import styles from './components/profiles.module.css'
import {setProfileChannelPaused} from '@/features/profile-channels/channel-actions'
import { ProfileEditorToolbar } from './components/profile-editor-toolbar'
import { ProfileOverview } from './components/profile-overview'
import type {ProfileEditorSection} from './profile-editor-section'

type Section = ProfileEditorSection
export function ProfileEditor({initialSection,collaborative=false,resourceId}:{initialSection?:ProfileEditorSection;collaborative?:boolean;resourceId?:string}={}) {
  const workspace=useWorkspaceIdentity()
  const router = useRouter(), model = useProfileDraft(resourceId)
  const request=useCallback(<T,>(path:string,init?:RequestInit)=>resourceId?profileRequest<T>(path,profileScope(init,resourceId)):init===undefined?profileRequest<T>(path):profileRequest<T>(path,init),[resourceId])
  const [section, setSection] = useState<Section>(initialSection??'overview'), [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading'), [pending, setPending] = useState(false), [notice, setNotice] = useState('')
  const [confirmReload, setConfirmReload] = useState(false), [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [pageUrl, setPageUrl] = useState('')
  const [groupPrimary,setGroupPrimary]=useState<HTMLDivElement|null>(null),[groupOptions,setGroupOptions]=useState<HTMLDivElement|null>(null)
  const [qrTarget, setQrTarget] = useState<StableQrTarget | null>(null)
  const qrTrigger = useRef<HTMLButtonElement | null>(null)
  const retry = useRef<(() => void) | null>(null)
  const sectionTarget = useRef<Section | null>(null)
  const busy = useRef(false), status = useRef<HTMLParagraphElement>(null)
  function openSection(next: Section) { if(!collaborative){if(next==='identity'&&!profileCanSave(model.draft)){router.push('/painel/perfil/dados');return}void model.flush().then(()=>router.push({overview:'/painel/perfil',identity:'/painel/perfil/dados',groups:'/painel/perfil/links',appearance:'/painel/perfil/aparencia'}[next])).catch(()=>{});return} sectionTarget.current = next; setSection(next) }
  useLayoutEffect(() => { if (sectionTarget.current === section) { document.getElementById('page-editor-' + section)?.focus(); sectionTarget.current = null } }, [section])
  const [previewForm,setPreviewForm]=useState<ContactFormDescriptor|null>(null),[previewError,setPreviewError]=useState(''),previewClock=useRef(0)
  const changeContactPreview=useCallback((definition:ContactDefinition)=>{previewClock.current++;setPreviewError('');setPreviewForm(definition.enabled?{revisionId:'editor-preview',definition}:null)},[])
  const loadContactPreview=useCallback(async()=>{const generation=previewClock.current;setPreviewError('');try{const presentation=await request<PublicProfile>('/preview/items');if(generation===previewClock.current)setPreviewForm(presentation?.restricted===false?presentation.contactForm??null:null)}catch{if(generation===previewClock.current)setPreviewError('Não foi possível carregar o formulário na prévia.')}},[request])
  const { replace, setError } = model
  useLayoutEffect(() => { if (notice) status.current?.focus() }, [notice])
  const load = useCallback(async () => {
    try {
      const [state, links] = await Promise.all([request<ProfileState>(''), profileCatalog(resourceId)])
      replace(state);if(state.draft)await loadContactPreview();else setPreviewForm(null); setSection(initialSection??'overview'); setCatalog(links); setPhase('ready'); setConfirmReload(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar.'); setPhase(previous => previous === 'loading' ? 'error' : previous) }
  }, [replace, setError,initialSection,resourceId,request,loadContactPreview])
  useEffect(() => { void load() }, [load])
  const { draft, state } = model, published = state.publishedContent ?? null
  const navigating=useRef(false)
  useEffect(()=>{
    if(phase!=='ready')return
    const leave=(event:MouseEvent)=>{
      if(model.saveState==='saved'||!state.draft&&!draft.name&&!draft.slug||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return
      const anchor=(event.target as Element).closest?.('a[href]') as HTMLAnchorElement|null
      if(!anchor||anchor.download||anchor.target==='_blank')return
      const destination=new URL(anchor.href,window.location.href)
      if(destination.origin!==window.location.origin||destination.pathname+destination.search===window.location.pathname+window.location.search)return
      event.preventDefault();event.stopImmediatePropagation()
      if(navigating.current)return
      navigating.current=true
      void model.flush().then(()=>router.push(destination.pathname+destination.search+destination.hash)).catch(reason=>setError(reason instanceof Error?reason.message:'Salve as alterações antes de sair.')).finally(()=>{navigating.current=false})
    }
    document.addEventListener('click',leave,true);return()=>document.removeEventListener('click',leave,true)
  },[phase,model.saveState,model.flush,router,setError,state.draft,draft.name,draft.slug])
  useEffect(() => { setPageUrl(state.publishedVersion !== null ? new URL('/p/' + (published?.slug ?? draft.slug), window.location.origin).href : '') }, [state.publishedVersion, published?.slug, draft.slug])
  const changed = hasUnpublishedProfile(draft, published)||Boolean(state.channelChanges), review = state.review
  async function toggleInvite(groupId:string,channelId:string,paused:boolean,trigger:HTMLElement){
    if(busy.current)return
    busy.current=true;setPending(true);setError('')
    try{replace(await setProfileChannelPaused(model.flush,groupId,channelId,paused))}
    catch(reason){if(isProfileVersionConflict(reason))model.markConflict();setError(reason instanceof Error?reason.message:'Não foi possível atualizar o convite.')}
    finally{busy.current=false;setPending(false);requestAnimationFrame(()=>{if(trigger.isConnected)trigger.focus()})}
  }
  async function action(kind: 'preview' | 'publish' | 'discard' | 'unpublish' | 'photo' | 'copy' | 'history' | 'qr' | 'templates' | 'import' | 'metrics' | 'checklist' | 'export' | 'campaigns' | 'mediaKit', file?: File) {
    if (busy.current) return
    if(collaborative&&!['preview','publish','discard','unpublish','photo','copy','qr'].includes(kind)){setError('Esta ação é exclusiva do proprietário.');return}
    busy.current = true; retry.current = null; setPending(true); setError(''); setNotice('')
    try {
      if (kind === 'copy') {
        try { await navigator.clipboard.writeText(pageUrl) } catch { throw new Error('Não foi possível copiar. Selecione o link da página e copie manualmente.') }
        if(!collaborative)void request('/checklist/actions',{method:'POST',body:JSON.stringify({action:'LINK_COPIED',expectedVersion:state.draft?.version??draft.version})}).catch(()=>undefined)
        setNotice('Link da página copiado.')
      }
      else if (kind === 'qr') {
        const current = await request<ProfileState>('')
        if (current.publishedVersion === null || !current.publishedContent) throw new Error('Publique sua página antes de gerar o QR Code. Seu rascunho foi mantido.')
        setQrTarget(stableQrTarget(window.location.origin, { kind: 'PROFILE', path: '/p/' + current.publishedContent.slug }))
      }
      else if (kind === 'discard') { await model.discard(); setNotice('Alterações descartadas. A versão publicada foi restaurada.') }
      else if (kind === 'photo' && file) {
        const base64 = await prepareAvatar(file)
        const result = await request<{ avatarAssetId: string }>('/avatar', { method: 'POST', body: JSON.stringify({ base64 }) })
        model.change({ ...draft, avatarAssetId: result.avatarAssetId })
      } else {
        const saved = await model.flush()
        if (kind === 'checklist') router.push('/painel/perfil/checklist')
        else if (kind === 'metrics') router.push('/painel/perfil/metricas')
        else if(kind==='mediaKit')router.push('/painel/perfil/midia-kit')
        else if (kind === 'campaigns') router.push('/painel/perfil/campanhas')
        else if (kind === 'export') router.push('/painel/perfil/exportar')
        else if (kind === 'history') router.push('/painel/perfil/historico')
        else if (kind === 'templates') router.push('/painel/perfil/modelos')
        else if (kind === 'import') router.push('/painel/perfil/importar')
        else if (kind === 'preview') {if(!collaborative)void request('/checklist/actions',{method:'POST',body:JSON.stringify({action:'PREVIEW_REQUESTED',expectedVersion:saved.version})}).catch(()=>undefined);router.push(profileWorkspacePath('previa',resourceId??null))}
        else if (kind === 'unpublish') {
          replace(await request<ProfileState>('/unpublish', { method: 'POST', body: JSON.stringify({ expectedVersion: saved.version }) }))
          setConfirmUnpublish(false); setNotice('Perfil retirado do ar. O rascunho foi mantido.')
        } else if (kind === 'publish') {
          const result = await request<{ review?: ProfileState['review'] }>('/publish', { method: 'POST', body: JSON.stringify({ expectedVersion: saved.version }) })
          replace(await request<ProfileState>(''))
          setNotice(result.review?.status === 'PENDING' ? 'Página enviada para revisão humana.' : result.review?.status === 'REJECTED' ? 'Esta versão foi recusada. Você pode contestar ou corrigir.' : 'Perfil publicado.')
        }
      }
    } catch (reason) { retry.current = () => void action(kind, file); if (isProfileVersionConflict(reason)) model.markConflict(); setError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Suas alterações foram mantidas.') }
    finally { busy.current = false; setPending(false) }
  }
  if(collaborative&&state.access?.role==='VIEWER')return <section className={styles.editor}><p>Você tem acesso de leitura a esta página.</p><Button onClick={()=>router.push(profileWorkspacePath('previa',resourceId??null))}><ActionIcon name="preview"/>Ver prévia</Button></section>
  const choosing=!collaborative&&!state.draft&&section==='overview',canConfigureContacts=!collaborative&&(!workspace?.ownerId||workspace.grants?.contacts?.read===true)
  const saveLabel = model.saveState === 'saving' ? 'Salvando…' : model.saveState === 'incomplete' ? 'Complete os dados da página para salvar' : ''
  return <ProfileChanges published={published}><section className={styles.editor} aria-label="Editor do perfil" data-save-state={model.saveState}>
    {model.error ? <div className={styles.error} role="alert"><span>{model.error}</span><Button variant="secondary" disabled={pending} onClick={() => phase === 'error' ? void load() : model.isConflict() ? setConfirmReload(true) : retry.current ? retry.current() : void model.flush().catch(() => {})}>{model.isConflict() ? 'Recarregar' : 'Tentar novamente'}</Button></div> : null}
    <p role="status" ref={status} tabIndex={-1} className={styles.operationNotice}>{notice}</p>
    {phase === 'loading' ? <ProfileEditorSkeleton collaborative={collaborative} section={initialSection??'overview'}/> : phase === 'ready' ? <>

      {changed ? <section className={styles.changeBanner} aria-label="Alterações não publicadas"><strong>Tem alterações não publicadas</strong><div className={styles.bannerActions}><span title={!published ? 'Disponível depois da primeira publicação' : undefined}><Button variant="secondary" disabled={pending || !published} onClick={() => void action('discard')}><ActionIcon name="restore"/>Descartar</Button></span><Button disabled={pending || !profileCanSave(draft) || review?.status === 'PENDING'} loading={pending} onClick={() => void action('publish')}><ActionIcon name="publish"/>Publicar</Button></div></section> : null}
      <ReviewStatus review={collaborative?review?{...review,canAppeal:false}:null:review} pending={pending} onAppeal={async text => { if (busy.current || !review) throw new Error('Aguarde a operação atual.'); busy.current = true; setPending(true); try { await model.flush(); model.setReview(await sendContentAppeal(review.id, text)); setNotice('Contestação enviada para revisão humana.') } finally { busy.current = false; setPending(false) } }} />
      {!choosing?<ProfileEditorToolbar collaborative={collaborative} groupPrimaryRef={setGroupPrimary} groupOptionsRef={setGroupOptions} section={section} onSection={setSection} pending={pending} canSave={profileCanSave(draft)} publicPath={state.publishedVersion !== null ? '/p/' + (published?.slug ?? draft.slug) : undefined} onAction={kind => void action(kind)} onReload={() => setConfirmReload(true)} onUnpublish={() => setConfirmUnpublish(true)} />:null}
      <ProfileEditingLayout content={{...draft,contactForm:previewForm}} showPreview={!choosing} notice={previewError?<ErrorState readOnlyAllowed message={previewError} onRetry={()=>void loadContactPreview()}/>:undefined}>
      {section === 'overview' ? <section role={choosing?undefined:"tabpanel"} id="page-editor-panel-overview" aria-labelledby={choosing?undefined:"page-editor-overview"}><>{choosing?<ProfileCreationChoice canUseAssistant={!workspace?.ownerId||workspace.grants?.assistant?.read===true}/>:<ProfileOverview onContacts={canConfigureContacts?()=>{if(workspace?.ownerId&&!workspace.grants?.page?.write){router.push('/painel/perfil/contatos');return}void model.flush().then(()=>router.push('/painel/perfil/dados#formulario-contato')).catch(()=>{})}:undefined} collaborative={collaborative} content={draft} published={state.publishedVersion !== null} changed={changed} pending={pending} canSave={profileCanSave(draft)} reviewStatus={review?.status} onSection={openSection} onAction={kind => void action(kind)} sharing={pageUrl ? <div className={styles.publicAddress} role="group" aria-label="Link da sua página"><div><span>Link da sua página</span><a href={pageUrl} target="_blank" rel="noopener noreferrer">{pageUrl}</a></div><div className={styles.publicActions}><Button variant="secondary" aria-label="Copiar link da página" disabled={pending} onClick={() => void action('copy')}><ActionIcon name="copy" />Copiar</Button><Button disabled={pending} onClick={event => { qrTrigger.current = event.currentTarget; void action('qr') }}><ActionIcon name="qr" />QR Code</Button></div></div> : <div className={styles.unpublishedAddress}><p>Publique sua página para ter um link compartilhável e um QR Code.</p><Button variant="secondary" disabled={pending} onClick={() => openSection('identity')}><ActionIcon name="edit"/>Configurar página</Button></div>} />}</></section> : null}
      {saveLabel ? <p className={styles.autosave} role="status" aria-live="polite">{saveLabel}</p> : null}
      {confirmReload ? <div className={styles.warning} role="group" aria-label="Recarregar perfil"><p>Recarregar substitui o que ainda não foi salvo nesta aba.</p><div className={styles.actions}><Button disabled={pending} onClick={() => void load()}>Confirmar recarregamento</Button><Button variant="secondary" onClick={() => setConfirmReload(false)}>Cancelar</Button></div></div> : null}
      {confirmUnpublish ? <div className={styles.warning} role="group" aria-label="Retirar perfil"><p>Retirar sua página do ar? O rascunho continua salvo.</p><div className={styles.actions}><Button variant="danger" disabled={pending} onClick={() => void action('unpublish')}>Confirmar retirada</Button><Button variant="secondary" onClick={() => setConfirmUnpublish(false)}>Cancelar retirada</Button></div></div> : null}

      <form aria-label="Editar perfil" data-layout="profile-form" className={styles.form} onSubmit={event => { event.preventDefault(); void model.flush().catch(() => {}) }}>
        <div hidden={section === 'appearance' || section === 'overview'} role="tabpanel" id={'page-editor-panel-' + (section === 'appearance' || section === 'overview' ? 'fields-hidden' : section)} aria-labelledby={'page-editor-' + section} className={section === 'groups' ? styles.groupsFrame : styles.formFrame} ><fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Dados da página</legend><ProfileFields pending={pending} actionHosts={{primary:groupPrimary,secondary:groupOptions}} channels={{groups:state.channelGroups??[],flush:model.flush,onSaved:replace,onToggle:(groupId,channelId,paused,trigger)=>void toggleInvite(groupId,channelId,paused,trigger)}} scheduling={state.scheduling} content={draft} onChange={content => { retry.current = null; model.change(content); setNotice('') }} published={state.publishedVersion !== null} catalog={catalog} onPhoto={file => void action('photo', file)} step={section === 'groups' ? 2 : section === 'identity' ? 0 : -1} /></fieldset></div>
        {section === 'appearance' ? <section role="tabpanel" id="page-editor-panel-appearance" aria-labelledby="page-editor-appearance"><fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Aparência da página</legend><ProfileAppearanceEditor content={draft} onChange={content => { retry.current = null; model.change(content); setNotice('') }} /></fieldset></section> : null}
      </form>
      {section==='identity'&&canConfigureContacts?<ContactSettingsPanel ready={profileCanSave(draft)} pending={pending} onPrepare={model.flush} onPreviewChange={changeContactPreview}/>:null}
      {section==='identity'&&!collaborative&&(!workspace?.ownerId||workspace.grants?.page?.write===true)?<DiscoverySettings ready={Boolean(state.draft)}/>:null}
      </ProfileEditingLayout>
    </> : null}
    {qrTarget ? <QrDialog target={qrTarget} trigger={qrTrigger.current} onClose={() => setQrTarget(null)} /> : null}
  </section></ProfileChanges>
}

