import { spawn, spawnSync } from 'node:child_process'
import { createServer, request as httpRequest } from 'node:http'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { removeCorrelatedJobs } from './queue-cleanup'

const TTL_SECONDS = 3
const API_PORT = 3398
const STUB_PORT = 4096
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380'
const prisma = new PrismaClient()
const suffix = `pixexp-${Date.now()}`
const host = `${suffix}.localhost`
const ids = {
  tenant: `${suffix}-tenant`,
  user: `${suffix}-user`,
  network: `${suffix}-net`,
  niche: `${suffix}-niche`,
  link: `${suffix}-link`,
}
const email = `${suffix}@prova.test`
const password = 'Senha-prova-1'

const stub = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.method === 'POST' && req.url === '/api/v1/charge') {
      const body = JSON.parse(Buffer.concat(chunks).toString()) as { correlationID: string; expiresIn: number }
      res.end(JSON.stringify({
        charge: {
          correlationID: body.correlationID,
          status: 'ACTIVE',
          brCode: '00020126580014BR.GOV.BCB.PIX',
          expiresDate: new Date(Date.now() + body.expiresIn * 1000).toISOString(),
        },
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

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: Record<string, unknown>; cookies: string[] }>((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const req = httpRequest({
      host: '127.0.0.1',
      port: API_PORT,
      method,
      path: `/api/v1${path}`,
      headers: { host, ...(payload ? { 'content-type': 'application/json' } : {}), ...headers },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString()
        resolve({
          status: res.statusCode ?? 0,
          body: text ? JSON.parse(text) as Record<string, unknown> : {},
          cookies: res.headers['set-cookie'] ?? [],
        })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function waitFor<T>(read: () => Promise<T | null>, attempts: number, label: string): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await read().catch(() => null)
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`${label} não aconteceu a tempo`)
}

async function seed() {
  await prisma.tenant.create({ data: { id: ids.tenant, host, name: suffix } })
  await prisma.user.create({
    data: { id: ids.user, tenantId: ids.tenant, name: 'Prova', passwordHash: bcrypt.hashSync(password, 8), role: 'USER', status: 'ACTIVE' },
  })
  for (const [kind, value] of [['EMAIL', email], ['PHONE', `55119${Date.now().toString().slice(-8)}`]] as const) {
    await prisma.userIdentifier.create({
      data: { userId: ids.user, tenantId: ids.tenant, kind, normalizedValue: value, confirmedAt: new Date() },
    })
  }
  await prisma.network.create({ data: { id: ids.network, tenantId: ids.tenant, name: 'Telegram', slug: suffix, knownHosts: [] } })
  await prisma.niche.create({ data: { id: ids.niche, tenantId: ids.tenant, name: 'Jogos', slug: suffix } })
  await prisma.link.create({
    data: {
      id: ids.link, tenantId: ids.tenant, ownerId: ids.user, networkId: ids.network, nicheId: ids.niche,
      canonicalUrl: `https://t.me/${suffix}`, name: 'Prova', description: 'expiração', status: 'PUBLISHED',
      everPublished: true, approvedName: 'Prova', approvedDescription: 'expiração',
    },
  })
}

async function cleanup() {
  const orders = await prisma.order.findMany({ where: { tenantId: ids.tenant }, select: { id: true } })
  const orderIds = orders.map((row) => row.id)
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.orderSurface.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.promotion.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.order.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.auditLog.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.link.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.userIdentifier.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.user.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.network.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.niche.deleteMany({ where: { tenantId: ids.tenant } })
  await prisma.tenant.deleteMany({ where: { id: ids.tenant } })
  return orderIds
}

async function main() {
  await new Promise<void>((resolve) => stub.listen(STUB_PORT, '127.0.0.1', () => resolve()))
  const pids: number[] = []
  let orderIds: string[] = []
  const report: Record<string, unknown> = { ttlSeconds: TTL_SECONDS }
  try {
    await seed()
    const env = {
      ...process.env,
      NODE_ENV: 'dev',
      PORT: String(API_PORT),
      HOST: '127.0.0.1',
      PIX_EXPIRATION_SECONDS: String(TTL_SECONDS),
      WOOVI_APP_ID: 'prova',
      WOOVI_API_BASE_URL: `http://127.0.0.1:${STUB_PORT}`,
      OPENAI_API_KEY: '',
      HDX_API_KEY: '',
    }
    for (const entry of ['src/server.ts', 'src/worker.ts']) {
      const child = spawn('npx', ['tsx', entry], {
        cwd: process.cwd(),
        env,
        shell: true,
        stdio: ['ignore', 'ignore', 'inherit'],
        detached: process.platform !== 'win32',
      })
      if (!child.pid) throw new Error(`${entry} não subiu`)
      pids.push(child.pid)
    }
    await waitFor(async () => ((await call('GET', '/actuator/live')).status === 200 ? true : null), 120, 'API')

    const login = await call('POST', '/auth/login', { email, password })
    if (login.status !== 200) throw new Error(`login ${login.status}`)
    const access = login.cookies.map((cookie) => /^accessToken=([^;]+)/.exec(cookie)?.[1]).find(Boolean)
    if (!access) throw new Error('sem cookie accessToken')
    const auth = { authorization: `Bearer ${access}` }

    const startedAt = Date.now()
    const checkout = await call('POST', '/promotions/checkout', { linkId: ids.link, surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' }, { ...auth, 'idempotency-key': suffix })
    if (checkout.status !== 201 || typeof checkout.body.brCode !== 'string') throw new Error(`checkout ${checkout.status} ${JSON.stringify(checkout.body)}`)
    const orderId = String(checkout.body.orderId)

    const pending = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { surfaces: true } })
    if (pending.status !== 'PENDING_PAYMENT') throw new Error(`status inicial ${pending.status}`)
    const windowMs = (pending.pixExpiresAt?.getTime() ?? 0) - startedAt
    if (windowMs <= 0 || windowMs > (TTL_SECONDS + 2) * 1000) throw new Error(`pixExpiresAt fora do TTL: ${windowMs}ms`)
    if (pending.surfaces.some((row) => row.hold !== 'PENDING_PAYMENT')) throw new Error('hold inicial')
    const pendingView = await call('GET', `/orders/${orderId}`, undefined, auth)
    if (pendingView.body.status !== 'PENDING_PAYMENT' || pendingView.body.brCode !== checkout.body.brCode) throw new Error('GET pendente')
    report.pending = { status: pending.status, hold: pending.surfaces.map((row) => row.hold), windowMs }

    const expired = await waitFor(async () => {
      const row = await prisma.order.findUnique({ where: { id: orderId }, include: { surfaces: true } })
      return row?.status === 'EXPIRED' ? row : null
    }, 80, 'expiração')
    report.expiredAfterMs = Date.now() - startedAt
    if (expired.surfaces.some((row) => row.hold !== 'RELEASED')) throw new Error(`hold ${expired.surfaces.map((row) => row.hold).join(',')}`)
    const promotions = await prisma.promotion.count({ where: { linkId: ids.link } })
    if (promotions !== 0) throw new Error(`promoções ${promotions}`)
    const expiredView = await call('GET', `/orders/${orderId}`, undefined, auth)
    if (expiredView.body.status !== 'EXPIRED') throw new Error(`GET expirado ${String(expiredView.body.status)}`)
    report.expired = { status: expired.status, hold: expired.surfaces.map((row) => row.hold), promotions }
  } finally {
    for (const pid of pids) kill(pid)
    stub.close()
    orderIds = await cleanup().catch(() => [])
    await prisma.$disconnect()
  }
  const jobs = await removeCorrelatedJobs(redisUrl, 'divulgador-links', orderIds[0] ?? suffix)
  report.jobsRemoved = jobs.removed
  report.leftovers = jobs.leftovers
  process.stdout.write(`${JSON.stringify(report)}\n`)
  if (jobs.leftovers.length > 0) throw new Error(`jobs órfãos: ${jobs.leftovers.join(', ')}`)
  process.stdout.write('ok\n')
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
