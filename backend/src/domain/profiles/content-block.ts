import {z} from 'zod'

/** Only supported public video URLs; never accept HTML, credentials or arbitrary iframe origins. */
export function videoEmbedUrl(value:string):string|null{
 try{
  const url=new URL(value)
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null
  const host=url.hostname.toLowerCase(),id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','www.youtube.com','m.youtube.com'].includes(host)?url.searchParams.get('v')??url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1]:null
  if(id&&/^[\w-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id
  if(['vimeo.com','www.vimeo.com'].includes(host)&&/^\/\d{6,12}$/.test(url.pathname))return 'https://player.vimeo.com/video'+url.pathname+'?dnt=1'
 }catch{ /* Invalid URLs are rejected at the boundary. */ }
 return null
}
const base={id:z.string().uuid(),visible:z.boolean(),title:z.string().trim().min(1).max(100)}
export const contentBlockInput=z.discriminatedUnion('type',[
 z.object({...base,type:z.literal('TEXT'),body:z.string().trim().min(1).max(3000)}).strict(),
 z.object({...base,type:z.literal('IMAGE'),assetId:z.string().regex(/^[a-f0-9]{64}$/),alt:z.string().trim().min(1).max(250),caption:z.string().trim().max(500)}).strict(),
 z.object({...base,type:z.literal('VIDEO'),url:z.string().trim().max(2048).refine(value=>videoEmbedUrl(value)!==null,'Use um vídeo público do YouTube ou Vimeo.')} ).strict(),
])
export type ContentBlock=z.infer<typeof contentBlockInput>
export const contentBlockText=(blocks:ContentBlock[])=>blocks.flatMap(block=>[block.title,...(block.type==='TEXT'?[block.body]:block.type==='IMAGE'?[block.alt,block.caption]:[block.url])]).join('\n')
