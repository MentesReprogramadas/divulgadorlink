import type {ProfileContent} from './profile'
import {ProfileError} from './profile'
export type ProfileItemFilters={q:string;categoryId:string|null}
export const PROFILE_ITEM_PAGE_SIZE=20
const normalized=(text:string)=>text.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').replace(/\s+/gu,' ').trim()
/** Call only after the server's temporal/authorization/age projection, never on a draft or frozen snapshot. */
export function profileItemPage(projected:ProfileContent,filters:ProfileItemFilters,offset=0):{items:ProfileContent['items'];categories:ProfileContent['categories'];nextOffset:number|null;total:number}{
 if(filters.q.length>100||!Number.isInteger(offset)||offset<0||offset>500)throw new ProfileError(400,'Confira os filtros da página.')
 const categories=projected.categories.filter(group=>group.visible),groupIds=new Set(categories.map(group=>group.id))
 const eligible=projected.items.filter(item=>item.visible&&!item.templateExample&&groupIds.has(item.categoryId)),primary=eligible.find(item=>item.id===projected.primaryItemId)
 const ordered=[...(primary?[primary]:[]),...categories.flatMap(group=>eligible.filter(item=>item.categoryId===group.id&&item.id!==primary?.id))]
 const words=normalized(filters.q).split(' ').filter(Boolean)
 const matched=ordered.filter(item=>(!filters.categoryId||item.categoryId===filters.categoryId)&&words.every(word=>normalized(item.label+' '+categories.find(group=>group.id===item.categoryId)!.name).includes(word)))
 const items=matched.slice(offset,offset+PROFILE_ITEM_PAGE_SIZE)
 return {items,categories:categories.filter(group=>items.some(item=>item.categoryId===group.id)),total:matched.length,nextOffset:offset+PROFILE_ITEM_PAGE_SIZE<matched.length?offset+PROFILE_ITEM_PAGE_SIZE:null}
}
