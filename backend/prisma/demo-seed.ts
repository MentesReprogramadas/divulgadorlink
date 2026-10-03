import { hash } from 'bcryptjs'
import {
  EmbeddingJobStatus,
  EmbeddingState,
  LinkStatus,
  OrderStatus,
  PaymentMethod,
  PrismaClient,
  PromotionProductCode,
  PromotionStatus,
  PromotionSurface,
  SurfaceHold,
} from '@prisma/client'
import { OpenAiEmbeddingService } from '../src/adapters/embeddings/openai-embedding-service'
import { buildLinkEmbeddingText } from '../src/domain/embeddings/embedding-service'
import { env } from '../src/env'

const prisma = new PrismaClient()

const PASSWORD = 'demo-local-123'

const USERS = [
  { id: 'demo-user-admin', name: 'Admin Demo', email: 'admin@demo.local', phone: '5511990000001', role: 'ADMIN' as const, status: 'ACTIVE' as const },
  { id: 'demo-user-owner', name: 'Dono Demo', email: 'dono@demo.local', phone: '5511990000002', role: 'USER' as const, status: 'ACTIVE' as const },
  { id: 'demo-user-banned', name: 'Banido Demo', email: 'banido@demo.local', phone: '5511990000003', role: 'USER' as const, status: 'BANNED' as const },
]

type LinkFixture = {
  id: string
  ownerId: string
  name: string
  description: string
  canonicalUrl: string
  network: string
  niche: string
  status: LinkStatus
  occupiesSlot: boolean
  everPublished: boolean
  embeddingState: EmbeddingState
  embed: boolean
  otherNote?: string
}

const LINKS: LinkFixture[] = [
  {
    id: 'demo-link-home',
    ownerId: 'demo-user-owner',
    name: 'Servidor de partidas ranqueadas',
    description: 'Discord de jogos com salas diárias e campeonatos de fim de semana.',
    canonicalUrl: 'https://discord.gg/demo-partidas',
    network: 'discord',
    niche: 'jogos',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-jogos-organico',
    ownerId: 'demo-user-owner',
    name: 'Guilda casual de RPG',
    description: 'Grupo de jogos de mesa e RPG no Discord, sem fila de ranqueada.',
    canonicalUrl: 'https://discord.gg/demo-rpg',
    network: 'discord',
    niche: 'jogos',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-ofertas',
    ownerId: 'demo-user-owner',
    name: 'Cupons do dia',
    description: 'Canal de compras, ofertas e cupons com links que expiram no mesmo dia.',
    canonicalUrl: 'https://t.me/demo-cupons',
    network: 'telegram',
    niche: 'compras-ofertas-cupons',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-moda',
    ownerId: 'demo-user-owner',
    name: 'Looks da semana',
    description: 'Perfil de moda e beleza com combinações e achados de brechó.',
    canonicalUrl: 'https://instagram.com/demo-looks',
    network: 'instagram',
    niche: 'moda-beleza',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-cursos',
    ownerId: 'demo-user-owner',
    name: 'Aulas de planilha',
    description: 'Canal de educação e cursos com aulas curtas de planilha e carreira.',
    canonicalUrl: 'https://youtube.com/demo-planilha',
    network: 'youtube',
    niche: 'educacao-cursos',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-musica',
    ownerId: 'demo-user-owner',
    name: 'Playlists da madrugada',
    description: 'Perfil de músicas com sets curtos e pedidos da audiência.',
    canonicalUrl: 'https://www.tiktok.com/@demo-playlists',
    network: 'tiktok',
    niche: 'musicas',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-futebol',
    ownerId: 'demo-user-owner',
    name: 'Resenha da rodada',
    description: 'Grupo de futebol para escalação, memes e o jogo do fim de semana.',
    canonicalUrl: 'https://chat.whatsapp.com/demo-rodada',
    network: 'whatsapp',
    niche: 'futebol',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-ferramentas',
    ownerId: 'demo-user-owner',
    name: 'Caixa de ferramentas web',
    description: 'Site de serviços e ferramentas para encurtar, agendar e medir campanha.',
    canonicalUrl: 'https://demo-ferramentas.example',
    network: 'site',
    niche: 'servicos-ferramentas',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-adulto',
    ownerId: 'demo-user-owner',
    name: 'Conteúdo adulto demo',
    description: 'Página do nicho adulto. Só aparece com o cookie de maioridade.',
    canonicalUrl: 'https://demo-adulto.example',
    network: 'site',
    niche: 'adulto',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'READY',
    embed: true,
  },
  {
    id: 'demo-link-outro',
    ownerId: 'demo-user-owner',
    name: 'Link de rede oculta',
    description: 'Publicado numa rede que não é faceta pública. Entra na home, não em /rede/outro.',
    canonicalUrl: 'https://demo-outro.example',
    network: 'outro',
    niche: 'entretenimento-geral',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'ABSENT',
    embed: false,
    otherNote: 'Fórum fora da lista de redes.',
  },
  {
    id: 'demo-link-banned',
    ownerId: 'demo-user-banned',
    name: 'Canal de um usuário banido',
    description: 'Conta suspensa. O link publicado continua no catálogo.',
    canonicalUrl: 'https://reddit.com/r/demo-banido',
    network: 'reddit',
    niche: 'entretenimento-geral',
    status: 'PUBLISHED',
    occupiesSlot: true,
    everPublished: true,
    embeddingState: 'ABSENT',
    embed: false,
  },
  {
    id: 'demo-link-draft',
    ownerId: 'demo-user-owner',
    name: 'Rascunho de divulgação',
    description: 'Ainda não entrou na fila. Não aparece no catálogo.',
    canonicalUrl: 'https://t.me/demo-rascunho',
    network: 'telegram',
    niche: 'divulgacao-marketing',
    status: 'DRAFT',
    occupiesSlot: true,
    everPublished: false,
    embeddingState: 'ABSENT',
    embed: false,
  },
  {
    id: 'demo-link-pending',
    ownerId: 'demo-user-owner',
    name: 'Grupo aguardando revisão',
    description: 'Texto na fila de moderação, com caso aberto.',
    canonicalUrl: 'https://t.me/demo-revisao',
    network: 'telegram',
    niche: 'tecnologia-internet',
    status: 'PENDING_MODERATION',
    occupiesSlot: true,
    everPublished: false,
    embeddingState: 'PENDING',
    embed: false,
  },
  {
    id: 'demo-link-rejected',
    ownerId: 'demo-user-owner',
    name: 'Grupo pré-rejeitado',
    description: 'Dono ainda pode contestar. O caso está aberto e sem texto de recurso.',
    canonicalUrl: 'https://t.me/demo-rejeitado',
    network: 'telegram',
    niche: 'ganhar-dinheiro',
    status: 'PRE_REJECTED',
    occupiesSlot: true,
    everPublished: false,
    embeddingState: 'FAILED',
    embed: false,
  },
  {
    id: 'demo-link-unavailable',
    ownerId: 'demo-user-owner',
    name: 'Canal que saiu do ar',
    description: 'Já foi publicado e agora está indisponível. Não ocupa vaga.',
    canonicalUrl: 'https://t.me/demo-indisponivel',
    network: 'telegram',
    niche: 'streaming',
    status: 'UNAVAILABLE',
    occupiesSlot: false,
    everPublished: true,
    embeddingState: 'ABSENT',
    embed: false,
  },
]

type OrderFixture = {
  id: string
  linkId: string
  status: OrderStatus
  method: PaymentMethod
  productCode: PromotionProductCode
  durationDays: number
  amountCents: number
  savingsCents: number
  surfaces: Array<{ surface: PromotionSurface; hold: SurfaceHold }>
  pixExpiresAt: Date | null
  brCode: string | null
  gatewayChargeId: string | null
  refundAttempts: number
  refundErrors: string[]
  refundIds: string[]
  paymentStatus: string | null
  userId?: string
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

const ORDERS: OrderFixture[] = [
  {
    id: 'demo-order-paid',
    linkId: 'demo-link-home',
    status: 'PAID',
    method: 'CARD',
    productCode: 'SEARCH_NICHE_HOME',
    durationDays: 7,
    amountCents: 3290,
    savingsCents: 680,
    surfaces: [
      { surface: 'HOME', hold: 'RELEASED' },
      { surface: 'NICHE', hold: 'RELEASED' },
      { surface: 'SEARCH', hold: 'RELEASED' },
    ],
    pixExpiresAt: null,
    brCode: null,
    gatewayChargeId: 'demo-charge-paid',
    refundAttempts: 0,
    refundErrors: [],
    refundIds: [],
    paymentStatus: 'PAID',
  },
  {
    id: 'demo-order-pending',
    linkId: 'demo-link-ofertas',
    status: 'PENDING_PAYMENT',
    method: 'PIX',
    productCode: 'SEARCH',
    durationDays: 7,
    amountCents: 790,
    savingsCents: 0,
    surfaces: [{ surface: 'SEARCH', hold: 'PENDING_PAYMENT' }],
    pixExpiresAt: hoursFromNow(24),
    brCode: '00020126DEMO-LOCAL-NAO-PAGAR',
    gatewayChargeId: 'demo-charge-pending',
    refundAttempts: 0,
    refundErrors: [],
    refundIds: [],
    paymentStatus: 'PENDING',
  },
  {
    id: 'demo-order-expired',
    linkId: 'demo-link-moda',
    status: 'EXPIRED',
    method: 'PIX',
    productCode: 'HOME',
    durationDays: 7,
    amountCents: 1990,
    savingsCents: 0,
    surfaces: [{ surface: 'HOME', hold: 'RELEASED' }],
    pixExpiresAt: hoursFromNow(-2),
    brCode: '00020126DEMO-EXPIRADO',
    gatewayChargeId: 'demo-charge-expired',
    refundAttempts: 0,
    refundErrors: [],
    refundIds: [],
    paymentStatus: 'EXPIRED',
  },
  {
    id: 'demo-order-late',
    linkId: 'demo-link-cursos',
    status: 'PAID_LATE',
    method: 'PIX',
    productCode: 'SEARCH',
    durationDays: 14,
    amountCents: 1290,
    savingsCents: 0,
    surfaces: [{ surface: 'SEARCH', hold: 'RELEASED' }],
    pixExpiresAt: hoursFromNow(-3),
    brCode: '00020126DEMO-ATRASADO',
    gatewayChargeId: 'demo-charge-late',
    refundAttempts: 0,
    refundErrors: [],
    refundIds: [],
    paymentStatus: 'PAID',
  },
  {
    id: 'demo-order-refund-pending',
    linkId: 'demo-link-musica',
    status: 'REFUND_PENDING',
    method: 'PIX',
    productCode: 'NICHE',
    durationDays: 7,
    amountCents: 1190,
    savingsCents: 0,
    surfaces: [{ surface: 'NICHE', hold: 'RELEASED' }],
    pixExpiresAt: hoursFromNow(-4),
    brCode: '00020126DEMO-ESTORNO-PENDENTE',
    gatewayChargeId: 'demo-charge-refund-pending',
    refundAttempts: 1,
    refundErrors: ['timeout no provedor'],
    refundIds: [],
    paymentStatus: 'PAID',
  },
  {
    id: 'demo-order-refunded',
    linkId: 'demo-link-futebol',
    status: 'REFUNDED',
    method: 'PIX',
    productCode: 'NICHE',
    durationDays: 7,
    amountCents: 1190,
    savingsCents: 0,
    surfaces: [{ surface: 'NICHE', hold: 'RELEASED' }],
    pixExpiresAt: hoursFromNow(-5),
    brCode: '00020126DEMO-ESTORNADO',
    gatewayChargeId: 'demo-charge-refunded',
    refundAttempts: 1,
    refundErrors: [],
    refundIds: ['demo-refund-ok'],
    paymentStatus: 'REFUNDED',
  },
  {
    id: 'demo-order-refund-failed',
    linkId: 'demo-link-ferramentas',
    status: 'REFUND_FAILED',
    method: 'PIX',
    productCode: 'SEARCH',
    durationDays: 28,
    amountCents: 1990,
    savingsCents: 0,
    surfaces: [{ surface: 'SEARCH', hold: 'RELEASED' }],
    pixExpiresAt: hoursFromNow(-6),
    brCode: '00020126DEMO-ESTORNO-FALHOU',
    gatewayChargeId: 'demo-charge-refund-failed',
    refundAttempts: 3,
    refundErrors: ['timeout no provedor', 'timeout no provedor', 'limite de tentativas'],
    refundIds: [],
    paymentStatus: 'PAID',
  },
]

const PER_NICHE = 24
const QUEUE_SIZE = 24
const HOME_SPONSORED = 8

const VOLUME_ANGLES = [
  'Comunidade',
  'Grupo diário',
  'Canal ao vivo',
  'Lista da semana',
  'Achados',
  'Iniciantes',
  'Avançado',
  'Discussão',
  'Arquivo',
  'Novidades',
  'Plantão',
  'Indicações',
]

type DemoUser = (typeof USERS)[number]

const PUBLISHERS: DemoUser[] = Array.from({ length: 12 }, (_, index) => {
  const n = String(index + 1).padStart(2, '0')
  return {
    id: `demo-user-pub-${n}`,
    name: `Editor ${n}`,
    email: `editor${n}@demo.local`,
    phone: `551198810${n}00`,
    role: 'USER' as const,
    status: 'ACTIVE' as const,
  }
})

function volumeLinks(
  niches: Array<{ slug: string; name: string; isPublicFacet: boolean }>,
  networks: Array<{ slug: string; name: string; isPublicFacet: boolean }>,
): LinkFixture[] {
  const publicNiches = niches.filter((row) => row.isPublicFacet)
  const publicNetworks = networks.filter((row) => row.isPublicFacet)
  const links: LinkFixture[] = []
  let cursor = 0
  for (const niche of publicNiches) {
    for (let index = 0; index < PER_NICHE; index += 1) {
      const network = publicNetworks[cursor % publicNetworks.length]!
      const angle = VOLUME_ANGLES[index % VOLUME_ANGLES.length]!
      const owner = PUBLISHERS[cursor % PUBLISHERS.length]!
      links.push({
        id: `demo-vol-${niche.slug}-${String(index + 1).padStart(2, '0')}`,
        ownerId: owner.id,
        name: `${angle} ${index + 1} · ${niche.name}`,
        description: `${angle} de ${niche.name} no ${network.name}. Catálogo de demonstração, sem vetor de busca.`,
        canonicalUrl: `https://demo.local/${niche.slug}/${index + 1}`,
        network: network.slug,
        niche: niche.slug,
        status: 'PUBLISHED',
        occupiesSlot: true,
        everPublished: true,
        embeddingState: 'ABSENT',
        embed: false,
      })
      cursor += 1
    }
  }
  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    const niche = publicNiches[index % publicNiches.length]!
    links.push({
      id: `demo-queue-${String(index + 1).padStart(2, '0')}`,
      ownerId: 'demo-user-owner',
      name: `Fila ${index + 1} · ${niche.name}`,
      description: `Texto ${index + 1} parado na moderação, do nicho ${niche.name}.`,
      canonicalUrl: `https://t.me/demo-fila-${index + 1}`,
      network: 'telegram',
      niche: niche.slug,
      status: 'PENDING_MODERATION',
      occupiesSlot: true,
      everPublished: false,
      embeddingState: 'ABSENT',
      embed: false,
    })
  }
  return links
}

function volumeOrders(links: LinkFixture[]): OrderFixture[] {
  return links
    .filter((link) => link.status === 'PUBLISHED' && link.id.endsWith('-03'))
    .slice(0, 16)
    .map((link, index) => ({
      id: `demo-order-vol-refund-${String(index + 1).padStart(2, '0')}`,
      linkId: link.id,
      userId: link.ownerId,
      status: 'REFUND_FAILED' as const,
      method: 'PIX' as const,
      productCode: 'SEARCH' as const,
      durationDays: 7,
      amountCents: 790 + index * 200,
      savingsCents: 0,
      surfaces: [{ surface: 'SEARCH' as const, hold: 'RELEASED' as const }],
      pixExpiresAt: hoursFromNow(-12),
      brCode: `00020126DEMO-ESTORNO-${index + 1}`,
      gatewayChargeId: `demo-charge-vol-${index + 1}`,
      refundAttempts: 3,
      refundErrors: ['timeout no provedor', 'timeout no provedor', 'limite de tentativas'],
      refundIds: [],
      paymentStatus: 'PAID',
    }))
}

function assertLocalDatabase(): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('db:demo recusa NODE_ENV=production.')
  }
  const host = new URL(env.DATABASE_URL).hostname
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    throw new Error(`db:demo só roda com Postgres em localhost. Host atual: ${host}.`)
  }
}

async function ensureUser(tenantId: string, passwordHash: string, spec: (typeof USERS)[number]): Promise<void> {
  const email = await prisma.userIdentifier.findUnique({
    where: { tenantId_kind_normalizedValue: { tenantId, kind: 'EMAIL', normalizedValue: spec.email } },
  })
  if (email && email.userId !== spec.id) {
    throw new Error(`${spec.email} já pertence a outro usuário. Não vou trocar a senha dessa conta.`)
  }
  const phone = await prisma.userIdentifier.findUnique({
    where: { tenantId_kind_normalizedValue: { tenantId, kind: 'PHONE', normalizedValue: spec.phone } },
  })
  if (phone && phone.userId !== spec.id) {
    throw new Error(`Telefone ${spec.phone} já pertence a outro usuário.`)
  }

  await prisma.user.upsert({
    where: { id: spec.id },
    create: {
      id: spec.id,
      tenantId,
      name: spec.name,
      passwordHash,
      role: spec.role,
      status: spec.status,
    },
    update: {
      name: spec.name,
      passwordHash,
      role: spec.role,
      status: spec.status,
    },
  })

  const confirmedAt = new Date()
  await prisma.userIdentifier.upsert({
    where: { tenantId_kind_normalizedValue: { tenantId, kind: 'EMAIL', normalizedValue: spec.email } },
    create: {
      id: `${spec.id}-email`,
      userId: spec.id,
      tenantId,
      kind: 'EMAIL',
      normalizedValue: spec.email,
      confirmedAt,
    },
    update: { confirmedAt, replacedAt: null },
  })
  await prisma.userIdentifier.upsert({
    where: { tenantId_kind_normalizedValue: { tenantId, kind: 'PHONE', normalizedValue: spec.phone } },
    create: {
      id: `${spec.id}-phone`,
      userId: spec.id,
      tenantId,
      kind: 'PHONE',
      normalizedValue: spec.phone,
      confirmedAt,
    },
    update: { confirmedAt, replacedAt: null },
  })
}

async function ensureLink(
  tenantId: string,
  spec: LinkFixture,
  networkId: string,
  nicheId: string,
): Promise<void> {
  const published = spec.status === 'PUBLISHED'
  await prisma.link.upsert({
    where: { id: spec.id },
    create: {
      id: spec.id,
      tenantId,
      ownerId: spec.ownerId,
      canonicalUrl: spec.canonicalUrl,
      name: spec.name,
      description: spec.description,
      networkId,
      nicheId,
      otherNote: spec.otherNote ?? null,
      status: spec.status,
      occupiesSlot: spec.occupiesSlot,
      everPublished: spec.everPublished,
      approvedName: published ? spec.name : null,
      approvedDescription: published ? spec.description : null,
      embeddingState: spec.embed ? 'PENDING' : spec.embeddingState,
    },
    update: {
      ownerId: spec.ownerId,
      canonicalUrl: spec.canonicalUrl,
      name: spec.name,
      description: spec.description,
      networkId,
      nicheId,
      otherNote: spec.otherNote ?? null,
      status: spec.status,
      occupiesSlot: spec.occupiesSlot,
      everPublished: spec.everPublished,
      approvedName: published ? spec.name : null,
      approvedDescription: published ? spec.description : null,
      embeddingState: spec.embed ? undefined : spec.embeddingState,
    },
  })
}

async function ensurePromotion(
  tenantId: string,
  id: string,
  linkId: string,
  surface: PromotionSurface,
  status: PromotionStatus,
  activatedAt: Date,
  expiresAt: Date,
): Promise<void> {
  const current = await prisma.promotion.findFirst({ where: { linkId, surface } })
  if (!current) {
    await prisma.promotion.create({
      data: { id, tenantId, linkId, surface, status, activatedAt, expiresAt },
    })
    return
  }
  await prisma.promotion.update({
    where: { id: current.id },
    data: { status, activatedAt, expiresAt },
  })
}

async function ensureOrder(tenantId: string, spec: OrderFixture): Promise<void> {
  const data = {
    tenantId,
    userId: spec.userId ?? 'demo-user-owner',
    linkId: spec.linkId,
    status: spec.status,
    method: spec.method,
    productCode: spec.productCode,
    durationDays: spec.durationDays,
    amountCents: spec.amountCents,
    savingsCents: spec.savingsCents,
    pixExpiresAt: spec.pixExpiresAt,
    gatewayChargeId: spec.gatewayChargeId,
    brCode: spec.brCode,
    refundCorrelationId: spec.status.startsWith('REFUND') ? `refund-${spec.id}` : null,
    refundAttempts: spec.refundAttempts,
    refundErrors: spec.refundErrors,
    refundIds: spec.refundIds,
    idempotencyKey: spec.id,
    renewal: false,
  }
  await prisma.order.upsert({
    where: { id: spec.id },
    create: { id: spec.id, ...data },
    update: data,
  })

  for (const surface of spec.surfaces) {
    const id = `${spec.id}-${surface.surface.toLowerCase()}`
    await prisma.orderSurface.upsert({
      where: { id },
      create: { id, orderId: spec.id, linkId: spec.linkId, surface: surface.surface, hold: surface.hold },
      update: { linkId: spec.linkId, surface: surface.surface, hold: surface.hold },
    })
  }

  if (spec.paymentStatus) {
    await prisma.payment.upsert({
      where: { id: `${spec.id}-payment` },
      create: {
        id: `${spec.id}-payment`,
        orderId: spec.id,
        provider: 'demo',
        externalId: spec.gatewayChargeId,
        amountCents: spec.amountCents,
        status: spec.paymentStatus,
      },
      update: {
        provider: 'demo',
        externalId: spec.gatewayChargeId,
        amountCents: spec.amountCents,
        status: spec.paymentStatus,
      },
    })
  }

  await prisma.orderEvent.upsert({
    where: { orderId_eventId: { orderId: spec.id, eventId: `${spec.id}-seed` } },
    create: { id: `${spec.id}-event`, orderId: spec.id, eventId: `${spec.id}-seed` },
    update: {},
  })
}

async function ensureCase(tenantId: string, id: string, linkId: string, closed: boolean): Promise<void> {
  const current = await prisma.moderationCase.findFirst({ where: { linkId } })
  const closedAt = closed ? new Date() : null
  if (!current) {
    await prisma.moderationCase.create({
      data: { id, tenantId, linkId, appealText: null, appealedAt: null, closedAt },
    })
    return
  }
  await prisma.moderationCase.update({
    where: { id: current.id },
    data: { appealText: null, appealedAt: null, closedAt },
  })
}

async function ensureJob(
  tenantId: string,
  id: string,
  link: LinkFixture,
  networkId: string,
  nicheId: string,
  status: EmbeddingJobStatus,
  lastError: string | null,
): Promise<void> {
  const data = {
    tenantId,
    linkId: link.id,
    status,
    attempts: status === 'PENDING' ? 0 : 1,
    lastError,
    snapshotName: link.name,
    snapshotDescription: link.description,
    snapshotNetworkId: networkId,
    snapshotNicheId: nicheId,
  }
  await prisma.embeddingJob.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  })
}

async function ensureAnalytics(tenantId: string, linkId: string, impressions: number, clicks: number): Promise<void> {
  const day = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  for (let index = 0; index < impressions; index += 1) {
    const sessionId = `demo-session-${linkId}-${index}`
    await prisma.analyticsEvent.upsert({
      where: {
        sessionId_linkId_surface_day_kind: {
          sessionId,
          linkId,
          surface: 'HOME',
          day,
          kind: 'IMPRESSION',
        },
      },
      create: {
        id: `${sessionId}-impression`,
        tenantId,
        sessionId,
        linkId,
        surface: 'HOME',
        day,
        kind: 'IMPRESSION',
      },
      update: {},
    })
    if (index < clicks) {
      await prisma.analyticsEvent.upsert({
        where: {
          sessionId_linkId_surface_day_kind: {
            sessionId,
            linkId,
            surface: 'HOME',
            day,
            kind: 'CLICK',
          },
        },
        create: {
          id: `${sessionId}-click`,
          tenantId,
          sessionId,
          linkId,
          surface: 'HOME',
          day,
          kind: 'CLICK',
        },
        update: {},
      })
    }
  }
}

async function embedPublished(links: LinkFixture[], nicheName: Map<string, string>, networkName: Map<string, string>): Promise<string[]> {
  if (!env.OPENAI_API_KEY) return ['OPENAI_API_KEY ausente: busca semântica fica vazia.']
  const service = new OpenAiEmbeddingService(env.OPENAI_API_KEY)
  const notes: string[] = []
  for (const link of links.filter((row) => row.embed)) {
    const stored = await prisma.link.findUnique({ where: { id: link.id }, select: { embeddingState: true } })
    if (stored?.embeddingState === 'READY') continue
    try {
      const text = buildLinkEmbeddingText({
        name: link.name,
        description: link.description,
        niche: nicheName.get(link.niche) ?? link.niche,
        network: networkName.get(link.network) ?? link.network,
      })
      let vector: number[] | null = null
      let lastError: unknown
      for (let attempt = 0; attempt < 3 && !vector; attempt += 1) {
        try {
          vector = await service.embed(text)
        } catch (error) {
          lastError = error
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
      if (!vector) throw lastError
      const literal = `[${vector.join(',')}]`
      await prisma.$executeRawUnsafe(
        'UPDATE "links" SET "embedding" = $1::vector, "embeddingState" = \'READY\' WHERE "id" = $2',
        literal,
        link.id,
      )
    } catch (error) {
      notes.push(`${link.id}: embedding falhou (${error instanceof Error ? error.message : 'erro'}).`)
      await prisma.link.update({ where: { id: link.id }, data: { embeddingState: 'FAILED' } })
    }
  }
  return notes
}

async function main() {
  assertLocalDatabase()
  const tenant = await prisma.tenant.findUnique({ where: { host: env.TENANT_HOST } })
  if (!tenant) {
    throw new Error('Tenant ausente. Rode npm run db:seed antes do demo.')
  }
  const nicheCount = await prisma.niche.count({ where: { tenantId: tenant.id } })
  if (nicheCount === 0) {
    throw new Error('Nichos ausentes. Rode npm run db:seed antes do demo.')
  }

  const [networks, niches] = await Promise.all([
    prisma.network.findMany({ where: { tenantId: tenant.id } }),
    prisma.niche.findMany({ where: { tenantId: tenant.id } }),
  ])
  const networkId = new Map(networks.map((row) => [row.slug, row.id]))
  const nicheId = new Map(niches.map((row) => [row.slug, row.id]))
  const networkName = new Map(networks.map((row) => [row.slug, row.name]))
  const nicheName = new Map(niches.map((row) => [row.slug, row.name]))

  const passwordHash = await hash(PASSWORD, 12)
  const volume = volumeLinks(
    niches.map((row) => ({ slug: row.slug, name: row.name, isPublicFacet: row.isPublicFacet })),
    networks.map((row) => ({ slug: row.slug, name: row.name, isPublicFacet: row.isPublicFacet })),
  )
  const catalog = [...LINKS, ...volume]
  for (const user of [...USERS, ...PUBLISHERS]) await ensureUser(tenant.id, passwordHash, user)

  for (const link of catalog) {
    const network = networkId.get(link.network)
    const niche = nicheId.get(link.niche)
    if (!network || !niche) throw new Error(`Catálogo sem ${link.network} ou ${link.niche}. Rode npm run db:seed.`)
    await ensureLink(tenant.id, link, network, niche)
  }

  const now = new Date()
  const week = hoursFromNow(24 * 6)
  const yesterday = hoursFromNow(-24)
  await ensurePromotion(tenant.id, 'demo-promo-home', 'demo-link-home', 'HOME', 'ACTIVE', yesterday, week)
  await ensurePromotion(tenant.id, 'demo-promo-niche', 'demo-link-home', 'NICHE', 'ACTIVE', yesterday, week)
  await ensurePromotion(tenant.id, 'demo-promo-search', 'demo-link-home', 'SEARCH', 'ACTIVE', yesterday, week)
  await ensurePromotion(tenant.id, 'demo-promo-expired', 'demo-link-moda', 'HOME', 'EXPIRED', hoursFromNow(-24 * 10), hoursFromNow(-24))
  await ensurePromotion(tenant.id, 'demo-promo-cancelled', 'demo-link-cursos', 'SEARCH', 'CANCELLED', hoursFromNow(-24 * 3), week)

  const nicheLeaders = new Map<string, string>()
  for (const link of volume) {
    if (link.status !== 'PUBLISHED' || !link.id.endsWith('-01')) continue
    if (!nicheLeaders.has(link.niche)) nicheLeaders.set(link.niche, link.id)
  }
  let homeSlots = 0
  for (const [niche, linkId] of nicheLeaders) {
    const activated = new Date(yesterday.getTime() - homeSlots * 60 * 60 * 1000)
    await ensurePromotion(tenant.id, `demo-promo-vol-niche-${niche}`, linkId, 'NICHE', 'ACTIVE', activated, week)
    if (niche !== 'adulto' && homeSlots < HOME_SPONSORED) {
      await ensurePromotion(tenant.id, `demo-promo-vol-home-${niche}`, linkId, 'HOME', 'ACTIVE', activated, week)
      homeSlots += 1
    }
  }

  for (const order of [...ORDERS, ...volumeOrders(volume)]) await ensureOrder(tenant.id, order)

  await ensureCase(tenant.id, 'demo-case-pending', 'demo-link-pending', false)
  await ensureCase(tenant.id, 'demo-case-rejected', 'demo-link-rejected', false)
  await ensureCase(tenant.id, 'demo-case-closed', 'demo-link-home', true)
  for (const link of volume.filter((row) => row.id.startsWith('demo-queue-'))) {
    await ensureCase(tenant.id, `demo-case-${link.id}`, link.id, false)
  }

  const pending = LINKS.find((link) => link.id === 'demo-link-pending')!
  const draft = LINKS.find((link) => link.id === 'demo-link-draft')!
  const rejected = LINKS.find((link) => link.id === 'demo-link-rejected')!
  const home = LINKS.find((link) => link.id === 'demo-link-home')!
  await ensureJob(tenant.id, 'demo-job-processing', pending, networkId.get(pending.network)!, nicheId.get(pending.niche)!, 'PROCESSING', null)
  await ensureJob(tenant.id, 'demo-job-pending', draft, networkId.get(draft.network)!, nicheId.get(draft.niche)!, 'PENDING', null)
  await ensureJob(tenant.id, 'demo-job-failed', rejected, networkId.get(rejected.network)!, nicheId.get(rejected.niche)!, 'FAILED', 'provedor indisponível no demo')
  await ensureJob(tenant.id, 'demo-job-done', home, networkId.get(home.network)!, nicheId.get(home.niche)!, 'DONE', null)

  await ensureAnalytics(tenant.id, 'demo-link-home', 12, 3)
  await ensureAnalytics(tenant.id, 'demo-link-ofertas', 4, 1)

  for (const term of ['golpe-demo', 'cassino-pirata-demo']) {
    const existing = await prisma.blocklistTerm.findFirst({ where: { tenantId: tenant.id, term } })
    if (!existing) await prisma.blocklistTerm.create({ data: { tenantId: tenant.id, term } })
  }

  const audit = await prisma.auditLog.findFirst({
    where: { tenantId: tenant.id, action: 'demo.seed', entityId: 'demo-link-home' },
  })
  if (!audit) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: 'demo-user-admin',
        action: 'demo.seed',
        entityType: 'Link',
        entityId: 'demo-link-home',
        before: {},
        after: { note: 'dados de demonstração local' },
      },
    })
  }

  const embeddingNotes = await embedPublished(LINKS, nicheName, networkName)
  const published = catalog.filter((link) => link.status === 'PUBLISHED').length
  console.log('Demo local pronto.')
  console.log(`Senha das contas demo: ${PASSWORD}`)
  console.log('admin@demo.local  → /admin/moderacao e /admin/estornos')
  console.log('dono@demo.local   → /painel com os status e a fila extra')
  console.log('banido@demo.local → /painel com conta suspensa')
  console.log(`editor01@demo.local … editor12@demo.local → donos do volume`)
  console.log(`${published} links publicados. Home e nicho mostram no máximo 24.`)
  console.log('Volume sem embedding: a busca continua só nos links nomeados.')
  console.log('Adulto só aparece em /nicho/adulto com cookie age=yes.')
  for (const note of embeddingNotes) console.log(note)
  console.log(`Relógio do seed: ${now.toISOString()}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    await prisma.$disconnect()
    process.exit(1)
  })
