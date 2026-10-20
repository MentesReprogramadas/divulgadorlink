import {z} from 'zod'
import {profileInput,profileVersion} from './profile-input'
import {profileSlug,ProfileError,type ProfileContent} from './profile'
import {profileTemplate,listProfileTemplates} from './profile-templates'
import {planProfileImport,type ImportLine,type ImportChoice} from './profile-import'
export const suggestionGroups={work:'Meu trabalho',social:'Redes sociais',contact:'Contato'} as const
export const suggestionInput=z.object({name:z.string().trim().min(1).max(80),slug:z.string().max(40).refine(v=>{try{profileSlug(v);return true}catch{return false}},'Confira o endereço da página.').transform(profileSlug),activity:z.string().trim().min(3).max(140),providedFacts:z.array(z.string().trim().min(1).max(100)).max(3),linkIds:z.array(z.string().uuid()).max(20),linksText:z.string().max(8192),expectedVersion:profileVersion,requestKey:z.string().uuid()}).strict()
export type SuggestionInput=z.infer<typeof suggestionInput>
export const suggestionPlan=z.object({bioFactIndices:z.array(z.number().int().nonnegative()).min(1).max(4),links:z.array(z.object({index:z.number().int().nonnegative(),group:z.enum(['work','social','contact'])}).strict()).min(1).max(20),templateVersionId:z.string().refine(id=>listProfileTemplates().some(t=>t.versionId===id))}).strict()
export type SuggestionPlan=z.infer<typeof suggestionPlan>
export type SuggestionSource={name:string;slug:string;facts:string[];baseVersion:number;links:Array<{itemId:string|null;label:string;url:string;destination:string;type:'URL'|'SOCIAL'|'CATALOG'}>}
export const suggestionApplyInput=z.object({expectedVersion:profileVersion,selectedFields:z.array(z.enum(['bio','groups','order','appearance'])).min(1).max(4),bioOverride:z.string().trim().max(500).optional(),templateVersionId:z.string().optional()}).strict().refine(v=>new Set(v.selectedFields).size===v.selectedFields.length)
export type SuggestionApplyInput=z.infer<typeof suggestionApplyInput>
export function validateSuggestionPlan(input:unknown,facts:string[],links:unknown[]){const plan=suggestionPlan.parse(input);if(plan.bioFactIndices.some(i=>i>=facts.length)||new Set(plan.bioFactIndices).size!==plan.bioFactIndices.length||plan.links.length!==links.length||new Set(plan.links.map(r=>r.index)).size!==links.length||plan.links.some(r=>r.index>=links.length))throw new ProfileError(503,'A IA retornou uma organização inválida. Seu rascunho foi mantido.');return plan}
export function suggestionBio(facts:string[],indices:number[]){if(indices.some(i=>!facts[i]))throw new ProfileError(503,'A IA usou uma informação inexistente.');return indices.map(i=>facts[i]!.replace(/[.\s]+$/,'')).join('. ')}
export function compileSuggestion(current:ProfileContent|null,source:SuggestionSource,plan:SuggestionPlan,apply:SuggestionApplyInput,id:()=>string):ProfileContent{
 let content:ProfileContent=structuredClone(current??{slug:source.slug,name:source.name,bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]});const selected=new Set(apply.selectedFields),itemIds=new Map(source.links.flatMap((link,index)=>link.itemId?[[index,link.itemId] as const]:[]))
 if(selected.has('bio'))content.bio=apply.bioOverride??suggestionBio(source.facts,plan.bioFactIndices)
 if(selected.has('appearance')){const appearance=profileTemplate(apply.templateVersionId??plan.templateVersionId).appearance;content.appearance={...appearance,...(content.appearance?.searchEnabled!==undefined?{searchEnabled:content.appearance.searchEnabled}:{})}}
 if(selected.has('groups')){
 const groups=new Map<string,string>();for(const entry of plan.links){const name=suggestionGroups[entry.group];let group=content.categories.find(c=>c.visible&&c.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));if(!group){group={id:id(),name,visible:true};content.categories.push(group)}groups.set(entry.group,group.id)}
 const lines:ImportLine[]=[],choices:ImportChoice[]=[];for(const entry of plan.links){const link=source.links[entry.index]!;const categoryId=groups.get(entry.group)!;if(link.itemId){const item=content.items.find(i=>i.id===link.itemId);if(!item)throw new ProfileError(409,'Um link mudou. Gere uma nova sugestão.');item.categoryId=categoryId}else{lines.push({line:entry.index+1,url:link.url,suggestedTitle:link.label,status:'READY',message:null});choices.push({line:entry.index+1,label:link.label,categoryId,newCategoryName:null})}}
 if(choices.length){const imported=planProfileImport(content,lines,choices,id);content=imported.content;choices.forEach((choice,index)=>itemIds.set(choice.line-1,imported.createdIds[index]!))}
 }
 if(selected.has('order')){const rank=new Map(plan.links.flatMap((entry,index)=>{const key=itemIds.get(entry.index);return key?[[key,index] as const]:[]}));content.items=content.items.map((item,index)=>({item,index})).sort((a,b)=>(rank.get(a.item.id)??(1000+a.index))-(rank.get(b.item.id)??(1000+b.index))).map(row=>row.item)}
 return profileInput.parse(content)
}
export const SUGGESTION_POLICY={attemptsPerDay:5,reserveMicros:5000,dailyBudgetMicros:25000,ttlMs:86400000,maxBodyBytes:6000,maxOutputTokens:1000,timeoutMs:10000,model:'gpt-5.4-nano-2026-03-17',inputUsdPerMillion:.20,outputUsdPerMillion:1.25} as const
export function assertSuggestionQuota(attempts:number,reservedMicros:number){if(attempts>=SUGGESTION_POLICY.attemptsPerDay||reservedMicros+SUGGESTION_POLICY.reserveMicros>SUGGESTION_POLICY.dailyBudgetMicros)throw new ProfileError(429,'Você usou as 5 tentativas de hoje. Volte amanhã.')}
export function suggestionCostMicros(inputTokens:number,outputTokens:number){return Math.ceil(inputTokens*SUGGESTION_POLICY.inputUsdPerMillion+outputTokens*SUGGESTION_POLICY.outputUsdPerMillion)}
