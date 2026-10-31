import { expect, it } from 'vitest'
import { dayPlanDefaults, dayPlanDateLabel } from './affiliate-day-plan'

it('começa hoje, cinco minutos à frente, arredondando para cinco minutos em Brasília',()=>{
  expect(dayPlanDefaults(new Date('2026-10-31T14:27:25Z'))).toEqual({day:'2026-10-31',start:'11:35',end:'21:00'})
  expect(dayPlanDefaults(new Date('2026-11-01T02:55:00Z'))).toEqual({day:'2026-11-01',start:'09:00',end:'21:00'})
})

it('passa para amanhã quando não resta período antes das 21h, inclusive virada de mês e ano',()=>{
  expect(dayPlanDefaults(new Date('2026-10-31T23:55:00Z'))).toEqual({day:'2026-11-01',start:'09:00',end:'21:00'})
  expect(dayPlanDefaults(new Date('2027-01-01T01:00:00Z'))).toEqual({day:'2027-01-01',start:'09:00',end:'21:00'})
})

it('destaca hoje ou amanhã junto da data absoluta sem confundir a data UTC com Brasília',()=>{
  const now=new Date('2026-11-01T01:00:00Z')
  expect(dayPlanDateLabel('2026-10-31',now)).toBe('Hoje, 31/10/2026')
  expect(dayPlanDateLabel('2026-11-01',now)).toBe('Amanhã, 01/11/2026')
  expect(dayPlanDateLabel('2026-11-02',now)).toBe('02/11/2026')
})
