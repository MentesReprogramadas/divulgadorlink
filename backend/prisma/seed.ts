import { PrismaClient, PromotionProductCode } from '@prisma/client'
import { CONFIG_KEYS, type ConfigKey } from '../src/domain/config/read-config'
import { PRICE_ROWS, type ProductCode } from '../src/domain/promotions/price-for'

const INITIAL_CONFIG: Record<ConfigKey, string> = {
  MODERATION_AUTO_APPROVE_THRESHOLD: '0.85',
  SEARCH_RELEVANCE_THRESHOLD: '0.35',
  SEARCH_TEXT_WEIGHT: '0.4',
  SEARCH_SEMANTIC_WEIGHT: '0.6',
}

const INITIAL_NETWORKS: Array<{
  name: string
  slug: string
  knownHosts: string[]
  isPublicFacet: boolean
}> = [
  { name: 'Discord', slug: 'discord', knownHosts: ['discord.com', 'discord.gg'], isPublicFacet: true },
  { name: 'Facebook', slug: 'facebook', knownHosts: ['facebook.com', 'fb.com', 'm.facebook.com'], isPublicFacet: true },
  { name: 'Instagram', slug: 'instagram', knownHosts: ['instagram.com'], isPublicFacet: true },
  { name: 'Kwai', slug: 'kwai', knownHosts: ['kwai.com'], isPublicFacet: true },
  { name: 'LinkedIn', slug: 'linkedin', knownHosts: ['linkedin.com'], isPublicFacet: true },
  { name: 'Outro', slug: 'outro', knownHosts: [], isPublicFacet: false },
  { name: 'Pinterest', slug: 'pinterest', knownHosts: ['pinterest.com'], isPublicFacet: true },
  { name: 'Reddit', slug: 'reddit', knownHosts: ['reddit.com'], isPublicFacet: true },
  { name: 'Site', slug: 'site', knownHosts: [], isPublicFacet: true },
  { name: 'Telegram', slug: 'telegram', knownHosts: ['t.me', 'telegram.me'], isPublicFacet: true },
  { name: 'Threads', slug: 'threads', knownHosts: ['threads.net'], isPublicFacet: true },
  { name: 'TikTok', slug: 'tiktok', knownHosts: ['tiktok.com'], isPublicFacet: true },
  { name: 'Twitch', slug: 'twitch', knownHosts: ['twitch.tv'], isPublicFacet: true },
  { name: 'Vimeo', slug: 'vimeo', knownHosts: ['vimeo.com'], isPublicFacet: true },
  { name: 'Whatsapp', slug: 'whatsapp', knownHosts: ['wa.me', 'chat.whatsapp.com', 'api.whatsapp.com'], isPublicFacet: true },
  { name: 'X', slug: 'x', knownHosts: ['x.com', 'twitter.com'], isPublicFacet: true },
  { name: 'YouTube', slug: 'youtube', knownHosts: ['youtube.com', 'youtu.be'], isPublicFacet: true },
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

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { host: 'temlinkaqui.com' },
    create: { host: 'temlinkaqui.com', name: 'Tem Link Aqui' },
    update: { name: 'Tem Link Aqui' },
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

  for (const network of INITIAL_NETWORKS) {
    await prisma.network.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: network.slug } },
      create: { tenantId: tenant.id, ...network },
      update: {
        name: network.name,
        knownHosts: network.knownHosts,
        isPublicFacet: network.isPublicFacet,
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
      update: { value },
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
