'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { api } from '@/lib/api'
import { LinkMediaFields, type LinkMediaDraft } from './link-media-fields'
import styles from './link-media.module.css'

type Asset={id:string;kind:'ICON'|'IMAGE';status:'PENDING'|'APPROVED';url:string;alt:string|null}
type Review={kind:'ICON'|'IMAGE';reason:string}
export function LinkMediaEditor({linkId}:{linkId:string}) {
  const [assets,setAssets]=useState<Asset[]>([]),[version,setVersion]=useState<number|null>(null),[value,setValue]=useState<LinkMediaDraft>({}),[busy,setBusy]=useState(false),[preparing,setPreparing]=useState(false),[error,setError]=useState(''),[note,setNote]=useState(''),[conflict,setConflict]=useState(false)
  const [reviews,setReviews]=useState<Review[]>([])
  async function load() {
    setBusy(true)
    try {
      const result=await api<{version?:number;assets?:Asset[];reviews?:Review[];message?:string}>(`/v1/links/${linkId}/media`)
      if(result.status!==200)throw new Error(result.body.message??'Não foi possível carregar os anexos.')
      setAssets(result.body.assets??[]);setReviews(result.body.reviews??[]);setVersion(result.body.version??0);setConflict(false);setError('')
    }catch(error){setError(error instanceof Error?error.message:'Não foi possível carregar os anexos.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[linkId])
  async function save() {
    if(busy||preparing||version===null||conflict)return
    if(value.image&&!value.image.alt.trim()){setError('Descreva a imagem antes de enviar.');return}
    setBusy(true);setError('');setNote('')
    let currentVersion=version
    try {
      for(const kind of ['icon','image'] as const) {
        if(!value[kind])continue
        const result=await api<{version?:number;message?:string}>(`/v1/links/${linkId}/media/${kind}`,{method:'PUT',body:JSON.stringify({...value[kind],expectedVersion:currentVersion})})
        if(result.status!==200){if(result.status===409)setConflict(true);throw new Error(result.body.message??'Não foi possível enviar o anexo.')}
        currentVersion=result.body.version!;setVersion(currentVersion)
        setValue(previous=>{const next={...previous};delete next[kind];return next})
      }
      await load();setNote('Anexos enviados para análise.')
    }catch(error){setError(error instanceof Error?error.message:'Não foi possível conectar. As imagens escolhidas foram mantidas.')}
    finally{setBusy(false)}
  }
  async function remove(kind:'ICON'|'IMAGE') {
    if(busy||version===null||conflict)return
    setBusy(true);setError('')
    try {
      const result=await api<{version?:number;message?:string}>(`/v1/links/${linkId}/media/${kind.toLowerCase()}`,{method:'DELETE',body:JSON.stringify({expectedVersion:version})})
      if(result.status!==200){if(result.status===409)setConflict(true);throw new Error(result.body.message??'Não foi possível remover o anexo.')}
      await load();setNote('Anexo removido.')
    }catch(error){setError(error instanceof Error?error.message:'Não foi possível remover o anexo.')}
    finally{setBusy(false)}
  }
  return <section className={styles.editor} aria-label="Anexos do link" aria-busy={busy}>
    <h2>Ícone e imagem</h2>
    {reviews.map(review=><p key={review.kind} role="status">{review.kind==='ICON'?'Ícone rejeitado':'Imagem rejeitada'}: {review.reason} Escolha outro anexo para enviar uma nova proposta.</p>)}
    <div className={styles.assets}>{assets.map(asset=><article key={asset.id} className={styles.asset}>
      <LiquidLens radius={24} />
      <p>{asset.kind==='ICON'?'Ícone':'Imagem'} · {asset.status==='PENDING'?'Aguardando análise':'Aprovado'}</p>
      <img className={styles.preview} src={asset.url.replace(/^\/api\//,'/bff/')} alt={asset.kind==='ICON'?'':asset.alt??''}/>
      <Button type="button" variant="secondary" disabled={busy||conflict} onClick={()=>void remove(asset.kind)}>Remover {asset.kind==='ICON'?'ícone':'imagem'} e propostas</Button>
    </article>)}</div>
    <LinkMediaFields value={value} onChange={setValue} disabled={busy||version===null} onBusy={setPreparing}/>
    <div className={styles.actions}><Button type="button" onClick={()=>void save()} disabled={busy||preparing||conflict||version===null||(!value.icon&&!value.image)}>Enviar anexos para análise</Button><Button type="button" variant="secondary" onClick={()=>void load()} disabled={busy}>Atualizar anexos</Button></div>
    {error?<p role="alert">{error}</p>:null}{note?<p role="status">{note}</p>:null}
  </section>
}
