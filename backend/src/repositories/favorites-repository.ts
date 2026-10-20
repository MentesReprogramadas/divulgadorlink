import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { PUBLIC_LINK_FILTER } from '@/domain/catalog/public-link'
import { collectionName, favoriteView, FavoritesError } from '@/domain/collections/favorites'

type Scope = { tenantId: string; userId: string; age: boolean }
type Operation =
  | { kind: 'list-favorites'; cursor?: string }
  | { kind: 'favorite'; linkId: string; method: 'GET' | 'PUT' | 'DELETE' }
  | { kind: 'list-collections'; cursor?: string }
  | { kind: 'create'; id: string; name: string }
  | { kind: 'collection'; id: string; cursor?: string }
  | { kind: 'rename'; id: string; name: string; expectedVersion: number }
  | { kind: 'delete'; id: string; expectedVersion: number }
  | { kind: 'item'; id: string; favoriteId: string; method: 'PUT' | 'DELETE' | 'PATCH'; expectedVersion: number; move?: 'up' | 'down' }
const notFound = () => new FavoritesError(404, 'Recurso não encontrado.')
const conflict = () => new FavoritesError(409, 'A coleção mudou. Atualize os dados antes de continuar.')
const linkInclude = { niche: true, network: true, owner: { select: { status: true, tenantId: true } } } as const

export async function favoritesOperation(db: PrismaClient, scope: Scope, operation: Operation) {
  const { tenantId, userId } = scope
  const write = !['list-favorites', 'list-collections', 'collection'].includes(operation.kind) && !(operation.kind === 'favorite' && operation.method === 'GET')
  return db.$transaction(async tx => {
    // Serialize writes by the actual owner before touching a link or collection.
    const actors = await tx.$queryRaw<Array<{ status: string }>>`SELECT status::text FROM users WHERE id=${userId} AND "tenantId"=${tenantId} ${write ? Prisma.sql`FOR UPDATE` : Prisma.empty}`
    if (!actors[0] || actors[0].status !== 'ACTIVE') throw new FavoritesError(403, 'Conta indisponível para esta ação.')
    const owner = { tenantId, userId }
    const view = (favorite: { id: string; linkId: string; link: Prisma.LinkGetPayload<{ include: typeof linkInclude }> }) => {
      const l = favorite.link
      const visible = l.status === 'PUBLISHED' && l.tenantId === tenantId && l.niche.tenantId === tenantId && l.network.tenantId === tenantId && (!l.ownerId || (l.owner?.status !== 'BANNED' && l.owner?.tenantId === tenantId)) && (scope.age || !(l.niche.requiresAge || l.network.requiresAge))
      return favoriteView({ ...favorite, visible, name: l.name, description: l.description, niche: { name: l.niche.name, slug: l.niche.slug }, network: { name: l.network.name, slug: l.network.slug } })
    }
    if (operation.kind === 'favorite') {
      const where = { tenantId_userId_linkId: { ...owner, linkId: operation.linkId } }
      if (operation.method === 'GET') {
        const saved = await tx.favorite.findUnique({ where, select: { id: true } })
        return { saved: Boolean(saved), favoriteId: saved?.id ?? null }
      }
      if (operation.method === 'DELETE') {
        await tx.collection.updateMany({
          where: { ...owner, items: { some: { favorite: { linkId: operation.linkId, ...owner } } } },
          data: { version: { increment: 1 } },
        })
        await tx.favorite.deleteMany({ where: { ...owner, linkId: operation.linkId } })
        return { saved: false }
      }
      const eligible = await tx.$queryRaw<Array<{ id: string }>>`SELECT l.id FROM links l JOIN niches n ON n.id=l."nicheId" AND n."tenantId"=l."tenantId" JOIN networks net ON net.id=l."networkId" AND net."tenantId"=l."tenantId" WHERE l.id=${operation.linkId} AND l."tenantId"=${tenantId} AND ${Prisma.raw(PUBLIC_LINK_FILTER)} AND (${scope.age} OR NOT (n."requiresAge" OR net."requiresAge")) AND (l."ownerId" IS NULL OR EXISTS (SELECT 1 FROM users u WHERE u.id=l."ownerId" AND u."tenantId"=l."tenantId")) FOR SHARE OF l`
      if (!eligible.length) throw notFound()
      const favorite = await tx.favorite.upsert({ where, update: {}, create: { id: randomUUID(), ...owner, linkId: operation.linkId }, select: { id: true, linkId: true } })
      return { saved: true, favoriteId: favorite.id, favorite }
    }
    if (operation.kind === 'list-favorites') {
      if (operation.cursor && !await tx.favorite.findFirst({ where: { ...owner, id: operation.cursor } })) throw notFound()
      const rows = await tx.favorite.findMany({ where: { ...owner, ...(operation.cursor ? { id: { gt: operation.cursor } } : {}) }, orderBy: { id: 'asc' }, take: 21, include: { link: { include: linkInclude }, items: { select: { collectionId: true } } } })
      return { items: rows.slice(0, 20).map(row => ({ ...view(row), collectionIds: row.items.map(i => i.collectionId) })), nextCursor: rows.length > 20 ? rows[19]!.id : null }
    }
    if (operation.kind === 'list-collections') {
      if (operation.cursor && !await tx.collection.findFirst({ where: { ...owner, id: operation.cursor } })) throw notFound()
      const rows = await tx.collection.findMany({ where: { ...owner, ...(operation.cursor ? { id: { gt: operation.cursor } } : {}) }, orderBy: { id: 'asc' }, take: 21, select: { id: true, name: true, version: true } })
      return { items: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19]!.id : null }
    }
    if (operation.kind === 'create') {
      const name = collectionName(operation.name)
      const existing = await tx.collection.findUnique({ where: { id: operation.id } })
      if (existing) {
        if (existing.tenantId !== tenantId || existing.userId !== userId) throw notFound()
        if (existing.name !== name) throw conflict()
        return { collection: { id: existing.id, name: existing.name, version: existing.version } }
      }
      const created = await tx.collection.create({ data: { id: operation.id, ...owner, name }, select: { id: true, name: true, version: true } })
      return { collection: created }
    }
    const collection = await tx.collection.findFirst({ where: { id: operation.id, ...owner }, select: { id: true, name: true, version: true, visibility:true, slug:true, publication:true, publishedRevision:true } })
    if (!collection) throw notFound()
    if (operation.kind === 'collection') {
      const cursor = operation.cursor ? await tx.collectionItem.findFirst({ where: { collectionId: collection.id, favoriteId: operation.cursor, ...owner } }) : null
      if (operation.cursor && !cursor) throw notFound()
      const rows = await tx.collectionItem.findMany({ where: { collectionId: collection.id, ...owner, ...(cursor ? { OR: [{ position: { gt: cursor.position } }, { position: cursor.position, favoriteId: { gt: cursor.favoriteId } }] } : {}) }, orderBy: [{ position: 'asc' }, { favoriteId: 'asc' }], take: 21, include: { favorite: { include: { link: { include: linkInclude } } } } })
      return { collection, items: rows.slice(0, 20).map(row => ({ ...view(row.favorite), position: row.position })), nextCursor: rows.length > 20 ? rows[19]!.favoriteId : null }
    }
    if (operation.kind === 'item') {
      const favorite = await tx.favorite.findFirst({ where: { id: operation.favoriteId, ...owner } })
      if (!favorite) throw notFound()
      const key = { collectionId_favoriteId: { collectionId: collection.id, favoriteId: favorite.id } }
      const existing = await tx.collectionItem.findUnique({ where: key })
      if ((operation.method === 'PUT' && existing) || (operation.method === 'DELETE' && !existing)) return { collection }
      if (collection.version !== operation.expectedVersion) throw conflict()
      if (operation.method === 'PUT') {
        const last = await tx.collectionItem.aggregate({ where: { collectionId: collection.id }, _max: { position: true } })
        const position = (last._max.position ?? -1) + 1
        if (position > 2147483646) throw new FavoritesError(409, 'Atualize a organização da coleção.')
        await tx.collectionItem.create({ data: { collectionId: collection.id, favoriteId: favorite.id, ...owner, position } })
      } else if (operation.method === 'DELETE') await tx.collectionItem.delete({ where: key })
      else {
        if (!existing) throw notFound()
        const neighbor = await tx.collectionItem.findFirst({ where: { collectionId: collection.id, position: operation.move === 'up' ? { lt: existing.position } : { gt: existing.position } }, orderBy: { position: operation.move === 'up' ? 'desc' : 'asc' } })
        if (!neighbor) return { collection }
        await tx.collectionItem.update({ where: key, data: { position: neighbor.position } })
        await tx.collectionItem.update({ where: { collectionId_favoriteId: { collectionId: collection.id, favoriteId: neighbor.favoriteId } }, data: { position: existing.position } })
      }
    } else {
      if (collection.version !== operation.expectedVersion) throw conflict()
      if (operation.kind === 'delete') { await tx.collection.delete({ where: { id: collection.id } }); return { deleted: true } }
      if (operation.kind === 'rename') await tx.collection.update({ where: { id: collection.id }, data: { name: collectionName(operation.name) } })
    }
    const updated = await tx.collection.update({ where: { id: collection.id }, data: { version: { increment: 1 } }, select: { id: true, name: true, version: true } })
    return { collection: updated }
  }, { isolationLevel: write ? Prisma.TransactionIsolationLevel.ReadCommitted : Prisma.TransactionIsolationLevel.RepeatableRead })
}
