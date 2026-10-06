import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient, type Link as PrismaLink } from '@prisma/client'
import {
  enqueueEmbedLink,
  shouldEnqueueEmbedLink,
  type LinkEmbedSnapshot,
} from '@/adapters/queues/enqueue-embed-link'
import { substantiveText } from '@/domain/catalog/index-policy'
import { prisma } from '@/lib/prisma'
import { recordEmbeddingIntent, tryDispatchEmbedding } from '@/use-cases/@Search/embedding-outbox'
import { banAccount } from '@/use-cases/@Admin/ban-account'
import { facetMatchesProbe, escapeLikePrefix, FACET_ACCENTS, FACET_PLAIN, type SearchFacetProbe } from '@/use-cases/@Search/rank-links'

function scheduleEmbedding(linkId: string, snapshot: LinkEmbedSnapshot): void {
  const intent = recordEmbeddingIntent(linkId, snapshot)
  void tryDispatchEmbedding(intent.id, async () => {
    await enqueueEmbedLink(linkId, intent.id)
  })
}

function linkEmbedSnapshot(row: {
  status: string
  name: string
  description: string
  networkId: string
  nicheId: string
}): LinkEmbedSnapshot {
  return {
    status: row.status,
    name: row.name,
    description: row.description,
    networkId: row.networkId,
    nicheId: row.nicheId,
  }
}

export type LinkStatus =
  | 'DRAFT'
  | 'PENDING_MODERATION'
  | 'PRE_REJECTED'
  | 'PUBLISHED'
  | 'UNAVAILABLE'

export const SLOT_STATUSES: LinkStatus[] = ['PENDING_MODERATION', 'PUBLISHED', 'PRE_REJECTED']
export const LINK_QUOTA = 4

export type SubmitterIdentifier = {
  id: string
  kind: 'EMAIL' | 'PHONE'
  normalizedValue: string
  confirmedAt: Date | null
  replacedAt: Date | null
}

export type SubmitterRecord = {
  id: string
  tenantId: string
  name?: string
  role?: 'ADMIN' | 'USER'
  status: 'ACTIVE' | 'BANNED'
  identifiers: SubmitterIdentifier[]
}

export type NetworkRecord = {
  id: string
  tenantId: string
  name: string
  slug: string
  isPublicFacet: boolean
  requiresAge?: boolean
  summary: string | null
}
export type NicheRecord = {
  id: string
  tenantId: string
  name: string
  slug: string
  requiresAge: boolean
  isPublicFacet: boolean
  summary: string | null
}

export type LinkRecord = {
  id: string
  tenantId: string
  ownerId: string | null
  canonicalUrl: string
  name: string
  description: string
  networkId: string
  nicheId: string
  otherNote: string | null
  status: LinkStatus
  occupiesSlot: boolean
  everPublished: boolean
  approvedName: string | null
  approvedDescription: string | null
  createdAt: Date
  updatedAt: Date
}

export type LinkModerationPatch = {
  status: LinkStatus
  occupiesSlot: boolean
  name?: string
  description?: string
  networkId?: string
  nicheId?: string
  everPublished?: boolean
  approvedName?: string | null
  approvedDescription?: string | null
}

export type NewLinkData = Omit<
  LinkRecord,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'occupiesSlot'
  | 'everPublished'
  | 'approvedName'
  | 'approvedDescription'
> & {
  ownerId: string
}

export interface LinksRepository {
  findLinkById(id: string): Promise<LinkRecord | null>
  findSubmitter(tenantId: string, userId: string): Promise<SubmitterRecord | null>
  findNetwork(tenantId: string, id: string): Promise<NetworkRecord | null>
  findNiche(tenantId: string, id: string): Promise<NicheRecord | null>
  listNiches(tenantId: string): Promise<NicheRecord[]>
  listNetworks(tenantId: string): Promise<NetworkRecord[]>
  findSearchFacetCandidates(tenantId: string, probe: SearchFacetProbe): Promise<{ niches: NicheRecord[]; networks: NetworkRecord[] }>
  listByOwner(tenantId: string, ownerId: string): Promise<LinkRecord[]>
  listBlocklistTerms(tenantId: string): Promise<string[]>
  listBannedIdentifiers(tenantId: string): Promise<{ phones: string[]; emails: string[] }>
  listBannedUrls(tenantId: string): Promise<string[]>
  /**
   * Counts the owner's slot-occupying links and inserts in one step, so two
   * concurrent submissions cannot both see a free slot. `decide` throws to abort.
   */
  createWithinQuota(
    data: NewLinkData,
    decide: (openSlots: number) => LinkStatus,
  ): Promise<LinkRecord>
  updateLinkModeration(linkId: string, patch: LinkModerationPatch): Promise<LinkRecord | null>
  createNiche(input: {
    tenantId: string
    name: string
    slug: string
    requiresAge: boolean
  }): Promise<NicheRecord>
  updateNicheFacet(input: { id: string; tenantId: string; isPublicFacet: boolean }): Promise<NicheRecord | null>
  substantiveCounts(tenantId: string): Promise<{
    niches: Array<{ id: string; count: number }>
    networks: Array<{ id: string; count: number }>
  }>
  updateFacetSummary(input: {
    kind: 'niche' | 'network'
    id: string
    tenantId: string
    summary: string | null
  }): Promise<NicheRecord | NetworkRecord | null>
  applyBan(input: {
    userId: string
    tenantId: string
    actorId: string
    requestId: string
    reason?: string
  }): Promise<{ userStatus: 'BANNED'; refunds: [] } | null>
  cancelActivePromotions(tenantId: string, linkId: string): Promise<number>
}

export class InMemoryLinksRepository implements LinksRepository {
  users: SubmitterRecord[] = []
  networks: NetworkRecord[] = []
  niches: NicheRecord[] = []
  terms: Array<{ tenantId: string; term: string }> = []
  links: LinkRecord[] = []
  promotions: Array<{ id: string; tenantId: string; linkId: string; status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' }> = []
  bans: Array<{ userId: string; actorId: string; requestId: string; reason: string | null; refunds: [] }> = []

  static seeded(): InMemoryLinksRepository {
    const repo = new InMemoryLinksRepository()
    repo.reset()
    return repo
  }

  reset(): void {
    const tenantId = 'seed-temlinkaqui'
    this.users = []
    this.terms = []
    this.links = []
    this.promotions = []
    this.bans = []
    this.networks = [
      { id: 'net-telegram', tenantId, name: 'Telegram', slug: 'telegram', isPublicFacet: true, summary: null },
      { id: 'net-outro', tenantId, name: 'Outro', slug: 'outro', isPublicFacet: false, summary: null },
    ]
    this.niches = [
      { id: 'niche-jogos', tenantId, name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true, summary: null },
      { id: 'niche-apostas', tenantId, name: 'Apostas', slug: 'apostas', requiresAge: true, isPublicFacet: true, summary: null },
    ]
  }

  addUser(user: SubmitterRecord): void {
    this.users.push({ ...user, identifiers: user.identifiers.map((row) => ({ ...row })) })
  }

  addTerm(tenantId: string, term: string): void {
    this.terms.push({ tenantId, term })
  }

  addLink(input: Partial<LinkRecord> & { tenantId: string; status: LinkStatus }): LinkRecord {
    const now = new Date()
    const row: LinkRecord = {
      id: randomUUID(),
      ownerId: null,
      canonicalUrl: `https://t.me/${randomUUID()}`,
      name: 'link',
      description: '',
      networkId: 'net-telegram',
      nicheId: 'niche-jogos',
      otherNote: null,
      occupiesSlot: true,
      everPublished: input.status === 'PUBLISHED',
      approvedName: input.status === 'PUBLISHED' ? (input.name ?? 'link') : null,
      approvedDescription: input.status === 'PUBLISHED' ? (input.description ?? '') : null,
      createdAt: now,
      updatedAt: now,
      ...input,
    }
    if (row.status === 'PUBLISHED') {
      row.everPublished = true
      row.approvedName = row.name
      row.approvedDescription = row.description
    }
    this.links.push(row)
    return { ...row }
  }

  async updateLinkModeration(linkId: string, patch: LinkModerationPatch): Promise<LinkRecord | null> {
    const row = this.links.find((item) => item.id === linkId)
    if (!row) return null
    const before = linkEmbedSnapshot(row)
    Object.assign(row, patch, { updatedAt: new Date() })
    if (patch.status === 'PUBLISHED') {
      row.everPublished = true
      row.approvedName = row.name
      row.approvedDescription = row.description
    }
    const after = linkEmbedSnapshot(row)
    if (shouldEnqueueEmbedLink(before, after)) {
      scheduleEmbedding(linkId, after)
    }
    return { ...row }
  }

  async applyBan(input: {
    userId: string
    tenantId: string
    actorId: string
    requestId: string
    reason?: string
  }): Promise<{ userStatus: 'BANNED'; refunds: [] } | null> {
    const user = this.users.find((row) => row.id === input.userId && row.tenantId === input.tenantId)
    if (!user) return null
    const owned = this.links.filter((row) => row.ownerId === input.userId && row.tenantId === input.tenantId)
    const promos = this.promotions.filter((row) => owned.some((link) => link.id === row.linkId))
    const result = banAccount({
      links: owned.map((row) => ({ id: row.id, status: row.status })),
      promotions: promos.map((row) => ({ id: row.id, status: row.status })),
    })
    user.status = 'BANNED'
    this.bans.push({
      userId: input.userId,
      actorId: input.actorId,
      requestId: input.requestId,
      reason: input.reason ?? null,
      refunds: result.refunds,
    })
    for (const next of result.links) {
      const row = this.links.find((link) => link.id === next.id)
      if (!row) continue
      row.status = next.status
      row.occupiesSlot = false
    }
    for (const next of result.promotions) {
      const row = this.promotions.find((promotion) => promotion.id === next.id)
      if (row) row.status = next.status
    }
    void input.actorId
    void input.requestId
    void input.reason
    return { userStatus: result.userStatus, refunds: result.refunds }
  }

  async cancelActivePromotions(tenantId: string, linkId: string): Promise<number> {
    let cancelled = 0
    for (const row of this.promotions) {
      if (row.tenantId !== tenantId || row.linkId !== linkId || row.status !== 'ACTIVE') continue
      row.status = 'CANCELLED'
      cancelled += 1
    }
    return cancelled
  }

  async createNiche(input: {
    tenantId: string
    name: string
    slug: string
    requiresAge: boolean
  }): Promise<NicheRecord> {
    const row: NicheRecord = {
      id: randomUUID(),
      isPublicFacet: !input.requiresAge,
      ...input,
      summary: null,
    }
    this.niches.push(row)
    return { ...row }
  }

  async updateNicheFacet(input: {
    id: string
    tenantId: string
    isPublicFacet: boolean
  }): Promise<NicheRecord | null> {
    const row = this.niches.find((item) => item.id === input.id && item.tenantId === input.tenantId)
    if (!row) return null
    row.isPublicFacet = input.isPublicFacet
    return { ...row }
  }

  async substantiveCounts(tenantId: string): Promise<{
    niches: Array<{ id: string; count: number }>
    networks: Array<{ id: string; count: number }>
  }> {
    const rows = this.links.filter((link) => {
      if (link.tenantId !== tenantId || link.status !== 'PUBLISHED') return false
      if (!substantiveText(link.name, link.description)) return false
      if (link.ownerId !== null) {
        const owner = this.users.find((user) => user.id === link.ownerId)
        if (!owner || owner.status === 'BANNED') return false
      }
      const niche = this.niches.find((row) => row.id === link.nicheId)
      return niche !== undefined && niche.requiresAge !== true
    })
    return groupFacetCounts(rows)
  }

  async updateFacetSummary(input: {
    kind: 'niche' | 'network'
    id: string
    tenantId: string
    summary: string | null
  }): Promise<NicheRecord | NetworkRecord | null> {
    const rows = input.kind === 'niche' ? this.niches : this.networks
    const row = rows.find((item) => item.id === input.id && item.tenantId === input.tenantId)
    if (!row) return null
    row.summary = input.summary
    return { ...row }
  }

  async findLinkById(id: string): Promise<LinkRecord | null> {
    const row = this.links.find((item) => item.id === id)
    return row ? { ...row } : null
  }

  async findSubmitter(tenantId: string, userId: string): Promise<SubmitterRecord | null> {
    const user = this.users.find((row) => row.id === userId && row.tenantId === tenantId)
    return user ? { ...user, identifiers: user.identifiers.map((row) => ({ ...row })) } : null
  }

  async findNetwork(tenantId: string, id: string): Promise<NetworkRecord | null> {
    const row = this.networks.find((item) => item.id === id && item.tenantId === tenantId)
    return row ? { ...row } : null
  }

  async findNiche(tenantId: string, id: string): Promise<NicheRecord | null> {
    const row = this.niches.find((item) => item.id === id && item.tenantId === tenantId)
    return row ? { ...row } : null
  }

  async listNiches(tenantId: string): Promise<NicheRecord[]> {
    return this.niches.filter((item) => item.tenantId === tenantId).map((item) => ({ ...item }))
  }

  async listNetworks(tenantId: string): Promise<NetworkRecord[]> {
    return this.networks.filter((item) => item.tenantId === tenantId).map((item) => ({ ...item }))
  }

  async findSearchFacetCandidates(tenantId: string, probe: SearchFacetProbe): Promise<{ niches: NicheRecord[]; networks: NetworkRecord[] }> {
    const visible = (item: { tenantId: string; isPublicFacet: boolean; slug: string; name: string }) =>
      item.tenantId === tenantId && item.isPublicFacet && facetMatchesProbe(item, probe)
    return {
      niches: this.niches.filter(visible).map((item) => ({ ...item })),
      networks: this.networks.filter(visible).map((item) => ({ ...item })),
    }
  }

  async listByOwner(tenantId: string, ownerId: string): Promise<LinkRecord[]> {
    return this.links
      .filter((item) => item.tenantId === tenantId && item.ownerId === ownerId)
      .map((item) => ({ ...item }))
  }

  async listBlocklistTerms(tenantId: string): Promise<string[]> {
    return this.terms.filter((item) => item.tenantId === tenantId).map((item) => item.term)
  }

  async listBannedIdentifiers(tenantId: string): Promise<{ phones: string[]; emails: string[] }> {
    const identifiers = this.users
      .filter((user) => user.tenantId === tenantId && user.status === 'BANNED')
      .flatMap((user) => user.identifiers)
    return {
      phones: identifiers.filter((row) => row.kind === 'PHONE').map((row) => row.normalizedValue),
      emails: identifiers.filter((row) => row.kind === 'EMAIL').map((row) => row.normalizedValue),
    }
  }

  async listBannedUrls(tenantId: string): Promise<string[]> {
    const banned = new Set(
      this.users
        .filter((user) => user.tenantId === tenantId && user.status === 'BANNED')
        .map((user) => user.id),
    )
    return this.links
      .filter((link) => link.tenantId === tenantId && link.ownerId !== null && banned.has(link.ownerId))
      .map((link) => link.canonicalUrl)
  }

  async createWithinQuota(
    data: NewLinkData,
    decide: (openSlots: number) => LinkStatus,
  ): Promise<LinkRecord> {
    const used = this.links.filter(
      (link) =>
        link.tenantId === data.tenantId &&
        link.ownerId === data.ownerId &&
        SLOT_STATUSES.includes(link.status) &&
        link.occupiesSlot,
    ).length
    const status = decide(LINK_QUOTA - used)
    return this.addLink({ ...data, status })
  }
}

export class PrismaLinksRepository implements LinksRepository {
  constructor(private readonly client: PrismaClient) {}

  async findLinkById(id: string): Promise<LinkRecord | null> {
    const row = await this.client.link.findUnique({ where: { id } })
    return row ? toLinkRecord(row) : null
  }

  async findSubmitter(tenantId: string, userId: string): Promise<SubmitterRecord | null> {
    const user = await this.client.user.findFirst({
      where: { id: userId, tenantId },
      include: { identifiers: true },
    })
    if (!user) {
      return null
    }
    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      role: user.role,
      status: user.status,
      identifiers: user.identifiers.map((row) => ({
        id: row.id,
        kind: row.kind,
        normalizedValue: row.normalizedValue,
        confirmedAt: row.confirmedAt,
        replacedAt: row.replacedAt,
      })),
    }
  }

  async findNetwork(tenantId: string, id: string): Promise<NetworkRecord | null> {
    return this.client.network.findFirst({
      where: { id, tenantId },
      select: { id: true, tenantId: true, name: true, slug: true, isPublicFacet: true, requiresAge: true, summary: true },
    })
  }

  async findNiche(tenantId: string, id: string): Promise<NicheRecord | null> {
    return this.client.niche.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        requiresAge: true,
        isPublicFacet: true,
        summary: true,
      },
    })
  }

  async listNetworks(tenantId: string): Promise<NetworkRecord[]> {
    return this.client.network.findMany({
      where: { tenantId },
      select: { id: true, tenantId: true, name: true, slug: true, isPublicFacet: true, requiresAge: true, summary: true },
    })
  }

  async findSearchFacetCandidates(tenantId: string, probe: SearchFacetProbe): Promise<{ niches: NicheRecord[]; networks: NetworkRecord[] }> {
    if (!probe.exact) return { niches: [], networks: [] }
    const keys = [...new Set([probe.exact, ...probe.tokens])]
    const pattern = probe.prefix ? `${escapeLikePrefix(probe.prefix)}%` : null
    const nameFold = Prisma.sql`lower(translate(name, ${FACET_ACCENTS}, ${FACET_PLAIN}))`
    const slugFold = Prisma.sql`lower(slug)`
    const matched = pattern
      ? Prisma.sql`${slugFold} IN (${Prisma.join(keys)}) OR ${nameFold} IN (${Prisma.join(keys)}) OR ${slugFold} LIKE ${pattern} ESCAPE '\\' OR ${nameFold} LIKE ${pattern} ESCAPE '\\'`
      : Prisma.sql`${slugFold} IN (${Prisma.join(keys)}) OR ${nameFold} IN (${Prisma.join(keys)})`
    const [niches, networks] = await Promise.all([
      this.client.$queryRaw<NicheRecord[]>`
        SELECT id, "tenantId", name, slug, "requiresAge", "isPublicFacet"
        FROM niches
        WHERE "tenantId" = ${tenantId} AND "isPublicFacet" = true AND (${matched})
      `,
      this.client.$queryRaw<NetworkRecord[]>`
        SELECT id, "tenantId", name, slug, "requiresAge", "isPublicFacet"
        FROM networks
        WHERE "tenantId" = ${tenantId} AND "isPublicFacet" = true AND (${matched})
      `,
    ])
    return { niches, networks }
  }

  async listByOwner(tenantId: string, ownerId: string): Promise<LinkRecord[]> {
    const rows = await this.client.link.findMany({ where: { tenantId, ownerId } })
    return rows.map((row) => toLinkRecord(row))
  }

  async listNiches(tenantId: string): Promise<NicheRecord[]> {
    return this.client.niche.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        requiresAge: true,
        isPublicFacet: true,
        summary: true,
      },
    })
  }

  async substantiveCounts(tenantId: string): Promise<{
    niches: Array<{ id: string; count: number }>
    networks: Array<{ id: string; count: number }>
  }> {
    const rows = await this.client.$queryRaw<Array<{ nicheId: string; networkId: string }>>`
      SELECT l."nicheId", l."networkId"
      FROM links l
      JOIN niches n ON n.id = l."nicheId"
      LEFT JOIN users u ON u.id = l."ownerId"
      WHERE l."tenantId" = ${tenantId}
        AND l.status = 'PUBLISHED'
        AND n."requiresAge" = false
        AND (l."ownerId" IS NULL OR u.status <> 'BANNED')
        AND char_length(btrim(l.description)) >= 80
        AND btrim(l.description) <> btrim(l.name)
    `
    return groupFacetCounts(rows)
  }

  async updateFacetSummary(input: {
    kind: 'niche' | 'network'
    id: string
    tenantId: string
    summary: string | null
  }): Promise<NicheRecord | NetworkRecord | null> {
    if (input.kind === 'niche') {
      const result = await this.client.niche.updateMany({
        where: { id: input.id, tenantId: input.tenantId },
        data: { summary: input.summary },
      })
      if (result.count === 0) return null
      return this.findNiche(input.tenantId, input.id)
    }
    const result = await this.client.network.updateMany({
      where: { id: input.id, tenantId: input.tenantId },
      data: { summary: input.summary },
    })
    if (result.count === 0) return null
    return this.findNetwork(input.tenantId, input.id)
  }

  async listBlocklistTerms(tenantId: string): Promise<string[]> {
    const rows = await this.client.blocklistTerm.findMany({
      where: { tenantId },
      select: { term: true },
    })
    return rows.map((row) => row.term)
  }

  async listBannedIdentifiers(tenantId: string): Promise<{ phones: string[]; emails: string[] }> {
    const rows = await this.client.userIdentifier.findMany({
      where: { tenantId, user: { tenantId, status: 'BANNED' } },
      select: { kind: true, normalizedValue: true },
    })
    return {
      phones: rows.filter((row) => row.kind === 'PHONE').map((row) => row.normalizedValue),
      emails: rows.filter((row) => row.kind === 'EMAIL').map((row) => row.normalizedValue),
    }
  }

  async listBannedUrls(tenantId: string): Promise<string[]> {
    const rows = await this.client.link.findMany({
      where: { tenantId, owner: { tenantId, status: 'BANNED' } },
      select: { canonicalUrl: true },
    })
    return rows.map((row) => row.canonicalUrl)
  }

  async createWithinQuota(
    data: NewLinkData,
    decide: (openSlots: number) => LinkStatus,
  ): Promise<LinkRecord> {
    return this.client.$transaction(
      async (tx) => {
        const used = await tx.link.count({
          where: {
            tenantId: data.tenantId,
            ownerId: data.ownerId,
            status: { in: SLOT_STATUSES },
            occupiesSlot: true,
          },
        })
        const status = decide(LINK_QUOTA - used)
        const created = await tx.link.create({ data: { ...data, status, occupiesSlot: true } })
        return toLinkRecord(created)
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  }

  async updateLinkModeration(linkId: string, patch: LinkModerationPatch): Promise<LinkRecord | null> {
    const existing = await this.client.link.findUnique({ where: { id: linkId } })
    if (!existing) return null
    const before = linkEmbedSnapshot(existing)
    const data: Prisma.LinkUncheckedUpdateInput = {
      status: patch.status,
      occupiesSlot: patch.occupiesSlot,
    }
    if (patch.name !== undefined) data.name = patch.name
    if (patch.description !== undefined) data.description = patch.description
    if (patch.networkId !== undefined) data.networkId = patch.networkId
    if (patch.nicheId !== undefined) data.nicheId = patch.nicheId
    if (patch.status === 'PUBLISHED') {
      data.everPublished = true
      data.approvedName = patch.name ?? existing.name
      data.approvedDescription = patch.description ?? existing.description
    }
    const updated = await this.client.$transaction(async (tx) => {
      const row = await tx.link.update({ where: { id: linkId }, data })
      const after = linkEmbedSnapshot(row)
      if (shouldEnqueueEmbedLink(before, after)) {
        await tx.link.update({ where: { id: linkId }, data: { embeddingState: 'PENDING' } })
        await tx.embeddingJob.create({
          data: {
            tenantId: row.tenantId,
            linkId,
            snapshotName: after.name,
            snapshotDescription: after.description,
            snapshotNetworkId: after.networkId,
            snapshotNicheId: after.nicheId,
          },
        })
      }
      return row
    })
    const after = linkEmbedSnapshot(updated)
    if (shouldEnqueueEmbedLink(before, after)) {
      scheduleEmbedding(linkId, after)
    }
    return toLinkRecord(updated)
  }

  async createNiche(input: {
    tenantId: string
    name: string
    slug: string
    requiresAge: boolean
  }): Promise<NicheRecord> {
    return this.client.niche.create({
      data: { ...input, isPublicFacet: !input.requiresAge },
      select: NICHE_SELECT,
    })
  }

  async updateNicheFacet(input: {
    id: string
    tenantId: string
    isPublicFacet: boolean
  }): Promise<NicheRecord | null> {
    const result = await this.client.niche.updateMany({
      where: { id: input.id, tenantId: input.tenantId },
      data: { isPublicFacet: input.isPublicFacet },
    })
    if (result.count === 0) return null
    return this.findNiche(input.tenantId, input.id)
  }

  async applyBan(input: {
    userId: string
    tenantId: string
    actorId: string
    requestId: string
    reason?: string
  }): Promise<{ userStatus: 'BANNED'; refunds: [] } | null> {
    return this.client.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id: input.userId, tenantId: input.tenantId } })
      if (!user) return null
      const links = await tx.link.findMany({ where: { ownerId: input.userId, tenantId: input.tenantId } })
      const promotions = await tx.promotion.findMany({
        where: { tenantId: input.tenantId, link: { ownerId: input.userId } },
      })
      const result = banAccount({
        links: links.map((row) => ({ id: row.id, status: row.status })),
        promotions: promotions.map((row) => ({ id: row.id, status: row.status })),
      })
      await tx.user.update({ where: { id: user.id }, data: { status: 'BANNED' } })
      for (const link of result.links) {
        await tx.link.update({
          where: { id: link.id },
          data: { status: link.status, occupiesSlot: false },
        })
      }
      for (const promotion of result.promotions) {
        if (promotion.status === 'CANCELLED') {
          await tx.promotion.update({ where: { id: promotion.id }, data: { status: 'CANCELLED' } })
        }
      }
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId,
          action: 'account.ban',
          entityType: 'User',
          entityId: input.userId,
          before: { status: user.status },
          after: { status: 'BANNED', reason: input.reason ?? null, refunds: [] },
          requestId: input.requestId,
        },
      })
      return { userStatus: result.userStatus, refunds: result.refunds }
    })
  }

  async cancelActivePromotions(tenantId: string, linkId: string): Promise<number> {
    const result = await this.client.promotion.updateMany({
      where: { tenantId, linkId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    })
    return result.count
  }
}

const NICHE_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  slug: true,
  requiresAge: true,
  isPublicFacet: true,
  summary: true,
} as const

function groupFacetCounts(rows: Array<{ nicheId: string; networkId: string }>): {
  niches: Array<{ id: string; count: number }>
  networks: Array<{ id: string; count: number }>
} {
  const niches = new Map<string, number>()
  const networks = new Map<string, number>()
  for (const row of rows) {
    niches.set(row.nicheId, (niches.get(row.nicheId) ?? 0) + 1)
    networks.set(row.networkId, (networks.get(row.networkId) ?? 0) + 1)
  }
  return {
    niches: [...niches].map(([id, count]) => ({ id, count })),
    networks: [...networks].map(([id, count]) => ({ id, count })),
  }
}

function toLinkRecord(row: PrismaLink): LinkRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    ownerId: row.ownerId,
    canonicalUrl: row.canonicalUrl,
    name: row.name,
    description: row.description,
    networkId: row.networkId,
    nicheId: row.nicheId,
    otherNote: row.otherNote,
    status: row.status,
    occupiesSlot: row.occupiesSlot,
    everPublished: row.everPublished,
    approvedName: row.approvedName,
    approvedDescription: row.approvedDescription,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

let linksRepository: LinksRepository =
  process.env.NODE_ENV === 'test'
    ? InMemoryLinksRepository.seeded()
    : new PrismaLinksRepository(prisma)

export function getLinksRepository(): LinksRepository {
  return linksRepository
}

export function setLinksRepositoryForTest(repository: LinksRepository): void {
  if (process.env.NODE_ENV !== 'test') return
  linksRepository = repository
}

export function resetLinksRepositoryForTest(): void {
  if (process.env.NODE_ENV !== 'test') {
    return
  }
  const repo = linksRepository
  if (repo instanceof InMemoryLinksRepository) {
    repo.reset()
  }
}
