import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { PromotionProductCode } from '@prisma/client'
import { z } from 'zod'
import { defaultOffers, isOfferCode, mergeCatalog, type OfferCode } from '@/domain/promotions/offer-catalog'
import { PRICE_ROWS, type PriceRow } from '@/domain/promotions/price-for'
import { env } from '@/env'
import { buildError, not_found, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'

const DURATIONS = [7, 14, 28] as const

const patchBody = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  featured: z.boolean().optional(),
  prices: z.array(z.object({
    durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]),
    amountCents: z.number().int().min(100).max(1_000_000),
  })).max(3).optional(),
}).strict()

function cardEnabled(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY)
}

async function rowsFor(tenantId: string): Promise<PriceRow[]> {
  const prices = await prisma.promotionPrice.findMany({
    where: { tenantId, effectiveTo: null },
  })
  if (prices.length === 0) return PRICE_ROWS.map((row) => ({ ...row }))
  return prices.flatMap((row) => {
    if (row.durationDays !== 7 && row.durationDays !== 14 && row.durationDays !== 28) return []
    return [{ code: row.productCode, durationDays: row.durationDays, amountCents: row.amountCents }]
  })
}

async function catalogFor(tenantId: string) {
  const [stored, rows] = await Promise.all([
    prisma.promotionOffer.findMany({ where: { tenantId } }),
    rowsFor(tenantId),
  ])
  return mergeCatalog(stored.map((row) => ({
    code: row.productCode,
    name: row.name,
    sortOrder: row.sortOrder,
    featured: row.featured,
  })), rows)
}

async function getOffers(request: FastifyRequest, reply: FastifyReply) {
  const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0] || '')
  if (request.user.tenantId !== tenant.id) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const enabled = cardEnabled()
  return reply.status(200).send({
    offers: await catalogFor(tenant.id),
    cardEnabled: enabled,
    ...(enabled && env.STRIPE_PUBLISHABLE_KEY ? { publishableKey: env.STRIPE_PUBLISHABLE_KEY } : {}),
  })
}

async function patchOffer(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const code = (request.params as { productCode?: string }).productCode ?? ''
  if (!isOfferCode(code)) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const parsed = patchBody.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send(buildError({
      code: validation,
      message: 'Dados inválidos.',
      request_id: request.id,
      issues: parsed.error.format(),
    }))
  }
  const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0] || '')
  if (request.user.tenantId !== tenant.id) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const fallback = defaultOffers().find((row) => row.code === code)!
  const body = parsed.data
  await prisma.$transaction(async (tx) => {
    if (body.featured === true) {
      await tx.promotionOffer.updateMany({ where: { tenantId: tenant.id }, data: { featured: false } })
    }
    await tx.promotionOffer.upsert({
      where: { tenantId_productCode: { tenantId: tenant.id, productCode: code as PromotionProductCode } },
      create: {
        tenantId: tenant.id,
        productCode: code as PromotionProductCode,
        name: body.name ?? fallback.name,
        sortOrder: body.sortOrder ?? fallback.sortOrder,
        featured: body.featured ?? fallback.featured,
      },
      update: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.featured !== undefined ? { featured: body.featured } : {}),
      },
    })
    for (const price of body.prices ?? []) {
      await tx.promotionPrice.upsert({
        where: {
          tenantId_productCode_durationDays: {
            tenantId: tenant.id,
            productCode: code as PromotionProductCode,
            durationDays: price.durationDays,
          },
        },
        create: {
          tenantId: tenant.id,
          productCode: code as PromotionProductCode,
          durationDays: price.durationDays,
          amountCents: price.amountCents,
          currency: 'BRL',
        },
        update: { amountCents: price.amountCents },
      })
    }
  })
  return reply.status(200).send({ offers: await catalogFor(tenant.id) })
}

export async function registerOfferRoutes(app: FastifyInstance) {
  app.get('/promotions/offers', { onRequest: [verifyJWT] }, getOffers)
  app.patch('/admin/offers/:productCode', { onRequest: [verifyJWT] }, patchOffer)
}

export const OFFER_DURATIONS = DURATIONS
export type { OfferCode }
