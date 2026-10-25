import {z} from 'zod'
import type {ProfileContent} from './profile'
import type {PublicChannelGroup} from './profile-channels'
export const profileLocale=z.enum(['pt-BR','en','es'])
export type ProfileLocale=z.infer<typeof profileLocale>
export const profileTranslationInput=z.object({
 primaryLocale:profileLocale,
 entries:z.array(z.object({locale:profileLocale,name:z.string().trim().max(80).optional(),bio:z.string().trim().max(500).optional(),categories:z.record(z.string().uuid(),z.string().trim().max(80)),items:z.record(z.string().uuid(),z.string().trim().max(100))}).strict()).max(2),
}).strict().superRefine((value,ctx)=>{if(new Set(value.entries.map(row=>row.locale)).size!==value.entries.length||value.entries.some(row=>row.locale===value.primaryLocale))ctx.addIssue({code:'custom',message:'Escolha idiomas diferentes do idioma original.'})})
export type ProfileTranslations=z.infer<typeof profileTranslationInput>
export function pruneTranslations(value:ProfileTranslations|undefined,categories:ReadonlyArray<{id:string}>,items:ReadonlyArray<{id:string}>):ProfileTranslations|undefined{
 if(!value)return undefined
 const groups=new Set(categories.map(row=>row.id)),links=new Set(items.map(row=>row.id))
 const labels=(input:Record<string,string>,ids:Set<string>)=>Object.fromEntries(Object.entries(input).filter(([id,text])=>ids.has(id)&&text.trim()).sort(([a],[b])=>a.localeCompare(b)).map(([id,text])=>[id,text.trim()]))
 return{primaryLocale:value.primaryLocale,entries:[...value.entries].sort((a,b)=>a.locale.localeCompare(b.locale)).map(row=>({locale:row.locale,...(row.name?.trim()?{name:row.name.trim()}:{}),...(row.bio?.trim()?{bio:row.bio.trim()}:{}),categories:labels(row.categories,groups),items:labels(row.items,links)}))}
}
export function translationTexts(content:ProfileContent){return(content.translations?.entries??[]).flatMap(row=>[row.name??'',row.bio??'',...Object.values(row.categories),...Object.values(row.items)]).filter(Boolean)}
export function localizeProfile<T extends ProfileContent&{channelGroups?:PublicChannelGroup[]}>(content:T,requested?:ProfileLocale){
 const config=pruneTranslations(content.translations,content.categories,content.items),primary=config?.primaryLocale??'pt-BR'
 const available=config?.entries.filter(row=>Boolean(row.name||row.bio||Object.keys(row.categories).length||Object.keys(row.items).length))??[]
 const entry=available.find(row=>row.locale===requested),locale=entry?.locale??primary
 const fallback={name:!entry?.name,bio:!entry?.bio,categories:content.categories.filter(row=>!entry?.categories[row.id]).map(row=>row.id),items:content.items.filter(row=>!entry?.items[row.id]).map(row=>row.id)}
 return{...content,...(config?{translations:config}:{}),name:entry?.name||content.name,bio:entry?.bio||content.bio,categories:content.categories.map(row=>({...row,name:entry?.categories[row.id]||row.name})),items:content.items.map(row=>({...row,...(row.event?{event:{...row.event,buttonLabel:entry?.items[row.id]||row.event.buttonLabel}}:{label:entry?.items[row.id]||row.label})})),...(content.channelGroups?{channelGroups:content.channelGroups.map(group=>({...group,name:entry?.categories[group.id]||group.name,channels:group.channels.map(channel=>({...channel,label:entry?.items[channel.id]||channel.label}))}))}:{}),locale,uiLocale:requested??primary,fallbackLocale:primary,availableLocales:[primary,...available.map(row=>row.locale)],translationFallbacks:fallback}
}
