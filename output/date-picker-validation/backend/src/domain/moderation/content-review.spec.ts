import { expect, it } from 'vitest'
import { reviewSummary } from './content-review'
it('apenas a primeira recusa permite contestação, sem expor snapshot nem dados internos', () => {
  const row = { id: 'id', version: 3, status: 'REJECTED', reason: 'Contexto insuficiente', appealedAt: null }
  expect(reviewSummary(row)?.canAppeal).toBe(true)
  expect(reviewSummary({ ...row, appealedAt: new Date() })?.canAppeal).toBe(false)
  expect(reviewSummary({ ...row, status: 'PENDING' })?.canAppeal).toBe(false)
  expect(reviewSummary(undefined)).toBeNull()
  expect(Object.keys(reviewSummary(row)!)).toEqual(['id', 'status', 'reason', 'version', 'canAppeal'])
})
