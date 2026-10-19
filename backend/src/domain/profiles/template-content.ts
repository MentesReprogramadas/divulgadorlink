import { ProfileError, type ProfileContent } from './profile'
import { profileTemplate } from './profile-templates'

export function applyProfileTemplate(content: ProfileContent, versionId: string, preserveContent: boolean, confirmedReplacement: boolean, newId: () => string): ProfileContent {
  const template=profileTemplate(versionId),configured=content.categories.length>0||content.items.length>0
  if(configured&&!preserveContent&&!confirmedReplacement)throw new ProfileError(409,'A substituição dos seus grupos e links precisa de confirmação.')
  const result=structuredClone(content)
  result.appearance={...template.appearance,...(content.appearance?.searchEnabled===undefined?{}:{searchEnabled:content.appearance.searchEnabled})}
  if(configured&&preserveContent)return result
  result.categories=[];result.items=[];result.primaryItemId=null
  for(const group of template.groups){
    const categoryId=newId();result.categories.push({id:categoryId,name:group.name,visible:true})
    result.items.push(...group.links.map(link=>({id:newId(),categoryId,type:'URL' as const,label:link.label,destination:link.destination,visible:false,templateExample:true})))
  }
  return result
}

/** A caller cannot mark arbitrary URLs as trusted examples or release a sample by editing its flag. */
export function protectTemplateExamples(previous: ProfileContent | null, incoming: ProfileContent): ProfileContent {
  const oldItems=new Map(previous?.items.map(item=>[item.id,item])??[])
  return {...incoming,items:incoming.items.map(item=>{
    const old=oldItems.get(item.id),example=Boolean(old?.templateExample&&old.type===item.type&&old.destination===item.destination)
    const {templateExample,...real}=item;void templateExample
    return {...real,...(example?{templateExample:true}:{})}
  })}
}
export function assertProfileExamplesReady(content: ProfileContent): void {
  if(content.items.some(item=>item.templateExample&&item.visible))throw new ProfileError(422,'Configure o endereço dos exemplos visíveis antes de publicar.')
}

/** Fictional hidden examples are not editorial input; real hidden items retain the existing moderation policy. */
export function profileModerationContent(content: ProfileContent): ProfileContent {
  const items=content.items.filter(item=>!item.templateExample)
  return {...content,items,primaryItemId:items.some(item=>item.id===content.primaryItemId)?content.primaryItemId:null}
}
