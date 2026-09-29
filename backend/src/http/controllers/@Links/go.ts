import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { buildError, not_found } from '@/http/errors'
import { resolveTenant } from '@/http/tenant'
import { getLinksRepository } from '@/repositories/links-repository'
import { openPublicLink } from '@/use-cases/@Links/open-public-link'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

type GoParams = { linkId: string }

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) {
    throw new ResourceNotFoundError()
  }
  return raw.split(':')[0]!
}

async function goToLink(request: FastifyRequest<{ Params: GoParams }>, reply: FastifyReply) {
  const notFound = () =>
    reply.status(404).send(
      buildError({
        code: not_found,
        message: 'Recurso não encontrado.',
        request_id: request.id,
      }),
    )

  let tenantId: string
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    tenantId = tenant.id
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return notFound()
    }
    throw error
  }

  const { linkId } = request.params
  const link = await getLinksRepository().findLinkById(linkId)

  if (!link || link.tenantId !== tenantId) {
    return notFound()
  }

  const view = openPublicLink(link)
  if (!view.visible) {
    return notFound()
  }

  return reply.redirect(link.canonicalUrl)
}

export async function goRoutes(app: FastifyInstance) {
  app.get('/:linkId', goToLink)
}
