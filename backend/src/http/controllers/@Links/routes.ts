import { promises as dns } from 'node:dns'
import https from 'node:https'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { signSurface } from '@/domain/analytics/surface-token'
import { documentTitle, facetIndexable, linkRobots, substantiveText } from '@/domain/catalog/index-policy'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { assertPublicHttps, safeFetch, type SafeFetchDeps } from '@/adapters/http/safe-fetch'
import { canonicalUrl } from '@/domain/links/canonical-url'
import { hostMatchesNetwork } from '@/domain/links/network-host'
import { urlAvailability } from '@/domain/links/url-availability'
import { prisma } from '@/lib/prisma'
import { notifyModerationQueue } from '@/adapters/notifications/outbound-mail'
import { currentEmail, getAcquisitionStore, metaContextFrom, startEventId } from '@/use-cases/@Acquisition/record-funnel'
import { DuplicateLinkError, getLinksRepository } from '@/repositories/links-repository'
import { env } from '@/env'
import { buildError, business_rule, forbidden, not_found, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import {
  canSubmitLink,
  confirmationFlags,
  ConfirmIdentifierUseCase,
  generatePlainCode,
  IdentifierChangeForbiddenError,
  PrismaConfirmCodesRepository,
} from '@/use-cases/@Auth/confirm-identifier'
import { compare, hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { enqueueTextProposal } from '@/adapters/queues/enqueue-text-proposal'
import { enqueueModeration } from '@/adapters/queues/enqueue-moderation'
import { editLinkText } from '@/use-cases/@Links/edit-link-text'
import { publicLinkView } from '@/http/public-link-view'
import { decideSubmission } from '@/use-cases/@Links/submit-link'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { preRefuse } from '@/use-cases/@Moderation/pre-refuse'
import { registerAppealRoute } from '@/http/controllers/@Admin/moderation'
import { getModerationCasesRepository } from '@/repositories/moderation-cases-repository'
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

let linkProbeForTest: ((url: string) => Promise<number | null>) | null = null
let queueRecipientsForTest: string[] = []

export function setQueueRecipientsForTest(emails: string[]): void {
  if (process.env.NODE_ENV !== 'test') return
  queueRecipientsForTest = emails
}

async function notifyQueue(tenantId: string, linkName: string, host: string): Promise<void> {
  try {
    const recipients = process.env.NODE_ENV === 'test'
      ? queueRecipientsForTest
      : (await prisma.user.findMany({
        where: { tenantId, role: 'ADMIN', status: 'ACTIVE' },
        include: { identifiers: { where: { kind: 'EMAIL', replacedAt: null, confirmedAt: { not: null } } } },
      })).flatMap((admin) => admin.identifiers.map((row) => row.normalizedValue))
    for (const to of recipients) {
      await notifyModerationQueue({ to, linkName, host, name: 'Tem Link Aqui' })
    }
  } catch {
    // o link já foi gravado; a falha do aviso não desfaz o envio
  }
}

export function setLinkProbeForTest(probe: ((url: string) => Promise<number | null>) | null): void {
  if (process.env.NODE_ENV !== 'test') return
  linkProbeForTest = probe
}

async function probeStatus(raw: string): Promise<number | null> {
  if (process.env.NODE_ENV === 'test') return linkProbeForTest ? linkProbeForTest(raw) : 200
  if (process.env.E2E_LINK_PROBE === 'example.com') {
    const host = new URL(raw).hostname
    if (host === 'example.com' || host.endsWith('.example.com')) return 200
  }
  try {
    const deps: SafeFetchDeps = {
      resolve: (hostname) => dns.resolve(hostname),
      connect: (target) => new Promise((resolve, reject) => {
        const parsed = new URL(target.url)
        const req = https.request({
          host: target.address,
          servername: target.servername,
          method: 'GET',
          path: `${parsed.pathname}${parsed.search}`,
          headers: { host: target.hostname },
          timeout: 5000,
        }, (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            const headers = new Headers()
            for (const [key, value] of Object.entries(res.headers)) {
              if (typeof value === 'string') headers.set(key, value)
              else if (Array.isArray(value)) headers.set(key, value.join(', '))
            }
            resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks) })
          })
        })
        req.on('error', reject)
        req.on('timeout', () => req.destroy(new Error('timeout')))
        req.end()
      }),
    }
    return (await safeFetch(raw, deps)).status
  } catch {
    return null
  }
}

const identifierChange = new ConfirmIdentifierUseCase(new PrismaConfirmCodesRepository(prisma), {
  hashPlain: (plain) => hash(plain, 6),
  compareHash: compare,
  generatePlain: (kind) => generatePlainCode(kind, env.NODE_ENV),
})

const emailChangeSchema = z.object({ email: z.string().email() }).strict()
const phoneChangeSchema = z.object({ phone: z.string().min(8) }).strict()

async function changeIdentifier(request: FastifyRequest, reply: FastifyReply, kind: 'EMAIL' | 'PHONE') {
  const parsed = (kind === 'EMAIL' ? emailChangeSchema : phoneChangeSchema).safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send(buildError({ code: validation, message: 'Dados inválidos.', request_id: request.id }))
  }
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const user = await getLinksRepository().findSubmitter(tenant.id, request.user.sub)
    if (!user) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    if (user.status === 'BANNED') {
      return reply.status(403).send(buildError({ code: business_rule, message: 'Conta não pode alterar o identificador.', request_id: request.id }))
    }
    const raw = kind === 'EMAIL'
      ? (parsed.data as { email: string }).email
      : (parsed.data as { phone: string }).phone
    const result = await identifierChange.beginChange({
      userId: request.user.sub,
      tenantId: tenant.id,
      kind,
      raw,
    })
    return reply.status(200).send({
      emailConfirmed: result.emailConfirmed,
      phoneConfirmed: result.phoneConfirmed,
      canSubmitLink: result.canSubmitLink,
    })
  } catch (error) {
    if (error instanceof IdentifierChangeForbiddenError) {
      return reply.status(403).send(buildError({ code: business_rule, message: error.message, request_id: request.id }))
    }
    if (error instanceof UserAlreadyExistsError) {
      return reply.status(409).send(buildError({ code: business_rule, message: error.message, request_id: request.id }))
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

const editBodySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
}).strict()

let editVerdictForTest: 'PUBLISH' | 'ADMIN' | null = null

export function setEditVerdictForTest(value: 'PUBLISH' | 'ADMIN' | null): void {
  if (process.env.NODE_ENV !== 'test') return
  editVerdictForTest = value
}

export function resetEditVerdictForTest(): void {
  editVerdictForTest = null
}

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
    try {
      assertPublicHttps(url)
    } catch {
      return reply.status(422).send(
        buildError({ code: validation, message: 'URL não permitida.', request_id: request.id }),
      )
    }
    if (!hostMatchesNetwork(new URL(url).hostname, network.knownHosts ?? [])) {
      return reply.status(422).send(
        buildError({ code: validation, message: 'A URL não pertence a essa rede.', request_id: request.id }),
      )
    }
    if (urlAvailability(await probeStatus(url)) === 'dead') {
      return reply.status(422).send(
        buildError({ code: validation, message: 'Não foi possível abrir essa URL.', request_id: request.id }),
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
    const store = getAcquisitionStore()
    const touch = await store.findTouch(user.id)
    await store.stampLink(link.id, touch)
    await store.recordFunnel({
      tenantId: tenant.id,
      eventId: link.id,
      name: 'SubmitLink',
      userId: user.id,
      linkId: link.id,
      meta: metaContextFrom(request, '/painel/links/novo', { externalId: user.id, email: currentEmail(user.identifiers) }),
    })
    if (link.status === 'PENDING_MODERATION') {
      await getModerationCasesRepository().ensureOpen({
        tenantId: tenant.id,
        linkId: link.id,
        source: 'SUBMISSION',
        wasEverPublished: false,
        lastApprovedName: null,
        lastApprovedDescription: null,
        internalSignals: [],
      })
    }
    await notifyQueue(tenant.id, body.name, hostFromRequest(request))
    if (runAi && link.status === 'PENDING_MODERATION') {
      try {
        await enqueueModeration(link.id)
      } catch {
        // A fila humana já foi avisada. Falha da fila da IA não desfaz o envio.
      }
    }
    return reply.status(201).send({
      id: link.id,
      status: link.status,
      runAi,
      occupiesSlot,
      ...(link.status === 'PRE_REJECTED' ? { message: 'Envio não aceito.' } : {}),
    })
  } catch (error) {
    if (error instanceof DuplicateLinkError) {
      return reply.status(409).send(
        buildError({ code: business_rule, message: 'Esse link já está no catálogo.', request_id: request.id }),
      )
    }
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

function linkSeo(input: {
  host: string
  id: string
  name: string
  description: string
  tenantName: string
  robots: ReturnType<typeof linkRobots>
  nicheName: string
  nicheSlug: string
}) {
  const title = documentTitle('named', input.name, input.tenantName)
  const canonical = `https://${input.host}/link/${input.id}`
  const indexable = input.robots.startsWith('index')
  return {
    title,
    description: input.description,
    canonical,
    robots: input.robots,
    openGraph: { title, description: input.description, url: canonical },
    ...(indexable ? {
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: input.name, description: input.description, url: canonical },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: `https://${input.host}/` },
              { '@type': 'ListItem', position: 2, name: input.nicheName, item: `https://${input.host}/nicho/${input.nicheSlug}` },
              { '@type': 'ListItem', position: 3, name: input.name, item: canonical },
            ],
          },
        ],
      },
    } : {}),
  }
}

async function getPublicLink(request: FastifyRequest, reply: FastifyReply) {
  const linkId = (request.params as { id: string }).id
  const missing = () =>
    reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  try {
    const host = hostFromRequest(request)
    const tenant = await resolveTenant(host)
    const repo = getLinksRepository()
    const link = await repo.findLinkById(linkId)
    if (!link || link.tenantId !== tenant.id) return missing()
    if (!(await publicLinkView(link)).visible) {
      return reply.status(200).send({
        id: link.id,
        available: false,
        seo: linkSeo({
          host,
          id: link.id,
          name: 'Indisponível',
          description: 'Indisponível',
          tenantName: tenant.name,
          nicheName: '',
          nicheSlug: '',
          robots: linkRobots({ blocked: true, substantive: false, nicheIndexable: false }),
        }),
      })
    }
    const [network, niche, counts] = await Promise.all([
      repo.findNetwork(tenant.id, link.networkId),
      repo.findNiche(tenant.id, link.nicheId),
      repo.substantiveCounts(tenant.id),
    ])
    const nicheIndexable = niche ? facetIndexable({
      isPublicFacet: niche.isPublicFacet,
      requiresAge: niche.requiresAge,
      summary: niche.summary,
      substantiveCount: counts.niches.find((row) => row.id === niche.id)?.count ?? 0,
    }) : false
    const surfaceToken = signSurface(tenant.id, link.id, 'organic', env.JWT_SECRET)
    return reply.status(200).send({
      id: link.id,
      available: true,
      name: link.name,
      description: link.description,
      network: { name: network?.name ?? '', slug: network?.slug ?? '' },
      niche: { name: niche?.name ?? '', slug: niche?.slug ?? '', requiresAge: niche?.requiresAge ?? false },
      surfaceToken,
      goPath: `/go/${link.id}?surfaceToken=${encodeURIComponent(surfaceToken)}`,
      seo: linkSeo({
        host,
        id: link.id,
        name: link.name,
        description: link.description,
        tenantName: tenant.name,
        nicheName: niche?.name ?? '',
        nicheSlug: niche?.slug ?? '',
        robots: linkRobots({
          substantive: substantiveText(link.name, link.description),
          nicheIndexable,
          blocked: niche?.requiresAge === true,
        }),
      }),
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return missing()
    throw error
  }
}

function pageOf(request: FastifyRequest): { page: number; pageSize: number } {
  const query = request.query as { page?: string; pageSize?: string }
  const page = Number(query.page)
  const pageSize = Number(query.pageSize)
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 24) : 12,
  }
}

async function listMine(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const repo = getLinksRepository()
    const links = await repo.listByOwner(tenant.id, request.user.sub)
    const { page, pageSize } = pageOf(request)
    const start = (page - 1) * pageSize
    const slice = links.slice(start, start + pageSize)
    const audits = getAuditLogsRepository()
    const body = []
    for (const link of slice) {
      const pending = await audits.latest({
        tenantId: tenant.id,
        entityType: 'link',
        entityId: link.id,
        action: 'link.text.proposed',
      })
      const after = pending?.after
      const pendingText = after && typeof after === 'object' && 'name' in after && 'description' in after
        ? { name: String((after as { name: unknown }).name), description: String((after as { description: unknown }).description) }
        : null
      const network = await repo.findNetwork(tenant.id, link.networkId)
      const niche = await repo.findNiche(tenant.id, link.nicheId)
      body.push({
        id: link.id,
        name: link.name,
        description: link.description,
        status: link.status,
        occupiesSlot: link.occupiesSlot,
        canonicalUrl: link.canonicalUrl,
        network: { name: network?.name ?? '', slug: network?.slug ?? '' },
        niche: { name: niche?.name ?? '', slug: niche?.slug ?? '' },
        pendingText,
      })
    }
    return reply.status(200).send({
      links: body,
      page,
      pageSize,
      total: links.length,
      slotsUsed: links.filter((link) => link.occupiesSlot).length,
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function patchLink(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const repo = getLinksRepository()
    const user = await repo.findSubmitter(tenant.id, request.user.sub)
    if (!user) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    if (user.status === 'BANNED') {
      return reply.status(403).send(buildError({ code: business_rule, message: 'Conta não pode alterar o catálogo.', request_id: request.id }))
    }
    const linkId = (request.params as { id: string }).id
    const link = await repo.findLinkById(linkId)
    if (!link || link.tenantId !== tenant.id || link.ownerId !== user.id) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const parsed = editBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(buildError({
        code: validation,
        message: 'Dados inválidos.',
        request_id: request.id,
        issues: parsed.error.format(),
      }))
    }
    if (link.status !== 'PUBLISHED' && link.status !== 'PENDING_MODERATION') {
      return reply.status(409).send(buildError({ code: business_rule, message: 'Link não pode ser editado.', request_id: request.id }))
    }
    const blocklisted = hitsBlocklist({
      text: `${parsed.data.name} ${parsed.data.description}`,
      selectedNiche: '',
      nicheNames: (await repo.listNiches(tenant.id)).map((row) => row.name),
      terms: await repo.listBlocklistTerms(tenant.id),
    })
    if (blocklisted) {
      return reply.status(200).send({
        id: link.id,
        name: link.name,
        description: link.description,
        applied: false,
        ranAi: false,
      })
    }
    if (link.status === 'PENDING_MODERATION') {
      const saved = await repo.updateLinkModeration(link.id, {
        status: link.status,
        occupiesSlot: link.occupiesSlot,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      return reply.status(200).send({
        id: link.id,
        name: saved?.name ?? parsed.data.name,
        description: saved?.description ?? parsed.data.description,
        applied: true,
        ranAi: false,
      })
    }
    const verdict = editVerdictForTest
    const edited = editLinkText({
      publishedName: link.name,
      nextName: parsed.data.name,
      blocklisted: false,
      ai: verdict ?? 'ADMIN',
    })
    const applied = verdict === 'PUBLISH' && edited.visibleName === parsed.data.name
    if (applied) {
      await repo.updateLinkModeration(link.id, {
        status: 'PUBLISHED',
        occupiesSlot: link.occupiesSlot,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      return reply.status(200).send({
        id: link.id,
        name: parsed.data.name,
        description: parsed.data.description,
        applied: true,
        ranAi: edited.ranAi,
      })
    }
    await getAuditLogsRepository().create({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'link.text.proposed',
      entityType: 'link',
      entityId: link.id,
      before: { name: link.name, description: link.description },
      after: { name: parsed.data.name, description: parsed.data.description },
      requestId: request.id,
    })
    await enqueueTextProposal(link.id)
    return reply.status(200).send({
      id: link.id,
      name: link.name,
      description: link.description,
      applied: false,
      ranAi: verdict !== null && edited.ranAi,
      pendingText: { name: parsed.data.name, description: parsed.data.description },
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function submissionStarted(request: FastifyRequest, reply: FastifyReply) {
  const tenant = await resolveTenant(hostFromRequest(request))
  if (request.user.tenantId !== tenant.id) {
    return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
  }
  const eventId = startEventId(request.user.sub)
  const result = await getAcquisitionStore().recordFunnel({
    tenantId: tenant.id,
    eventId,
    name: 'StartLinkSubmission',
    userId: request.user.sub,
    linkId: null,
    meta: metaContextFrom(request, '/painel/links/novo', { externalId: request.user.sub }),
  })
  return reply.status(200).send({ eventId, recorded: result === 'inserted' })
}

export async function linksRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [verifyJWT] }, createLink)
  app.get('/submission-started', { onRequest: [verifyJWT] }, submissionStarted)
  app.get('/mine', { onRequest: [verifyJWT] }, listMine)
  app.get('/:id', getPublicLink)
  app.post('/account/email', { onRequest: [verifyJWT] }, (request, reply) => changeIdentifier(request, reply, 'EMAIL'))
  app.post('/account/phone', { onRequest: [verifyJWT] }, (request, reply) => changeIdentifier(request, reply, 'PHONE'))
  app.patch('/:id', { onRequest: [verifyJWT] }, patchLink)
  await registerAppealRoute(app)
}
