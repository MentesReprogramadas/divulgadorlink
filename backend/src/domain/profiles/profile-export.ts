import {pruneTranslations} from './profile-translations'
import type {ChannelSettings} from './profile-channels'
import type {ProfileContent} from './profile'
import {appearanceInput} from './appearance'
function hasCredentials(destination:string){
 try{const url=new URL(destination);return Boolean(url.username||url.password)||[...url.searchParams.keys()].some(key=>/^(token|access_token|api_?key|authorization|signature|x-amz-(credential|signature))$/i.test(key))}catch{return false}
}
export type ExportRevision='draft'|'published'
/** Deliberate content allowlist: never serialize persistence/session objects. */
export function buildProfileExport(content:ProfileContent,revision:ExportRevision,now:Date,channels:ChannelSettings={groups:[]}){
 const exportable=content.items.filter(row=>row.type==='CATALOG'||!hasCredentials(row.destination)),excluded=content.items.length-exportable.length
 const appearance=content.appearance?appearanceInput.parse(content.appearance):undefined
 return {schemaVersion:1 as const,exportedAt:now.toISOString(),revision,
  profile:{...(content.contentBlocks?{contentBlocks:content.contentBlocks.filter(block=>block.type!=='IMAGE')}:{}),...(content.buttonTest&&exportable.some(item=>item.id===content.buttonTest!.blockId)?{buttonTest:content.buttonTest}:{}),slug:content.slug,name:content.name,bio:content.bio,requiresAge:content.requiresAge,...(content.translations?{translations:pruneTranslations(content.translations,content.categories,exportable)}:{}),primaryItemId:exportable.some(row=>row.id===content.primaryItemId)?content.primaryItemId:null,...(appearance?{appearance}:{})},
  categories:content.categories.map(row=>({id:row.id,name:row.name,visible:row.visible})),
  items:exportable.map(row=>({id:row.id,categoryId:row.categoryId,type:row.type,label:row.label,destination:row.destination,visible:row.visible,...(row.event?{event:row.event}:{}),...(row.schedule?{schedule:{startsAt:row.schedule.startsAt,endsAt:row.schedule.endsAt,timeZone:row.schedule.timeZone,paused:row.schedule.paused}}:{})})),
  channelGroups:channels.groups.map(group=>({id:group.id,channels:group.channels.filter(row=>exportable.some(item=>item.id===row.id)).map(row=>({id:row.id,paused:row.paused,showLabel:row.showLabel??true}))})),
  assetsManifest:[...(content.avatarAssetId?[{kind:'avatar',included:false,reason:'Arquivos de imagem não são incluídos.'}]:[]),...(content.contentBlocks?.some(block=>block.type==='IMAGE')?[{kind:'contentImages',included:false,reason:'Blocos de imagem precisam ser enviados novamente.'}]:[])],
  omissions:[...(excluded?[`${excluded} link(s) com credenciais foram omitidos. Remova as credenciais antes de exportar.`]:[]),'A importação deste arquivo substitui o rascunho após confirmação; não publica automaticamente.','Fotos, arquivos externos, credenciais, permissões, cobrança e métricas não são incluídos.','Links do catálogo são referências; seus arquivos e conteúdo externo não são copiados.','Links permanentes são exportados como links; vínculos internos e tokens de acesso não são incluídos.']}
}
