'use client'
import { Checkbox } from '@/components/ui/checkbox'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionIcon } from '@/components/ui/action-icon'
import { Field, Input, Select } from '@/components/ui/input'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import type { ProfileContent,ProfileDraft,ProfileState } from '../profile-contract'
import { reorderProfileItems, transferProfileLink } from '../profile-organization'
import {ProfileLinkDialog} from './profile-link-dialog'
import { ProfileLinkList } from './profile-link-list'
import { useProfileSort } from './use-profile-sort'
import styles from './profile-groups.module.css'
import { ChangedField, useProfileChanges } from './profile-changes'
import { ProfileScheduleDialog } from './profile-schedule-dialog'
import type {ChannelGroupSummary} from '@/features/profile-channels/channel-contract'
import {ProfileGroupActions,type ProfileGroupActionHosts} from './profile-group-actions'
import { LiquidLens } from '@/components/ui/liquid-lens'

type Group = ProfileContent['categories'][number]
type Item = ProfileContent['items'][number]
export type ProfileChannelsNavigation={groups:ChannelGroupSummary[];flush:()=>Promise<ProfileDraft>;onSaved:(state:ProfileState)=>void;onToggle:(groupId:string,channelId:string,paused:boolean,trigger:HTMLElement)=>void}
export function ProfileGroupManager({ content: c, onChange, catalog, scheduling,channels,pending=false,actionHosts }: { pending?:boolean;actionHosts?:ProfileGroupActionHosts; content: ProfileContent; onChange: (content: ProfileContent) => void; catalog: Array<{ id: string; name: string }>; scheduling?: { allowed: boolean; serverNow: string };channels?:ProfileChannelsNavigation }) {
  const changes = useProfileChanges()
  const [selected, setSelected] = useState<string | null>(null), [groupDraft, setGroupDraft] = useState<Group | null>(null), [itemDraft, setItemDraft] = useState<Item | null>(null)
  const [removal, setRemoval] = useState<{ kind: 'group' | 'link'; id: string } | null>(null)
  const [primaryOpen, setPrimaryOpen] = useState(false), [primaryDraft, setPrimaryDraft] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [scheduleItem,setScheduleItem]=useState<{id:string;trigger:HTMLElement}|null>(null)
  const itemTrigger=useRef<HTMLElement|null>(null), groupTrigger=useRef<HTMLElement|null>(null), removalTrigger=useRef<HTMLElement|null>(null), primaryTrigger=useRef<HTMLElement|null>(null), focusedGroup=useRef<string|null>(null)
  const heading = useRef<HTMLHeadingElement>(null), root = useRef<HTMLElement>(null), lastGroup = useRef<string | null>(null), hintId = useId()
  const group = c.categories.find(row => row.id === selected), siblings = c.items.filter(item => item.categoryId === selected)
  const change = (patch: Partial<ProfileContent>) => onChange({ ...c, ...patch })
  const groupSort = useProfileSort(c.categories.map(group => group.id), (source, target) => {
    const categories = reorderProfileItems(c.categories, source, target); change({ categories })
    setAnnouncement(`${categories.find(group => group.id === source)?.name} movido para a posição ${categories.findIndex(group => group.id === source) + 1}.`)
  })
  useLayoutEffect(() => {
    if (groupDraft || itemDraft || removal) return
    if (selected) {
      if (focusedGroup.current !== selected) heading.current?.focus()
    }
    else if (lastGroup.current) {
      const cards = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-open-group]') ?? [])
      const target = cards.find(card => card.dataset.openGroup === lastGroup.current) ?? actionHosts?.primary?.querySelector<HTMLButtonElement>('[data-new-group]') ?? root.current?.querySelector<HTMLButtonElement>('[data-new-group]')
      target?.focus()
    }
    focusedGroup.current = selected
  }, [selected, groupDraft === null, removal === null])
  function reorderLinks(source: string, target: string) {
    const reordered = reorderProfileItems(siblings, source, target)
    let index = 0
    change({ items: c.items.map(item => item.categoryId === selected ? reordered[index++] : item) })
    setAnnouncement(`Link movido para a posição ${reordered.findIndex(item => item.id === source) + 1}.`)
  }
  function closeGroup() { lastGroup.current = selected; setSelected(null); setAnnouncement('') }
  function editItem(id:string) {
    itemTrigger.current=document.activeElement as HTMLElement
    const item=c.items.find(row=>row.id===id)
    if(item)setItemDraft({...item,...(item.templateExample?{destination:'',visible:true}:{})})
  }
  function completeLink(provided?:Item) {
    const value=provided??itemDraft
    if (!value) return
    const existing = c.items.find(item => item.id === value.id)
    const moved = existing && existing.categoryId !== value.categoryId
    const content = moved ? transferProfileLink(c, value.id, value.categoryId) : c
    onChange({ ...content, items: existing ? content.items.map(item => item.id === value.id ? value : item) : [...content.items, value] })
    if (moved) setAnnouncement(`Link movido para ${c.categories.find(group => group.id === value.categoryId)?.name}.`)
    setItemDraft(null)
  }
  function completeDialog(element: HTMLElement, work: () => void) {
    const fields = element.closest('[data-profile-dialog]')?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')
    if (fields && Array.from(fields).every(field => field.reportValidity())) work()
  }
  const primary = <Field label="Botão principal" hint="Escolha o link que aparece no topo da sua página."><Select value={primaryDraft} onChange={e => setPrimaryDraft(e.target.value)}><option value="">Sem botão principal</option>{c.items.map(item => <option key={item.id} value={item.id}>{channels?.groups.flatMap(group=>group.channels).find(channel=>channel.id===item.id)?channels.groups.flatMap(group=>group.channels).find(channel=>channel.id===item.id)!.networkName+': '+item.label:item.label}</option>)}</Select></Field>
  return <section ref={root} className={styles.manager} aria-label="Grupos e links da página">
    <p role="status" aria-live="polite" className={styles.announcement}>{announcement}</p>
    {group ? <>
      <header className={styles.groupIntro}><Button type="button" variant="secondary" onClick={closeGroup}><ActionIcon name="back" />Voltar aos grupos</Button><div className={styles.groupIdentity}><h2 ref={heading} tabIndex={-1}>{group.name}</h2><Badge tone="neutral">{siblings.length} {siblings.length === 1 ? 'link' : 'links'}</Badge>{!group.visible ? <Badge tone="muted">Grupo oculto</Badge> : null}</div></header>
      <div className={styles.actions} role="group" aria-label="Ações do grupo"><Button type="button" variant="secondary" onClick={event => { groupTrigger.current=event.currentTarget; setGroupDraft({ ...group }) }}><ActionIcon name="edit" />Editar grupo</Button><Button type="button" variant="danger" onClick={event => { removalTrigger.current=event.currentTarget; setRemoval({ kind: 'group', id: group.id }) }}><ActionIcon name="trash" />Remover grupo</Button><Button type="button" onClick={event => {itemTrigger.current=event.currentTarget;setItemDraft({ id: crypto.randomUUID(), categoryId: group.id, type: 'URL', label: '', destination: '', visible: true })}}><ActionIcon name="plus" />Adicionar link</Button><Button type="button" variant="secondary" onClick={()=>change({categories:c.categories.map(row=>row.id===group.id?{...row,visible:!row.visible}:row)})}>{group.visible?'Ocultar grupo':'Mostrar grupo'}</Button></div>
      {!group.visible ? <p className={styles.warning}><LiquidLens radius={12}/>Este grupo está oculto. Seus links não aparecem na página pública.</p> : null}
      
      {siblings.length ? <ProfileLinkList content={c} items={siblings} primaryId={c.primaryItemId} channels={channels?.groups.flatMap(group=>group.channels)} onToggle={(item,trigger)=>{const channel=channels?.groups.flatMap(group=>group.channels).find(channel=>channel.id===item.id);if(channel&&channels)channels.onToggle(item.categoryId,item.id,!channel.paused,trigger);else change({items:c.items.map(row=>row.id===item.id?{...row,visible:!row.visible}:row)})}} onReorder={reorderLinks} onEdit={editItem} onRemove={id => { removalTrigger.current=document.activeElement as HTMLElement; setRemoval({ kind: 'link', id }) }} scheduling={scheduling} onSchedule={(id,trigger)=>setScheduleItem({id,trigger})} /> : <div className={styles.empty}><h3>Adicione o primeiro link</h3><p>Seu grupo está criado. Agora adicione os links deste grupo.</p><LiquidLens radius={16} /></div>}
    </> : <>
      <ProfileGroupActions hosts={actionHosts} pending={pending} canChoosePrimary={Boolean(c.items.length)} onPrimary={()=>{primaryTrigger.current=document.activeElement as HTMLElement;setPrimaryDraft(c.primaryItemId??'');setPrimaryOpen(true)}} onNewGroup={()=>{groupTrigger.current=document.activeElement as HTMLElement;setGroupDraft({id:crypto.randomUUID(),name:'',visible:true})}}/>
      {!c.categories.length ? <div className={styles.empty}><h3>Comece pelo primeiro grupo</h3><p>Por exemplo: Meus projetos, Contato ou Redes sociais. Depois, adicione os links dentro dele.</p><LiquidLens radius={16} /></div> : <><p id={hintId} className={styles.srOnly}>Arraste pela alça ou use Mover para ordenar. No teclado, use as setas na alça.</p><ul ref={groupSort.root} className={styles.grid}>
        {c.categories.map((row, index) => <li key={row.id} className={styles.card} data-unpublished={changes.group(row.id, c) || undefined} data-sort-id={row.id} data-over={groupSort.over === row.id || undefined} data-dragging={groupSort.dragging === row.id || undefined}>
          <div className={styles.cardTop}><Badge tone={row.visible ? 'neutral' : 'muted'}>{row.visible ? `${c.items.filter(item => item.categoryId === row.id).length} ${c.items.filter(item => item.categoryId === row.id).length === 1 ? 'link' : 'links'}` : 'Oculto'}</Badge><button type="button" className={styles.handle} aria-label={'Arrastar grupo ' + row.name} aria-describedby={hintId} {...groupSort.handle(row.id)}><ActionIcon name="grip" /></button></div>
          <button type="button" className={styles.openGroup} data-open-group={row.id} onClick={() => { setSelected(row.id);setAnnouncement('') }}><strong>{row.name}</strong><span>Abrir grupo <ActionIcon name="next" /></span></button>
          <Button type="button" variant="secondary" aria-label={(row.visible?'Ocultar grupo ':'Mostrar grupo ')+row.name} onClick={()=>change({categories:c.categories.map(group=>group.id===row.id?{...group,visible:!group.visible}:group)})}>{row.visible?'Ocultar':'Mostrar'}</Button>
          <details className={styles.order}><summary>Mover</summary><div><Button type="button" variant="secondary" disabled={!index} onClick={() => { change({ categories: reorderProfileItems(c.categories, row.id, c.categories[index - 1].id) }); setAnnouncement('Ordem dos grupos atualizada.') }}><ActionIcon name="moveUp" />Subir grupo</Button><Button type="button" variant="secondary" disabled={index === c.categories.length - 1} onClick={() => { change({ categories: reorderProfileItems(c.categories, row.id, c.categories[index + 1].id) }); setAnnouncement('Ordem dos grupos atualizada.') }}><ActionIcon name="moveDown" />Descer grupo</Button></div></details>
        <LiquidLens radius={16} /></li>)}
      </ul></>}
    </>}
    {scheduleItem ? <ProfileScheduleDialog schedule={c.items.find(item=>item.id===scheduleItem.id)?.schedule} allowed={scheduling?.allowed??false} trigger={scheduleItem.trigger} onClose={()=>setScheduleItem(null)} onApply={schedule=>{change({items:c.items.map(item=>item.id===scheduleItem.id?{...item,schedule}:item)});setScheduleItem(null);setAnnouncement('Agendamento alterado no rascunho. Publique para aplicar na página.')}} /> : null}
    <OverlayDialog open={primaryOpen} returnFocusTo={primaryTrigger.current} title="Escolher botão principal" onClose={() => setPrimaryOpen(false)}><div className={styles.dialog}><ChangedField changed={changes.field('primaryItemId', primaryDraft || null)}>{primary}</ChangedField><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setPrimaryOpen(false)}>Cancelar</Button><Button type="button" onClick={() => { change({ primaryItemId: primaryDraft || null }); setPrimaryOpen(false) }}>Concluir</Button></div></div></OverlayDialog>
    <OverlayDialog open={groupDraft !== null} returnFocusTo={groupTrigger.current} title={c.categories.some(group => group.id === groupDraft?.id) ? 'Editar grupo' : 'Criar grupo'} onClose={() => setGroupDraft(null)}>
      {groupDraft ? <div data-profile-dialog className={styles.dialog} onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); event.currentTarget.querySelector<HTMLButtonElement>('[data-complete]')?.click() } }}><ChangedField changed={changes.baseline !== undefined && groupDraft.name !== changes.baseline.categories.find(row => row.id === groupDraft.id)?.name}><Field label="Nome do grupo"><Input required pattern=".*\S.*" title="Digite um nome para o grupo." maxLength={80} autoFocus value={groupDraft.name} onChange={event => setGroupDraft({ ...groupDraft, name: event.target.value })} placeholder="Ex.: Meus projetos" /></Field></ChangedField>{c.categories.some(row=>row.id===groupDraft.id)?<ChangedField changed={changes.baseline !== undefined && groupDraft.visible !== changes.baseline.categories.find(row => row.id === groupDraft.id)?.visible}><label className={styles.check}><Checkbox checked={groupDraft.visible} onChange={event => setGroupDraft({ ...groupDraft, visible: event.target.checked })} />Grupo visível</label></ChangedField>:null}<div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setGroupDraft(null)}>Cancelar</Button><Button type="button" data-complete onClick={event => completeDialog(event.currentTarget, () => { const exists = c.categories.some(group => group.id === groupDraft.id); change({ categories: exists ? c.categories.map(group => group.id === groupDraft.id ? { ...groupDraft, name: groupDraft.name.trim() } : group) : [...c.categories, { ...groupDraft, name: groupDraft.name.trim() }] }); setSelected(groupDraft.id); setGroupDraft(null) })}><ActionIcon name="save" />Concluir grupo</Button></div></div> : null}
    </OverlayDialog>
    {itemDraft?<ProfileLinkDialog draft={itemDraft} content={c} catalog={catalog} channels={channels} trigger={itemTrigger.current??document.body} onChange={setItemDraft} onSave={(element,value)=>completeDialog(element,()=>completeLink(value))} onClose={()=>setItemDraft(null)}/>:null}
    <OverlayDialog open={removal !== null} returnFocusTo={removalTrigger.current} title={removal?.kind === 'group' ? 'Remover grupo' : 'Remover link'} onClose={() => setRemoval(null)}>{removal ? <div className={styles.dialog}><p className={styles.warning}><LiquidLens radius={12}/>{removal.kind === 'group' ? `Remover ${c.categories.find(group => group.id === removal.id)?.name} e seus ${c.items.filter(item => item.categoryId === removal.id).length} ${c.items.filter(item => item.categoryId === removal.id).length === 1 ? 'link' : 'links'} da sua página? Os links do catálogo permanecem no catálogo.` : 'Remover este link da sua página?'}</p><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => setRemoval(null)}>Cancelar</Button><Button type="button" variant="danger" onClick={() => { const items = c.items.filter(item => removal.kind === 'group' ? item.categoryId !== removal.id : item.id !== removal.id); change({ categories: removal.kind === 'group' ? c.categories.filter(group => group.id !== removal.id) : c.categories, items, primaryItemId: items.some(item => item.id === c.primaryItemId) ? c.primaryItemId : null }); if (removal.kind === 'group') { lastGroup.current = removal.id; setSelected(null) } setRemoval(null); setAnnouncement('Removido.') }}>Confirmar remoção</Button></div></div> : null}</OverlayDialog>
  </section>
}
