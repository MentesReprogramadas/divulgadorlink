import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { RenewalReminderError, renewalPreferences, readRenewalReminders } from '@/use-cases/@Notifications/renewal-reminders'

let testDb: PrismaClient | null = null
export function setRenewalReminderDbForTest(db: PrismaClient | null): void { if (process.env.NODE_ENV === 'test') testDb = db }
async function actor(request: FastifyRequest, reply: FastifyReply, action: (input: { tenantId: string; actorId: string; requestId: string }) => Promise<unknown>) {
  reply.header('cache-control', 'private, no-store')
  const user = await readAccessUser(request)
  if (!user || user.typ !== 'access') return reply.code(401).send(buildError({ code: 'unauthenticated', message: 'Não autenticado.', request_id: request.id }))
  const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0]!)
  if (user.tenantId !== tenant.id) return reply.code(403).send(buildError({ code: 'forbidden', message: 'Acesso negado.', request_id: request.id }))
  try { return await action({ tenantId: tenant.id, actorId: user.sub, requestId: request.id }) }
  catch (error) {
    if (!(error instanceof RenewalReminderError)) throw error
    return reply.code(error.status).send(buildError({ code: error.status === 409 ? 'conflict' : 'not_found', message: error.message, request_id: request.id }))
  }
}
export async function renewalReminderRoutes(app: FastifyInstance) {
  app.get('/me/notification-preferences', (request, reply) => actor(request, reply, input => renewalPreferences(testDb ?? prisma, input)))
  app.patch('/me/notification-preferences', (request, reply) => actor(request, reply, input => renewalPreferences(testDb ?? prisma, input, z.object({ emailRenewal: z.boolean(), expectedVersion: z.number().int().nonnegative().max(2147483646) }).strict().parse(request.body))))
  app.get('/promotions/mine/reminders', (request, reply) => actor(request, reply, input => readRenewalReminders(testDb ?? prisma, input)))
}

export {actor as withNotificationActor}
