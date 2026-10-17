import { describe, expect, it } from 'vitest'
import { appeal } from '@/use-cases/@Moderation/appeal'

describe('contestação', () => {
  it('só aceita uma e não publica sozinha', () => {
    expect(appeal({ alreadyAppealed: false, text: 'foi engano' }).status).toBe('PENDING_MODERATION')
    expect(() => appeal({ alreadyAppealed: true, text: 'de novo' })).toThrow(/uma vez/)
  })
})
