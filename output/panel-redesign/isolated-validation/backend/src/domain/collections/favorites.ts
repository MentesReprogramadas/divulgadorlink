export class FavoritesError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) { super(message) }
}
export function collectionName(value: string): string {
  if ([...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new FavoritesError(400, 'Nome inválido.')
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name || name.length > 80) throw new FavoritesError(400, 'Use um nome entre 1 e 80 caracteres.')
  return name
}
export function favoriteView(row: { id: string; linkId: string; visible: boolean; name: string; description: string; niche?: { name: string; slug: string }; network?: { name: string; slug: string } }) {
  if (!row.visible) return { id: row.id, linkId: row.linkId, available: false as const }
  return { id: row.id, linkId: row.linkId, available: true as const, name: row.name, description: row.description, niche: row.niche, network: row.network, href: '/link/' + encodeURIComponent(row.linkId) }
}
