import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { avatarPng } from '@/domain/profiles/avatar'
export interface ProfileMedia {
  put(input: { tenantId: string; ownerId: string; base64: string }): Promise<string>
  get(input: { tenantId: string; ownerId: string; id: string }): Promise<Buffer | null>
}
/** Uses the existing database; no bucket, local ephemeral disk or provider credentials. */
export class PrismaProfileMedia implements ProfileMedia {
  constructor(private readonly db: Prisma.TransactionClient) {}
  async put(input: { tenantId: string; ownerId: string; base64: string }) {
    const bytes = avatarPng(input.base64), id = createHash('sha256').update(bytes).digest('hex')
    await this.db.profileAsset.upsert({ where: { tenantId_ownerId_id: { tenantId: input.tenantId, ownerId: input.ownerId, id } }, create: { id, tenantId: input.tenantId, ownerId: input.ownerId, bytes }, update: {} })
    return id
  }
  async get(input: { tenantId: string; ownerId: string; id: string }) {
    const row = await this.db.profileAsset.findUnique({ where: { tenantId_ownerId_id: input } }); return row ? Buffer.from(row.bytes) : null
  }
}
