import type {ProfileState} from '@/features/profiles/profile-contract'
import type {ProfileAppearance} from '@/features/profiles/profile-appearance'
import type {StableQrTarget} from '@/features/permanent-qr/qr-target'
import {stableQrTarget} from '@/features/permanent-qr/qr-target'
import {profileAppearance} from '@/features/profiles/profile-appearance'
export type ShareKitOptions={source:'published'|'draft';preset:'POST'|'STORY';template:'minimal'|'spotlight';title?:string;bio?:string;background?:string;accent?:string}
export type ShareKitPlan={source:ShareKitOptions['source'];preset:ShareKitOptions['preset'];template:ShareKitOptions['template'];width:1080;height:1080|1920;title:string;bio:string;slug:string;revision:number;requiresAge:boolean;target:StableQrTarget;font:ProfileAppearance['font'];background:string;accent:string}
export function buildShareKitPlan(state:ProfileState,origin:string,options:ShareKitOptions):ShareKitPlan{
 if(!['published','draft'].includes(options.source)||!['POST','STORY'].includes(options.preset)||!['minimal','spotlight'].includes(options.template))throw new Error('Escolha a origem, o formato e o modelo da arte.')
 const content=options.source==='published'?state.publishedContent:state.draft,revision=options.source==='published'?state.publishedVersion:state.draft?.version
 if(!content||revision===null||revision===undefined)throw new Error(options.source==='published'?'Publique sua página para gerar a arte oficial.':'Crie sua página antes de gerar uma prévia.')
 const title=(options.title??content.name).trim(),bio=(options.bio??content.bio).trim(),appearance=profileAppearance(content.appearance)
 if(!title||title.length>80||bio.length>500)throw new Error('Use um título de até 80 e uma descrição de até 500 caracteres.')
 for(const color of [options.background,options.accent])if(color!==undefined&&!/^#[a-f0-9]{6}$/i.test(color))throw new Error('Escolha cores válidas para a arte.')
 return {source:options.source,preset:options.preset,template:options.template,width:1080,height:options.preset==='POST'?1080:1920,title,bio,slug:content.slug,revision,requiresAge:content.requiresAge,target:stableQrTarget(origin,{kind:'PROFILE',path:'/p/'+content.slug}),font:appearance.font,background:options.background??appearance.background,accent:options.accent??appearance.buttonColor}
}
export function wrapShareText(text:string,width:number,measure:(value:string)=>number):string[]{
 if(!Number.isFinite(width)||width<=0)throw new Error('Largura inválida.')
 const lines:string[]=[]
 for(const paragraph of text.split(/\r\n|\r|\n/)){
  let line=''
  for(const word of paragraph.trim().split(/\s+/u)){
   if(!word)continue
   if(measure((line?line+' ':'')+word)<=width){line+=(line?' ':'')+word;continue}
   if(line){lines.push(line);line=''}
   for(const point of word){if(measure(line+point)>width){if(!line)throw new Error('O texto não cabe neste formato.');lines.push(line);line=''}line+=point}
  }
  lines.push(line)
 }
 return lines
}

export function fitShareTitle(value:string,width:number,measure:(text:string,size:number)=>number,max=76,min=32){
 const title=value.replace(/\s+/gu,' ').trim()
 for(let size=max;size>=min;size-=2)if(measure(title,size)<=width)return{size,lines:[title]}
 return{size:min,lines:wrapShareText(title,width,text=>measure(text,min))}
}
