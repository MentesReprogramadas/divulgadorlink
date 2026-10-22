import type { Prisma } from '@prisma/client'
import { expect, it, vi } from 'vitest'
import { validateProfile } from '@/use-cases/@Profiles/validate-profile'
import { validateRedirectContent } from '@/use-cases/@Redirects/validate-content'
import type { ProfileContent } from '@/domain/profiles/profile'
import { ContentReviewRequired } from '@/domain/moderation/content-review'

function fixture(value = '0', terms: string[] = []) {
  return { blocklistTerm: { findMany: async () => terms.map(term => ({ term })) }, link: { findMany: async () => [] }, config: { findUnique: async () => ({ value }) } } as unknown as Prisma.TransactionClient
}
const content: ProfileContent = { slug: 'pessoal', name: 'Página pessoal', bio: 'Estudos', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [], items: [] }
it('zero libera páginas e convites sem consultar IA indisponível', async () => {
  const judge = vi.fn(async () => { throw new Error('offline') })
  const ports = { probe: async () => 200, judge }
  expect((await validateProfile(fixture(), 'tenant', content, ports)).name).toBe(content.name)
  expect(await validateRedirectContent(fixture(), 'tenant', { label: 'Meu convite', destinationUrl: 'https://example.com/convite', requiresAge: false, expectedRevision: 0, requestKey: '00000000-0000-4000-8000-000000000000' }, ports)).toBe('https://example.com/convite')
  expect(judge).not.toHaveBeenCalled()
})
it('zero preserva blocklist e validação do destino; vazio não vira zero', async () => {
  const judge = vi.fn(async () => null), ports = { probe: async () => 200, judge }
  await expect(validateProfile(fixture('0', ['pessoal']), 'tenant', content, ports)).rejects.toBeInstanceOf(ContentReviewRequired)
  await expect(validateProfile(fixture(' '), 'tenant', content, ports)).rejects.toBeInstanceOf(ContentReviewRequired)
  await expect(validateRedirectContent(fixture('0', ['convite']), 'tenant', { label: 'Meu convite', destinationUrl: 'https://example.com/convite', requiresAge: false, expectedRevision: 0, requestKey: '00000000-0000-4000-8000-000000000000' }, ports)).rejects.toBeInstanceOf(ContentReviewRequired)
  await expect(validateRedirectContent(fixture(), 'tenant', { label: 'Meu convite', destinationUrl: 'http://127.0.0.1/privado', requiresAge: false, expectedRevision: 0, requestKey: '00000000-0000-4000-8000-000000000000' }, ports)).rejects.toThrow()
  expect(judge).not.toHaveBeenCalled()
})
