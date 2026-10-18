import { expect, it } from 'vitest'
import { civilToUtc, utcToCivil, scheduleLabel } from './profile-schedule'
it('F14-U05/T02 converts explicit IANA civil time to UTC, rejects invalid and ambiguous instants', () => {
  expect(civilToUtc('2026-10-17T09:00','America/Sao_Paulo')).toBe('2026-10-17T12:00:00.000Z')
  expect(utcToCivil('2026-10-17T12:00:00.000Z','America/Sao_Paulo')).toBe('2026-10-17T09:00')
  expect(civilToUtc('','UTC')).toBeNull()
  expect(() => civilToUtc('2026-02-30T12:00','UTC')).toThrow('válida')
  expect(() => civilToUtc('2026-03-08T02:30','America/New_York')).toThrow('não existe')
  expect(() => civilToUtc('2026-11-01T01:30','America/New_York')).toThrow('ambíguo')
})
it('F14-C02 status distinguishes paused, waiting, ended and unavailable without assuming permission', () => {
  const s={startsAt:'2026-10-17T12:00:00.000Z',endsAt:'2026-10-17T13:00:00.000Z',timeZone:'UTC',paused:false}
  expect(scheduleLabel(s,'2026-10-17T11:00:00.000Z')).toBe('Agendado')
  expect(scheduleLabel(s,s.startsAt)).toBe('No período')
  expect(scheduleLabel(s,s.endsAt)).toBe('Encerrado')
  expect(scheduleLabel({...s,paused:true},s.endsAt)).toBe('Pausado')
  expect(scheduleLabel(s,s.startsAt,false)).toBe('Plano indisponível')
})
