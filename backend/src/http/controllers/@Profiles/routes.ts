import { avatarContentType } from '@/domain/profiles/avatar-webp'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { ProfileError } from '@/domain/profiles/profile'
import { profileInput, profileVersion } from '@/domain/profiles/profile-input'
import { logDomainEvent } from '@/observability/logger'
import * as profiles from '@/repositories/profiles-repository'
import { profileValidationPorts, type ProfileValidationPorts } from '@/use-cases/@Profiles/validate-profile'
let testDb: PrismaClient | null = null, testPorts: ProfileValidationPorts | null = null
export function setProfilesForTest(db: PrismaClient | null, ports: ProfileValidationPorts | null = null) { if (process.env.NODE_ENV === 'test') { testDb = db; testPorts = ports } }
type Context = { tenantId: string; ownerId: string; age: boolean }
async function run(q: FastifyRequest, r: FastifyReply, privateRoute: boolean, work: (db: PrismaClient, actor: Context) => Promise<unknown>) {
  r.header('cache-control', 'private, no-store').header('x-content-type-options', 'nosniff')
  try {
    const user = await readAccessUser(q)
    if (privateRoute && (!user || user.typ !== 'access')) throw new ProfileError(401, 'Entre para editar seu perfil.')
    const tenant = await resolveTenant(normalizeTenantHost(q.headers.host ?? ''))
    if (privateRoute && user?.tenantId !== tenant.id) throw new ProfileError(403, 'Acesso negado.')
    return await work(testDb ?? prisma, { tenantId: tenant.id, ownerId: user?.sub ?? '', age: q.cookies.age === 'yes' })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return r.code(404).send(buildError({ code: 'not_found', message: 'Perfil não encontrado.', request_id: q.id }))
    if (error instanceof ZodError) return r.code(400).send(buildError({ code: 'validation', message: 'Confira os campos do perfil.', request_id: q.id }))
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return r.code(409).send(buildError({ code: 'conflict', message: 'Esse endereço já está em uso. Escolha outro.', request_id: q.id }))
    if (error instanceof ProfileError) return r.code(error.status).send(buildError({ code: error.status === 409 ? 'conflict' : error.status === 404 ? 'not_found' : error.status === 401 ? 'unauthenticated' : error.status === 403 ? 'forbidden' : error.status === 503 ? 'provider_error' : 'validation', message: error.message, request_id: q.id }))
    logDomainEvent('profile.failed', { request_id: q.id, result: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'unexpected' })
    throw new Error('Falha ao processar perfil.')
  }
}
const expected = z.object({ expectedVersion: profileVersion }).strict()
const slugParams = z.object({ slug: z.string().regex(/^[a-z0-9-]{3,40}$/) })
const asset = z.string().regex(/^[a-f0-9]{64}$/)
export async function profilesRoutes(app: FastifyInstance) {
  app.get('/me/profile', (q, r) => run(q, r, true, (db, actor) => profiles.readProfile(db, actor)))
  app.patch('/me/profile', (q, r) => run(q, r, true, (db, actor) => {
    const input = z.object({ expectedVersion: profileVersion, content: profileInput }).strict().parse(q.body)
    return profiles.saveProfile(db, actor, input.content, input.expectedVersion)
  }))
  app.get('/me/profile/preview', (q, r) => run(q, r, true, (db, actor) => profiles.previewProfile(db, actor)))
  app.post('/me/profile/publish', (q, r) => run(q, r, true, (db, actor) => profiles.publishProfile(db, actor, expected.parse(q.body).expectedVersion, testPorts ?? profileValidationPorts(normalizeTenantHost(q.headers.host ?? '')))))
  app.post('/me/profile/unpublish', (q, r) => run(q, r, true, (db, actor) => profiles.unpublishProfile(db, actor, expected.parse(q.body).expectedVersion)))
  app.post('/me/profile/discard', (q, r) => run(q, r, true, (db, actor) => profiles.discardProfile(db, actor, expected.parse(q.body).expectedVersion)))
  app.post('/me/profile/avatar', (q, r) => run(q, r, true, (db, actor) => profiles.uploadProfileAvatar(db, actor, z.object({ base64: z.string().max(349528) }).strict().parse(q.body).base64)))
  app.get('/me/profile/avatar/:id', (q, r) => run(q, r, true, async (db, actor) => { const bytes = await profiles.profileAvatar(db, actor, z.object({ id: asset }).parse(q.params).id); return r.type(avatarContentType(bytes)).send(bytes) }))
  app.get('/profiles/:slug', (q, r) => run(q, r, false, (db, actor) => profiles.publicProfile(db, actor.tenantId, slugParams.parse(q.params).slug, actor.age)))
  app.get('/profiles/:slug/avatar/:id', (q, r) => run(q, r, false, async (db, actor) => { const p = slugParams.extend({ id: asset }).parse(q.params); const bytes = await profiles.profileAvatar(db, actor, p.id, p.slug); return r.type(avatarContentType(bytes)).send(bytes) }))
}
