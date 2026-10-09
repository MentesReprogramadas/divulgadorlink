import { PrismaClient, PromotionProductCode } from '@prisma/client'
import { CONFIG_KEYS, type ConfigKey } from '../src/domain/config/read-config'
import { PRICE_ROWS, type ProductCode } from '../src/domain/promotions/price-for'
import { defaultOffers } from '../src/domain/promotions/offer-catalog'
import { INITIAL_NETWORKS, INITIAL_NICHES } from '../src/domain/catalog/initial-facets'
import { env } from '../src/env'
import { fillMissingFacetSummaries } from './fill-facet-summaries'

const INITIAL_CONFIG: Record<ConfigKey, string> = {
  MODERATION_AUTO_APPROVE_THRESHOLD: '0.85',
  SEARCH_RELEVANCE_THRESHOLD: '0.35',
  SEARCH_TEXT_WEIGHT: '0.4',
  SEARCH_SEMANTIC_WEIGHT: '0.6',
  SHOW_IMPRESSIONS: '1',
}

const prisma = new PrismaClient()

function toPromotionProductCode(code: ProductCode): PromotionProductCode {
  return code as PromotionProductCode
}

const TENANT_HOST = env.TENANT_HOST
const TENANT_NAME = env.TENANT_NAME

if (TENANT_HOST === 'localhost' || TENANT_HOST === '127.0.0.1') {
  throw new Error('TENANT_HOST precisa ser o domínio público do site.')
}

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

  await fillMissingFacetSummaries(prisma, tenant.id)

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
