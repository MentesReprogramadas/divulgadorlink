export type QrSource={kind:'PROFILE'|'REDIRECT';path:string}
export type StableQrTarget={kind:QrSource['kind'];url:string;name:string}
export type QrFormat='png'|'svg'
export type QrSize=256|512|1024
export function stableQrTarget(origin:string,input:QrSource):StableQrTarget {
  // URL() strips whitespace/control characters; reject them before parsing.
  // eslint-disable-next-line no-control-regex
  if(origin.length>2048||/[\u0000-\u0020\u007f]/u.test(origin))throw new Error('Endereço da plataforma inválido.')
  const base=new URL(origin),local=['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.hostname.endsWith('.localhost')
  if(base.username||base.password||base.pathname!=='/'||base.search||base.hash||(base.protocol!=='https:'&&!(base.protocol==='http:'&&local)))throw new Error('Use o endereço seguro da plataforma.')
  const match=input.kind==='PROFILE'?/^\/p\/([a-z0-9][a-z0-9-]{0,99})$/.exec(input.path):input.kind==='REDIRECT'?/^\/r\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.exec(input.path):null
  if(!match)throw new Error('Escolha uma página publicada ou um link permanente válido.')
  return {kind:input.kind,url:new URL(input.path,base.origin).href,name:match[1]}
}
export function qrExportOptions(format:unknown,size:unknown):{format:QrFormat;size:QrSize;mime:string}{
  if(format!=='png'&&format!=='svg')throw new Error('Escolha PNG ou SVG.')
  if(size!==256&&size!==512&&size!==1024)throw new Error('Escolha 256, 512 ou 1024 pixels.')
  return {format,size,mime:format==='png'?'image/png':'image/svg+xml'}
}
