'use client'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionIcon } from '@/components/ui/action-icon'
import { Field, Input, Select } from '@/components/ui/input'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import type { ProfileContent } from '../profile-contract'
import { reorderProfileItems, transferProfileLink } from '../profile-organization'
import { ProfileLinkList } from './profile-link-list'
import { useProfileSort } from './use-profile-sort'
import styles from './profile-groups.module.css'
import { ChangedField, useProfileChanges } from './profile-changes'

type Group = ProfileContent['categories'][number]
type Item = ProfileContent['items'][number]
export function ProfileGroupManager({ content: c, onChange, catalog }: { content: ProfileContent; onChange: (content: ProfileContent) => void; catalog: Array<{ id: string; name: string }> }) {
  const changes = useProfileChanges()
  const [selected, setSelected] = useState<string | null>(null), [groupDraft, setGroupDraft] = useState<Group | null>(null), [itemDraft, setItemDraft] = useState<Item | null>(null)
  const [removal, setRemoval] = useState<{ kind: 'group' | 'link'; id: string } | null>(null)
  const [primaryOpen, setPrimaryOpen] = useState(false), [primaryDraft, setPrimaryDraft] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const heading = useRef<HTMLHeadingElement>(null), root = useRef<HTMLElement>(null), lastGroup = useRef<string | null>(null), hintId = useId()
  const group = c.categories.find(row => row.id === selected), siblings = c.items.filter(item => item.categoryId === selected)
  const change = (patch: Partial<ProfileContent>) => onChange({ ...c, ...patch })
  const groupSort = useProfileSort(c.categories.map(group => group.id), (source, target) => {
    const categories = reorderProfileItems(c.categories, source, target); change({ categories })
    setAnnouncement(`${categories.find(group => group.id === source)?.name} movido para a posição ${categories.findIndex(group => group.id === source) + 1}.`)
  })
  useLayoutEffect(() => {
    if (groupDraft || itemDraft || removal) return
    if (selected) heading.current?.focus()
    else if (lastGroup.current) {
      const cards = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-open-group]') ?? [])
      const target = cards.find(card => card.dataset.openGroup === lastGroup.current) ?? root.current?.querySelector<HTMLButtonElement>('[data-new-group]')
      target?.focus()
    }
  }, [selected, groupDraft === null, itemDraft === null, removal === null])
  function reorderLinks(source: string, target: string) {
    const reordered = reorderProfileItems(siblings, source, target)
    let index = 0
    change({ items: c.items.map(item => item.categoryId === selected ? reordered[index++] : item) })
    setAnnouncement(`Link movido para a posição ${reordered.findIndex(item => item.id === source) + 1}.`)
  }
  function closeGroup() { lastGroup.current = selected; setSelected(null); setAnnouncement('') }
  function completeLink() {
    if (!itemDraft) return
    const existing = c.items.find(item => item.id === itemDraft.id)
    const moved = existing && existing.categoryId !== itemDraft.categoryId
    const content = moved ? transferProfileLink(c, itemDraft.id, itemDraft.categoryId) : c
    onChange({ ...content, items: existing ? content.items.map(item => item.id === itemDraft.id ? itemDraft : item) : [...content.items, itemDraft] })
    if (moved) setAnnouncement(`Link movido para ${c.categories.find(group => group.id === itemDraft.categoryId)?.name}.`)
    setItemDraft(null)
  }
  function completeDialog(element: HTMLElement, work: () => void) {
    const fields = element.closest('[data-profile-dialog]')?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')
    if (fields && Array.from(fields).every(field => field.reportValidity())) work()
  }
  const primary = <Field label="Botão principal" hint="Escolha o link que aparece no topo da sua página."><Select value={primaryDraft} onChange={e => setPrimaryDraft(e.target.value)}><option value="">Sem botão principal</option>{c.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
  return <section ref={root} className={styles.manager} aria-label="Grupos e links da página">
    <p role="status" aria-live="polite" className={styles.announcement}>{announcement}</p>
    {group ? <>
      <header className={styles.groupIntro}><Button type="button" variant="secondary" onClick={closeGroup}><ActionIcon name="back" />Voltar aos grupos</Button><div className={styles.groupIdentity}><h2 ref={heading} tabIndex={-1}>{group.name}</h2><Badge tone="neutral">{siblings.length} {siblings.length === 1 ? 'link' : 'links'}</Badge>{!group.visible ? <Badge tone="muted">Grupo oculto</Badge> : null}</div></header>
      <div className={styles.actions} role="group" aria-label="Ações do grupo"><Button type="button" variant="secondary" onClick={() => setGroupDraft({ ...group })}><ActionIcon name="edit" />Editar grupo</Button><Button type="button" variant="danger" onClick={() => setRemoval({ kind: 'group', id: group.id })}><ActionIcon name="trash" />Remover grupo</Button><Button type="button" onClick={() => setItemDraft({ id: crypto.randomUUID(), categoryId: group.id, type: 'URL', label: '', destination: '', visible: true })}><ActionIcon name="plus" />Adicionar link</Button></div>
      {!group.visible ? <p className={styles.warning}>Este grupo está oculto. Seus links não aparecem na página pública.</p> : null}
      
      {siblings.length ? <ProfileLinkList content={c} items={siblings} primaryId={c.primaryItemId} onReorder={reorderLinks} onEdit={id => setItemDraft({ ...c.items.find(item => item.id === id)! })} onRemove={id => setRemoval({ kind: 'link', id })} /> : <div className={styles.empty}><h3>Adicione o primeiro link</h3><p>Seu grupo está criado. Agora inclua um site, rede social ou link do catálogo.</p></div>}
    </> : <>
      <header className={styles.sectionHeading}><h2 className={styles.srOnly}>Grupos e links</h2><div className={styles.actions}><Button type="button" variant="secondary" disabled={!c.items.length} onClick={() => { setPrimaryDraft(c.primaryItemId ?? ''); setPrimaryOpen(true) }}>Botão principal</Button><Button type="button" data-new-group onClick={() => setGroupDraft({ id: crypto.randomUUID(), name: '', visible: true })}><ActionIcon name="plus" />Adicionar grupo</Button></div></header>
      {!c.categories.length ? <div className={styles.empty}><h3>Comece pelo primeiro grupo</h3><p>Por exemplo: Meus projetos, Contato ou Redes sociais. Depois, adicione os links dentro dele.</p></div> : <><p id={hintId} className={styles.srOnly}>Arraste pela alça ou use Mover para ordenar. No teclado, use as setas na alça.</p><ul ref={groupSort.root} className={styles.grid}>
        {c.categories.map((row, index) => <li key={row.id} className={styles.card} data-unpublished={changes.group(row.id, c) || undefined} data-sort-id={row.id} data-over={groupSort.over === row.id || undefined} data-dragging={groupSort.dragging === row.id || undefined}>
          <div className={styles.cardTop}><Badge tone={row.visible ? 'neutral' : 'muted'}>{row.visible ? `${c.items.filter(item => item.categoryId === row.id).length} ${c.items.filter(item => item.categoryId === row.id).length === 1 ? 'link' : 'links'}` : 'Oculto'}</Badge><button type="button" className={styles.handle} aria-label={'Arrastar grupo ' + row.name} aria-describedby={hintId} {...groupSort.handle(row.id)}><ActionIcon name="grip" /></button></div>
          <button type="button" className={styles.openGroup} data-open-group={row.id} onClick={() => { setSelected(row.id); setAnnouncement('') }}><strong>{row.name}</strong><span>Abrir grupo <ActionIcon name="next" /></span></button>
          <details className={styles.order}><summary>Mover</summary><div><Button type="button" variant="secondary" disabled={!index} onClick={() => { change({ categories: reorderProfileItems(c.categories, row.id, c.categories[index - 1].id) }); setAnnouncement('Ordem dos grupos atualizada.') }}><ActionIcon name="moveUp" />Subir grupo</Button><Button type="button" variant="secondary" disabled={index === c.categories.length - 1} onClick={() => { change({ categories: reorderProfileItems(c.categories, row.id, c.categories[index + 1].id) }); setAnnouncement('Ordem dos grupos atualizada.') }}><ActionIcon name="moveDown" />Descer grupo</Button></div></details>
        </li>)}
      </ul></>}
    </>}
    <OverlayDialog open={primaryOpen} title="Escolher botão principal" onClose={() => setPrimaryOpen(false)}><div className={styles.dialog}><ChangedField changed={changes.field('primaryItemId', primaryDraft || null)}>{primary}</ChangedField><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setPrimaryOpen(false)}>Cancelar</Button><Button type="button" onClick={() => { change({ primaryItemId: primaryDraft || null }); setPrimaryOpen(false) }}>Concluir</Button></div></div></OverlayDialog>
    <OverlayDialog open={groupDraft !== null} title={c.categories.some(group => group.id === groupDraft?.id) ? 'Editar grupo' : 'Criar grupo'} onClose={() => setGroupDraft(null)}>
      {groupDraft ? <div data-profile-dialog className={styles.dialog} onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); event.currentTarget.querySelector<HTMLButtonElement>('[data-complete]')?.click() } }}><ChangedField changed={changes.baseline !== undefined && groupDraft.name !== changes.baseline.categories.find(row => row.id === groupDraft.id)?.name}><Field label="Nome do grupo"><Input required pattern=".*\S.*" title="Digite um nome para o grupo." maxLength={80} autoFocus value={groupDraft.name} onChange={event => setGroupDraft({ ...groupDraft, name: event.target.value })} placeholder="Ex.: Meus projetos" /></Field></ChangedField><ChangedField changed={changes.baseline !== undefined && groupDraft.visible !== changes.baseline.categories.find(row => row.id === groupDraft.id)?.visible}><label className={styles.check}><input type="checkbox" checked={groupDraft.visible} onChange={event => setGroupDraft({ ...groupDraft, visible: event.target.checked })} />Grupo visível</label></ChangedField><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setGroupDraft(null)}>Cancelar</Button><Button type="button" data-complete onClick={event => completeDialog(event.currentTarget, () => { const exists = c.categories.some(group => group.id === groupDraft.id); change({ categories: exists ? c.categories.map(group => group.id === groupDraft.id ? { ...groupDraft, name: groupDraft.name.trim() } : group) : [...c.categories, { ...groupDraft, name: groupDraft.name.trim() }] }); setSelected(groupDraft.id); setGroupDraft(null) })}><ActionIcon name="save" />Concluir grupo</Button></div></div> : null}
    </OverlayDialog>
    <OverlayDialog open={itemDraft !== null} title={c.items.some(item => item.id === itemDraft?.id) ? 'Editar link do perfil' : 'Adicionar link ao grupo'} onClose={() => setItemDraft(null)}>
      {itemDraft ? <div data-profile-dialog className={styles.dialog} onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); event.currentTarget.querySelector<HTMLButtonElement>('[data-complete]')?.click() } }}><ChangedField changed={changes.baseline !== undefined && itemDraft.label !== changes.baseline.items.find(row => row.id === itemDraft.id)?.label}><Field label="Título do link"><Input autoFocus required pattern=".*\S.*" title="Digite um título para o link." maxLength={100} value={itemDraft.label} onChange={event => setItemDraft({ ...itemDraft, label: event.target.value })} /></Field></ChangedField><ChangedField changed={changes.baseline !== undefined && itemDraft.type !== changes.baseline.items.find(row => row.id === itemDraft.id)?.type}><Field label="Tipo de link"><Select value={itemDraft.type} onChange={event => setItemDraft({ ...itemDraft, type: event.target.value as Item['type'], destination: '' })}><option value="URL">Endereço próprio</option><option value="SOCIAL">Rede social</option><option value="CATALOG">Meu link do catálogo</option></Select></Field></ChangedField>
        {c.categories.length > 1 && c.items.some(item => item.id === itemDraft.id) ? <ChangedField changed={changes.baseline !== undefined && itemDraft.categoryId !== changes.baseline.items.find(row => row.id === itemDraft.id)?.categoryId}><Field label="Grupo"><Select value={itemDraft.categoryId} onChange={event => setItemDraft({ ...itemDraft, categoryId: event.target.value })}>{c.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field></ChangedField> : null}
        <ChangedField changed={changes.baseline !== undefined && itemDraft.destination !== changes.baseline.items.find(row => row.id === itemDraft.id)?.destination}>{itemDraft.type === 'CATALOG' ? <Field label="Link do catálogo"><Select required value={itemDraft.destination} onChange={event => setItemDraft({ ...itemDraft, destination: event.target.value })}><option value="">Escolha um link publicado</option>{catalog.map(link => <option key={link.id} value={link.id}>{link.name}</option>)}</Select></Field> : <Field label="Link de acesso" hint="Cole o endereço completo, começando com https://."><Input required type="url" maxLength={2048} value={itemDraft.destination} onChange={event => setItemDraft({ ...itemDraft, destination: event.target.value })} /></Field>}</ChangedField>
        <ChangedField changed={changes.baseline !== undefined && itemDraft.visible !== changes.baseline.items.find(row => row.id === itemDraft.id)?.visible}><label className={styles.check}><input type="checkbox" checked={itemDraft.visible} onChange={event => setItemDraft({ ...itemDraft, visible: event.target.checked })} />Link visível</label></ChangedField><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setItemDraft(null)}>Cancelar</Button><Button type="button" data-complete onClick={event => completeDialog(event.currentTarget, () => { completeLink() })}><ActionIcon name="save" />Concluir link</Button></div>
      </div> : null}
    </OverlayDialog>

    <OverlayDialog open={removal !== null} title={removal?.kind === 'group' ? 'Remover grupo' : 'Remover link'} onClose={() => setRemoval(null)}>{removal ? <div className={styles.dialog}><p className={styles.warning}>{removal.kind === 'group' ? `Remover ${c.categories.find(group => group.id === removal.id)?.name} e seus ${c.items.filter(item => item.categoryId === removal.id).length} ${c.items.filter(item => item.categoryId === removal.id).length === 1 ? 'link' : 'links'} da sua página? Os links do catálogo permanecem no catálogo.` : 'Remover este link da sua página?'}</p><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setRemoval(null)}>Cancelar</Button><Button type="button" variant="danger" onClick={() => { const items = c.items.filter(item => removal.kind === 'group' ? item.categoryId !== removal.id : item.id !== removal.id); change({ categories: removal.kind === 'group' ? c.categories.filter(group => group.id !== removal.id) : c.categories, items, primaryItemId: items.some(item => item.id === c.primaryItemId) ? c.primaryItemId : null }); if (removal.kind === 'group') { lastGroup.current = removal.id; setSelected(null) } setRemoval(null); setAnnouncement('Removido.') }}>Confirmar remoção</Button></div></div> : null}</OverlayDialog>
  </section>
}
