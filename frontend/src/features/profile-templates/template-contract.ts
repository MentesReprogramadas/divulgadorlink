import type {ProfileContent} from '@/features/profiles/profile-contract'
import type {ProfileAppearance} from '@/features/profiles/profile-appearance'
export type ProfileTemplate={versionId:string;activity:'COMMUNITY'|'CREATOR'|'SHOP'|'PROFESSIONAL'|'EVENT';title:string;description:string;appearance:ProfileAppearance;demoName:string;demoBio:string;groups:Array<{key:string;name:string;links:Array<{key:string;label:string;destination:string}>}>}
/** Demonstration only. Apply sends a version identifier, never this fictional content. */
export function templateDemonstration(template:ProfileTemplate):ProfileContent{
  const categories=template.groups.map(group=>({id:template.versionId+'-'+group.key,name:group.name,visible:true}))
  const items=template.groups.flatMap((group,index)=>group.links.map(link=>({id:template.versionId+'-'+group.key+'-'+link.key,categoryId:categories[index].id,type:'URL' as const,label:link.label,destination:link.destination,visible:true})))
  return{slug:'modelo-de-pagina',name:template.demoName,bio:template.demoBio,avatarAssetId:null,requiresAge:false,appearance:template.appearance,primaryItemId:items[0]?.id??null,categories,items}
}
