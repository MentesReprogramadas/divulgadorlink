export function analyticsDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}

export function shiftAnalyticsDay(day: string, days: number): string {
  return new Date(Date.parse(day + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10)
}

export function analyticsDayStart(day: string): Date {
  const desired = Date.parse(day + 'T00:00:00Z')
  let instant = desired
  const format = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  for (let attempt = 0; attempt < 3; attempt++) {
    const values = Object.fromEntries(format.formatToParts(new Date(instant)).map(part => [part.type, part.value]))
    const observed = Date.parse(values.year + '-' + values.month + '-' + values.day + 'T' + values.hour + ':' + values.minute + ':' + values.second + 'Z')
    const delta = desired - observed
    instant += delta
    if (!delta) break
  }
  return new Date(instant)
}
