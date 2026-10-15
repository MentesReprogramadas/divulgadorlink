import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { parseEvolutionMessage, secretEquals } from '@/domain/notifications/evolution-command'
import { authorizedOperator, evolutionConfiguration, evolutionConnection, EVOLUTION_SETTINGS_KEY, quotedReviewReference } from '@/use-cases/@Notifications/evolution-operations'
import { enqueueEvolutionCycle } from '@/adapters/queues/enqueue-evolution'

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0]!)
  if (request.user.tenantId !== tenant.id) { reply.code(403).send({ message: 'Acesso negado.' }); return null }
  const admin = await prisma.user.findFirst({ where: { id: request.user.sub, tenantId: tenant.id, role: 'ADMIN', status: 'ACTIVE' } })
  if (!admin) { reply.code(404).send({ message: 'Recurso não encontrado.' }); return null }
  return tenant
}

export async function registerEvolutionRoutes(app: FastifyInstance) {
  app.post('/integrations/evolution/webhook', { bodyLimit: 64 * 1024 }, async (request, reply) => {
    const supplied = request.headers['x-evolution-secret']
    if (!env.EVOLUTION_WEBHOOK_AUTH_SECRET || typeof supplied !== 'string' || !secretEquals(supplied, env.EVOLUTION_WEBHOOK_AUTH_SECRET)) return reply.code(401).send({ accepted: false })
    const tenant = await prisma.tenant.findUnique({ where: { host: env.TENANT_HOST } })
    const config = tenant ? await evolutionConfiguration(prisma, tenant.id) : null
    if (!tenant || !config?.actionsEnabled) return reply.code(200).send({ accepted: false })
    const message = parseEvolutionMessage(request.body, { instance: config.instance, group: config.group })
    if (!message) return reply.code(200).send({ accepted: false })
    if (!await authorizedOperator(prisma, tenant.id, message.sender)) return reply.code(403).send({ accepted: false })
    let reference = message.command.reference
    if (message.quotedMessageId) {
      const quoted = await quotedReviewReference(prisma, tenant.id, message.quotedMessageId, config.secret)
      if (!quoted || (reference && reference !== quoted)) return reply.code(200).send({ accepted: false })
      reference = quoted
    }
    await prisma.evolutionReceipt.upsert({ where: { instance_providerMessageId: { instance: config.instance, providerMessageId: message.messageId } },
      create: { tenantId: tenant.id, instance: config.instance, providerMessageId: message.messageId, sender: message.sender, reference, decision: message.command.decision, reason: message.command.reason }, update: {},
    })
    void enqueueEvolutionCycle().catch(() => undefined) // durable receipt is drained after Redis recovers
    return reply.code(200).send({ accepted: true })
  })

  app.get('/admin/integrations/evolution/status', { onRequest: [verifyJWT] }, async (request, reply) => {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const config = await evolutionConfiguration(prisma, tenant.id)
    const messages = await prisma.operationalMessage.findMany({ where: { tenantId: tenant.id, kind: { not: 'MODERATION_EMAIL' } }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, kind: true, state: true, attempts: true, lastErrorCode: true, createdAt: true, providerMessageId: true } })
    const backlog = await prisma.operationalMessage.count({ where: { tenantId: tenant.id, state: { in: ['PENDING', 'RETRY', 'UNCERTAIN', 'DEAD'] }, kind: { not: 'MODERATION_EMAIL' } } })
    const operators = await prisma.evolutionOperator.findMany({ where: { tenantId: tenant.id }, select: { phone: true, enabled: true, userId: true } })
    const connection = config?.configured ? await evolutionConnection(config) : 'unknown'
    return { connection, checkedAt: new Date().toISOString(), configured: config?.configured ?? false, enabled: config?.enabled ?? false, actionsEnabled: config?.actionsEnabled ?? false, instance: config?.instance ?? '', group: config?.group ?? '', backlog, messages, operators, allowedPhones: config?.phones ?? [], version: (await prisma.config.findUnique({ where: { tenantId_key: { tenantId: tenant.id, key: EVOLUTION_SETTINGS_KEY } } }))?.updatedAt.toISOString() ?? null }
  })

  app.patch('/admin/integrations/evolution/settings', { onRequest: [verifyJWT] }, async (request, reply) => {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const body = z.object({ enabled: z.boolean(), actionsEnabled: z.boolean(), version: z.string().nullable() }).strict().parse(request.body)
    const config = await evolutionConfiguration(prisma, tenant.id)
    if (body.enabled && !config?.configured) return reply.code(409).send({ message: 'Configure a integração no servidor antes de ativar.' })
    const changed = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenant.id} FOR UPDATE`
      const existing = await tx.config.findUnique({ where: { tenantId_key: { tenantId: tenant.id, key: EVOLUTION_SETTINGS_KEY } } })
      if ((existing?.updatedAt.toISOString() ?? null) !== body.version) return false
      const value = JSON.stringify({ enabled: body.enabled, actionsEnabled: body.actionsEnabled })
      await tx.config.upsert({ where: { tenantId_key: { tenantId: tenant.id, key: EVOLUTION_SETTINGS_KEY } }, create: { tenantId: tenant.id, key: EVOLUTION_SETTINGS_KEY, value }, update: { value } })
      await tx.auditLog.create({ data: { tenantId: tenant.id, actorId: request.user.sub, action: 'evolution.settings', entityType: 'Integration', entityId: tenant.id, after: { enabled: body.enabled, actionsEnabled: body.actionsEnabled } } })
      return true
    })
    return changed ? { saved: true } : reply.code(409).send({ message: 'Configuração alterada. Atualize a página.' })
  })

  app.post('/admin/integrations/evolution/operators/:phone', { onRequest: [verifyJWT] }, async (request, reply) => {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const phone = (request.params as { phone: string }).phone
    const { enabled } = z.object({ enabled: z.boolean() }).strict().parse(request.body)
    const config = await evolutionConfiguration(prisma, tenant.id)
    if (!config?.phones.includes(phone)) return reply.code(400).send({ message: 'Número não autorizado na configuração do servidor.' })
    await prisma.$transaction(async tx => {
      await tx.evolutionOperator.upsert({ where: { tenantId_phone: { tenantId: tenant.id, phone } }, create: { tenantId: tenant.id, phone, userId: request.user.sub, enabled }, update: { userId: request.user.sub, enabled } })
      await tx.auditLog.create({ data: { tenantId: tenant.id, actorId: request.user.sub, action: 'evolution.operator', entityType: 'Integration', entityId: tenant.id, after: { enabled, operatorSuffix: phone.slice(-4) } } })
    })
    return { saved: true }
  })

  app.post('/admin/integrations/evolution/deliveries/:id/retry', { onRequest: [verifyJWT] }, async (request, reply) => {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const body = z.object({ confirmUncertain: z.boolean().default(false) }).strict().parse(request.body)
    const id = (request.params as { id: string }).id
    const result = await prisma.$transaction(async tx => {
      const row = await tx.operationalMessage.findFirst({ where: { id, tenantId: tenant.id, kind: { not: 'MODERATION_EMAIL' } } })
      if (!row || !['RETRY', 'DEAD', 'UNCERTAIN'].includes(row.state)) return 404
      if (row.state === 'UNCERTAIN' && !body.confirmUncertain) return 409
      const claimed = await tx.operationalMessage.updateMany({ where: { id, state: row.state, updatedAt: row.updatedAt }, data: { state: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastErrorCode: null } })
      if (!claimed.count) return 409
      await tx.auditLog.create({ data: { tenantId: tenant.id, actorId: request.user.sub, action: 'evolution.retry', entityType: 'OperationalMessage', entityId: id, after: { previousState: row.state, confirmed: body.confirmUncertain } } })
      return 200
    })
    if (result !== 200) return reply.code(result).send({ message: 'Confirme a entrega incerta ou atualize a página.' })
    void enqueueEvolutionCycle().catch(() => undefined)
    return { queued: true }
  })
}
