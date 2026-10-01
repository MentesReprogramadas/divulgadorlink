import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const passwordHash = bcrypt.hashSync('Senha-e2e-1', 8)

const CONFIG = {
  MODERATION_AUTO_APPROVE_THRESHOLD: '0.85',
  SEARCH_RELEVANCE_THRESHOLD: '0.35',
  SEARCH_TEXT_WEIGHT: '0.4',
  SEARCH_SEMANTIC_WEIGHT: '0.6',
}

async function tenantBundle(host: string, name: string) {
  const tenant = await prisma.tenant.create({ data: { host, name } })
  for (const [key, value] of Object.entries(CONFIG)) {
    await prisma.config.create({ data: { tenantId: tenant.id, key, value } })
  }
  const network = await prisma.network.create({
    data: { tenantId: tenant.id, name: 'Telegram', slug: 'telegram', knownHosts: ['t.me'], isPublicFacet: true },
  })
  const niche = await prisma.niche.create({
    data: { tenantId: tenant.id, name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true },
  })
  return { tenant, network, niche }
}

async function user(input: {
  tenantId: string
  name: string
  email: string
  phone: string
  role?: 'USER' | 'ADMIN'
  status?: 'ACTIVE' | 'BANNED'
  confirmed: boolean
}) {
  const created = await prisma.user.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      passwordHash,
      role: input.role ?? 'USER',
      status: input.status ?? 'ACTIVE',
    },
  })
  const confirmedAt = input.confirmed ? new Date() : null
  await prisma.userIdentifier.create({
    data: { userId: created.id, tenantId: input.tenantId, kind: 'EMAIL', normalizedValue: input.email, confirmedAt },
  })
  await prisma.userIdentifier.create({
    data: { userId: created.id, tenantId: input.tenantId, kind: 'PHONE', normalizedValue: input.phone, confirmedAt },
  })
  return created
}

async function link(input: {
  tenantId: string
  ownerId: string
  networkId: string
  nicheId: string
  name: string
  description: string
  url: string
  status: 'PUBLISHED' | 'UNAVAILABLE' | 'PENDING_MODERATION'
}) {
  return prisma.link.create({
    data: {
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      networkId: input.networkId,
      nicheId: input.nicheId,
      name: input.name,
      description: input.description,
      canonicalUrl: input.url,
      status: input.status,
      occupiesSlot: input.status !== 'UNAVAILABLE',
      everPublished: input.status === 'PUBLISHED',
      approvedName: input.status === 'PUBLISHED' ? input.name : null,
      approvedDescription: input.status === 'PUBLISHED' ? input.description : null,
    },
  })
}

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE tenants CASCADE')
  const a = await tenantBundle('tenant-a.localhost', 'Tenant A')
  const b = await tenantBundle('tenant-b.localhost', 'Tenant B')
  const bia = await user({
    tenantId: a.tenant.id, name: 'Bia', email: 'bia@tenant-a.test', phone: '5511911110001', confirmed: true,
  })
  const eva = await user({
    tenantId: a.tenant.id, name: 'Eva', email: 'eva@tenant-a.test', phone: '5511911110002', confirmed: true,
  })
  await user({
    tenantId: a.tenant.id, name: 'Admin', email: 'admin@tenant-a.test', phone: '5511911110003', role: 'ADMIN', confirmed: true,
  })
  const dora = await user({
    tenantId: b.tenant.id, name: 'Dora', email: 'dora@tenant-b.test', phone: '5511911110004', confirmed: true,
  })
  const receitas = await link({
    tenantId: a.tenant.id, ownerId: bia.id, networkId: a.network.id, nicheId: a.niche.id,
    name: 'Receitas', description: 'Grupo de receitas', url: 'https://t.me/receitas', status: 'PUBLISHED',
  })
  const off = await link({
    tenantId: a.tenant.id, ownerId: bia.id, networkId: a.network.id, nicheId: a.niche.id,
    name: 'NomeSecretoIndisponivel', description: 'nao mostrar', url: 'https://t.me/off', status: 'UNAVAILABLE',
  })
  const xss = await link({
    tenantId: a.tenant.id, ownerId: bia.id, networkId: a.network.id, nicheId: a.niche.id,
    name: '<script>alert(1)</script>', description: 'texto', url: 'https://t.me/xss', status: 'PUBLISHED',
  })
  const approve = await link({
    tenantId: a.tenant.id, ownerId: eva.id, networkId: a.network.id, nicheId: a.niche.id,
    name: 'FilaAprovar', description: 'caso', url: 'https://t.me/aprovar', status: 'PENDING_MODERATION',
  })
  const reject = await link({
    tenantId: a.tenant.id, ownerId: eva.id, networkId: a.network.id, nicheId: a.niche.id,
    name: 'FilaRejeitar', description: 'caso', url: 'https://t.me/rejeitar', status: 'PENDING_MODERATION',
  })
  const secret = await link({
    tenantId: b.tenant.id, ownerId: dora.id, networkId: b.network.id, nicheId: b.niche.id,
    name: 'SegredoDoB', description: 'outro tenant', url: 'https://t.me/segredo', status: 'PUBLISHED',
  })
  const approveCase = await prisma.moderationCase.create({ data: { tenantId: a.tenant.id, linkId: approve.id } })
  const rejectCase = await prisma.moderationCase.create({ data: { tenantId: a.tenant.id, linkId: reject.id } })
  const state = {
    tenantA: a.tenant.id,
    tenantB: b.tenant.id,
    receitas: receitas.id,
    off: off.id,
    xss: xss.id,
    approve: approve.id,
    reject: reject.id,
    approveCase: approveCase.id,
    rejectCase: rejectCase.id,
    secret: secret.id,
    password: 'Senha-e2e-1',
    bia: 'bia@tenant-a.test',
    eva: 'eva@tenant-a.test',
    admin: 'admin@tenant-a.test',
    dora: 'dora@tenant-b.test',
  }
  writeFileSync(path.join(__dirname, '../../frontend/e2e/state.json'), JSON.stringify(state, null, 2))
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
