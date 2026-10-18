import {ProfileError,type ProfileContent} from '@/domain/profiles/profile'
import {assertProfileExamplesReady} from '@/domain/profiles/template-content'
import {assertPublicHttps} from '@/adapters/http/safe-fetch'
import {canonicalUrl} from '@/domain/links/canonical-url'
/** Extracted unchanged from F09: preview/restore do not acquire a visible-link requirement. */
export function assertProfilePublicationPresence(content:ProfileContent):void{
 assertProfileExamplesReady(content)
 if(!content.items.some(item=>item.visible&&content.categories.some(category=>category.id===item.categoryId&&category.visible)))throw new ProfileError(422,'Inclua pelo menos um link visível antes de publicar.')
}
export function normalizeProfileDestinations(content:ProfileContent):ProfileContent{
 const result={...content,items:content.items.map(item=>({...item}))}
 for(const item of result.items){
  if(item.templateExample||item.type==='CATALOG')continue
  try{assertPublicHttps(item.destination);item.destination=canonicalUrl(item.destination)}catch{throw new ProfileError(422,'Use destinos HTTPS públicos, sem credenciais ou portas especiais. O rascunho foi mantido.')}
 }
 return result
}
