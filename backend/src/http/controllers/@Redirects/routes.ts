import * as ownership from '@/repositories/ownership'
import {fetchOwnershipFile,type OwnershipFetch} from '@/adapters/http/ownership-fetch'
import {destinationPoolInput} from '@/domain/redirects/destination-pool'
import * as pools from '@/repositories/destination-pools'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { logDomainEvent } from '@/observability/logger'
import { createRedirectInput, destinationInput, redirectHandle } from '@/domain/redirects/redirect-input'
import { RedirectError } from '@/use-cases/@Redirects/validate-destination'
import { publicContentValidationPorts, type PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
import * as redirects from '@/repositories/redirects-repository'

let ownershipFetch:OwnershipFetch=fetchOwnershipFile
export function setOwnershipFetchForTest(fetcher:OwnershipFetch|null){if(process.env.NODE_ENV==='test')ownershipFetch=fetcher??fetchOwnershipFile}
let testDb: PrismaClient | null = null, testPorts: PublicContentValidationPorts | null = null
export function setRedirectsForTest(db: PrismaClient | null, ports: PublicContentValidationPorts | null = null) { if (process.env.NODE_ENV === 'test') { testDb = db; testPorts = ports } }
type Context = redirects.RedirectActor & { age: boolean; viewerId: string | null; ports: PublicContentValidationPorts }
async function run(q: FastifyRequest, r: FastifyReply, privateRoute: boolean, work: (db: PrismaClient, actor: Context) => Promise<unknown>) {
  r.header('cache-control', 'private, no-store').header('x-robots-tag', 'noindex, nofollow').header('x-content-type-options', 'nosniff')
  try {
    const user = await readAccessUser(q)
    if (privateRoute && (!user || user.typ !== 'access')) throw new RedirectError(401, 'Entre para gerenciar seus convites.')
    const host = normalizeTenantHost(q.headers.host ?? ''), tenant = await resolveTenant(host)
    if (privateRoute && user?.tenantId !== tenant.id) throw new RedirectError(403, 'Acesso negado.')
    return await work(testDb ?? prisma, { tenantId: tenant.id, ownerId: user?.sub ?? '', actorId: q.workspaceActor?.id, viewerId: user?.typ === 'access' && user.tenantId === tenant.id ? user.sub : null, age: q.cookies.age === 'yes', ports: testPorts ?? publicContentValidationPorts(host) })
  } catch (error) {
    const message = error instanceof RedirectError ? error.message : error instanceof ZodError ? 'Confira os campos do convite.' : 'Link permanente não encontrado.'
    const status = error instanceof RedirectError ? error.status : error instanceof ZodError ? 400 : error instanceof ResourceNotFoundError ? 404 : error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code) ? 409 : 500
    if (status === 500) logDomainEvent('redirect.failed', { request_id: q.id, result: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'unexpected' })
    return r.code(status).send({ ...buildError({ code: status === 409 ? 'conflict' : status === 404 ? 'not_found' : status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : status >= 500 ? 'provider_error' : 'validation', message: status >= 500 && status !== 503 ? 'Não foi possível processar o convite. Tente novamente.' : status === 409 && !(error instanceof RedirectError) ? 'Outra alteração concorreu com esta operação. Atualize os dados.' : message, request_id: q.id }), ...(privateRoute && error instanceof RedirectError && error.resource ? { resource: error.resource } : {}) })
  }
}
const params = z.object({ id: redirectHandle })
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + 'T00:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value })
const range = z.object({ from: day.optional(), to: day.optional() }).strict().refine(input => !input.from || !input.to || input.from <= input.to)
export async function redirectsRoutes(app: FastifyInstance) {
  app.get('/me/redirects/:id/ownership',(q,r)=>run(q,r,true,(db,a)=>ownership.readOwnership(db,a,params.parse(q.params).id)))
  app.post('/me/redirects/:id/ownership/challenges',(q,r)=>run(q,r,true,(db,a)=>ownership.createOwnership(db,a,params.parse(q.params).id,z.object({revisionId:z.string().uuid()}).strict().parse(q.body).revisionId)))
  app.post('/me/redirects/:id/ownership/verify',(q,r)=>run(q,r,true,(db,a)=>ownership.verifyOwnership(db,a,params.parse(q.params).id,z.object({challengeId:z.string().uuid()}).strict().parse(q.body).challengeId,ownershipFetch)))
  app.delete('/me/redirects/:id/ownership',(q,r)=>run(q,r,true,(db,a)=>ownership.revokeOwnership(db,a,params.parse(q.params).id)))
  app.get('/redirects/:id/ownership',(q,r)=>run(q,r,false,(db,a)=>ownership.publicOwnership(db,a.tenantId,params.parse(q.params).id,a.age)))

  app.get('/me/redirects/:id/pool',(q,r)=>run(q,r,true,(db,a)=>pools.readDestinationPool(db,a,params.parse(q.params).id)))
  app.put('/me/redirects/:id/pool',(q,r)=>run(q,r,true,(db,a)=>pools.saveDestinationPool(db,a,params.parse(q.params).id,destinationPoolInput.parse(q.body),a.ports)))
  app.patch('/me/redirects/:id/pool/:revisionId',(q,r)=>run(q,r,true,(db,a)=>{const p=z.object({id:redirectHandle,revisionId:z.string().uuid()}).parse(q.params),input=z.object({paused:z.boolean(),expectedVersion:z.number().int().nonnegative()}).strict().parse(q.body);return pools.pausePoolDestination(db,a,p.id,p.revisionId,input.paused,input.expectedVersion,a.ports)}))
  app.delete('/me/redirects/:id/pool',(q,r)=>run(q,r,true,(db,a)=>pools.disableDestinationPool(db,a,params.parse(q.params).id,z.object({expectedVersion:z.number().int().nonnegative()}).strict().parse(q.body).expectedVersion)))
  app.get('/me/redirects', (q, r) => run(q, r, true, (db, actor) => redirects.listRedirects(db, actor, z.object({ cursor: redirectHandle.optional() }).strict().parse(q.query).cursor)))
  app.post('/me/redirects', (q, r) => run(q, r, true, (db, actor) => redirects.changeRedirect(db, actor, null, createRedirectInput.parse(q.body), actor.ports)))
  app.get('/me/redirects/:id', (q, r) => run(q, r, true, (db, actor) => redirects.readRedirect(db, actor, params.parse(q.params).id, range.parse(q.query))))
  app.post('/me/redirects/:id/destinations', (q, r) => run(q, r, true, (db, actor) => redirects.changeRedirect(db, actor, params.parse(q.params).id, destinationInput.parse(q.body), actor.ports)))
  app.post('/me/redirects/:id/disable', (q, r) => run(q, r, true, (db, actor) => redirects.disableRedirect(db, actor, params.parse(q.params).id, z.object({ expectedRevision: z.number().int().nonnegative().max(2147483646) }).strict().parse(q.body).expectedRevision)))
  app.get('/r/:id', (q, r) => run(q, r, false, async (db, actor) => {
    const value = await redirects.resolveRedirect(db, actor.tenantId, params.parse(q.params).id, actor.age, actor.ports, actor.viewerId, new Date(), q.method === 'GET', q.method === 'GET')
    if ('available' in value && value.available) return r.redirect(value.destinationUrl)
    return value
  }))
}
