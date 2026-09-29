import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { linkMachine, transition } from '@/domain/state/transition'
import { authorize } from '@/http/authorize'
import {
  authorizeDenialCode,
  buildError,
  business_rule,
  forbidden,
  not_found,
  validation,
} from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import {
  getModerationCasesRepository,
  InMemoryModerationCasesRepository,
} from '@/repositories/moderation-cases-repository'
import { getLinksRepository } from '@/repositories/links-repository'
import { appeal } from '@/use-cases/@Moderation/appeal'
import { decideCase } from '@/use-cases/@Moderation/decide-case'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export const appealBodySchema = z.object({ text: z.string() }).strict()

export const decideModerationBodySchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    name: z.string().optional(),
    description: z.string().optional(),
    networkId: z.string().optional(),
    nicheId: z.string().optional(),
    reason: z.string().optional(),
    newNiche: z
      .object({
        name: z.string(),
        kind: z.enum(['SCAM', 'PERSONAL_DATA', 'MINOR', 'NORMAL']).optional(),
        requiresAge: z.boolean(),
      })
      .optional(),
  })
  .strict()

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) {
    throw new ResourceNotFoundError()
  }
  return raw.split(':')[0]!
}

function denialStatus(code: typeof forbidden | typeof not_found): number {
  return code === forbidden ? 403 : 404
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function postLinkAppeal(request: FastifyRequest, reply: FastifyReply) {
  const parsed = appealBodySchema.safeParse(request.body)
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

  const linkId = (request.params as { id: string }).id
  const linksRepo = getLinksRepository()
  const casesRepo = getModerationCasesRepository()

  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(
        buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }),
      )
    }

    const link = await linksRepo.findLinkById(linkId)
    if (!link || link.tenantId !== tenant.id) {
      return reply.status(404).send(
        buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }),
      )
    }

    const authorizeContext = {
      actorId: request.user.sub,
      tenantId: request.user.tenantId,
      ownerId: link.ownerId ?? '',
      resourceTenantId: tenant.id,
      role: 'USER' as const,
      action: 'link.appeal',
    }
    if (!link.ownerId || !authorize(authorizeContext)) {
      const code = authorizeDenialCode(authorizeContext)
      return reply.status(denialStatus(code)).send(
        buildError({
          code,
          message: code === forbidden ? 'Acesso negado.' : 'Recurso não encontrado.',
          request_id: request.id,
        }),
      )
    }

    let moderationCase = await casesRepo.findOpenByLinkId(linkId)
    if (!moderationCase) {
      moderationCase = await casesRepo.create({
        tenantId: tenant.id,
        linkId,
        source: 'PRE_REFUSAL',
        wasEverPublished: link.everPublished,
        lastApprovedName: link.lastApprovedName,
        lastApprovedDescription: link.lastApprovedDescription,
        internalSignals: [],
      })
    }

    if (moderationCase.appealed) {
      return reply.status(409).send(
        buildError({ code: business_rule, message: 'contestação uma vez', request_id: request.id }),
      )
    }

    if (link.status !== 'PRE_REJECTED') {
      return reply.status(403).send(
        buildError({ code: business_rule, message: 'Link não pode ser contestado.', request_id: request.id }),
      )
    }

    try {
      const outcome = appeal({ alreadyAppealed: false, text: parsed.data.text })
      transition(linkMachine, link.status, outcome.status)
      const saved = await casesRepo.saveAppeal(moderationCase.id, parsed.data.text)
      if (!saved) {
        return reply.status(409).send(
          buildError({ code: business_rule, message: 'contestação uma vez', request_id: request.id }),
        )
      }
      await linksRepo.updateLinkModeration(linkId, { status: outcome.status, occupiesSlot: true })
      return reply.status(200).send({ status: outcome.status })
    } catch (error) {
      if (error instanceof Error && /uma vez|texto/.test(error.message)) {
        return reply.status(409).send(
          buildError({ code: business_rule, message: error.message, request_id: request.id }),
        )
      }
      throw error
    }
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function postAdminModerationDecision(request: FastifyRequest, reply: FastifyReply) {
  const parsed = decideModerationBodySchema.safeParse(request.body)
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

  const caseId = (request.params as { id: string }).id
  const body = parsed.data
  const linksRepo = getLinksRepository()
  const casesRepo = getModerationCasesRepository()
  const auditRepo = getAuditLogsRepository()

  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    const moderationCase = await casesRepo.findById(caseId)
    if (!moderationCase || moderationCase.tenantId !== tenant.id || moderationCase.closed) {
      return reply.status(404).send(
        buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }),
      )
    }

    const role = request.user.role === 'ADMIN' ? 'ADMIN' : 'USER'
    const authorizeContext = {
      actorId: request.user.sub,
      tenantId: request.user.tenantId,
      ownerId: moderationCase.id,
      resourceTenantId: tenant.id,
      role,
      action: 'moderation.decide',
    }
    if (!authorize(authorizeContext)) {
      const code = authorizeDenialCode(authorizeContext)
      return reply.status(denialStatus(code)).send(
        buildError({
          code,
          message: code === forbidden ? 'Acesso negado.' : 'Recurso não encontrado.',
          request_id: request.id,
        }),
      )
    }

    const link = await linksRepo.findLinkById(moderationCase.linkId)
    if (!link || link.tenantId !== tenant.id) {
      return reply.status(404).send(
        buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }),
      )
    }

    const niches = await linksRepo.listNiches(tenant.id)
    const selectedNiche = niches.find((row) => row.id === (body.nicheId ?? link.nicheId))
    const internalSignals = [...moderationCase.internalSignals]
    const nextDescription = body.description ?? link.description
    const nextName = body.name ?? link.name
    if (
      hitsBlocklist({
        text: `${nextName} ${nextDescription}`,
        selectedNiche: selectedNiche?.name ?? '',
        nicheNames: niches.map((row) => row.name),
        terms: [],
      })
    ) {
      if (!internalSignals.includes('niche_mismatch')) internalSignals.push('niche_mismatch')
    }

    const creatingNiche = Boolean(body.newNiche)
    let targetNicheId = body.nicheId ?? link.nicheId

    let decisionResult: ReturnType<typeof decideCase>
    try {
      decisionResult = decideCase({
        decision: body.decision,
        url: link.canonicalUrl,
        creatingNiche,
        nicheKind: body.newNiche?.kind ?? 'NORMAL',
        requiresAge: body.newNiche?.requiresAge,
        wasPublished: moderationCase.wasEverPublished || link.everPublished,
      })
    } catch (error) {
      return reply.status(400).send(
        buildError({
          code: business_rule,
          message: error instanceof Error ? error.message : 'decisão inválida',
          request_id: request.id,
        }),
      )
    }

    if (body.newNiche) {
      const created = await linksRepo.createNiche({
        tenantId: tenant.id,
        name: body.newNiche.name,
        slug: slugify(body.newNiche.name),
        requiresAge: body.newNiche.requiresAge,
      })
      targetNicheId = created.id
    }

    const before = {
      status: link.status,
      name: link.name,
      description: link.description,
      canonicalUrl: link.canonicalUrl,
      nicheId: link.nicheId,
      occupiesSlot: link.occupiesSlot,
    }

    if (link.status !== decisionResult.status) {
      transition(linkMachine, link.status, decisionResult.status)
    }

    const patch: Parameters<typeof linksRepo.updateLinkModeration>[1] = {
      status: decisionResult.status,
      occupiesSlot: decisionResult.occupiesSlot,
    }

    if (body.decision === 'APPROVE') {
      if (body.name) patch.name = body.name
      if (body.description) patch.description = body.description
      if (body.networkId) patch.networkId = body.networkId
      patch.nicheId = targetNicheId
    } else if (decisionResult.status === 'PUBLISHED') {
      patch.name = moderationCase.lastApprovedName ?? link.lastApprovedName ?? link.name
      patch.description =
        moderationCase.lastApprovedDescription ?? link.lastApprovedDescription ?? link.description
    }

    const updated = await linksRepo.updateLinkModeration(link.id, patch)
    if (decisionResult.requiresAge && targetNicheId) {
      await linksRepo.updateNicheFacet({
        id: targetNicheId,
        tenantId: tenant.id,
        isPublicFacet: false,
      })
    }

    if (casesRepo instanceof InMemoryModerationCasesRepository) {
      const stored = casesRepo.cases.find((row) => row.id === caseId)
      if (stored) stored.internalSignals = internalSignals
    }
    await casesRepo.close(caseId)

    const after = {
      status: updated?.status ?? decisionResult.status,
      name: updated?.name ?? patch.name ?? link.name,
      description: updated?.description ?? patch.description ?? link.description,
      canonicalUrl: link.canonicalUrl,
      nicheId: updated?.nicheId ?? link.nicheId,
      occupiesSlot: decisionResult.occupiesSlot,
      reason: body.reason ?? null,
    }

    await auditRepo.create({
      tenantId: tenant.id,
      actorId: request.user.sub,
      action: 'moderation.decide',
      entityType: 'ModerationCase',
      entityId: caseId,
      before,
      after,
      requestId: request.id,
    })

    return reply.status(200).send({
      id: caseId,
      linkId: link.id,
      status: updated?.status ?? decisionResult.status,
      url: link.canonicalUrl,
      occupiesSlot: decisionResult.occupiesSlot,
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function registerModerationRoutes(app: FastifyInstance) {
  app.post('/admin/moderation/:id', { onRequest: [verifyJWT] }, postAdminModerationDecision)
}

export async function registerAppealRoute(app: FastifyInstance) {
  app.post('/:id/appeal', { onRequest: [verifyJWT] }, postLinkAppeal)
}
