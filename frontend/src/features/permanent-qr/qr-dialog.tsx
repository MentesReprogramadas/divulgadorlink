'use client'
import { useEffect,useRef,useState } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Field,Select } from '@/components/ui/input'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { Skeleton,SkeletonRegion } from '@/components/feedback/skeleton'
import { generateQr,downloadQr,type QrArtifact } from './generate-qr'
import { type StableQrTarget,type QrFormat,type QrSize } from './qr-target'
import styles from './qr-dialog.module.css'

export function QrDialog({target,onClose,trigger}: {target:StableQrTarget;onClose:()=>void;trigger?:HTMLElement|null}){
  const [format,setFormat]=useState<QrFormat>('png'),[size,setSize]=useState<QrSize>(512),[artifact,setArtifact]=useState<QrArtifact|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[notice,setNotice]=useState('')
  const copying=useRef(false)
  const ready=Boolean(artifact&&artifact.format===format&&artifact.size===size&&artifact.url===target.url)
  useEffect(()=>{
    let cancelled=false;setLoading(true);setError('');setArtifact(null);setNotice('')
    void generateQr(target,format,size).then(result=>{if(!cancelled)setArtifact(result)}).catch(()=>{if(!cancelled)setError('Não foi possível gerar o QR Code. Seus dados foram mantidos; tente novamente.')}).finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[target,format,size,attempt])
  async function copy(){if(copying.current)return;copying.current=true;try{await navigator.clipboard.writeText(target.url);setNotice('Endereço copiado.')}catch{setError('Não foi possível copiar. Selecione o endereço e copie manualmente.')}finally{copying.current=false}}
  function download(){if(!artifact||loading||!ready)return;try{downloadQr(artifact);setNotice('Download iniciado.')}catch{setError('Não foi possível baixar. Tente novamente.')}}
  return <OverlayDialog open title="QR Code" onClose={onClose} returnFocusTo={trigger}><div className={styles.body}>
    <p className={styles.address}>{target.url}</p>
    <div className={styles.controls}><Field label="Formato do arquivo" hint="PNG para enviar; SVG para imprimir."><Select value={format} onChange={event=>setFormat(event.target.value as QrFormat)}><option value="png">PNG</option><option value="svg">SVG</option></Select></Field><Field label="Tamanho da imagem"><Select value={String(size)} onChange={event=>setSize(Number(event.target.value) as QrSize)}><option value="256">256 px</option><option value="512">512 px</option><option value="1024">1024 px</option></Select></Field></div>
    <div className={styles.preview} role="group" aria-label="Prévia do QR Code" aria-busy={loading}>{loading?<SkeletonRegion label="Gerando QR Code"><Skeleton width="100%" height="13rem"/></SkeletonRegion>:artifact?<img src={artifact.preview} width={size} height={size} alt={target.kind==='PROFILE'?'QR Code da página publicada':'QR Code do link permanente'}/>:<ActionIcon name="qr" width={64} height={64}/>}</div>
    {error?<p role="alert" className={styles.error}>{error}</p>:null}<p role="status" className={styles.note+' '+styles.notice}>{notice}</p>
    <p className={styles.note}>{target.kind==='REDIRECT'?'Atualizar o destino mantém este QR. Desativar o endereço interrompe o acesso.':'Abre a página publicada. Trocar o endereço ou retirar do ar interrompe o acesso.'} Depende de manter o endereço e a plataforma disponíveis.</p>
    <WorkspaceActions><Button variant="secondary" onClick={()=>void copy()}><ActionIcon name="copy"/>Copiar endereço</Button>{error&&!artifact?<Button onClick={()=>setAttempt(value=>value+1)} disabled={loading}><ActionIcon name="refresh"/>Tentar novamente</Button>:<Button onClick={download} disabled={loading||!ready}><ActionIcon name="download"/>Baixar QR Code</Button>}</WorkspaceActions>
  </div></OverlayDialog>
}
