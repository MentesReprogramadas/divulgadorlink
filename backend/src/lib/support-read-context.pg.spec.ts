import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { supportReadContext } from './support-read-context'
import { prisma } from '@/lib/prisma'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasourceUrl: url })
const id = randomUUID(), previous = process.env.DATABASE_URL
beforeAll(async () => {
  process.env.DATABASE_URL = url
  await db.tenant.create({ data: { id, host: `${id}.support.test`, name: 'Support proof' } })
})
afterAll(async () => {
  await supportReadContext.run(true, () => prisma.$disconnect())
  await db.tenant.delete({ where: { id } })
  await db.$disconnect()
  process.env.DATABASE_URL = previous
})
it('PostgreSQL refuses ORM and raw writes even inside a transaction while support reads work', async () => {
  await supportReadContext.run(true, async () => {
    expect((await prisma.$queryRawUnsafe<Array<{ default_transaction_read_only: string }>>('SHOW default_transaction_read_only'))[0].default_transaction_read_only).toBe('on')
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id } })).name).toBe('Support proof')
    await expect(prisma.tenant.update({ where: { id }, data: { name: 'forbidden' } })).rejects.toThrow(/read.only/i)
    await expect(prisma.$executeRaw`UPDATE tenants SET name = 'forbidden' WHERE id = ${id}`).rejects.toThrow(/read.only/i)
    await expect(prisma.$transaction(async tx => tx.tenant.update({ where: { id }, data: { name: 'forbidden' } }))).rejects.toThrow(/read.only/i)
    expect((await prisma.$transaction(async tx => tx.tenant.findUniqueOrThrow({ where: { id } }))).name).toBe('Support proof')
  })
  await db.tenant.update({ where: { id }, data: { name: 'Ordinary request still writes' } })
  expect((await db.tenant.findUniqueOrThrow({ where: { id } })).name).toBe('Ordinary request still writes')
})
