import {generateQr} from '@/features/permanent-qr/generate-qr'
import {readableInk} from '@/features/profiles/profile-appearance'
import {wrapShareText,type ShareKitPlan} from './share-kit-plan'
export type ShareKitArtifact={plan:ShareKitPlan;blob:Blob;filename:string;preview:string}
async function image(source:string){const value=new Image();value.src=source;await value.decode();return value}
function text(context:CanvasRenderingContext2D,value:string,{x,y,width,height,size,min=20,font,weight=400}:{x:number;y:number;width:number;height:number;size:number;min?:number;font:string;weight?:number}){
 let lines:string[]=[]
 for(;size>=min;size-=2){context.font=`${weight} ${size}px ${font}`;lines=wrapShareText(value,width,value=>context.measureText(value).width);if(lines.length*size*1.3<=height)break}
 if(size<min)throw new Error('O texto não cabe neste formato. Encurte a descrição e gere outra prévia.')
 context.textBaseline='top';context.textAlign='center';lines.forEach((line,index)=>context.fillText(line,x,y+index*size*1.3))
}
/** Native browser rasterization; only the fixed local logo and F13-generated QR are images. */
export async function renderShareKit(plan:ShareKitPlan):Promise<ShareKitArtifact>{
 await document.fonts.ready
 const canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height
 const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível gerar a imagem neste navegador.')
 const story=plan.preset==='STORY',center=540,padding=72,width=1080-padding*2
 context.fillStyle=plan.background;context.fillRect(0,0,1080,plan.height)
 let ink=readableInk(plan.background)
 if(plan.template==='spotlight'){context.fillStyle=plan.accent;context.fillRect(0,0,1080,story?610:300);ink=readableInk(plan.accent)}
 const variables=getComputedStyle(document.documentElement),font=plan.font==='classic'?'Georgia, serif':variables.getPropertyValue(plan.font==='clean'?'--font-source-sans':'--font-outfit').trim()||'sans-serif'
 await Promise.all([document.fonts.load(`400 28px ${font}`),document.fonts.load(`600 72px ${font}`)])
 context.fillStyle=ink
 text(context,plan.title,{x:center,y:story?250:90,width,height:story?260:160,size:story?92:72,min:36,font,weight:600})
 context.fillStyle=readableInk(plan.background)
 text(context,plan.bio,{x:center,y:story?670:330,width,height:story?280:160,size:story?38:28,min:20,font})
 const qr=await generateQr(plan.target,'png',512),qrImage=await image(qr.preview),qrSize=story?440:320,qrY=story?1060:530
 context.imageSmoothingEnabled=false;context.drawImage(qrImage,center-qrSize/2,qrY,qrSize,qrSize)
 text(context,plan.target.url,{x:center,y:qrY+qrSize+(story?75:36),width,height:story?140:90,size:story?32:25,min:18,font})
 const logo=await image('/logo.svg'),logoWidth=190,logoHeight=logoWidth*logo.naturalHeight/logo.naturalWidth,brandY=plan.height-65
 context.imageSmoothingEnabled=true;context.fillStyle='#ffffff';context.fillRect(center-110,brandY-10,220,logoHeight+20);context.drawImage(logo,center-logoWidth/2,brandY,logoWidth,logoHeight)
 if(plan.requiresAge){context.fillStyle=readableInk(plan.background);text(context,'18+',{x:980,y:plan.height-60,width:80,height:40,size:26,min:20,font,weight:600})}
 if(plan.source==='draft'){context.fillStyle='#ffffff';context.fillRect(0,0,1080,58);context.fillStyle='#0a192f';text(context,'PRÉVIA — publique antes de divulgar',{x:center,y:13,width:1000,height:42,size:24,min:20,font,weight:600})}
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Não foi possível gerar o arquivo. Tente novamente.')),'image/png'))
 return {plan,blob,filename:'temlinkaqui-'+plan.slug+'-'+plan.preset.toLowerCase()+(plan.source==='draft'?'-previa':'')+'.png',preview:URL.createObjectURL(blob)}
}
