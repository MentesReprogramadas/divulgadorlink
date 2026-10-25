'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { FileUpload } from '@/components/ui/file-upload'
import { prepareLinkMediaFile } from './prepare-link-media'
import styles from './link-media.module.css'

export type LinkMediaDraft = { icon?: {base64:string}; image?: {base64:string;alt:string} }
export function LinkMediaFields({value,onChange,disabled=false,onBusy}: {value:LinkMediaDraft;onChange:(value:LinkMediaDraft)=>void;disabled?:boolean;onBusy?:(busy:boolean)=>void}) {
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function choose(file:File,kind:'icon'|'image') {
    if (busy || disabled) return
    setBusy(true);onBusy?.(true);setError('')
    try {
      const base64=await prepareLinkMediaFile(file,kind)
      onChange({...value,[kind]:kind==='icon'?{base64}:{base64,alt:value.image?.alt??''}})
    } catch(error) { setError(error instanceof Error?error.message:'Não foi possível abrir a imagem.') }
    finally {setBusy(false);onBusy?.(false)}
  }
  return <fieldset className={styles.fields} disabled={disabled||busy}><legend>Anexos opcionais</legend>
    <p className={styles.hint}>Ícone e imagem passam por análise própria. O link pode publicar enquanto os anexos aguardam revisão.</p>
    {(['icon','image'] as const).map(kind=><div key={kind} className={styles.slot}>
      <FileUpload label={kind==='icon'?'Ícone do link (opcional)':'Imagem do link (opcional)'} accept="image/png,image/jpeg,image/webp" disabled={disabled||busy} onChoose={file=>void choose(file,kind)} hint={kind==='icon'?'Até 512 px e 256 KB após preparação.':'Até 1600 px e 1 MB após preparação.'} visual={value[kind]?<img className={styles.preview} src={'data:image/webp;base64,'+value[kind]!.base64} alt={kind==='icon'?'Prévia do ícone escolhido':'Prévia da imagem escolhida'}/>:undefined}/>
      {value[kind]?<Button type="button" variant="ghost" onClick={()=>{const next={...value};delete next[kind];onChange(next)}}>{kind==='icon'?'Remover ícone escolhido':'Remover imagem escolhida'}</Button>:null}
      {kind==='image'&&value.image?<Field label="Descrição da imagem" hint="Descreva o que aparece na imagem para quem não pode vê-la."><Input value={value.image.alt} maxLength={250} required onChange={event=>onChange({...value,image:{...value.image!,alt:event.target.value}})}/></Field>:null}
    </div>)}
    {busy?<p role="status">Preparando imagem…</p>:null}{error?<p role="alert">{error}</p>:null}
  </fieldset>
}
