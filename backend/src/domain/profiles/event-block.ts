import {z} from 'zod'
import type {ProfileContent} from './profile'
const instant=z.string().datetime().refine(value=>{const date=new Date(value);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value.slice(0,10)},'Informe uma data válida.')
export const eventBlockInput=z.object({description:z.string().trim().max(1000),startsAt:instant,endsAt:instant,timeZone:z.string().max(100).refine(value=>{try{new Intl.DateTimeFormat('pt-BR',{timeZone:value});return true}catch{return false}},'Escolha um fuso válido.'),location:z.string().trim().min(1).max(400),state:z.enum(['SCHEDULED','CANCELLED']),previousStartsAt:instant.optional()}).strict().refine(event=>new Date(event.endsAt)>new Date(event.startsAt),{path:['endsAt'],message:'O fim precisa ser depois do início.'})
export type EventBlock=z.infer<typeof eventBlockInput>
export function eventState(event:EventBlock,now:Date){return event.state==='CANCELLED'?'CANCELLED':new Date(event.endsAt)<=now?'ENDED':'SCHEDULED'}
export function reconcileProfileEvents(content:ProfileContent,published?:ProfileContent):ProfileContent{
 return {...content,items:content.items.map(item=>{if(!item.event)return item;const prior=published?.items.find(old=>old.id===item.id)?.event;const event={...item.event};delete event.previousStartsAt;const previous=prior&&prior.startsAt!==event.startsAt?prior.startsAt:prior?.previousStartsAt;return {...item,event:{...event,...(previous?{previousStartsAt:previous}:{})}}})}
}
const escapeText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')
function fold(line:string){let part='',result='';for(const point of line){if(Buffer.byteLength(part+point,'utf8')>75){result+=part+'\r\n';part=' '}part+=point}return result+part}
const utc=(value:string|Date)=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
export function eventCalendar(item:{id:string;label:string;destination:string;event:EventBlock},sequence:number,stamp:Date){
 const event=item.event,lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Tem Link Aqui//Agenda//PT','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+item.id+'@events.temlinkaqui.com','SEQUENCE:'+sequence,'DTSTAMP:'+utc(stamp),'DTSTART:'+utc(event.startsAt),'DTEND:'+utc(event.endsAt),'SUMMARY:'+escapeText(item.label),'DESCRIPTION:'+escapeText(event.description),'LOCATION:'+escapeText(event.location),'URL:'+escapeText(item.destination),'STATUS:'+(event.state==='CANCELLED'?'CANCELLED':'CONFIRMED'),'X-WR-TIMEZONE:'+escapeText(event.timeZone),'END:VEVENT','END:VCALENDAR']
 return lines.map(fold).join('\r\n')+'\r\n'
}
