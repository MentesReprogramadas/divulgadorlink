import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { PrismaClient } from '@prisma/client'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { ConfirmGatewayPaymentUseCase } from '@/use-cases/@Payments/confirm-gateway-payment'
import { runRefundPix } from '@/use-cases/@Payments/payment-jobs'
import { PrismaCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'
import { closePaymentJobQueue } from '@/adapters/queues/enqueue-payment-job'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { removeCorrelatedJobs } from './queue-cleanup'

const prisma = new PrismaClient()
const suffix = `prove-${Date.now()}`
const ids = {
  tenant: `${suffix}-tenant`,
  user: `${suffix}-user`,
  network: `${suffix}-net`,
  niche: `${suffix}-niche`,
  link: `${suffix}-link`,
  uncharged: `${suffix}-uncharged`,
  expiring: `${suffix}-expiring`,
}

const stub = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.method === 'POST' && req.url === '/api/v1/charge') {
      const body = JSON.parse(Buffer.concat(chunks).toString()) as { correlationID: string }
      res.end(JSON.stringify({
        charge: { correlationID: body.correlationID, status: 'ACTIVE', brCode: '00020126580014BR.GOV.BCB.PIX' },
      }))
      return
    }
    res.statusCode = 404
    res.end('{}')
  })
})

function kill(pid: number) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { shell: true, stdio: 'ignore' })
    return
  }
  try { process.kill(-pid, 'SIGKILL') } catch { process.kill(pid, 'SIGKILL') }
}

async function waitFor(read: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await read()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('worker não concluiu a tempo')
}

async function cleanup() {
  await prisma.payment.deleteMany({ where: { orderId: { in: [ids.uncharged, ids.expiring] } } })
  await prisma.orderSurface.deleteMany({ where: { orderId: { in: [ids.uncharged, ids.expiring] } } })
  await prisma.orderEvent.deleteMany({ where: { orderId: { in: [ids.uncharged, ids.expiring] } } })
  await prisma.promotion.deleteMany({ where: { linkId: ids.link } })
  await prisma.order.deleteMany({ where: { id: { in: [ids.uncharged, ids.expiring] } } })
  await prisma.link.deleteMany({ where: { id: ids.link } })
  await prisma.userIdentifier.deleteMany({ where: { userId: ids.user } })
  await prisma.user.deleteMany({ where: { id: ids.user } })
  await prisma.network.deleteMany({ where: { id: ids.network } })
  await prisma.niche.deleteMany({ where: { id: ids.niche } })
  await prisma.tenant.deleteMany({ where: { id: ids.tenant } })
}

async function main() {
await new Promise<void>((resolve) => stub.listen(4098, '127.0.0.1', () => resolve()))

let workerPid = 0
try {
  await prisma.tenant.create({ data: { id: ids.tenant, host: `${suffix}.localhost`, name: suffix } })
  await prisma.user.create({
    data: { id: ids.user, tenantId: ids.tenant, name: 'Prova', passwordHash: 'not-a-secret', role: 'USER', status: 'ACTIVE' },
  })
  await prisma.network.create({ data: { id: ids.network, tenantId: ids.tenant, name: 'Telegram', slug: suffix, knownHosts: [] } })
  await prisma.niche.create({ data: { id: ids.niche, tenantId: ids.tenant, name: 'Jogos', slug: suffix } })
  await prisma.link.create({
    data: {
      id: ids.link, tenantId: ids.tenant, ownerId: ids.user, networkId: ids.network, nicheId: ids.niche,
      canonicalUrl: 'https://t.me/prova', name: 'Prova', description: 'prova', status: 'PUBLISHED', everPublished: true,
    },
  })
  const past = new Date(Date.now() - 60_000)
  const future = new Date(Date.now() + 1_800_000)
  await prisma.order.create({
    data: {
      id: ids.uncharged, tenantId: ids.tenant, userId: ids.user, linkId: ids.link, status: 'PENDING_PAYMENT',
      method: 'PIX', productCode: 'SEARCH', durationDays: 7, amountCents: 790, savingsCents: 0,
      pixExpiresAt: future, createdAt: past,
    },
  })
  await prisma.order.create({
    data: {
      id: ids.expiring, tenantId: ids.tenant, userId: ids.user, linkId: ids.link, status: 'PENDING_PAYMENT',
      method: 'PIX', productCode: 'SEARCH', durationDays: 7, amountCents: 790, savingsCents: 0,
      pixExpiresAt: past, gatewayChargeId: ids.expiring,
    },
  })
  await prisma.orderSurface.createMany({
    data: [
      { orderId: ids.uncharged, linkId: ids.link, surface: 'SEARCH', hold: 'PENDING_PAYMENT' },
      { orderId: ids.expiring, linkId: ids.link, surface: 'NICHE', hold: 'PENDING_PAYMENT' },
    ],
  })

  const connection = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6380', { maxRetriesPerRequest: null })
  const queue = new Queue('divulgador-links', { connection })
  await queue.add('charge-order', { orderId: ids.uncharged }, { jobId: `charge-${ids.uncharged}`, delay: 0 })
  await queue.add('expire-pix', { orderId: ids.expiring }, { jobId: `expire-${ids.expiring}`, delay: 0 })
  await queue.close()
  await connection.quit()

  const worker = spawn('npx', ['tsx', 'src/worker.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, WOOVI_API_BASE_URL: 'http://127.0.0.1:4098', WOOVI_APP_ID: 'prove' },
    shell: true,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  if (!worker.pid) throw new Error('worker não subiu')
  workerPid = worker.pid

  await waitFor(async () => {
    const charged = await prisma.order.findUnique({ where: { id: ids.uncharged } })
    const expired = await prisma.order.findUnique({ where: { id: ids.expiring } })
    return charged?.gatewayChargeId === ids.uncharged && expired?.status === 'EXPIRED'
  })

  const payments = await prisma.payment.count({ where: { orderId: ids.uncharged } })
  const hold = await prisma.orderSurface.findFirst({ where: { orderId: ids.expiring } })
  const promotions = await prisma.promotion.count({ where: { linkId: ids.link } })
  if (payments !== 1) throw new Error(`payments ${payments}`)
  if (hold?.hold !== 'RELEASED') throw new Error(`hold ${hold?.hold}`)
  if (promotions !== 0) throw new Error(`promotions ${promotions}`)

  kill(workerPid)
  workerPid = 0

  const store = new PrismaCheckoutStore(prisma)
  const orders = {
    async findById(id: string) {
      return (await store.findCommercial(id))?.order ?? null
    },
    async save(order: import('@/domain/payments/order').Order) {
      await store.saveOrder(order)
    },
  }
  const confirmed = await new ConfirmGatewayPaymentUseCase(orders, {
    method: 'PIX',
    async getCharge() { return { status: 'PAID', paidAt: new Date() } },
    async refund() { return { refundId: 'nao', status: 'FAILED' } },
  }, {
    async activateFromPaidOrder() { throw new Error('promoção indevida') },
  }, {
    async scheduleRetry() { return undefined },
  }).execute({ orderId: ids.expiring, eventId: 'evt-late' })
  if (confirmed.order.status !== 'PAID_LATE' || confirmed.activated) throw new Error('tarde não ficou PAID_LATE')

  const failing = {
    method: 'PIX' as const,
    async getCharge() { return { status: 'EXPIRED' as const, paidAt: null } },
    async refund() { return { refundId: 'falhou', status: 'FAILED' as const } },
  }
  await runRefundPix(ids.expiring, failing)
  await runRefundPix(ids.expiring, failing)
  await runRefundPix(ids.expiring, failing)
  const third = await prisma.order.findUnique({ where: { id: ids.expiring } })
  if (third?.status !== 'REFUND_FAILED') throw new Error(`refund ${third?.status}`)
  if (third.refundCorrelationId !== `refund-${ids.expiring}`) throw new Error(`correlation ${third.refundCorrelationId}`)
  if (await prisma.promotion.count({ where: { linkId: ids.link } }) !== 0) throw new Error('promoção depois do estorno')
  process.stdout.write('ok\n')
} finally {
  if (workerPid) kill(workerPid)
  stub.close()
  await closePaymentJobQueue()
  await cleanup().catch(() => undefined)
  await prisma.$disconnect()
  await defaultPrisma.$disconnect()
}
const jobs = await removeCorrelatedJobs(process.env.REDIS_URL ?? 'redis://127.0.0.1:6380', 'divulgador-links', suffix)
process.stdout.write(`${JSON.stringify({ jobsRemoved: jobs.removed.length, leftovers: jobs.leftovers })}\n`)
if (jobs.leftovers.length > 0) throw new Error(`jobs órfãos: ${jobs.leftovers.join(', ')}`)
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
