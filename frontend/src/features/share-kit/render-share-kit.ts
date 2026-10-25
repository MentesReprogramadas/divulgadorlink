import {generateQr} from '@/features/permanent-qr/generate-qr'
import {readableInk} from '@/features/profiles/profile-appearance'
import {fitShareTitle,wrapShareText,type ShareKitPlan} from './share-kit-plan'
export type ShareKitArtifact={plan:ShareKitPlan;blob:Blob;filename:string;preview:string}
async function image(source:string){const value=new Image();value.src=source;await value.decode();return value}
function layout(context:CanvasRenderingContext2D,value:string,width:number,height:number,size:number,min:number,font:string,weight=400){
 for(;size>=min;size-=2){context.font=weight+' '+size+'px '+font;const lines=value?wrapShareText(value,width,line=>context.measureText(line).width):[];if(lines.length*size*1.3<=height)return{size,lines}}
 throw new Error('O texto não cabe neste formato. Encurte a descrição e gere outra prévia.')
}
function drawText(context:CanvasRenderingContext2D,block:{size:number;lines:string[]},y:number,font:string,weight=400){context.font=weight+' '+block.size+'px '+font;context.textBaseline='top';context.textAlign='center';block.lines.forEach((line,index)=>context.fillText(line,540,y+index*block.size*1.3))}
/** Browser rasterization; the only images are the fixed local logo and generated QR. */
export async function renderShareKit(plan:ShareKitPlan):Promise<ShareKitArtifact>{
 await document.fonts.ready
 const canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height
 const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível gerar a imagem neste navegador.')
 const story=plan.preset==='STORY',framed=plan.template==='spotlight',width=880
 const variables=getComputedStyle(document.documentElement),font=plan.font==='classic'?'Georgia, serif':variables.getPropertyValue(plan.font==='clean'?'--font-source-sans':'--font-outfit').trim()||'sans-serif'
 // Next's fallback face can require Arial, which may be absent on Linux.
 const primaryFont=font.split(',')[0]
 await Promise.all([document.fonts.load('400 28px '+primaryFont),document.fonts.load('600 76px '+primaryFont)])
 const title=fitShareTitle(plan.title,width,(value,size)=>{context.font='600 '+size+'px '+font;return context.measureText(value).width},story?96:76,story?40:32)
 const bio=layout(context,plan.bio,width,story?340:180,story?38:30,20,font),url=layout(context,plan.target.url,width,80,story?30:25,18,font)
 const titleHeight=title.lines.length*title.size*1.3,bioHeight=bio.lines.length*bio.size*1.3,qrSize=story?460:360
 const total=titleHeight+(bioHeight?32+bioHeight:0)+40+qrSize+20+url.lines.length*url.size*1.3
 if(total>plan.height-180)throw new Error('O texto não cabe neste formato. Encurte o título ou a descrição.')
 const top=Math.max(80,(plan.height-110-total)/2),surface=framed&&plan.background.toLowerCase()===plan.accent.toLowerCase()?readableInk(plan.accent):plan.background
 context.fillStyle=framed?plan.accent:plan.background;context.fillRect(0,0,1080,plan.height)
 if(framed){context.fillStyle=surface;context.beginPath();context.roundRect(40,top-32,1000,total+64,36);context.fill();context.strokeStyle=readableInk(surface);context.globalAlpha=.15;context.lineWidth=2;context.stroke();context.globalAlpha=1}
 context.fillStyle=readableInk(surface);drawText(context,title,top,font,600)
 let y=top+titleHeight
 if(bioHeight){y+=32;drawText(context,bio,y,font);y+=bioHeight}
 y+=40
 const qr=await generateQr(plan.target,'png',512),qrImage=await image(qr.preview)
 context.imageSmoothingEnabled=false;context.drawImage(qrImage,540-qrSize/2,y,qrSize,qrSize)
 context.fillStyle=readableInk(surface);drawText(context,url,y+qrSize+20,font)
 const logo=await image('/logo.svg'),logoWidth=190,logoHeight=logoWidth*logo.naturalHeight/logo.naturalWidth,brandY=plan.height-65
 context.imageSmoothingEnabled=true;context.fillStyle='#ffffff';context.fillRect(430,brandY-10,220,logoHeight+20);context.drawImage(logo,540-logoWidth/2,brandY,logoWidth,logoHeight)
 if(plan.requiresAge){context.fillStyle=readableInk(framed?plan.accent:plan.background);context.font='600 26px '+font;context.textAlign='center';context.textBaseline='top';context.fillText('18+',990,plan.height-60)}
 if(plan.source==='draft'){context.fillStyle='#ffffff';context.fillRect(0,0,1080,58);context.fillStyle='#0a192f';drawText(context,{size:24,lines:['PRÉVIA — publique antes de divulgar']},13,font,600)}
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Não foi possível gerar o arquivo. Tente novamente.')),'image/png'))
 return {plan,blob,filename:'temlinkaqui-'+plan.slug+'-'+plan.preset.toLowerCase()+(plan.source==='draft'?'-previa':'')+'.png',preview:URL.createObjectURL(blob)}
}
