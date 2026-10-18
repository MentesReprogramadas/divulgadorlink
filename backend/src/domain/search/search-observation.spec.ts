import { expect, it } from 'vitest'
import { canObserveSearch, normalizedSearchTerm, searchSessionKey, hasSearchSample, searchOutcome } from './search-observation'
it('F08-U01 normalizes whitespace/case without merging distinct accents or expanding intent', () => {
  expect(normalizedSearchTerm('  GRUPOS\n  de Inglês ')).toBe('grupos de inglês')
  expect(normalizedSearchTerm('avó')).not.toBe(normalizedSearchTerm('avô'))
  expect(normalizedSearchTerm('ＰＲＯＪＥＴＯＳ')).toBe('projetos')
})
it.each(['maria@example.com', '+55 (16) 99390-4330', 'CPF 123.456.789-00', '@maria', 'https://example.com/pessoal?token=secret', 'senha secreta', 'meu telefone', 'a'.repeat(121), 'token abcdefghijklmnopqrstuvwxyz'])('F08-U02 discards sensitive or oversized term %s before persistence', raw => {
  expect(normalizedSearchTerm(raw)).toBeNull()
})
it('F08-U03/U04 failure and age gating differ from zero results; threshold is explicit', () => {
  expect(searchOutcome({ failed: true, gated: false, count: 0 })).toBe('FAILED')
  expect(searchOutcome({ failed: false, gated: true, count: 0 })).toBe('GATED')
  expect(searchOutcome({ failed: false, gated: false, count: 0 })).toBe('SUCCESS')
  expect(hasSearchSample(9)).toBe(false); expect(hasSearchSample(10)).toBe(true)
})
it('F08-T03 consent, automation, test traffic and privacy signals are enforced independently', () => {
  expect(canObserveSearch({ consent: 'marketing', userAgent: 'Mozilla/5.0' })).toBe(true)
  for (const input of [{}, { consent: 'denied' }, { consent: 'marketing', userAgent: 'HeadlessChrome' }, { consent: 'marketing', testTraffic: '1' }, { consent: 'marketing', gpc: '1' }, { consent: 'marketing', dnt: '1' }]) expect(canObserveSearch(input)).toBe(false)
})
it('F08 session hash is scoped by tenant and day; raw session is never stored', () => {
  const key = searchSessionKey('tenant-a', 'session-sentinel', '2026-10-17', 'fixture-secret')
  expect(key).toHaveLength(64); expect(key).not.toContain('session-sentinel')
  expect(key).not.toBe(searchSessionKey('tenant-b', 'session-sentinel', '2026-10-17', 'fixture-secret'))
  expect(key).not.toBe(searchSessionKey('tenant-a', 'session-sentinel', '2026-10-18', 'fixture-secret'))
})
