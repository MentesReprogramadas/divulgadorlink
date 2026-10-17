import { expect, it } from 'vitest'
import { emptyProfile } from './profile-contract'
import { profileAppearance } from './profile-appearance'
import { hasUnpublishedProfile, profileKey } from './profile-diff'
it('diferenças são de conteúdo, não do número da versão nem da ausência de tema em páginas antigas', () => {
  const live = { ...emptyProfile(), slug: 'ana', name: 'Ana' }
  const newer = { ...live, version: 12, appearance: profileAppearance() }
  expect(hasUnpublishedProfile(newer, live)).toBe(false)
  expect(profileKey({ ...live, bio: ' Texto ' })).toBe(profileKey({ ...live, bio: 'Texto' }))
  expect(hasUnpublishedProfile({ ...live, bio: 'Novo' }, live)).toBe(true)
})
