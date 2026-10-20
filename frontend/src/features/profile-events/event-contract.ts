export type EventBlock={buttonLabel?:string;description:string;startsAt:string;endsAt:string;timeZone:string;location:string;state:'SCHEDULED'|'CANCELLED';previousStartsAt?:string}
export function eventStatus(event:EventBlock,now:string){return event.state==='CANCELLED'?'Cancelado':new Date(event.endsAt)<=new Date(now)?'Encerrado':'Programado'}
