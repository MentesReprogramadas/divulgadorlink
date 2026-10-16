import { seedReports } from './e2e-reports-seed'
import { seedAvailability } from './e2e-availability-seed'
import { seedPerformance } from './e2e-performance-seed'
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
  SHOW_IMPRESSIONS: '1',
}

async function tenantBundle(host: string, name: string) {
  const tenant = await prisma.tenant.create({ data: { host, name } })
  for (const [key, value] of Object.entries(CONFIG)) {
    await prisma.config.create({ data: { tenantId: tenant.id, key, value } })
  }
  const network = await prisma.network.create({
    data: { tenantId: tenant.id, name: 'Telegram', slug: 'telegram', knownHosts: ['t.me'], isPublicFacet: true },
  })
  await prisma.network.create({
    data: { tenantId: tenant.id, name: 'Site', slug: 'site', knownHosts: [], isPublicFacet: true },
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
  await user({ tenantId: a.tenant.id, name: 'Autora de submissão', email: 'submitter@tenant-a.test', phone: '5511911110005', confirmed: true })
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
  // F42 owns a separate tenant so moderation tests cannot change catalog fixtures.
  const evolution = await tenantBundle('evolution.localhost', 'Evolution fixture')
  const evolutionOwner = await user({ tenantId: evolution.tenant.id, name: 'Operadora fixture', email: 'owner@evolution.test', phone: '5511911120001', confirmed: true })
  await user({ tenantId: evolution.tenant.id, name: 'Autora fixture', email: 'submitter@evolution.test', phone: '5511911120003', confirmed: true })
  await user({ tenantId: evolution.tenant.id, name: 'Admin fixture', email: 'admin@evolution.test', phone: '5511911120002', role: 'ADMIN', confirmed: true })
  const evolutionLink = await link({ tenantId: evolution.tenant.id, ownerId: evolutionOwner.id, networkId: evolution.network.id, nicheId: evolution.niche.id, name: 'Referência fixture', description: 'Comunidade de estudo', url: 'https://example.com/evolution-fixture', status: 'PUBLISHED' })
  const performance = await seedPerformance(prisma, { tenantId: evolution.tenant.id, ownerId: evolutionOwner.id, networkId: evolution.network.id, nicheId: evolution.niche.id })
  const reportsTenant = await tenantBundle('reports.localhost', 'Reports fixture')
  const reportOwner = await user({ tenantId: reportsTenant.tenant.id, name: 'Responsavel', email: 'owner@reports.test', phone: '5511911130001', confirmed: true })
  await user({ tenantId: reportsTenant.tenant.id, name: 'Visitante', email: 'reader@reports.test', phone: '5511911130002', confirmed: true })
  const reportAdmin = await user({ tenantId: reportsTenant.tenant.id, name: 'Admin', email: 'admin@reports.test', phone: '5511911130003', role: 'ADMIN', confirmed: true })
  const reports = await seedReports(prisma, { tenantId: reportsTenant.tenant.id, ownerId: reportOwner.id, networkId: reportsTenant.network.id, nicheId: reportsTenant.niche.id, adminId: reportAdmin.id })
  const availabilityTenant = await tenantBundle('availability.localhost', 'Disponibilidade fixture')
  const availabilityNetwork = await prisma.network.findFirstOrThrow({ where: { tenantId: availabilityTenant.tenant.id, slug: 'site' } })
  const availabilityOwner = await user({ tenantId: availabilityTenant.tenant.id, name: 'Responsável pelos estudos', email: 'owner@availability.test', phone: '5511911140001', confirmed: true })
  await user({ tenantId: availabilityTenant.tenant.id, name: 'Outro responsável', email: 'other@availability.test', phone: '5511911140002', confirmed: true })
  await user({ tenantId: availabilityTenant.tenant.id, name: 'Admin', email: 'admin@availability.test', phone: '5511911140003', confirmed: true, role: 'ADMIN' })
  const availability = await seedAvailability(prisma, { tenantId: availabilityTenant.tenant.id, ownerId: availabilityOwner.id, networkId: availabilityNetwork.id, nicheId: availabilityTenant.niche.id })
  const renewalTenant = await tenantBundle('renewal.localhost', 'Lembretes fixture')
  const renewalNetwork = await prisma.network.findFirstOrThrow({ where: { tenantId: renewalTenant.tenant.id, slug: 'site' } })
  const renewalOwner = await user({ tenantId: renewalTenant.tenant.id, name: 'Responsavel pela comunidade', email: 'owner@renewal.test', phone: '5511911150001', confirmed: true })
  await user({ tenantId: renewalTenant.tenant.id, name: 'Outro responsavel', email: 'other@renewal.test', phone: '5511911150002', confirmed: true })
  const relatedTenant = await tenantBundle('related.localhost', 'Relacionados fixture')
  const favoritesTenant = await tenantBundle('favorites.localhost', 'Favoritos fixture')
  const favoritesOwner = await user({ tenantId: favoritesTenant.tenant.id, name: 'Leitora', email: 'owner@favorites.test', phone: '5511911160001', confirmed: true })
  await user({ tenantId: favoritesTenant.tenant.id, name: 'Outra leitora', email: 'other@favorites.test', phone: '5511911160002', confirmed: true })
  const state = {
    favorites: { tenantId: favoritesTenant.tenant.id, ownerId: favoritesOwner.id, networkId: favoritesTenant.network.id, nicheId: favoritesTenant.niche.id, owner: 'owner@favorites.test', other: 'other@favorites.test', password: 'Senha-e2e-1' },
    related: { tenantId: relatedTenant.tenant.id, networkId: relatedTenant.network.id, nicheId: relatedTenant.niche.id },
    renewal: { tenantId: renewalTenant.tenant.id, ownerId: renewalOwner.id, networkId: renewalNetwork.id, nicheId: renewalTenant.niche.id, owner: 'owner@renewal.test', other: 'other@renewal.test', password: 'Senha-e2e-1' },
    availability: { ...availability, tenantId: availabilityTenant.tenant.id, ownerId: availabilityOwner.id, networkId: availabilityNetwork.id, nicheId: availabilityTenant.niche.id, owner: 'owner@availability.test', other: 'other@availability.test', admin: 'admin@availability.test', password: 'Senha-e2e-1' },
    reports: { ...reports, tenantId: reportsTenant.tenant.id, reader: 'reader@reports.test', admin: 'admin@reports.test', password: 'Senha-e2e-1' },
    performance,
    evolution: { tenantA: evolution.tenant.id, receitas: evolutionLink.id, password: 'Senha-e2e-1', bia: 'owner@evolution.test', eva: 'submitter@evolution.test', admin: 'admin@evolution.test' },
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
    submitter: 'submitter@tenant-a.test',
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
