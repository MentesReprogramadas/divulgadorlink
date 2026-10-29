import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@/lib/prisma'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { resolveTenant, normalizeTenantHost } from '@/http/tenant'

export async function requireAffiliateAdmin(request: FastifyRequest, reply: FastifyReply) {
  reply.header('cache-control','private, no-store')
  const user = await readAccessUser(request)
  if (!user || user.typ !== 'access') {reply.code(401).send({message:'Entre para continuar.'});return null}
  // The affiliate operation is not delegated through a support or shared workspace session.
  if (request.supportUser || request.workspaceActor) {reply.code(403).send({message:'Abra sua própria conta administrativa.'});return null}
  const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
  if (user.tenantId !== tenant.id || !await prisma.user.findFirst({where:{id:user.sub,tenantId:tenant.id,role:'ADMIN',status:'ACTIVE'},select:{id:true}})) {
    reply.code(403).send({message:'Acesso negado.'});return null
  }
  return tenant
}
