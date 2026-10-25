'use client'
import {useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Field,Input,TextArea,Select} from '@/components/ui/input'
import {FileUpload} from '@/components/ui/file-upload'
import {ActionIcon} from '@/components/ui/action-icon'
import {BillingPaywall} from '@/features/profile-billing/billing-paywall'
import {prepareAvatar} from '../prepare-avatar'
import {videoEmbedUrl,type ContentBlock} from '../content-block'
import type {ProfileContent} from '../profile-contract'
import styles from './profile-content-editor.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function ProfileContentEditor({content,allowed,pending,onChange,onUpload}:{content:ProfileContent;allowed:boolean;pending:boolean;onChange:(value:ProfileContent)=>void;onUpload:(base64:string)=>Promise<string>}){
 const blocks=content.contentBlocks??[],[editing,setEditing]=useState<ContentBlock|null>(null),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[kind,setKind]=useState<ContentBlock['type']>('TEXT'),[remove,setRemove]=useState<string|null>(null),list=useRef<HTMLDivElement>(null),trigger=useRef<HTMLElement|null>(null)
 const change=(next:ContentBlock[])=>onChange({...content,contentBlocks:next})
 function add(){trigger.current=document.activeElement as HTMLElement;const base={id:crypto.randomUUID(),visible:true,title:''};setEditing(kind==='TEXT'?{...base,type:'TEXT',body:''}:kind==='IMAGE'?{...base,type:'IMAGE',assetId:'',alt:'',caption:''}:{...base,type:'VIDEO',url:''});setError('')}
 function save(){
  if(!editing)return
  if(!editing.title.trim()||editing.type==='TEXT'&&!editing.body.trim()||editing.type==='IMAGE'&&(!editing.assetId||!editing.alt.trim())||editing.type==='VIDEO'&&!videoEmbedUrl(editing.url)){setError('Complete os campos. Para vídeo, use um endereço do YouTube ou Vimeo.');return}
  change(blocks.some(block=>block.id===editing.id)?blocks.map(block=>block.id===editing.id?editing:block):[...blocks,editing]);setEditing(null);setError('');requestAnimationFrame(()=>list.current?.focus())
 }
 async function upload(file?:File){if(!file||!editing||editing.type!=='IMAGE')return;setUploading(true);setError('');try{const assetId=await onUpload(await prepareAvatar(file));setEditing({...editing,assetId})}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível enviar a imagem.')}finally{setUploading(false)}}
 function move(index:number,offset:number){const next=[...blocks];[next[index],next[index+offset]]=[next[index+offset],next[index]];change(next)}
 return <section className={styles.editor} aria-label="Blocos de conteúdo"><header><h2>Conteúdo além dos links</h2><p>Apresente seus serviços, mostre seu portfólio ou conte sua história em vídeo. Os blocos aparecem antes dos grupos de links.</p></header>
  {!allowed?<BillingPaywall feature="profile.richBlocks"/>:null}
  {allowed&&!editing?<div className={styles.actions}><Field label="Adicionar bloco"><Select value={kind} onChange={event=>setKind(event.target.value as ContentBlock['type'])}><option value="TEXT">Texto</option><option value="IMAGE">Imagem com legenda</option><option value="VIDEO">Vídeo</option></Select></Field><Button disabled={pending||blocks.length>=12} onClick={add}>Adicionar bloco</Button></div>:null}
  {error&&!editing?<p role="alert">{error}</p>:null}
  {editing?<OverlayDialog open title={blocks.some(block=>block.id===editing.id)?'Editar bloco':'Novo bloco'} returnFocusTo={trigger.current} closeDisabled={uploading} onClose={()=>{setEditing(null);setError('')}}>{error?<p role="alert">{error}</p>:null}{uploading?<p role="status">Enviando imagem…</p>:null}<fieldset className={styles.fields} disabled={pending||uploading}><legend>{blocks.some(block=>block.id===editing.id)?'Editar bloco':'Novo bloco'}</legend>
   <Field label="Título"><Input value={editing.title} maxLength={100} required onChange={event=>setEditing({...editing,title:event.target.value})}/></Field>
   {editing.type==='TEXT'?<Field label="Texto"><TextArea value={editing.body} maxLength={3000} rows={7} required onChange={event=>setEditing({...editing,body:event.target.value})}/></Field>:null}
   {editing.type==='VIDEO'?<Field label="Endereço do vídeo" hint="YouTube ou Vimeo. O visitante escolhe quando carregar o vídeo."><Input type="url" value={editing.url} maxLength={2048} required onChange={event=>setEditing({...editing,url:event.target.value})}/></Field>:null}
   {editing.type==='IMAGE'?<><FileUpload label="Imagem" title="Escolher imagem" description="Toque para escolher ou arraste uma imagem." visual={<ActionIcon name="image" width={30} height={30}/>} accept="image/png,image/jpeg,image/webp" disabled={pending||uploading} hint={editing.assetId?'Imagem enviada. PNG, JPG ou WebP, até 5 MB.':'PNG, JPG ou WebP, até 5 MB. A imagem será otimizada.'} onChoose={file=>void upload(file)}/><Field label="Descrição da imagem" hint="Descreva o que aparece para quem usa leitor de tela."><Input value={editing.alt} maxLength={250} required onChange={event=>setEditing({...editing,alt:event.target.value})}/></Field><Field label="Legenda (opcional)"><TextArea value={editing.caption} maxLength={500} rows={3} onChange={event=>setEditing({...editing,caption:event.target.value})}/></Field></>:null}
   <div className={styles.actions}><Button onClick={save}>Salvar bloco</Button><Button variant="secondary" onClick={()=>{setEditing(null);setError('')}}>Cancelar</Button></div><LiquidLens radius={16} /></fieldset></OverlayDialog>:null}
  <div ref={list} tabIndex={-1} className={styles.list}>{blocks.map((block,index)=><article key={block.id} className={styles.card}><div><span>{block.type==='TEXT'?'Texto':block.type==='IMAGE'?'Imagem':'Vídeo'} · {block.visible?'Visível':'Oculto'}</span><h3>{block.title}</h3><p>{block.type==='TEXT'?block.body:block.type==='IMAGE'?block.caption||block.alt:block.url}</p></div><div className={styles.actions}>
   {allowed?<><Button variant="secondary" aria-label={'Editar '+block.title} disabled={pending||Boolean(editing)} onClick={event=>{trigger.current=event.currentTarget;setEditing(block);setError('')}}>Editar</Button><Button variant="ghost" disabled={pending||Boolean(editing)} onClick={()=>change(blocks.map(row=>row.id===block.id?{...row,visible:!row.visible}:row))}>{block.visible?'Ocultar':'Mostrar'}</Button><Button variant="ghost" disabled={pending||index===0||Boolean(editing)} aria-label={'Subir '+block.title} onClick={()=>move(index,-1)}>Subir</Button><Button variant="ghost" disabled={pending||index===blocks.length-1||Boolean(editing)} aria-label={'Descer '+block.title} onClick={()=>move(index,1)}>Descer</Button></>:null}
   <Button variant="danger" aria-label={'Remover '+block.title} disabled={pending||Boolean(editing)} onClick={()=>setRemove(block.id)}>Remover</Button></div>{remove===block.id?<div role="group" aria-label="Confirmar remoção"><p>Remover este bloco do rascunho?</p><div className={styles.actions}><Button variant="danger" onClick={()=>{change(blocks.filter(row=>row.id!==block.id));setRemove(null)}}>Confirmar remoção</Button><Button variant="secondary" onClick={()=>setRemove(null)}>Cancelar remoção</Button></div></div>:null}<LiquidLens radius={16} /></article>)}</div>
  {!blocks.length&&!editing&&allowed?<p>Ainda não há blocos. Escolha um formato para começar.</p>:null}
 </section>
}
