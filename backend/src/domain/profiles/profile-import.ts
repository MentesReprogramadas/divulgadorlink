import type {ProfileContent} from './profile'
import {ProfileError} from './profile'
import {assertPublicHttps} from '@/adapters/http/safe-fetch'
import {canonicalUrl} from '@/domain/links/canonical-url'
export type ImportLine = {line:number;url:string|null;suggestedTitle:string;status:'READY'|'INVALID'|'DUPLICATE';message:string|null}
export type ImportChoice = {line:number;label:string;categoryId:string|null;newCategoryName:string|null}
export function previewProfileImport(lines:string[],current:ProfileContent):ImportLine[]{
 const nonempty=lines.filter(line=>line.trim());if(nonempty.length===0||nonempty.length>50)throw new ProfileError(422,'Cole de 1 a 50 endereços, um por linha.')
 if(lines.some(line=>line.length>2048))throw new ProfileError(422,'Cada endereço pode ter até 2048 caracteres.')
 const seen=new Set(current.items.filter(item=>item.type!=='CATALOG'&&!item.templateExample).flatMap(item=>{try{return [canonicalUrl(item.destination)]}catch{return []}}))
 return lines.flatMap<ImportLine>((raw,index)=>{
  if(!raw.trim())return []
  const base={line:index+1,url:null,suggestedTitle:'',status:'INVALID' as const,message:'Use um endereço HTTPS público, sem senha ou porta especial.'}
  try{
   assertPublicHttps(raw.trim());const url=canonicalUrl(raw.trim())
   if(url.length>2048)return [{...base,message:'O endereço completo pode ter até 2048 caracteres.'}]
   const duplicate=seen.has(url);seen.add(url)
   return [{...base,url,suggestedTitle:new URL(url).hostname,status:duplicate?'DUPLICATE' as const:'READY' as const,message:duplicate?'Este endereço já está na página ou em outra linha.':null}]
  }catch{return [base]}
 })
}
export function planProfileImport(current:ProfileContent,lines:ImportLine[],choices:ImportChoice[],id:()=>string):{content:ProfileContent;createdIds:string[]}{
 if(!choices.length||choices.length>50)throw new ProfileError(422,'Selecione de 1 a 50 links válidos.')
 if(current.items.length+choices.length>500)throw new ProfileError(422,'Sua página pode ter até 500 links. Reduza a seleção.')
 const selected=new Set<number>(),groups=current.categories.map(group=>({...group})),items=current.items.map(item=>({...item})),createdIds:string[]=[],newGroups=new Map<string,string>()
 for(const choice of choices){
  const source=lines.find(line=>line.line===choice.line),label=choice.label.trim()
  if(!source||source.status!=='READY'||!source.url||selected.has(choice.line))throw new ProfileError(422,'Selecione cada linha válida apenas uma vez.')
  selected.add(choice.line)
  if(!label||label.length>100)throw new ProfileError(422,`Linha ${choice.line}: dê um título de até 100 caracteres ao link.`)
  let categoryId=choice.categoryId
  if(categoryId){if(choice.newCategoryName||!groups.some(group=>group.id===categoryId))throw new ProfileError(422,'Escolha um grupo da sua página.')}
  else{
   const name=choice.newCategoryName?.trim()??''
   if(!name||name.length>80)throw new ProfileError(422,'Dê um nome de até 80 caracteres ao novo grupo.')
   const key=name.toLocaleLowerCase('pt-BR');categoryId=newGroups.get(key)??null
   if(!categoryId){categoryId=id();newGroups.set(key,categoryId);groups.push({id:categoryId,name,visible:true})}
  }
  const itemId=id();createdIds.push(itemId);items.push({id:itemId,categoryId,type:'URL',label,destination:source.url,visible:true})
 }
 if(groups.length>100)throw new ProfileError(422,'Sua página pode ter até 100 grupos. Escolha grupos existentes.')
 return {content:{...current,categories:groups,items},createdIds}
}
