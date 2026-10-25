export type ContentBlock=
 |{id:string;visible:boolean;title:string;type:'TEXT';body:string}
 |{id:string;visible:boolean;title:string;type:'IMAGE';assetId:string;alt:string;caption:string}
 |{id:string;visible:boolean;title:string;type:'VIDEO';url:string}

export function videoEmbedUrl(value:string):string|null{
 try{
  const url=new URL(value)
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null
  const host=url.hostname.toLowerCase(),id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','www.youtube.com','m.youtube.com'].includes(host)?url.searchParams.get('v')??url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1]:null
  if(id&&/^[\w-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id
  if(['vimeo.com','www.vimeo.com'].includes(host)&&/^\/\d{6,12}$/.test(url.pathname))return 'https://player.vimeo.com/video'+url.pathname+'?dnt=1'
 }catch{ /* Invalid author input stays in the editor. */ }
 return null
}
