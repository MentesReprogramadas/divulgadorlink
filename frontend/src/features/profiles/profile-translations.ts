import type {ProfileContent,ProfileLocale,ProfilePresentation} from './profile-contract'
export const profileLanguages:Record<ProfileLocale,string>={'pt-BR':'Português',en:'English',es:'Español'}
export function translatedDraft(content:ProfileContent,locale:ProfileLocale):ProfilePresentation{
 const entry=content.translations?.entries.find(row=>row.locale===locale)
 return {...content,locale,uiLocale:locale,fallbackLocale:content.translations?.primaryLocale??'pt-BR',name:entry?.name||content.name,bio:entry?.bio||content.bio,categories:content.categories.map(row=>({...row,name:entry?.categories[row.id]||row.name})),items:content.items.map(row=>({...row,...(row.event?{event:{...row.event,buttonLabel:entry?.items[row.id]||row.event.buttonLabel}}:{label:entry?.items[row.id]||row.label})}))}
}
