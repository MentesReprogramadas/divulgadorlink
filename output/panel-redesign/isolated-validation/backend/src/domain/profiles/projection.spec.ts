import { expect, it } from 'vitest'
import { visibleProfile, type ProfileContent } from './profile'
const content: ProfileContent = { slug: 'meu-perfil', name: 'Ana', bio: 'Projetos', avatarAssetId: null, requiresAge: false, primaryItemId: 'hidden', categories: [{ id: 'one', name: 'Projetos', visible: true }, { id: 'secret', name: 'GrupoOculto', visible: false }], items: [
  { id: 'web', categoryId: 'one', type: 'URL', label: 'Site', destination: 'https://example.com/', visible: true },
  { id: 'hidden', categoryId: 'one', type: 'URL', label: 'ItemOculto', destination: 'https://example.com/segredo', visible: false },
  { id: 'parent', categoryId: 'secret', type: 'URL', label: 'FilhoOculto', destination: 'https://example.com/privado', visible: true },
  { id: 'catalog', categoryId: 'one', type: 'CATALOG', label: 'Indisponivel', destination: 'catalog-id', visible: true },
] }
it('F09-U03/T05 projeção elimina categorias ocultas, itens ocultos e catálogo inelegível, inclusive botão principal', () => {
  const result = visibleProfile(content, new Set())
  expect(result.categories.map(c => c.id)).toEqual(['one'])
  expect(result.items.map(i => i.id)).toEqual(['web'])
  expect(result.primaryItemId).toBeNull()
  expect(JSON.stringify(result)).not.toMatch(/ItemOculto|GrupoOculto|FilhoOculto|Indisponivel|segredo|privado/)
  expect(content.items).toHaveLength(4)
})
it('F09-U04/U05 referências pessoais não criam facetas nem convertem URLs em Link do catálogo', () => {
  const result = visibleProfile({ ...content, primaryItemId: 'catalog' }, new Set(['catalog-id']))
  expect(result.items.map(i => [i.type, i.destination])).toEqual([['URL', 'https://example.com/'], ['CATALOG', 'catalog-id']])
  expect(result).not.toHaveProperty('nicheId'); expect(result.categories[0]).not.toHaveProperty('networkId')
  expect(result.primaryItemId).toBe('catalog')
})
