'use client'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import type { ProfileContent } from '../profile-contract'
import { moveProfileItem } from '@/domain/profile-order'
import styles from './profiles.module.css'
type Props = { content: ProfileContent; onChange: (content: ProfileContent) => void; published: boolean; catalog: Array<{ id: string; name: string }>; onPhoto: (file: File) => void }
export function ProfileFields({ content: c, onChange, published, catalog, onPhoto }: Props) {
  const change = (patch: Partial<ProfileContent>) => onChange({ ...c, ...patch })
  const updateItem = (id: string, patch: Partial<ProfileContent['items'][number]>) => change({ items: c.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  return <>
    <fieldset className={styles.identityFields}><legend>Identidade e endereço</legend>
      <Field label="Endereço do perfil" hint={published ? 'Retire o perfil do ar para mudar o endereço.' : 'Seu endereço será /p/seu-nome. Use 3 a 40 letras, números e hífens.'}><Input required value={c.slug} maxLength={40} readOnly={published} onChange={e => change({ slug: e.target.value })} /></Field>
      <Field label="Nome público"><Input required maxLength={80} value={c.name} onChange={e => change({ name: e.target.value })} /></Field>
      <Field label="Descrição"><TextArea maxLength={500} rows={3} value={c.bio} onChange={e => change({ bio: e.target.value })} /></Field>
      <Field label="Foto do perfil" hint="PNG, JPG ou WebP até 5 MB. Ajustamos o tamanho; a foto só vai ao ar após publicar."><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) onPhoto(file); e.target.value = '' }} /></Field>
      {c.avatarAssetId ? <Button type="button" variant="secondary" onClick={() => change({ avatarAssetId: null })}>Remover foto</Button> : null}
      <label className={styles.check}><input type="checkbox" checked={c.requiresAge} onChange={e => change({ requiresAge: e.target.checked })} />Conteúdo para maiores de 18 anos</label>
      <Field label="Botão principal"><Select value={c.primaryItemId ?? ''} onChange={e => change({ primaryItemId: e.target.value || null })}><option value="">Sem botão principal</option>{c.items.map(i => <option key={i.id} value={i.id}>{i.label || 'Link sem título'}</option>)}</Select></Field>
    </fieldset>
    {!c.categories.length ? <p className={styles.note}>Crie um grupo para organizar seus links e redes sociais.</p> : null}
    {c.categories.map((group, index) => <fieldset className={styles.group} key={group.id}><legend>Grupo {index + 1}</legend>
      <Field label={'Nome do grupo ' + (index + 1)}><Input required maxLength={80} value={group.name} onChange={e => change({ categories: c.categories.map(g => g.id === group.id ? { ...g, name: e.target.value } : g) })} /></Field>
      <label className={styles.check}><input type="checkbox" checked={group.visible} onChange={e => change({ categories: c.categories.map(g => g.id === group.id ? { ...g, visible: e.target.checked } : g) })} />Grupo visível</label>
      <div className={styles.actions}><Button type="button" variant="secondary" disabled={!index} onClick={() => change({ categories: moveProfileItem(c.categories, index, index - 1) })}>Subir grupo {index + 1}</Button><Button type="button" variant="secondary" disabled={index === c.categories.length - 1} onClick={() => change({ categories: moveProfileItem(c.categories, index, index + 1) })}>Descer grupo {index + 1}</Button><Button type="button" variant="secondary" onClick={() => change({ categories: c.categories.filter(g => g.id !== group.id), items: c.items.filter(i => i.categoryId !== group.id), primaryItemId: c.items.some(i => i.categoryId === group.id && i.id === c.primaryItemId) ? null : c.primaryItemId })}>Excluir grupo {index + 1}</Button></div>
      {c.items.filter(i => i.categoryId === group.id).map((item, itemIndex, siblings) => <div key={item.id} className={styles.row} role="group" aria-label={'Link ' + (itemIndex + 1) + ' do grupo ' + (index + 1)}>
        <Field label="Título do link"><Input required maxLength={100} value={item.label} onChange={e => updateItem(item.id, { label: e.target.value })} /></Field>
        <Field label="Tipo de link"><Select value={item.type} onChange={e => updateItem(item.id, { type: e.target.value as typeof item.type, destination: '' })}><option value="URL">URL própria</option><option value="SOCIAL">Rede social</option><option value="CATALOG">Meu link do catálogo</option></Select></Field>
        {item.type === 'CATALOG' ? <Field label="Link do catálogo"><Select required value={item.destination} onChange={e => updateItem(item.id, { destination: e.target.value })}><option value="">Escolha um link publicado</option>{catalog.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field> : <Field label="URL" hint="Use https://. Este link ficará apenas no perfil."><Input required type="url" maxLength={2048} value={item.destination} onChange={e => updateItem(item.id, { destination: e.target.value })} /></Field>}
        <label className={styles.check}><input type="checkbox" checked={item.visible} onChange={e => updateItem(item.id, { visible: e.target.checked })} />Link visível</label>
        <div className={styles.actions}>{([-1, 1] as const).map(offset => <Button key={offset} type="button" variant="secondary" disabled={offset === -1 ? !itemIndex : itemIndex === siblings.length - 1} onClick={() => {
          const other = siblings[itemIndex + offset], a = c.items.findIndex(i => i.id === item.id), b = c.items.findIndex(i => i.id === other.id); change({ items: moveProfileItem(c.items, a, b) })
        }}>{offset === -1 ? 'Subir link' : 'Descer link'}</Button>)}<Button type="button" variant="secondary" onClick={() => change({ items: c.items.filter(i => i.id !== item.id), primaryItemId: c.primaryItemId === item.id ? null : c.primaryItemId })}>Excluir link</Button></div>
      </div>)}
      <Button type="button" variant="secondary" onClick={() => change({ items: [...c.items, { id: crypto.randomUUID(), categoryId: group.id, type: 'URL', label: '', destination: '', visible: true }] })}>Adicionar link ao grupo {index + 1}</Button>
    </fieldset>)}
    <Button type="button" variant="secondary" onClick={() => change({ categories: [...c.categories, { id: crypto.randomUUID(), name: '', visible: true }] })}>Adicionar grupo</Button>
  </>
}
