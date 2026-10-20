'use client'
import {useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Field,Select} from '@/components/ui/input'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import type {RedirectSummary} from '@/features/redirects/redirect-contract'
import {CreatePoolInvite} from './create-pool-invite'
import styles from './pool.module.css'

export function PoolEntryDialog({items,hasMore,pending,onMore,onClose,onCreated,trigger}:{items:RedirectSummary[];hasMore:boolean;pending:boolean;onMore:()=>void;onClose:()=>void;onCreated:(item:RedirectSummary)=>void;trigger:HTMLElement|null}){
 const [selected,setSelected]=useState(''),[creating,setCreating]=useState(false),[notice,setNotice]=useState('')
 const choices=items.filter(row=>!row.disabled&&row.active&&row.active.id===row.activeRevisionId),entry=choices.find(row=>row.id===selected)
 return <><OverlayDialog open={!creating} title="Um link para vários convites" returnFocusTo={trigger} onClose={onClose} closeDisabled={pending}><div className={styles.form}><p className={styles.intro}>Compartilhe um só endereço. Cada visita segue para um dos convites que você escolher.</p><ol className={styles.guide}><li><strong>Escolha o endereço de entrada</strong><span>É o link que você vai compartilhar.</span></li><li><strong>Escolha os convites de destino</strong><span>São os grupos que receberão as visitas.</span></li><li><strong>Confira e ative</strong><span>A divisão começa depois da sua confirmação.</span></li></ol>{choices.length?<Field label="Qual endereço você vai compartilhar?" hint="Na próxima tela, você escolhe outros convites para receber as visitas."><Select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Escolha um dos seus convites</option>{choices.map(row=><option key={row.id} value={row.id}>{row.active!.label}</option>)}</Select></Field>:<p className={styles.hint}>Cadastre um convite aprovado para começar. Convites em revisão aparecem aqui após a aprovação.</p>}{entry?<div className={styles.callout}><span>Endereço de entrada</span><code className={styles.address}>{entry.stablePath}</code></div>:null}{notice?<p role="status">{notice}</p>:null}<WorkspaceActions>{hasMore?<Button type="button" variant="secondary" disabled={pending} onClick={onMore}><ActionIcon name="loadMore"/>Carregar mais convites</Button>:null}<Button type="button" variant={choices.length?'secondary':'primary'} onClick={()=>setCreating(true)}><ActionIcon name="plus"/>Cadastrar convite</Button>{entry?<ButtonLink href={'/painel/convites/'+entry.id+'/distribuicao?configurar=1'}><ActionIcon name="next"/>Escolher destinos</ButtonLink>:null}</WorkspaceActions></div></OverlayDialog>{creating?<CreatePoolInvite onClose={()=>setCreating(false)} onCreated={item=>{onCreated(item);setCreating(false);if(item.active){setSelected(item.id);setNotice('Convite validado. Continue para escolher os destinos.')}else setNotice('Convite cadastrado. Aguarde a aprovação para continuar.')}}/>:null}</>
}
