import {changeCollectionPublication,publicCollection} from '@/repositories/public-collections'
import {collectionPublicationInput} from '@/domain/collections/public-collection'
import {publicContentValidationPorts,type PublicContentValidationPorts} from '@/use-cases/public-content-validation-ports'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { favoritesOperation } from '@/repositories/favorites-repository'
import { FavoritesError } from '@/domain/collections/favorites'
import { logDomainEvent } from '@/observability/logger'

let testDb: PrismaClient | null = null, testPorts:PublicContentValidationPorts|null=null
export function setCollectionsPortsForTest(ports:PublicContentValidationPorts|null){if(process.env.NODE_ENV==='test')testPorts=ports}
export function setFavoritesDbForTest(db: PrismaClient | null) { if (process.env.NODE_ENV === 'test') testDb = db }
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), version = z.number().int().nonnegative().max(2147483646)
const pagination = z.object({ cursor: id.optional() }).strict()
type Operation = Parameters<typeof favoritesOperation>[2]
async function run(request: FastifyRequest, reply: FastifyReply, operation: () => Operation, publication?: {id:string;expected:number;input: z.infer<typeof collectionPublicationInput>|null}) {
  reply.header('cache-control', 'private, no-store')
  const user = await readAccessUser(request)
  if (!user || user.typ !== 'access') return reply.code(401).send(buildError({ code: 'unauthenticated', message: 'Entre para guardar seus favoritos.', request_id: request.id }))
  const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
  if (user.tenantId !== tenant.id) return reply.code(403).send(buildError({ code: 'forbidden', message: 'Acesso negado.', request_id: request.id }))
  try { if(publication)return await changeCollectionPublication(testDb??prisma,{tenantId:tenant.id,userId:user.sub,actorId:request.workspaceActor?.id},publication.id,publication.expected,publication.input,testPorts??publicContentValidationPorts(normalizeTenantHost(request.headers.host??''))); return await favoritesOperation(testDb ?? prisma, { tenantId: tenant.id, userId: user.sub, age: request.cookies.age === 'yes' }, operation()) }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.code(409).send(buildError({ code: 'conflict', message: 'Identificador já utilizado. Atualize os dados.', request_id: request.id }))
    if (error instanceof ZodError) throw error
    if (!(error instanceof FavoritesError)) {
      // Prisma errors may embed private names or SQL parameters; keep those out of traces/logs.
      logDomainEvent('favorites.failed', { request_id: request.id, result: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'unexpected' })
      throw new Error('Falha de persistência em favoritos.')
    }
    return reply.code(error.status).send(buildError({ code: error.status === 409 ? 'conflict' : error.status === 400 ? 'validation' : error.status === 403 ? 'forbidden' : 'not_found', message: error.message, request_id: request.id }))
  }
}
export async function favoritesRoutes(app: FastifyInstance) {
  app.post('/me/collections/:id/publish',(q,r)=>{const input=collectionPublicationInput.parse(q.body);return run(q,r,()=>({kind:'list-collections'}),{id:z.object({id}).parse(q.params).id,expected:input.expectedVersion,input})})
  app.patch('/me/collections/:id/visibility',(q,r)=>{const input=z.object({expectedVersion:version,visibility:z.literal('PRIVATE')}).strict().parse(q.body);return run(q,r,()=>({kind:'list-collections'}),{id:z.object({id}).parse(q.params).id,expected:input.expectedVersion,input:null})})
  app.get('/collections/:slug',async(q,r)=>{r.header('cache-control','private, no-store');const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''));try{return await publicCollection(testDb??prisma,tenant.id,z.object({slug:z.string().regex(/^[a-z0-9-]{3,40}$/)}).parse(q.params).slug,q.cookies.age==='yes')}catch(error){if(error instanceof FavoritesError)return r.code(error.status).send(buildError({code:'not_found',message:error.message,request_id:q.id}));throw error}})

  app.get('/me/favorites', (q, r) => run(q, r, () => ({ kind: 'list-favorites', ...pagination.parse(q.query) })))
  for (const method of ['GET', 'PUT', 'DELETE'] as const) app.route({ method, url: '/me/favorites/:linkId', handler: (q, r) => run(q, r, () => ({ kind: 'favorite', method, ...z.object({ linkId: id }).parse(q.params) })) })
  app.get('/me/collections', (q, r) => run(q, r, () => ({ kind: 'list-collections', ...pagination.parse(q.query) })))
  app.post('/me/collections', (q, r) => run(q, r, () => ({ kind: 'create', ...z.object({ id: z.string().uuid(), name: z.string().max(200) }).strict().parse(q.body) })))
  app.get('/me/collections/:id', (q, r) => run(q, r, () => ({ kind: 'collection', ...z.object({ id }).parse(q.params), ...pagination.parse(q.query) })))
  app.patch('/me/collections/:id', (q, r) => run(q, r, () => ({ kind: 'rename', ...z.object({ id }).parse(q.params), ...z.object({ name: z.string().max(200), expectedVersion: version }).strict().parse(q.body) })))
  app.delete('/me/collections/:id', (q, r) => run(q, r, () => ({ kind: 'delete', ...z.object({ id }).parse(q.params), ...z.object({ expectedVersion: z.coerce.number().pipe(version) }).strict().parse(q.query) })))
  for (const method of ['PUT', 'DELETE', 'PATCH'] as const) app.route({ method, url: '/me/collections/:id/items/:favoriteId', handler: (q, r) => run(q, r, () => {
    const body = method === 'PATCH' ? z.object({ expectedVersion: version, move: z.enum(['up', 'down']) }).strict().parse(q.body) : z.object({ expectedVersion: version }).strict().parse(q.body)
    return { kind: 'item', method, ...z.object({ id, favoriteId: id }).parse(q.params), ...body }
  }) })
}
