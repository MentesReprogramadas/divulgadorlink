import { describe, expect, it } from 'vitest'
import { getAcquisitionStore, publishEventName, resetAcquisitionStoreForTest } from '@/use-cases/@Acquisition/record-funnel'
import { parseTouch } from '@/domain/acquisition/touch'

const touch = parseTouch(JSON.stringify({
  source: 'meta', medium: 'paid', campaign: 'outubro', content: 'a', term: 'b', landingPath: '/divulgar',
}))

describe('funil', () => {
  it('publica só na primeira transição para publicado', () => {
    expect(publishEventName('PENDING_MODERATION', 'PUBLISHED')).toBe('LinkPublished')
    expect(publishEventName('PUBLISHED', 'PUBLISHED')).toBeNull()
    expect(publishEventName('PENDING_MODERATION', 'PRE_REJECTED')).toBeNull()
  })

  it('grava o toque só quando o cookie existe e não repete o evento', async () => {
    resetAcquisitionStoreForTest()
    const store = getAcquisitionStore()
    await store.rememberRegistration({ tenantId: 't', userId: 'u1', touch })
    await store.rememberRegistration({ tenantId: 't', userId: 'u2', touch: null })
    expect(store.touchFor('u1')?.campaign).toBe('outubro')
    expect(store.touchFor('u2')).toBeNull()
    const again = await store.recordFunnel({
      tenantId: 't', eventId: 'u1', name: 'CompleteRegistration', userId: 'u1', linkId: null,
    })
    expect(again).toBe('duplicate')
  })

  it('não chama a Meta no evento repetido', async () => {
    resetAcquisitionStoreForTest()
    const store = getAcquisitionStore()
    const calls: string[] = []
    const input = {
      tenantId: 't',
      eventId: 'link-1',
      name: 'SubmitLink' as const,
      userId: 'u1',
      linkId: 'link-1',
      onInserted: async () => { calls.push('meta') },
    }
    expect(await store.recordFunnel(input)).toBe('inserted')
    expect(await store.recordFunnel(input)).toBe('duplicate')
    expect(calls).toEqual(['meta'])
  })
})
