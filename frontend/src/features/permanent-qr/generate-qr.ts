import { qrExportOptions,stableQrTarget,type StableQrTarget,type QrFormat,type QrSize } from './qr-target'
export type QrArtifact={url:string;format:QrFormat;size:QrSize;mime:string;filename:string;preview:string;blob:Blob}
/** One existing generator, no external service or camera, and no raw SVG inserted in the DOM. */
export async function generateQr(target:StableQrTarget,format:unknown,size:unknown):Promise<QrArtifact>{
  const options=qrExportOptions(format,size),parsed=new URL(target.url)
  const safe=stableQrTarget(parsed.origin,{kind:target.kind,path:parsed.pathname})
  if(safe.url!==target.url)throw new Error('O endereço público mudou. Feche e abra o QR Code novamente.')
  const QR=await import('qrcode')
  const settings={width:options.size,margin:4,errorCorrectionLevel:'M' as const,color:{dark:'#000000ff',light:'#ffffffff'}}
  const preview=await QR.toDataURL(safe.url,{...settings,type:'image/png'})
  if(!preview.startsWith('data:image/png;base64,'))throw new Error('Não foi possível gerar o QR Code. Tente novamente.')
  const binary=options.format==='svg'?await QR.toString(safe.url,{...settings,type:'svg'}):Uint8Array.from(atob(preview.split(',')[1]),character=>character.charCodeAt(0))
  return{url:safe.url,format:options.format,size:options.size,mime:options.mime,filename:'temlinkaqui-'+(safe.kind==='PROFILE'?'pagina-':'convite-')+safe.name+'-'+options.size+'.'+options.format,preview,blob:new Blob([binary],{type:options.mime})}
}
export function downloadQr(artifact:QrArtifact){
  const url=URL.createObjectURL(artifact.blob),anchor=document.createElement('a')
  anchor.href=url;anchor.download=artifact.filename;document.body.append(anchor);anchor.click();anchor.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
