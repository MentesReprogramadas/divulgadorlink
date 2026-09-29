import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { buildError, not_found } from '@/http/errors'
import { getLinksRepository } from '@/repositories/links-repository'
import { openPublicLink } from '@/use-cases/@Links/open-public-link'

type GoParams = { linkId: string }

async function goToLink(request: FastifyRequest<{ Params: GoParams }>, reply: FastifyReply) {
  const { linkId } = request.params
  const link = await getLinksRepository().findLinkById(linkId)

  if (!link) {
    return reply.status(404).send(
      buildError({
        code: not_found,
        message: 'Recurso não encontrado.',
        request_id: request.id,
      }),
    )
  }

  const view = openPublicLink(link)
  if (!view.visible) {
    return reply.status(404).send(
      buildError({
        code: not_found,
        message: 'Recurso não encontrado.',
        request_id: request.id,
      }),
    )
  }

  return reply.redirect(link.canonicalUrl)
}

export async function goRoutes(app: FastifyInstance) {
  app.get('/:linkId', goToLink)
}
