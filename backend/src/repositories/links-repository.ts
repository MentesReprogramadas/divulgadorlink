import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient, type Link as PrismaLink } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
  status: 'ACTIVE' | 'BANNED'
  identifiers: SubmitterIdentifier[]
}

export type NetworkRecord = { id: string; tenantId: string; slug: string }
export type NicheRecord = {
  id: string
  tenantId: string
  name: string
  slug: string
  requiresAge: boolean
  isPublicFacet: boolean
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
  lastApprovedName: string | null
  lastApprovedDescription: string | null
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
  lastApprovedName?: string | null
  lastApprovedDescription?: string | null
}

export type NewLinkData = Omit<
  LinkRecord,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'occupiesSlot'
  | 'everPublished'
  | 'lastApprovedName'
  | 'lastApprovedDescription'
> & {
  ownerId: string
}

export interface LinksRepository {
  findLinkById(id: string): Promise<LinkRecord | null>
  findSubmitter(tenantId: string, userId: string): Promise<SubmitterRecord | null>
  findNetwork(tenantId: string, id: string): Promise<NetworkRecord | null>
  findNiche(tenantId: string, id: string): Promise<NicheRecord | null>
  listNiches(tenantId: string): Promise<NicheRecord[]>
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
}

export class InMemoryLinksRepository implements LinksRepository {
  users: SubmitterRecord[] = []
  networks: NetworkRecord[] = []
  niches: NicheRecord[] = []
  terms: Array<{ tenantId: string; term: string }> = []
  links: LinkRecord[] = []

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
    this.networks = [
      { id: 'net-telegram', tenantId, slug: 'telegram' },
      { id: 'net-outro', tenantId, slug: 'outro' },
    ]
    this.niches = [
      { id: 'niche-jogos', tenantId, name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true },
      { id: 'niche-apostas', tenantId, name: 'Apostas', slug: 'apostas', requiresAge: true, isPublicFacet: true },
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
      lastApprovedName: input.status === 'PUBLISHED' ? (input.name ?? 'link') : null,
      lastApprovedDescription: input.status === 'PUBLISHED' ? (input.description ?? '') : null,
      createdAt: now,
      updatedAt: now,
      ...input,
    }
    if (row.status === 'PUBLISHED') {
      row.everPublished = true
      row.lastApprovedName = row.name
      row.lastApprovedDescription = row.description
    }
    this.links.push(row)
    return { ...row }
  }

  async updateLinkModeration(linkId: string, patch: LinkModerationPatch): Promise<LinkRecord | null> {
    const row = this.links.find((item) => item.id === linkId)
    if (!row) return null
    Object.assign(row, patch, { updatedAt: new Date() })
    if (patch.status === 'PUBLISHED') {
      row.everPublished = true
      row.lastApprovedName = row.name
      row.lastApprovedDescription = row.description
    }
    return { ...row }
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
      select: { id: true, tenantId: true, slug: true },
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
      },
    })
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
      },
    })
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
    const existing = await this.client.link.findUnique({ where: { id: linkId }, select: { id: true } })
    if (!existing) return null
    const updated = await this.client.link.update({
      where: { id: linkId },
      data: {
        status: patch.status,
        occupiesSlot: patch.occupiesSlot,
        name: patch.name,
        description: patch.description,
        networkId: patch.networkId,
        nicheId: patch.nicheId,
      },
    })
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
}

const NICHE_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  slug: true,
  requiresAge: true,
  isPublicFacet: true,
} as const

function toLinkRecord(row: PrismaLink): LinkRecord {
  const published = row.status === 'PUBLISHED'
  return {
    ...row,
    everPublished: published,
    lastApprovedName: published ? row.name : null,
    lastApprovedDescription: published ? row.description : null,
  }
}

let linksRepository: LinksRepository =
  process.env.NODE_ENV === 'test'
    ? InMemoryLinksRepository.seeded()
    : new PrismaLinksRepository(prisma)

export function getLinksRepository(): LinksRepository {
  return linksRepository
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
