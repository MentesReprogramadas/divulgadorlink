import { describe, expect, it } from 'vitest'
import { reportReason, reportKind, intakeReport, decideReport, REPORT_WINDOW_MS, REPORT_DAILY_LIMIT } from './report'

describe('F06 denúncias', () => {
  const now = new Date('2026-10-14T12:00:00Z')
  it('F06-U01/T04 enumera motivos e separa disponibilidade de conteúdo', () => {
    expect(reportReason('EXPIRED_INVITE')).toBe('EXPIRED_INVITE')
    expect(() => reportReason('arbitrary')).toThrow()
    expect(reportKind('EXPIRED_INVITE')).toBe('AVAILABILITY')
    expect(reportKind('UNAVAILABLE_DESTINATION')).toBe('AVAILABILITY')
    expect(reportKind('SPAM')).toBe('CONTENT')
    expect(reportKind('INAPPROPRIATE_CONTENT')).toBe('CONTENT')
  })
  it('F06-U02/T01 neutraliza repetição antes de consumir limite e expira a janela', () => {
    expect(intakeReport(new Date(now.getTime() - 1000), REPORT_DAILY_LIMIT, now)).toBe('DUPLICATE')
    expect(intakeReport(null, REPORT_DAILY_LIMIT, now)).toBe('LIMITED')
    expect(intakeReport(new Date(now.getTime() - REPORT_WINDOW_MS), 0, now)).toBe('CREATE')
    expect(intakeReport(null, REPORT_DAILY_LIMIT - 1, now)).toBe('CREATE')
  })
  it('F06-U04/T03 preserva terminalidade, versão e justificativa', () => {
    const input = { status: 'RECEIVED' as const, version: 1, next: 'IN_REVIEW' as const, expectedVersion: 1, reason: ' Conferindo convite ' }
    expect(decideReport(input)).toEqual({ status: 'IN_REVIEW', version: 2, reason: 'Conferindo convite' })
    expect(decideReport({ ...input, next: 'RESOLVED' }).status).toBe('RESOLVED')
    expect(() => decideReport({ ...input, status: 'RESOLVED', next: 'RECEIVED' })).toThrow()
    expect(() => decideReport({ ...input, expectedVersion: 0 })).toThrow()
    expect(() => decideReport({ ...input, reason: ' ' })).toThrow()
    expect(() => decideReport({ ...input, next: 'RECEIVED' })).toThrow()
  })
})
