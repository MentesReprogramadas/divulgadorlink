import { describe, expect, it } from 'vitest'
import { dueForRenewal, renewalWindowKey, renewalReminderPolicy } from './renewal-reminder'

const now = new Date('2026-10-16T12:00Z')
const row = { status: 'ACTIVE', administrative: false, expiresAt: new Date('2026-10-19T12:00Z'), accountStatus: 'ACTIVE', linkStatus: 'PUBLISHED' }
describe('F02 janela de renovação', () => {
  it('F02-U01/T01 inclui exatamente 72 horas e exclui após vencer', () => {
    expect(dueForRenewal(row, now)).toBe(true)
    expect(dueForRenewal({ ...row, expiresAt: new Date('2026-10-19T12:00:00.001Z') }, now)).toBe(false)
    expect(dueForRenewal({ ...row, expiresAt: now }, now)).toBe(false)
  })
  it('F02-U02/T02 exclui pausadas, canceladas, admin e conta/link inaptos', () => {
    for (const status of ['PAUSED', 'CANCELLED', 'EXPIRED']) expect(dueForRenewal({ ...row, status }, now)).toBe(false)
    expect(dueForRenewal({ ...row, administrative: true }, now)).toBe(false)
    expect(dueForRenewal({ ...row, accountStatus: 'BANNED' }, now)).toBe(false)
    expect(dueForRenewal({ ...row, linkStatus: 'UNAVAILABLE' }, now)).toBe(false)
    expect(dueForRenewal({ ...row, expiresAt: null }, now)).toBe(false)
  })
  it('F02-U03/T01 mantém chave por vencimento e distingue tenant e renovação', () => {
    expect(renewalWindowKey('a', 'p', row.expiresAt)).toBe(renewalWindowKey('a', 'p', row.expiresAt))
    expect(renewalWindowKey('a', 'p', row.expiresAt)).not.toBe(renewalWindowKey('b', 'p', row.expiresAt))
    expect(renewalWindowKey('a', 'p', row.expiresAt)).not.toBe(renewalWindowKey('a', 'p', now))
  })
  it('F02 rollout começa desligado e valida a flag', () => {
    expect(renewalReminderPolicy({}).enabled).toBe(false)
    expect(renewalReminderPolicy({ RENEWAL_REMINDERS_ENABLED: '1' }).enabled).toBe(true)
    expect(() => renewalReminderPolicy({ RENEWAL_REMINDERS_ENABLED: 'yes' })).toThrow()
  })
})
