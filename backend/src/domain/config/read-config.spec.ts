import { expect, it } from 'vitest'
import { readConfig } from './read-config'

it('configuração vazia não desativa a aprovação pela IA como se fosse zero', () => {
  for (const value of ['', ' ', '\t']) expect(() => readConfig({ MODERATION_AUTO_APPROVE_THRESHOLD: value }, 'MODERATION_AUTO_APPROVE_THRESHOLD')).toThrow()
  expect(readConfig({ MODERATION_AUTO_APPROVE_THRESHOLD: '0' }, 'MODERATION_AUTO_APPROVE_THRESHOLD')).toBe(0)
})
