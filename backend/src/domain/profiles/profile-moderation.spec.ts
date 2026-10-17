import { describe, expect, it } from 'vitest'
import type { ProfileContent } from './profile'
import { profileHasNewBlockedSignals, profileModerationChanges, profileModerationSnapshot } from './profile-moderation'

const original: ProfileContent = { slug: 'ana-estudos', name: 'Ana Estudos', bio: 'Projetos e leitura', avatarAssetId: null, requiresAge: false, primaryItemId: 'site', categories: [{ id: 'a', name: 'Projetos', visible: true }, { id: 'b', name: 'Contato', visible: false }], items: [{ id: 'site', categoryId: 'a', type: 'URL', label: 'Meu site', destination: 'https://example.com/site', visible: true }, { id: 'social', categoryId: 'b', type: 'SOCIAL', label: 'Converse comigo', destination: 'https://example.com/contato', visible: false }] }
describe('reaproveitamento da aprovação do conteúdo do perfil', () => {
  it('aparência, caixa/espaçamento, ordem, visibilidade e organização não introduzem conteúdo', () => {
    expect(profileModerationChanges({ ...original, name: ' ANA   ESTUDOS ', primaryItemId: 'social', categories: [...original.categories].reverse().map(group => ({ ...group, visible: true })), items: [...original.items].reverse().map(item => ({ ...item, categoryId: 'b', visible: true })) }, original).changedFields).toEqual([])
    expect(profileModerationChanges({ ...original, categories: original.categories.slice(0, 1), items: original.items.slice(0, 1) }, original).changedFields).toEqual([])
  })
  it('IDs e parâmetros removidos pela canonicalização não invalidam o mesmo destino e rótulo', () => {
    expect(profileModerationChanges({ ...original, items: [{ ...original.items[0], id: 'clone', destination: 'https://EXAMPLE.com/site/?utm_source=fixture#top' }] }, original).changedFields).toEqual([])
  })
  it('destinos, tipos e rótulos novos, inclusive ocultos, exigem análise', () => {
    for (const patch of [{ destination: 'https://example.com/outro' }, { label: 'Nova oferta' }, { type: 'SOCIAL' as const }]) expect(profileModerationChanges({ ...original, items: [{ ...original.items[0], ...patch, visible: false }] }, original).changedFields).not.toEqual([])
  })
  it('texto novo é analisado sem repetir bloqueios de textos preservados', () => {
    const result = profileModerationChanges({ ...original, name: 'Ana — meus estudos' }, { ...original, bio: original.bio })
    expect(result).toEqual({ changedFields: ['nome'], text: 'Ana — meus estudos' })
    expect(profileModerationChanges({ ...original, bio: 'Novo assunto' }, original).changedFields).toEqual(['descrição'])
  })
  it('primeira publicação, foto, idade e endereço não são tratados como aparência', () => {
    expect(profileModerationChanges(original).changedFields).toEqual(['primeira publicação'])
    expect(profileModerationChanges({ ...original, avatarAssetId: 'new', requiresAge: true, slug: 'novo-endereco' }, original).changedFields).toEqual(['endereço da página', 'foto', 'restrição de idade'])
  })
  it('pontuação no nome de grupo não introduz tema; palavras, símbolos e destinos novos continuam analisados', () => {
    expect(profileModerationChanges({ ...original, categories: [{ ...original.categories[0], name: '...' }] }, original).changedFields).toEqual([])
    for (const name of ['Conteúdo adulto', '⛔', 'www.novo.test']) expect(profileModerationChanges({ ...original, categories: [{ ...original.categories[0], name }] }, original).changedFields).toEqual(['nome de grupo'])
    expect(profileModerationChanges({ ...original, categories: [{ ...original.categories[0], name: '...' }], items: [{ ...original.items[0], destination: 'https://novo.test/' }] }, original).changedFields).toContain('destino ou tipo de link')
  })
  it('sinais já aprovados seguem para IA contextual; novos sinais mantêm a revisão obrigatória', () => {
    const approved = { ...original, requiresAge: true, bio: 'Adulto +18. Contato https://example.com/contato ou 11999998888' }
    expect(profileHasNewBlockedSignals('Meu espaço adulto +18. Contato https://example.com/contato ou 11999998888', ['adulto', '+18'], approved)).toBe(false)
    for (const text of ['Novo proibido', 'https://example.com/contato-novo', '11999997777', 'www.novo.test']) expect(profileHasNewBlockedSignals(text, ['proibido'], approved)).toBe(true)
    expect(profileHasNewBlockedSignals('Adulto', ['adulto'])).toBe(true)
    expect(profileModerationSnapshot(approved)).toMatchObject({ requiresAge: true, description: approved.bio, links: [{ id: 'site', destination: original.items[0].destination }, { id: 'social', type: 'SOCIAL' }] })
  })
})
