const brDay=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(date)

export function dayPlanDefaults(now=new Date()){
  const startAt=new Date(Math.ceil((now.getTime()+5*60000)/(5*60000))*5*60000)
  const start=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(startAt)
  if(brDay(startAt)===brDay(now)&&start<'21:00')return {day:brDay(now),start,end:'21:00'}
  return {day:brDay(new Date(now.getTime()+86400000)),start:'09:00',end:'21:00'}
}

export function dayPlanDateLabel(day:string,now=new Date()){
  const relative=day===brDay(now)?'Hoje, ':day===brDay(new Date(now.getTime()+86400000))?'Amanhã, ':''
  return relative+day.split('-').reverse().join('/')
}
