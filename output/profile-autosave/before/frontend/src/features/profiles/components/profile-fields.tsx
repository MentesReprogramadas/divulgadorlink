'use client'
import { ImageUpload } from '@/components/ui/image-upload'
import { Field, Input, TextArea } from '@/components/ui/input'
import type { ProfileContent } from '../profile-contract'
import styles from './profiles.module.css'
import { ProfileGroupManager } from './profile-group-manager'
type Props = { content: ProfileContent; onChange: (content: ProfileContent) => void; published: boolean; catalog: Array<{ id: string; name: string }>; onPhoto: (file: File) => void; step: number }
export function ProfileFields({ content: c, onChange, published, catalog, onPhoto, step }: Props) {
  const change = (patch: Partial<ProfileContent>) => onChange({ ...c, ...patch })
  return <>
    <fieldset hidden={step !== 0} disabled={step !== 0} className={styles.identityFields}><legend>Sua página</legend>
      <Field label="Personalize o link da sua página" hint={published ? 'Retire a página do ar para mudar este link.' : `Você vai compartilhar /p/${c.slug || 'seu-nome'}. Use 3 a 40 letras, números e hífens.`}><Input required value={c.slug} minLength={3} maxLength={40} placeholder="Ex.: receitas-da-ana" pattern="[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){1,38}[A-Za-z0-9]" title="Use 3 a 40 letras sem acentos, números e hífens entre palavras." readOnly={published} onChange={e => change({ slug: e.target.value })} /></Field>
      <Field label="Título da sua página" hint="Ex.: Receitas da Ana. Este nome aparece no topo da página."><Input required maxLength={80} value={c.name} placeholder="Ex.: Receitas da Ana" onChange={e => change({ name: e.target.value })} /></Field>
      <Field label="Descrição"><TextArea maxLength={500} rows={3} value={c.bio} onChange={e => change({ bio: e.target.value })} /></Field>
    </fieldset>
    <fieldset hidden={step !== 1} disabled={step !== 1} className={styles.identityFields}><legend>Foto e acesso</legend>
      <ImageUpload label="Foto do perfil" imageUrl={c.avatarAssetId ? '/bff/v1/me/profile/avatar/' + c.avatarAssetId : undefined} onChoose={onPhoto} onRemove={() => change({ avatarAssetId: null })} />
      <label className={styles.check}><input type="checkbox" checked={c.requiresAge} onChange={e => change({ requiresAge: e.target.checked })} />Conteúdo para maiores de 18 anos</label>
    </fieldset>
    {step === 2 ? <ProfileGroupManager content={c} onChange={onChange} catalog={catalog} /> : null}
    {step === 3 ? <div className={styles.review}><h2>Confira antes de publicar</h2><p>{c.name} · /p/{c.slug}</p><p>{c.categories.length} grupos · {c.items.length} links</p><p className={styles.note}>Salvar mantém as alterações em rascunho. Publicar atualiza a página após as validações.</p></div> : null}
  </>
}
