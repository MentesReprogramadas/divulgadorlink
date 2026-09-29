import { describe, expect, it } from 'vitest'
import { InMemoryModerationCasesRepository } from '@/repositories/moderation-cases-repository'

describe('contestação por envio', () => {
  it('permite uma contestação por submissão e outra na submissão seguinte', async () => {
    const cases = new InMemoryModerationCasesRepository()
    const first = cases.startSubmission({ tenantId: 't1', linkId: 'link-1', source: 'PRE_REFUSAL' })
    expect(await cases.saveAppeal(first.id, 'foi engano')).toMatchObject({ appealed: true, appealText: 'foi engano' })
    expect(await cases.saveAppeal(first.id, 'de novo')).toBeNull()

    const second = cases.startSubmission({ tenantId: 't1', linkId: 'link-1', source: 'BLOCKLIST' })
    expect(second.id).not.toBe(first.id)
    expect(await cases.saveAppeal(second.id, 'texto novo')).toMatchObject({ appealed: true, appealText: 'texto novo' })
    expect(await cases.saveAppeal(second.id, 'outra vez')).toBeNull()

    const history = await cases.listByLinkId('link-1')
    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({ id: first.id, closed: true, appealText: 'foi engano' })
    expect(history[1]).toMatchObject({ id: second.id, closed: false, appealText: 'texto novo' })
  })
})
