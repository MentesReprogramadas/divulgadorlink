import { z } from 'zod'

export const profileScheduleInput = z.object({
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  timeZone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }); return true } catch { return false } }, 'Escolha um fuso horário válido.'),
  paused: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.startsAt) >= new Date(value.endsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim precisa ser depois do início.' })
})
export type ProfileSchedule = z.infer<typeof profileScheduleInput>
export type ScheduleState = 'VISIBLE' | 'WAITING' | 'ENDED' | 'PAUSED' | 'UNAVAILABLE'
export function scheduleState(schedule: ProfileSchedule | null | undefined, now: Date, allowed = true): ScheduleState {
  if (!schedule) return 'VISIBLE'
  if (schedule.paused) return 'PAUSED'
  if (!allowed || !Number.isFinite(now.getTime())) return 'UNAVAILABLE'
  if (schedule.endsAt && now.getTime() >= new Date(schedule.endsAt).getTime()) return 'ENDED'
  if (schedule.startsAt && now.getTime() < new Date(schedule.startsAt).getTime()) return 'WAITING'
  return 'VISIBLE'
}

export function nextScheduleBoundary(schedules: Array<ProfileSchedule | null | undefined>, now: Date): Date | null {
  const times = schedules.flatMap(schedule => schedule && !schedule.paused ? [schedule.startsAt, schedule.endsAt].filter((value): value is string => value !== null).map(value => new Date(value).getTime()) : []).filter(value => value > now.getTime())
  return times.length ? new Date(Math.min(...times)) : null
}
