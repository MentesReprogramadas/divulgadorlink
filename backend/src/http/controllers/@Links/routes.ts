import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { buildError, business_rule, not_found, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getLinksRepository } from '@/repositories/links-repository'
import { canSubmitLink, confirmationFlags } from '@/use-cases/@Auth/confirm-identifier'
import { decideSubmission } from '@/use-cases/@Links/submit-link'
import { preRefuse } from '@/use-cases/@Moderation/pre-refuse'
import { postGuardedWrite } from '@/http/controllers/@Admin/ban'
import { registerAppealRoute } from '@/http/controllers/@Admin/moderation'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export const submitLinkBodySchema = z
  .object({
    url: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    networkId: z.string().min(1),
    nicheId: z.string().min(1),
    otherNote: z.string().optional(),
  })
  .strict()

class QuotaExhaustedError extends Error {}

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) {
    throw new ResourceNotFoundError()
  }
  return raw.split(':')[0]!
}

function toCanonicalUrl(raw: string): string | null {
  try {
    return canonicalUrl(raw)
  } catch {
    return null
  }
}

async function createLink(request: FastifyRequest, reply: FastifyReply) {
  const parsed = submitLinkBodySchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send(
      buildError({
        code: validation,
        message: 'Dados inválidos.',
        request_id: request.id,
        issues: parsed.error.format(),
      }),
    )
  }
  const body = parsed.data
  const repo = getLinksRepository()

  const forbiddenReply = () =>
    reply.status(403).send(
      buildError({
        code: business_rule,
        message: 'Conta não pode enviar link.',
        request_id: request.id,
      }),
    )
  const notFoundReply = () =>
    reply.status(404).send(
      buildError({
        code: not_found,
        message: 'Recurso não encontrado.',
        request_id: request.id,
      }),
    )

  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    const userId = request.user.sub as string

    if (request.user.tenantId !== tenant.id) {
      return forbiddenReply()
    }

    const user = await repo.findSubmitter(tenant.id, userId)
    if (!user) {
      return notFoundReply()
    }

    if (!canSubmitLink({ ...confirmationFlags(user.identifiers), status: user.status })) {
      return forbiddenReply()
    }

    const [network, niche] = await Promise.all([
      repo.findNetwork(tenant.id, body.networkId),
      repo.findNiche(tenant.id, body.nicheId),
    ])
    if (!network || !niche) {
      return notFoundReply()
    }

    const url = toCanonicalUrl(body.url)
    if (!url) {
      return reply.status(400).send(
        buildError({ code: validation, message: 'URL inválida.', request_id: request.id }),
      )
    }

    const [banned, bannedUrls, niches, terms] = await Promise.all([
      repo.listBannedIdentifiers(tenant.id),
      repo.listBannedUrls(tenant.id),
      repo.listNiches(tenant.id),
      repo.listBlocklistTerms(tenant.id),
    ])

    const refused = preRefuse({
      phoneHistory: user.identifiers.filter((row) => row.kind === 'PHONE').map((row) => row.normalizedValue),
      bannedPhones: banned.phones,
      emailHistory: user.identifiers.filter((row) => row.kind === 'EMAIL').map((row) => row.normalizedValue),
      bannedEmails: banned.emails,
      url,
      bannedUrls,
    }).refused

    const blocklisted = hitsBlocklist({
      text: `${body.name} ${body.description}`,
      selectedNiche: niche.name,
      nicheNames: niches.map((row) => row.name),
      terms,
    })

    let decision: ReturnType<typeof decideSubmission> | undefined
    const link = await repo.createWithinQuota(
      {
        tenantId: tenant.id,
        ownerId: user.id,
        canonicalUrl: url,
        name: body.name,
        description: body.description,
        networkId: network.id,
        nicheId: niche.id,
        otherNote: body.otherNote ?? null,
      },
      (openSlots) => {
        try {
          decision = decideSubmission({
            openSlots,
            networkSlug: network.slug,
            nicheSlug: niche.slug,
            blocklisted,
            preRefused: refused,
          })
        } catch {
          throw new QuotaExhaustedError()
        }
        return decision.status
      },
    )

    const { runAi, occupiesSlot } = decision!
    return reply.status(201).send({
      id: link.id,
      status: link.status,
      runAi,
      occupiesSlot,
      ...(link.status === 'PRE_REJECTED' ? { message: 'Envio não aceito.' } : {}),
    })
  } catch (error) {
    if (error instanceof QuotaExhaustedError) {
      return reply.status(409).send(
        buildError({ code: business_rule, message: 'cota esgotada', request_id: request.id }),
      )
    }
    if (error instanceof ResourceNotFoundError) {
      return notFoundReply()
    }
    throw error
  }
}

export async function linksRoutes(app: FastifyInstance) {
  app.post('/', { onRequest: [verifyJWT] }, createLink)
  app.post('/account/email', { onRequest: [verifyJWT] }, (request, reply) => postGuardedWrite(request, reply, 'account.email'))
  app.post('/account/phone', { onRequest: [verifyJWT] }, (request, reply) => postGuardedWrite(request, reply, 'account.phone'))
  app.patch('/:id', { onRequest: [verifyJWT] }, (request, reply) => postGuardedWrite(request, reply, 'link.update'))
  await registerAppealRoute(app)
}
