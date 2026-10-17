import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { Queue, QueueEvents, type Worker } from 'bullmq'
import Redis from 'ioredis'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { OpenAiTextModeration } from '@/adapters/moderation/openai-text-moderation'
import { getEmbedLinkJobsForTest, resetEmbedLinkJobsForTest } from '@/adapters/queues/enqueue-embed-link'
import { TEXT_PROPOSAL_JOB_OPTIONS } from '@/adapters/queues/enqueue-text-proposal'
import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { createWorker, type TextJudge } from '@/worker'

const url = process.env.CHECKOUT_DATABASE_URL
if (!url) throw new Error('CHECKOUT_DATABASE_URL ausente')
const redisUrl = 'redis://127.0.0.1:6380'

const db = new PrismaClient({ datasources: { db: { url } } })
let connection: Redis
let queueName: string
let queue: Queue
let events: QueueEvents
let worker: Worker | null = null

async function seedProposal(linkId: string) {
  await db.link.create({
    data: {
      id: linkId, tenantId: 'tw', ownerId: 'owner-tw', nicheId: 'niche-tw', networkId: 'net-tw',
      canonicalUrl: `https://t.me/${linkId}`, name: 'Publicado', description: 'antigo', status: 'PUBLISHED',
      approvedName: 'Publicado', approvedDescription: 'antigo', everPublished: true,
    },
  })
  await db.auditLog.create({
    data: {
      tenantId: 'tw', action: 'link.text.proposed', entityType: 'link', entityId: linkId,
      before: { name: 'Publicado' }, after: { name: 'Proposto', description: 'novo' },
    },
  })
}

async function runJob(linkId: string, judge: TextJudge | null) {
  worker = createWorker(connection, { textJudge: judge, db }, queueName)
  const job = await queue.add('text-proposed', { linkId }, { jobId: `text-${linkId}`, ...TEXT_PROPOSAL_JOB_OPTIONS })
  const result = await job.waitUntilFinished(events, 20_000)
  const finished = await queue.getJob(job.id!)
  return { result: result as string, attemptsMade: finished?.attemptsMade ?? -1 }
}

async function verdictAudit(linkId: string) {
  const rows = await db.auditLog.findMany({ where: { entityId: linkId, action: 'link.text.verdict' } })
  expect(rows).toHaveLength(1)
  return rows[0]!.after as { decision: string; provider: string; confidence: number | null; threshold: number }
}

describe('worker text-proposed de ponta a ponta (PostgreSQL + Redis + BullMQ reais, adapter fake)', () => {
  beforeAll(async () => {
    connection = new Redis(redisUrl, { maxRetriesPerRequest: null })
  })

  afterAll(async () => {
    await connection.quit()
    await db.$disconnect()
  })

  beforeEach(async () => {
    queueName = `text-proposed-proof-${randomUUID()}`
    queue = new Queue(queueName, { connection })
    events = new QueueEvents(queueName, { connection: new Redis(redisUrl, { maxRetriesPerRequest: null }) })
    await events.waitUntilReady()
    resetEmbedLinkJobsForTest()
    await db.$executeRawUnsafe('TRUNCATE TABLE audit_logs, configs, analytics_events, payments, order_events, order_surfaces, orders, promotions, links, niches, networks, user_identifiers, users, tenants CASCADE')
    await db.tenant.create({ data: { id: 'tw', host: 'tw.example', name: 'tw' } })
    await db.user.create({ data: { id: 'owner-tw', tenantId: 'tw', name: 'o', passwordHash: 'x', role: 'USER', status: 'ACTIVE' } })
    await db.network.create({ data: { id: 'net-tw', tenantId: 'tw', name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: 'niche-tw', tenantId: 'tw', name: 'Culinária', slug: 'culinaria' } })
    await db.config.create({ data: { tenantId: 'tw', key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.85' } })
  })

  afterEach(async () => {
    await worker?.close()
    worker = null
    await queue.obliterate({ force: true })
    await queue.close()
    await events.close()
    const leftovers = await connection.keys(`bull:${queueName}:*`)
    expect(leftovers).toEqual([])
  })

  it('PUBLISH: veredito acima do limiar publica o texto, audita e pede embedding', async () => {
    await seedProposal('lw-pub')
    const calls: string[] = []
    const judge: TextJudge = async (text) => {
      calls.push(text.name)
      return { pass: true, confidence: 0.9, reasons: [] }
    }
    const { result, attemptsMade } = await runJob('lw-pub', judge)
    expect(result).toBe('PUBLISH')
    expect(attemptsMade).toBe(1)
    expect(calls).toEqual(['Proposto'])
    const link = await db.link.findUniqueOrThrow({ where: { id: 'lw-pub' } })
    expect(link).toMatchObject({ name: 'Proposto', description: 'novo', approvedName: 'Proposto', embeddingState: 'PENDING', status: 'PUBLISHED' })
    expect(await verdictAudit('lw-pub')).toMatchObject({ decision: 'PUBLISH', provider: 'adapter', confidence: 0.9, threshold: 0.85 })
    expect(getEmbedLinkJobsForTest()).toEqual([{ name: 'embed-link', data: { linkId: 'lw-pub' } }])
  })

  it('ADMIN: reprovação ou confiança abaixo do limiar não publica e audita', async () => {
    const cases: Array<[string, ModelVerdict]> = [
      ['lw-fail', { pass: false, confidence: 0.99, reasons: ['proibido'] }],
      ['lw-low', { pass: true, confidence: 0.5, reasons: [] }],
    ]
    for (const [linkId, verdict] of cases) {
      await seedProposal(linkId)
      const { result } = await runJob(linkId, async () => verdict)
      await worker?.close()
      worker = null
      expect(result).toBe('ADMIN')
      const link = await db.link.findUniqueOrThrow({ where: { id: linkId } })
      expect(link).toMatchObject({ name: 'Publicado', description: 'antigo', embeddingState: 'ABSENT' })
      expect(await verdictAudit(linkId)).toMatchObject({ decision: 'ADMIN', provider: 'adapter', confidence: verdict!.confidence })
    }
    expect(getEmbedLinkJobsForTest()).toEqual([])
  })

  it('falha do provedor: BullMQ refaz com backoff e só na última tentativa manda para ADMIN, sem publicar', async () => {
    await seedProposal('lw-err')
    let calls = 0
    const judge: TextJudge = async () => {
      calls += 1
      throw new Error('provedor fora')
    }
    const { result, attemptsMade } = await runJob('lw-err', judge)
    expect(result).toBe('ADMIN')
    expect(calls).toBe(TEXT_PROPOSAL_JOB_OPTIONS.attempts)
    expect(attemptsMade).toBe(TEXT_PROPOSAL_JOB_OPTIONS.attempts)
    const link = await db.link.findUniqueOrThrow({ where: { id: 'lw-err' } })
    expect(link.name).toBe('Publicado')
    expect(await verdictAudit('lw-err')).toMatchObject({ decision: 'ADMIN', provider: 'error', confidence: null })
    expect(getEmbedLinkJobsForTest()).toEqual([])
  }, 30_000)

  it('timeout do adapter OpenAI real (transporte que nunca responde) segue o mesmo contrato de falha', async () => {
    await seedProposal('lw-timeout')
    let requests = 0
    const hanging: typeof fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
      requests += 1
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    })
    const adapter = new OpenAiTextModeration('sk-not-a-real-key', hanging, 'gpt-4o-mini', 50)
    const { result } = await runJob('lw-timeout', (text) => adapter.judge(text))
    expect(result).toBe('ADMIN')
    expect(requests).toBe(TEXT_PROPOSAL_JOB_OPTIONS.attempts)
    const link = await db.link.findUniqueOrThrow({ where: { id: 'lw-timeout' } })
    expect(link.name).toBe('Publicado')
    expect(await verdictAudit('lw-timeout')).toMatchObject({ decision: 'ADMIN', provider: 'error' })
  }, 30_000)

  it('sem adapter configurado não finge veredito: ADMIN com provider unavailable na primeira tentativa', async () => {
    await seedProposal('lw-none')
    const { result, attemptsMade } = await runJob('lw-none', null)
    expect(result).toBe('ADMIN')
    expect(attemptsMade).toBe(1)
    expect(await verdictAudit('lw-none')).toMatchObject({ decision: 'ADMIN', provider: 'unavailable' })
  })
})
