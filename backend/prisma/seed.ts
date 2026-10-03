import { PrismaClient, PromotionProductCode } from '@prisma/client'
import { CONFIG_KEYS, type ConfigKey } from '../src/domain/config/read-config'
import { PRICE_ROWS, type ProductCode } from '../src/domain/promotions/price-for'
import { defaultOffers } from '../src/domain/promotions/offer-catalog'

import { env } from '../src/env'

const INITIAL_CONFIG: Record<ConfigKey, string> = {
  MODERATION_AUTO_APPROVE_THRESHOLD: '0.85',
  SEARCH_RELEVANCE_THRESHOLD: '0.35',
  SEARCH_TEXT_WEIGHT: '0.4',
  SEARCH_SEMANTIC_WEIGHT: '0.6',
  SHOW_IMPRESSIONS: '1',
}

const INITIAL_NETWORKS: Array<{
  name: string
  slug: string
  knownHosts: string[]
  isPublicFacet: boolean
  requiresAge: boolean
}> = [
  { name: 'Discord', slug: 'discord', knownHosts: ['discord.com', 'discord.gg'], isPublicFacet: true, requiresAge: false },
  { name: 'Facebook', slug: 'facebook', knownHosts: ['facebook.com', 'fb.com', 'm.facebook.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Fansly', slug: 'fansly', knownHosts: ['fansly.com'], isPublicFacet: true, requiresAge: true },
  { name: 'Fatal Model', slug: 'fatal-model', knownHosts: ['fatalmodel.com'], isPublicFacet: true, requiresAge: true },
  { name: 'Instagram', slug: 'instagram', knownHosts: ['instagram.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Kwai', slug: 'kwai', knownHosts: ['kwai.com'], isPublicFacet: true, requiresAge: false },
  { name: 'LinkedIn', slug: 'linkedin', knownHosts: ['linkedin.com'], isPublicFacet: true, requiresAge: false },
  { name: 'OnlyFans', slug: 'onlyfans', knownHosts: ['onlyfans.com'], isPublicFacet: true, requiresAge: true },
  { name: 'Outro', slug: 'outro', knownHosts: [], isPublicFacet: false, requiresAge: false },
  { name: 'Pinterest', slug: 'pinterest', knownHosts: ['pinterest.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Privacy', slug: 'privacy', knownHosts: ['privacy.com.br'], isPublicFacet: true, requiresAge: true },
  { name: 'Reddit', slug: 'reddit', knownHosts: ['reddit.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Site', slug: 'site', knownHosts: [], isPublicFacet: true, requiresAge: false },
  { name: 'Telegram', slug: 'telegram', knownHosts: ['t.me', 'telegram.me'], isPublicFacet: true, requiresAge: false },
  { name: 'Threads', slug: 'threads', knownHosts: ['threads.net'], isPublicFacet: true, requiresAge: false },
  { name: 'TikTok', slug: 'tiktok', knownHosts: ['tiktok.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Twitch', slug: 'twitch', knownHosts: ['twitch.tv'], isPublicFacet: true, requiresAge: false },
  { name: 'Vimeo', slug: 'vimeo', knownHosts: ['vimeo.com'], isPublicFacet: true, requiresAge: false },
  { name: 'Whatsapp', slug: 'whatsapp', knownHosts: ['wa.me', 'chat.whatsapp.com', 'api.whatsapp.com'], isPublicFacet: true, requiresAge: false },
  { name: 'X', slug: 'x', knownHosts: ['x.com', 'twitter.com'], isPublicFacet: true, requiresAge: false },
  { name: 'YouTube', slug: 'youtube', knownHosts: ['youtube.com', 'youtu.be'], isPublicFacet: true, requiresAge: false },
]

const INITIAL_NICHES: Array<{ name: string; slug: string; requiresAge: boolean; isPublicFacet: boolean }> = [
  { name: 'Ganhar Dinheiro', slug: 'ganhar-dinheiro', requiresAge: false, isPublicFacet: true },
  { name: 'Apostas', slug: 'apostas', requiresAge: false, isPublicFacet: true },
  { name: 'Compras, Ofertas & Cupons', slug: 'compras-ofertas-cupons', requiresAge: false, isPublicFacet: true },
  { name: 'Divulgação & Marketing', slug: 'divulgacao-marketing', requiresAge: false, isPublicFacet: true },
  { name: 'Filmes & Séries', slug: 'filmes-series', requiresAge: false, isPublicFacet: true },
  { name: 'Streaming', slug: 'streaming', requiresAge: false, isPublicFacet: true },
  { name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true },
  { name: 'Serviços & Ferramentas', slug: 'servicos-ferramentas', requiresAge: false, isPublicFacet: true },
  { name: 'Tecnologia & Internet', slug: 'tecnologia-internet', requiresAge: false, isPublicFacet: true },
  { name: 'Educação & Cursos', slug: 'educacao-cursos', requiresAge: false, isPublicFacet: true },
  { name: 'Saúde & Bem-estar', slug: 'saude-bem-estar', requiresAge: false, isPublicFacet: true },
  { name: 'Moda & Beleza', slug: 'moda-beleza', requiresAge: false, isPublicFacet: true },
  { name: 'Afiliados & Monetização', slug: 'afiliados-monetizacao', requiresAge: false, isPublicFacet: true },
  { name: 'Marketplace & Vendas Diretas', slug: 'marketplace-vendas-diretas', requiresAge: false, isPublicFacet: true },
  { name: 'Futebol', slug: 'futebol', requiresAge: false, isPublicFacet: true },
  { name: 'Músicas', slug: 'musicas', requiresAge: false, isPublicFacet: true },
  { name: 'Entretenimento Geral', slug: 'entretenimento-geral', requiresAge: false, isPublicFacet: true },
  { name: 'Esportes', slug: 'esportes', requiresAge: false, isPublicFacet: true },
  { name: 'Finanças & Investimentos', slug: 'financas-investimentos', requiresAge: false, isPublicFacet: true },
  { name: 'Política & Sociedade', slug: 'politica-sociedade', requiresAge: false, isPublicFacet: true },
  { name: 'Apps, Redes Sociais & Plataformas', slug: 'apps-redes-plataformas', requiresAge: false, isPublicFacet: true },
  { name: 'Animes, Nerd & Geek', slug: 'animes-nerd-geek', requiresAge: false, isPublicFacet: true },
  { name: 'Amizade & Relacionamentos', slug: 'amizade-relacionamentos', requiresAge: false, isPublicFacet: true },
  { name: 'Serviços Profissionais', slug: 'servicos-profissionais', requiresAge: false, isPublicFacet: true },
  { name: 'Adulto', slug: 'adulto', requiresAge: true, isPublicFacet: true },
  { name: 'Outro', slug: 'outro', requiresAge: false, isPublicFacet: false },
]

const prisma = new PrismaClient()

function toPromotionProductCode(code: ProductCode): PromotionProductCode {
  return code as PromotionProductCode
}

const TENANT_HOST = env.TENANT_HOST
const TENANT_NAME = env.TENANT_NAME

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { host: TENANT_HOST },
    create: { host: TENANT_HOST, name: TENANT_NAME },
    update: { name: TENANT_NAME },
  })

  for (const row of PRICE_ROWS) {
    await prisma.promotionPrice.upsert({
      where: {
        tenantId_productCode_durationDays: {
          tenantId: tenant.id,
          productCode: toPromotionProductCode(row.code),
          durationDays: row.durationDays,
        },
      },
      create: {
        tenantId: tenant.id,
        productCode: toPromotionProductCode(row.code),
        durationDays: row.durationDays,
        amountCents: row.amountCents,
        currency: 'BRL',
      },
      update: {
        amountCents: row.amountCents,
        currency: 'BRL',
      },
    })
  }

  for (const offer of defaultOffers()) {
    const existing = await prisma.promotionOffer.findUnique({
      where: { tenantId_productCode: { tenantId: tenant.id, productCode: toPromotionProductCode(offer.code) } },
    })
    if (existing) continue
    await prisma.promotionOffer.create({
      data: {
        tenantId: tenant.id,
        productCode: toPromotionProductCode(offer.code),
        name: offer.name,
        sortOrder: offer.sortOrder,
        featured: offer.featured,
      },
    })
  }

  for (const network of INITIAL_NETWORKS) {
    await prisma.network.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: network.slug } },
      create: { tenantId: tenant.id, ...network },
      update: {
        name: network.name,
        knownHosts: network.knownHosts,
        isPublicFacet: network.isPublicFacet,
        requiresAge: network.requiresAge,
      },
    })
  }

  for (const niche of INITIAL_NICHES) {
    await prisma.niche.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: niche.slug } },
      create: { tenantId: tenant.id, ...niche },
      update: {
        name: niche.name,
        requiresAge: niche.requiresAge,
        isPublicFacet: niche.isPublicFacet,
      },
    })
  }

  for (const key of CONFIG_KEYS) {
    const value = INITIAL_CONFIG[key]
    const config = await prisma.config.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      create: { tenantId: tenant.id, key, value },
      update: key === 'SHOW_IMPRESSIONS' ? {} : { value },
    })

    const existingSeed = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'config.seed',
        entityType: 'Config',
        entityId: config.id,
      },
    })

    if (!existingSeed) {
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: null,
          action: 'config.seed',
          entityType: 'Config',
          entityId: config.id,
          before: {},
          after: { key, value },
        },
      })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
