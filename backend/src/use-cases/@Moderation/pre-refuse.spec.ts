import { describe, expect, it } from 'vitest'
import { preRefuse } from '@/use-cases/@Moderation/pre-refuse'

describe('pré-recusa', () => {
  it('dispara por telefone antigo e não dispara por IP', () => {
    const result = preRefuse({
      phoneHistory: ['+5511999999999'],
      bannedPhones: ['+5511999999999'],
      emailHistory: [],
      bannedEmails: [],
      url: 'https://t.me/livre',
      bannedUrls: ['https://t.me/exemplo123'],
      ip: '1.1.1.1',
    })
    expect(result.refused).toBe(true)
    expect(result.signals).toEqual(['phone'])
  })
})
