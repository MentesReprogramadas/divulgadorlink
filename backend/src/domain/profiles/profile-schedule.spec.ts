import { describe, expect, it } from 'vitest'
import { profileScheduleInput, scheduleState, type ProfileSchedule } from './profile-schedule'
import { profileAt, visibleProfile, type ProfileContent } from './profile'
const schedule: ProfileSchedule = { startsAt: '2026-10-17T12:00:00.000Z', endsAt: '2026-10-17T13:00:00.000Z', timeZone: 'America/Sao_Paulo', paused: false }
describe('F14 schedule domain', () => {
  it('F14-U01/T01 includes exact start and excludes exact end using the supplied server instant', () => {
    expect(scheduleState(schedule, new Date('2026-10-17T11:59:59.999Z'))).toBe('WAITING')
    expect(scheduleState(schedule, new Date(schedule.startsAt!))).toBe('VISIBLE')
    expect(scheduleState(schedule, new Date(schedule.endsAt!))).toBe('ENDED')
    expect(scheduleState(null, new Date(), false)).toBe('VISIBLE')
  })
  it('F14-U02/T02 rejects reversed/equal windows, invalid dates and unknown time zones', () => {
    expect(profileScheduleInput.safeParse({ ...schedule, endsAt: schedule.startsAt }).success).toBe(false)
    expect(profileScheduleInput.safeParse({ ...schedule, startsAt: schedule.endsAt, endsAt: schedule.startsAt }).success).toBe(false)
    expect(profileScheduleInput.safeParse({ ...schedule, startsAt: '2026-02-30T12:00:00Z' }).success).toBe(false)
    expect(profileScheduleInput.safeParse({ ...schedule, timeZone: 'Unknown/Zone' }).success).toBe(false)
    expect(profileScheduleInput.safeParse({ ...schedule, startsAt: null, endsAt: null }).success).toBe(true)
  })
  it('F14-U03 pause takes precedence; expired paid access hides scheduled content without mutating it', () => {
    expect(scheduleState({ ...schedule, paused: true }, new Date(schedule.startsAt!))).toBe('PAUSED')
    const original=JSON.stringify(schedule)
    expect(scheduleState(schedule,new Date(schedule.startsAt!),false)).toBe('UNAVAILABLE')
    expect(JSON.stringify(schedule)).toBe(original)
  })
  it('F14-U04 public projection strips future identifiers/settings while publication retains the complete eligible window',()=>{
    const content:ProfileContent={slug:'pagina',name:'Página',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:'i',categories:[{id:'g',name:'Grupo futuro',visible:true}],items:[{id:'i',categoryId:'g',type:'URL',label:'Future sentinel',destination:'https://example.com/future-private',visible:true,schedule}]}
    expect(visibleProfile(content,new Set()).items[0].schedule).toEqual(schedule)
    const before=profileAt(content,new Set(),new Date('2026-10-17T11:00:00Z'),true)
    expect(before.content).toMatchObject({items:[],categories:[],primaryItemId:null});expect(JSON.stringify(before.content)).not.toContain('future-private');expect(before.nextBoundary?.toISOString()).toBe(schedule.startsAt)
    const inside=profileAt(content,new Set(),new Date(schedule.startsAt!),true);expect(inside.content.items).toHaveLength(1);expect(inside.content.items[0]).not.toHaveProperty('schedule');expect(inside.content.primaryItemId).toBe('i')
  })
})
