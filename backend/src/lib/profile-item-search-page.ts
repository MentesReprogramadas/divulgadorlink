import {createHash,createHmac,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
import {profileItemPage,type ProfileItemFilters} from '@/domain/profiles/profile-item-search'
import {ProfileError,type ProfileContent} from '@/domain/profiles/profile'
import type {PublicChannelGroup} from '@/domain/profiles/profile-channels'
type ProjectedProfile={restricted:true}|(ProfileContent&{restricted:false;publishedRevisionId:number;serverNow?:string;nextBoundary?:string|null;previewAt?:string;previewBounds?:{before:string|null;after:string|null};channelGroups?:PublicChannelGroup[]})
const payload=z.object({offset:z.number().int().min(1).max(500),fingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).strict()
const mac=(body:string,secret:string)=>createHmac('sha256',secret).update('profile-items-v1\0'+body).digest()
function encodeCursor(offset:number,fingerprint:string,secret:string){const body=Buffer.from(JSON.stringify({offset,fingerprint})).toString('base64url');return body+'.'+mac(body,secret).toString('base64url')}
function readCursor(raw:string,secret:string){
 try{
  if(raw.length>2048||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(raw))throw new Error('cursor')
  const [body,signature]=raw.split('.'),actual=Buffer.from(signature!,'base64url'),expected=mac(body!,secret)
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('signature')
  return payload.parse(JSON.parse(Buffer.from(body!,'base64url').toString('utf8')))
 }catch{throw new ProfileError(422,'A página de resultados não é válida. Reinicie a busca.')}
}
/** Only accepts the already-filtered server projection; metadata never contains raw snapshot/draft fields. */
export function profileItemSearchPage(projected:ProjectedProfile,context:string,filters:ProfileItemFilters,cursor:string|null,secret:string){
 if(projected.restricted)return projected
 const active={q:filters.q.trim().replace(/\s+/gu,' '),categoryId:filters.categoryId}
 const fingerprint=createHash('sha256').update(JSON.stringify([context,projected.publishedRevisionId,active,projected.categories,projected.items])).digest('hex')
 const page=cursor?readCursor(cursor,secret):null
 if(page&&page.fingerprint!==fingerprint)throw new ProfileError(409,'Os resultados mudaram. Reinicie a busca mantendo seus filtros.')
 const result=profileItemPage(projected,active,page?.offset??0)
 const selected=new Set(result.items.map(item=>item.id)),channelGroups=projected.channelGroups?.filter(group=>group.channels.some(channel=>selected.has(channel.id))||(!group.channels.length&&!active.q&&(!active.categoryId||active.categoryId===group.id)&&!page?.offset)).map(group=>({...group,channels:group.channels.filter(channel=>selected.has(channel.id))})),emptyGroups=new Set(channelGroups?.filter(group=>!group.channels.length).map(group=>group.id)??[])
 const categories=projected.categories.filter(group=>result.categories.some(selected=>selected.id===group.id)||emptyGroups.has(group.id))
 return {...projected,items:result.items,categories,...(channelGroups?{channelGroups}:{}),primaryItemId:result.items.some(item=>item.id===projected.primaryItemId)?projected.primaryItemId:null,search:{filters:{...active,cursor},groups:projected.categories,total:result.total,nextCursor:result.nextOffset===null?null:encodeCursor(result.nextOffset,fingerprint,secret)}}
}
