'use client'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ImageUpload } from '@/components/ui/image-upload'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { ActionIcon } from '@/components/ui/action-icon'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import type { ProfileContent } from '../profile-contract'
import { moveProfileItem } from '@/domain/profile-order'
import styles from './profiles.module.css'
type Props = { content: ProfileContent; onChange: (content: ProfileContent) => void; published: boolean; catalog: Array<{ id: string; name: string }>; onPhoto: (file: File) => void; step: number }
export function ProfileFields({ content: c, onChange, published, catalog, onPhoto, step }: Props) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const change = (patch: Partial<ProfileContent>) => onChange({ ...c, ...patch })
  const updateItem = (id: string, patch: Partial<ProfileContent['items'][number]>) => change({ items: c.items.map(i => i.id === id ? { ...i, ...patch } : i) })
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
    <fieldset hidden={step !== 2} disabled={step !== 2} className={styles.identityFields}><legend>Link em destaque</legend>
      <Field label="Botão principal"><Select value={c.primaryItemId ?? ''} onChange={e => change({ primaryItemId: e.target.value || null })}><option value="">Sem botão principal</option>{c.items.map(i => <option key={i.id} value={i.id}>{i.label || 'Link sem título'}</option>)}</Select></Field>
    </fieldset>
    {step === 2 ? <>
    {!c.categories.length ? <p className={styles.note}>Crie um grupo para organizar seus links e redes sociais.</p> : null}
    <Button type="button" onClick={() => { const id = crypto.randomUUID(); change({ categories: [...c.categories, { id, name: '', visible: true }] }); setEditingGroup(id) }}><ActionIcon name="plus" />Adicionar grupo</Button>
    {c.categories.map((group, index) => <section className={styles.group} key={group.id} aria-label={'Grupo ' + (index + 1)}>
      <div className={styles.actions}><h2>{group.name || 'Novo grupo'}</h2><Button type="button" variant="secondary" onClick={() => setEditingGroup(group.id)}><ActionIcon name="edit" />Editar grupo {index + 1}</Button></div>
      <OverlayDialog open={editingGroup === group.id} title="Editar grupo" onClose={() => setEditingGroup(null)}><div className={styles.form} onKeyDown={e => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); e.currentTarget.querySelector('button')?.click() } }}>
      <Field label={'Nome do grupo ' + (index + 1)}><Input required maxLength={80} value={group.name} onChange={e => change({ categories: c.categories.map(g => g.id === group.id ? { ...g, name: e.target.value } : g) })} /></Field>
      <label className={styles.check}><input type="checkbox" checked={group.visible} onChange={e => change({ categories: c.categories.map(g => g.id === group.id ? { ...g, visible: e.target.checked } : g) })} />Grupo visível</label>
      <Button type="button" onClick={e => { const input = e.currentTarget.parentElement?.querySelector('input'); if (input?.reportValidity()) setEditingGroup(null) }}><ActionIcon name="save" />Concluir grupo</Button>
      </div></OverlayDialog>
      <div className={styles.actions}><Button type="button" variant="secondary" disabled={!index} onClick={() => change({ categories: moveProfileItem(c.categories, index, index - 1) })}><ActionIcon name="up" />Subir grupo {index + 1}</Button><Button type="button" variant="secondary" disabled={index === c.categories.length - 1} onClick={() => change({ categories: moveProfileItem(c.categories, index, index + 1) })}><ActionIcon name="down" />Descer grupo {index + 1}</Button><Button type="button" variant="secondary" onClick={() => change({ categories: c.categories.filter(g => g.id !== group.id), items: c.items.filter(i => i.categoryId !== group.id), primaryItemId: c.items.some(i => i.categoryId === group.id && i.id === c.primaryItemId) ? null : c.primaryItemId })}><ActionIcon name="trash" />Excluir grupo {index + 1}</Button></div>
      {c.items.filter(i => i.categoryId === group.id).map((item, itemIndex, siblings) => <div key={item.id} className={styles.row} role="group" aria-label={'Link ' + (itemIndex + 1) + ' do grupo ' + (index + 1)}>
        <strong>{item.label || 'Novo link'}</strong><p className={styles.note}>{item.destination || 'Complete o endereço do link.'}</p><Button type="button" variant="secondary" onClick={() => setEditingItem(item.id)}><ActionIcon name="edit" />Editar link</Button>
        <OverlayDialog open={editingItem === item.id} title="Editar link do perfil" onClose={() => setEditingItem(null)}><div className={styles.form} onKeyDown={e => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); e.currentTarget.querySelector('button')?.click() } }}>
        <Field label="Título do link"><Input required maxLength={100} value={item.label} onChange={e => updateItem(item.id, { label: e.target.value })} /></Field>
        <Field label="Tipo de link"><Select value={item.type} onChange={e => updateItem(item.id, { type: e.target.value as typeof item.type, destination: '' })}><option value="URL">Endereço próprio</option><option value="SOCIAL">Rede social</option><option value="CATALOG">Meu link do catálogo</option></Select></Field>
        {item.type === 'CATALOG' ? <Field label="Link do catálogo"><Select required value={item.destination} onChange={e => updateItem(item.id, { destination: e.target.value })}><option value="">Escolha um link publicado</option>{catalog.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field> : <Field label="Link de acesso" icon={<ActionIcon name="link" />} hint="Cole o endereço com https://. Este link ficará apenas no perfil."><Input required type="url" maxLength={2048} value={item.destination} onChange={e => updateItem(item.id, { destination: e.target.value })} /></Field>}
        <label className={styles.check}><input type="checkbox" checked={item.visible} onChange={e => updateItem(item.id, { visible: e.target.checked })} />Link visível</label>
        <Button type="button" onClick={e => { const fields = e.currentTarget.parentElement?.querySelectorAll('input, select'); if (fields && Array.from(fields).every(field => (field as HTMLInputElement).reportValidity())) setEditingItem(null) }}><ActionIcon name="save" />Concluir link</Button>
        </div></OverlayDialog>
        <div className={styles.actions}>{([-1, 1] as const).map(offset => <Button key={offset} type="button" variant="secondary" disabled={offset === -1 ? !itemIndex : itemIndex === siblings.length - 1} onClick={() => {
          const other = siblings[itemIndex + offset], a = c.items.findIndex(i => i.id === item.id), b = c.items.findIndex(i => i.id === other.id); change({ items: moveProfileItem(c.items, a, b) })
        }}><ActionIcon name="up" />{offset === -1 ? 'Subir link' : 'Descer link'}</Button>)}<Button type="button" variant="secondary" onClick={() => change({ items: c.items.filter(i => i.id !== item.id), primaryItemId: c.primaryItemId === item.id ? null : c.primaryItemId })}><ActionIcon name="trash" />Excluir link</Button></div>
      </div>)}
      <Button type="button" variant="secondary" onClick={() => { const id = crypto.randomUUID(); change({ items: [...c.items, { id, categoryId: group.id, type: 'URL', label: '', destination: '', visible: true }] }); setEditingItem(id) }}><ActionIcon name="plus" />Adicionar link ao grupo {index + 1}</Button>
    </section>)}
    </> : null}
    {step === 3 ? <div className={styles.review}><h2>Confira antes de publicar</h2><p>{c.name} · /p/{c.slug}</p><p>{c.categories.length} grupos · {c.items.length} links</p><p className={styles.note}>Salvar mantém as alterações em rascunho. Publicar atualiza a página após as validações.</p></div> : null}
  </>
}
