import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { MetaContext } from '@/use-cases/@Acquisition/record-funnel'

export const META_CONTEXT_TTL_DAYS = 7

export interface OrderInsightsRepository {
  saveMetaContext(orderId: string, context: MetaContext): Promise<void>
  takeMetaContext(orderId: string): Promise<MetaContext | null>
  purgeMetaContexts(before: Date): Promise<number>
  markPaid(orderId: string, at: Date): Promise<void>
}

export class MemoryOrderInsightsRepository implements OrderInsightsRepository {
  contexts = new Map<string, { context: MetaContext; createdAt: Date }>()
  paidAt = new Map<string, Date>()

  async saveMetaContext(orderId: string, context: MetaContext): Promise<void> {
    this.contexts.set(orderId, { context, createdAt: new Date() })
  }

  async takeMetaContext(orderId: string): Promise<MetaContext | null> {
    const row = this.contexts.get(orderId)
    this.contexts.delete(orderId)
    return row?.context ?? null
  }

  async purgeMetaContexts(before: Date): Promise<number> {
    let removed = 0
    for (const [id, row] of this.contexts) {
      if (row.createdAt < before) {
        this.contexts.delete(id)
        removed += 1
      }
    }
    return removed
  }

  async markPaid(orderId: string, at: Date): Promise<void> {
    if (!this.paidAt.has(orderId)) this.paidAt.set(orderId, at)
  }

  reset(): void {
    this.contexts.clear()
    this.paidAt.clear()
  }
}

export class PrismaOrderInsightsRepository implements OrderInsightsRepository {
  constructor(private readonly client: PrismaClient) {}

  async saveMetaContext(orderId: string, context: MetaContext): Promise<void> {
    const json = context as unknown as Prisma.InputJsonValue
    await this.client.orderMetaContext.upsert({
      where: { orderId },
      create: { orderId, context: json },
      update: { context: json },
    })
  }

  async takeMetaContext(orderId: string): Promise<MetaContext | null> {
    const rows = await this.client.$queryRaw<Array<{ context: MetaContext }>>`
      DELETE FROM order_meta_contexts WHERE "orderId" = ${orderId} RETURNING context
    `
    return rows[0]?.context ?? null
  }

  async purgeMetaContexts(before: Date): Promise<number> {
    const result = await this.client.orderMetaContext.deleteMany({ where: { createdAt: { lt: before } } })
    return result.count
  }

  async markPaid(orderId: string, at: Date): Promise<void> {
    await this.client.$executeRaw`
      UPDATE orders SET "paidAt" = COALESCE("paidAt", ${at}) WHERE id = ${orderId}
    `
  }
}

const memory = new MemoryOrderInsightsRepository()

export function getOrderInsightsRepository(): OrderInsightsRepository {
  return process.env.NODE_ENV === 'test' ? memory : new PrismaOrderInsightsRepository(prisma)
}

export function memoryOrderInsights(): MemoryOrderInsightsRepository {
  return memory
}
