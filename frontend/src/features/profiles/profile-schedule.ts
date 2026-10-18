export type ProfileSchedule = { startsAt: string | null; endsAt: string | null; timeZone: string; paused: boolean }
function formatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}
export function utcToCivil(value: string | null, timeZone: string): string {
  if (!value) return ''
  const parts=formatter(timeZone).formatToParts(new Date(value)), get=(type:string)=>parts.find(part=>part.type===type)!.value
  return get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute')
}
/** Find every matching instant, rather than guessing an offset at DST transitions. */
export function civilToUtc(value: string, timeZone: string): string | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Informe uma data válida.')
  const naive=new Date(value+':00.000Z').getTime()
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0,16)!==value || Number(value.slice(0,4))<1970) throw new Error('Informe uma data válida, a partir de 1970.')
  const offsets=new Set<number>()
  for(let hour=-36;hour<=36;hour+=6){const instant=naive+hour*3600000;const civil=utcToCivil(new Date(instant).toISOString(),timeZone);offsets.add(new Date(civil+':00.000Z').getTime()-instant)}
  const candidates=[...offsets].map(offset=>naive-offset).filter(instant=>utcToCivil(new Date(instant).toISOString(),timeZone)===value)
  if (!candidates.length) throw new Error('Esse horário não existe nesse fuso. Escolha outro horário.')
  if (candidates.length>1) throw new Error('Esse horário é ambíguo nesse fuso. Escolha outro horário.')
  return new Date(candidates[0]).toISOString()
}
export function scheduleLabel(schedule: ProfileSchedule | null | undefined, now: string, allowed = true): string {
  if (!schedule) return ''
  if (schedule.paused) return 'Pausado'
  if (!allowed) return 'Plano indisponível'
  if (schedule.endsAt && schedule.endsAt <= now) return 'Encerrado'
  if (schedule.startsAt && schedule.startsAt > now) return 'Agendado'
  return 'No período'
}
