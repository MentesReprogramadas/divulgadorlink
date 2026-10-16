'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProfileFields } from './components/profile-fields'
import { ProfileView } from './components/profile-view'
import { emptyProfile, type ProfileContent, type ProfileDraft, type ProfileState, type PublicProfile } from './profile-contract'
import { profileCatalog, profileRequest } from './profile-api'
import { ProfileAgeGate } from './profile-age-gate'
import { prepareAvatar } from './prepare-avatar'
import styles from './components/profiles.module.css'

export function ProfileEditor() {
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile), [published, setPublished] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>([]), [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [preview, setPreview] = useState<PublicProfile | null>(null), [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmReload, setConfirmReload] = useState(false), [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const busy = useRef(false), status = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => { if (notice) status.current?.focus() }, [notice])
  const [dirty, setDirty] = useState(false)
  const load = useCallback(async () => {
    setError('')
    try {
      const [state, links] = await Promise.all([profileRequest<ProfileState>(''), profileCatalog()])
      setDraft(state.draft ?? emptyProfile()); setPublished(state.publishedVersion); setCatalog(links); setPreview(null); setDirty(false); setPhase('ready'); setConfirmReload(false)
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
        setDraft(previous => ({ ...previous, avatarAssetId: result.avatarAssetId })); setDirty(true); setPreview(null); setNotice('Foto recebida. Salve o rascunho e publique para colocá-la no ar.')
      } else if (kind === 'unpublish') {
        const state = await profileRequest<ProfileState>('/unpublish', { method: 'POST', body: JSON.stringify({ expectedVersion: draft.version }) }); setDraft(previous => ({ ...previous, version: state.draft?.version ?? previous.version })); setPublished(null); setConfirmUnpublish(false); setNotice('Perfil retirado do ar. O rascunho foi mantido.')
      } else {
        const { version, ...content } = draft
        const state = await profileRequest<ProfileState>('', { method: 'PATCH', body: JSON.stringify({ expectedVersion: version, content }) })
        if (!state.draft) throw new Error('O servidor não confirmou o rascunho.')
        setDraft(state.draft); setPublished(state.publishedVersion); setDirty(false)
        if (kind === 'preview') { setPreview(await profileRequest<PublicProfile>('/preview')); setNotice('Prévia do rascunho. A publicação ainda não foi alterada.') }
        else if (kind === 'publish') {
          const result = await profileRequest<{ publishedRevisionId: number }>('/publish', { method: 'POST', body: JSON.stringify({ expectedVersion: state.draft.version }) })
          setPublished(result.publishedRevisionId); setNotice('Perfil publicado.')
        } else setNotice('Rascunho salvo. Publique para atualizar sua página.')
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar. Seus dados foram mantidos.') }
    finally { busy.current = false; setPending(false) }
  }
  function change(content: ProfileContent) { setDraft({ ...content, version: draft.version }); setDirty(true); setPreview(null); setNotice('') }
  return <section className={styles.editor} aria-label="Editor do perfil">
    <header><h2>Seu perfil público</h2><p className={styles.note}>Reúna seus links em uma página. Organize, confira a prévia e publique.</p></header>
    <div className={styles.actions}>{phase === 'ready' ? <><span>{dirty ? 'Alterações não salvas' : published === null ? 'Ainda não publicado' : published === draft.version ? 'Publicado' : 'Alterações em rascunho'}</span>{published !== null ? <a href={'/p/' + draft.slug}>Abrir perfil público</a> : null}</> : null}<Button variant="secondary" disabled={pending} onClick={() => phase === 'ready' ? setConfirmReload(true) : void load()}>Atualizar dados</Button></div>
    {confirmReload ? <div role="group" aria-label="Recarregar perfil"><p>Recarregar descarta as alterações não salvas nesta aba.</p><div className={styles.actions}><Button onClick={() => void load()}>Confirmar recarregamento</Button><Button variant="secondary" onClick={() => setConfirmReload(false)}>Cancelar</Button></div></div> : null}
    {error ? <p role="alert">{error}</p> : null}<p role="status" ref={status} tabIndex={-1} className={styles.status}>{notice}</p>
    {phase === 'loading' ? <p role="status">Carregando perfil…</p> : phase === 'error' ? <p>Atualize os dados para tentar novamente.</p> : <>
      <div className={styles.formFrame}><form aria-label="Editar perfil" className={styles.form} onSubmit={e => { e.preventDefault(); void action('save') }}>
        <fieldset disabled={pending} className={styles.controls}><legend className={styles.visuallyHidden}>Dados do perfil</legend><ProfileFields content={draft} onChange={change} published={published !== null} catalog={catalog} onPhoto={file => void action('save', file)} />
          <div className={styles.actions}><Button type="submit" loading={pending}>Salvar rascunho</Button><Button type="button" variant="secondary" onClick={e => { if (e.currentTarget.form?.reportValidity()) void action('preview') }}>Ver prévia</Button><Button type="button" onClick={e => { if (e.currentTarget.form?.reportValidity()) void action('publish') }}>Publicar perfil</Button></div>
        </fieldset>
      </form></div>
      {published !== null ? confirmUnpublish ? <div role="group" aria-label="Retirar perfil"><p>Retirar seu perfil do ar? O rascunho continua salvo.</p><div className={styles.actions}><Button disabled={pending} onClick={() => void action('unpublish')}>Confirmar retirada</Button><Button variant="secondary" onClick={() => setConfirmUnpublish(false)}>Cancelar retirada</Button></div></div> : <Button variant="secondary" disabled={pending} onClick={() => setConfirmUnpublish(true)}>Retirar do ar</Button> : null}
      {preview ? <section className={styles.preview} aria-label="Prévia do perfil"><h2>Prévia do rascunho</h2>{preview.restricted ? <ProfileAgeGate /> : <ProfileView content={preview} heading="h3" avatarUrl={preview.avatarAssetId ? '/bff/v1/me/profile/avatar/' + preview.avatarAssetId : undefined} />}</section> : null}
    </>}
  </section>
}
