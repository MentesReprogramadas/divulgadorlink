import { describe, expect, it } from 'vitest'
import { monitorPolicy, observeAvailability } from './availability-monitor'

const now = new Date('2026-10-15T12:00:00Z')
const policy = monitorPolicy({})
describe('F07 acompanhamento conservador', () => {
  it('F07-U01/T02 bloqueio do provedor não prova convite expirado', () => {
    for (const status of [401, 403, 405, 429]) {
      const next = observeAvailability({ failures: 2, automaticallyUnavailable: false }, status, now, policy)
      expect(next).toMatchObject({ state: 'INCONCLUSIVE', failures: 0, withdraw: false })
    }
  })
  it('F07-U02/T01 exige falhas repetidas, com backoff e checagens espaçadas', () => {
    const first = observeAvailability({ failures: 0, automaticallyUnavailable: false }, null, now, policy)
    expect(first).toMatchObject({ state: 'SUSPECT', failures: 1, withdraw: false })
    expect(first.nextCheckAt.getTime() - now.getTime()).toBe(30 * 60000)
    const second = observeAvailability({ failures: 1, automaticallyUnavailable: false }, 503, first.nextCheckAt, policy)
    expect(second.withdraw).toBe(false)
    expect(second.nextCheckAt.getTime() - first.nextCheckAt.getTime()).toBe(60 * 60000)
    expect(observeAvailability({ failures: 2, automaticallyUnavailable: false }, 410, second.nextCheckAt, policy)).toMatchObject({ state: 'UNAVAILABLE', failures: 3, withdraw: true })
  })
  it('F07-U04 acessível não garante vaga nem recupera sem aprovação da correção', () => {
    expect(observeAvailability({ failures: 2, automaticallyUnavailable: false }, 200, now, policy)).toMatchObject({ state: 'ACCESSIBLE', failures: 0, withdraw: false })
    expect(observeAvailability({ failures: 3, automaticallyUnavailable: true }, 200, now, policy)).toMatchObject({ state: 'UNAVAILABLE', withdraw: false })
    expect(observeAvailability({ failures: 1, automaticallyUnavailable: false }, 400, now, policy).state).toBe('INCONCLUSIVE')
  })
  it('F07-T03 configuração tem limites explícitos; falso não habilita rede por acidente', () => {
    expect(policy.enabled).toBe(false)
    expect(monitorPolicy({ AVAILABILITY_ENABLED: '1', AVAILABILITY_INTERVAL_MINUTES: '120' })).toMatchObject({ enabled: true, intervalMs: 120 * 60000 })
    for (const fields of [{ AVAILABILITY_ENABLED: 'true' }, { AVAILABILITY_FAILURE_THRESHOLD: '1' }, { AVAILABILITY_INTERVAL_MINUTES: '0' }, { AVAILABILITY_HOST_INTERVAL_SECONDS: 'NaN' }]) expect(() => monitorPolicy(fields)).toThrow()
  })
})
