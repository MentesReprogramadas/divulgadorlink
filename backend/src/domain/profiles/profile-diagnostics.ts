import {createHash} from 'node:crypto'
import type {ProfileContent} from './profile'
export const DIAGNOSTIC_RULE_VERSION=1
export type DiagnosticFinding={key:string;code:'DUPLICATE_TITLE'|'UNAVAILABLE_LINK'|'MANY_BUTTONS'|'LOW_INTERACTION';title:string;reason:string;actionPath:string;actionLabel:string;blockId:string|null;position:number|null;evidence:{impressions?:number;clicks?:number;count?:number;revision?:number;checkedAt?:string};ruleVersion:number}
export function profileDiagnostics(input:{draft:ProfileContent;version:number;unavailable:ReadonlyMap<string,{checkedAt:string|null}>;metrics?:{revision:number;items:ProfileContent['items'];blocks:Array<{id:string;impressions:number|null;clicks:number|null}>}}):DiagnosticFinding[]{
 const groups=new Set(input.draft.categories.filter(g=>g.visible).map(g=>g.id)),items=input.draft.items.filter(i=>i.visible&&groups.has(i.categoryId)),findings:DiagnosticFinding[]=[]
 function add(code:DiagnosticFinding['code'],blockId:string|null,title:string,reason:string,evidence:DiagnosticFinding['evidence'],position:number|null=null){findings.push({key:createHash('sha256').update(JSON.stringify([DIAGNOSTIC_RULE_VERSION,input.version,code,blockId,code==='LOW_INTERACTION'?input.metrics?.revision??null:null])).digest('hex'),code,blockId,title,reason,evidence,position,ruleVersion:DIAGNOSTIC_RULE_VERSION,actionPath:'/painel/perfil/links',actionLabel:'Revisar grupos e links'})}
 const titles=new Map<string,typeof items>()
 for(const item of items){const title=item.label.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');titles.set(title,[...(titles.get(title)??[]),item])}
 for(const matches of titles.values())if(matches.length>1)add('DUPLICATE_TITLE',matches[0]!.id,'Títulos repetidos: '+matches[0]!.label,`${matches.length} botões visíveis têm o mesmo título. Use nomes que expliquem o destino de cada um.`,{count:matches.length})
 for(const [index,item] of items.entries())if(item.type==='CATALOG'&&input.unavailable.has(item.destination)){const checked=input.unavailable.get(item.destination)!;add('UNAVAILABLE_LINK',item.id,'Revisar destino: '+item.label,'O catálogo registrou este destino como indisponível. Confira ou substitua o botão.',{...(checked.checkedAt?{checkedAt:checked.checkedAt}:{})},index+1)}
 if(items.length>20)add('MANY_BUTTONS',null,'Organizar os botões',`Sua página tem ${items.length} botões visíveis. Considere agrupá-los para facilitar a escolha.`,{count:items.length})
 if(input.metrics)for(const [index,item] of input.metrics.items.entries()){
  const block=input.metrics.blocks.find(b=>b.id===item.id)
  if(block?.impressions!==null&&block?.impressions!==undefined&&block.clicks!==null&&block.impressions>=100&&block.clicks/block.impressions<.01)add('LOW_INTERACTION',item.id,'Revisar o texto: '+item.label,'Menos de 1% das visualizações deste botão gerou clique no período. Isso é uma observação, não explica a causa nem garante melhora.',{impressions:block.impressions,clicks:block.clicks,revision:input.metrics.revision},index+1)
 }
 return findings
}
