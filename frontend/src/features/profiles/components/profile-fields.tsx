'use client'
import { ImageUpload } from '@/components/ui/image-upload'
import { Field, Input, TextArea } from '@/components/ui/input'
import type { ProfileContent } from '../profile-contract'
import styles from './profiles.module.css'
import { ProfileGroupManager,type ProfileChannelsNavigation } from './profile-group-manager'
import type { ProfileGroupActionHosts } from './profile-group-actions'
import { ChangedField, useProfileChanges } from './profile-changes'

type Props = { pending?:boolean; actionHosts?:ProfileGroupActionHosts; content: ProfileContent; onChange: (content: ProfileContent) => void; published: boolean; catalog: Array<{ id: string; name: string }>; onPhoto: (file: File) => void; step: number; scheduling?: { allowed: boolean; serverNow: string };channels?:ProfileChannelsNavigation }
export function ProfileFields({ content: c, onChange, published, catalog, onPhoto, step, scheduling,channels,pending,actionHosts }: Props) {
  const changes = useProfileChanges(), change = (patch: Partial<ProfileContent>) => onChange({ ...c, ...patch })
  return <>
    <fieldset hidden={step !== 0} disabled={step !== 0} className={styles.identityFields}><legend>Página</legend>
      <ChangedField changed={changes.field('name', c.name.trim())}><Field label="Nome da página"><Input required maxLength={80} value={c.name} placeholder="Ex.: Receitas da Ana" onChange={event => change({ name: event.target.value })} /></Field></ChangedField>
      <ChangedField changed={changes.field('slug', c.slug.trim().toLowerCase())}><Field label="Endereço da página" hint={published ? 'Retire a página do ar para mudar o endereço.' : '/p/' + (c.slug || 'seu-nome')}><Input required value={c.slug} minLength={3} maxLength={40} placeholder="receitas-da-ana" pattern="[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){1,38}[A-Za-z0-9]" title="Use 3 a 40 letras sem acentos, números e hífens entre palavras." readOnly={published} onChange={event => change({ slug: event.target.value })} /></Field></ChangedField>
      <ChangedField changed={changes.field('bio', c.bio.trim())}><Field label="Descrição"><TextArea maxLength={500} rows={3} value={c.bio} onChange={event => change({ bio: event.target.value })} /></Field></ChangedField>
      <ChangedField changed={changes.field('avatarAssetId', c.avatarAssetId)}><ImageUpload label="Foto do perfil" imageUrl={c.avatarAssetId ? '/bff/v1/me/profile/avatar/' + c.avatarAssetId : undefined} onChoose={onPhoto} onRemove={() => change({ avatarAssetId: null })} /></ChangedField>
      <ChangedField changed={changes.field('requiresAge', c.requiresAge)}><label className={styles.check}><input type="checkbox" checked={c.requiresAge} onChange={event => change({ requiresAge: event.target.checked })} />Conteúdo para maiores de 18 anos</label></ChangedField>
    </fieldset>
    {step === 2 ? <ProfileGroupManager pending={pending} actionHosts={actionHosts} content={c} onChange={onChange} catalog={catalog} scheduling={scheduling} channels={channels} /> : null}
  </>
}
