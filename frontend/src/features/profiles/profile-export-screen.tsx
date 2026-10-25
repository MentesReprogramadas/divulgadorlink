'use client'
import {useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,Select} from '@/components/ui/input'
import {FileUpload} from '@/components/ui/file-upload'
import {ErrorState} from '@/components/feedback/error-state'
import {EmptyState} from '@/components/feedback/empty-state'
import {profileRequest,ProfileRequestError} from './profile-api'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import type {ProfileContent} from './profile-contract'
import styles from './profile-export-screen.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function ProfileExportScreen({pendingOnly=false}:{pendingOnly?:boolean}){
 const [revision,setRevision]=useState('draft'),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[missing,setMissing]=useState(false),busy=useRef(false)
 const [backup,setBackup]=useState<unknown>(null),[preview,setPreview]=useState<{content:ProfileContent;expectedVersion:number}|null>(null),[importError,setImportError]=useState(''),[fileError,setFileError]=useState(''),fileInput=useRef<HTMLInputElement>(null)
 async function inspect(file:File){
  if(busy.current)return
  busy.current=true;setPending(true);setFileError('');setNotice('')
  try{if(file.size>900000)throw new Error('Escolha um arquivo de até 900 KB.');const value:unknown=JSON.parse(await file.text());const checked=await profileRequest<{content:ProfileContent;expectedVersion:number}>('/backup/preview',{method:'POST',body:JSON.stringify({backup:value})});setBackup(value);setPreview(checked);setImportError('')}
  catch(reason){setFileError(reason instanceof SyntaxError?'Não foi possível ler este arquivo. Escolha um arquivo baixado da sua página.':reason instanceof Error?reason.message:'Arquivo inválido. Escolha um arquivo baixado da sua página.')}
  finally{busy.current=false;setPending(false);if(fileInput.current)fileInput.current.value=''}
 }
 async function restore(){if(busy.current||!preview)return;busy.current=true;setPending(true);setImportError('');try{await profileRequest('/backup/import',{method:'POST',body:JSON.stringify({backup,expectedVersion:preview.expectedVersion})});setPreview(null);setBackup(null);setNotice('Página importada para edição. Confira antes de publicar.')}catch(reason){setImportError(reason instanceof Error?reason.message:'Não foi possível importar. Seu arquivo foi mantido.')}finally{busy.current=false;setPending(false)}}
 async function download(){
  if(busy.current)return
  busy.current=true;setPending(true);setError('');setNotice('');setMissing(false)
  try{
   const content=await profileRequest<{schemaVersion:number}>('/export?revision='+revision,{cache:'no-store'})
   if(content.schemaVersion!==1)throw new Error('Não foi possível preparar o arquivo. Tente de novo.')
   const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json;charset=utf-8'}))
   const anchor=document.createElement('a');anchor.href=url;anchor.download='minha-pagina-'+revision+'.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
   setNotice('Arquivo preparado. Confira os downloads do navegador.')
  }catch(reason){setMissing(reason instanceof ProfileRequestError&&reason.status===404);setError(reason instanceof Error?reason.message:'Não foi possível exportar. Tente de novo.')}
  finally{busy.current=false;setPending(false)}
 }
 return <section className={styles.page} aria-label="Importar e exportar minha página" aria-busy={pending||pendingOnly}>
  <div className={styles.actions}><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Minha página</ButtonLink></div>
  {notice?<p role="status">{notice}</p>:null}
  <div className={styles.grid}>
   <section className={styles.card} aria-labelledby="download-page-title"><header><ActionIcon name="download"/><h2 id="download-page-title">Baixar minha página</h2><p>Guarde seus grupos, links e aparência.</p></header>
    <Field label="O que deseja baixar?"><Select value={revision} disabled={pending||pendingOnly} onChange={event=>{setRevision(event.target.value);setNotice('');setError('')}}><option value="draft">Conteúdo em edição</option><option value="published">Página que está no ar</option></Select></Field>
    <Button readOnlyAllowed disabled={pending||pendingOnly} loading={pending} onClick={()=>void download()}><ActionIcon name="download"/>Baixar arquivo</Button>
    {error?missing?<EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="edit"/>Editar minha página</ButtonLink>}>{error}</EmptyState>:<ErrorState message={error} onRetry={()=>void download()}/>:null}
   <LiquidLens radius={16} /></section>
   <section className={styles.card} aria-labelledby="import-page-title"><header><ActionIcon name="importLinks"/><h2 id="import-page-title">Importar uma página</h2><p>Use um arquivo que você baixou aqui.</p></header>
    <FileUpload inputRef={fileInput} label="Arquivo da página" accept="application/json,.json" hint="Arquivo .json de até 900 KB" error={fileError} disabled={pending||pendingOnly} onChoose={file=>void inspect(file)}/>
   <LiquidLens radius={16} /></section>
  </div>
  <OverlayDialog open={!!preview} title="Importar página" onClose={()=>{if(!pending){setPreview(null);setBackup(null)}}} closeDisabled={pending} returnFocusTo={fileInput.current}>
   {preview?<div className={styles.confirmation}><strong>{preview.content.name}</strong><dl className={styles.summary}><div><dt>Grupos</dt><dd>{preview.content.categories.length}</dd></div><div><dt>Links</dt><dd>{preview.content.items.length}</dd></div></dl><p>O conteúdo em edição será substituído.</p><ul><li>Seu endereço e a página publicada não mudam.</li><li>A foto atual será removida.</li><li>Links permanentes serão importados como links comuns.</li></ul>{importError?<p role="alert">{importError}</p>:null}<Button disabled={pending} loading={pending} onClick={()=>void restore()}><ActionIcon name="restore"/>Importar e substituir</Button></div>:null}
  </OverlayDialog>
 </section>
}
