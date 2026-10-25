import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { LinkMediaError, linkMediaWidth, prepareLinkMedia, resizeLinkMedia, type LinkMediaKind } from '@/domain/links/link-media'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { mutateLinkMedia, linkMediaDatabase, type LinkMediaActor } from '@/repositories/link-media'

const database = linkMediaDatabase

async function actor(request: FastifyRequest, admin = false): Promise<LinkMediaActor> {
  const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
  if (request.user.tenantId !== tenant.id || admin && request.user.role !== 'ADMIN') throw new LinkMediaError(403, 'Acesso negado.')
  const user = await database().user.findFirst({ where: { id: request.user.sub, tenantId: tenant.id, status: 'ACTIVE', ...(admin ? { role: 'ADMIN' as const } : {}) }, select: { id: true } })
  if (!user) throw new LinkMediaError(403, 'Conta indisponível.')
  return { tenantId: tenant.id, ownerId: user.id, admin, auditActorId: request.workspaceActor?.id ?? user.id }
}
async function safe(reply: FastifyReply, run: () => Promise<unknown>) {
  reply.header('cache-control', 'private, no-store')
  try { return await run() } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: 'Recurso não encontrado.' })
    if (error instanceof LinkMediaError) return reply.status(error.status).send({ message: error.message })
    if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Confira os dados do anexo.' })
    throw error
  }
}
function binary(reply: FastifyReply, bytes: Uint8Array) { return reply.header('cache-control', 'private, no-store').header('x-content-type-options', 'nosniff').type('image/webp').send(Buffer.from(bytes)) }
const version = z.number().int().min(0)
const params = z.object({ id: z.string().min(1), kind: z.enum(['icon','image']) })
const kindOf = (kind: 'icon' | 'image'): LinkMediaKind => kind === 'icon' ? 'ICON' : 'IMAGE'

export async function registerLinkMediaRoutes(app: FastifyInstance) {
  app.get('/:id/media', { onRequest: [verifyJWT] }, (request, reply) => safe(reply, async () => {
    const a = await actor(request), { id } = request.params as { id: string }
    const link = await database().link.findFirst({ where: { id, tenantId: a.tenantId, ownerId: a.ownerId }, select: { mediaVersion: true, media: { select: { id: true, kind: true, status: true, alt: true, revision: true } } } })
    if (!link) throw new LinkMediaError(404, 'Link não encontrado.')
    const reviews = []
    for (const kind of ['ICON','IMAGE']) {
      const latest = await database().auditLog.findFirst({where:{tenantId:a.tenantId,entityType:'link',entityId:id,action:{in:['link.media.propose','link.media.remove','link.media.approve','link.media.reject']},after:{path:['kind'],equals:kind}},orderBy:{createdAt:'desc'},select:{action:true,after:true,createdAt:true}})
      if (latest?.action === 'link.media.reject' && latest.after && typeof latest.after === 'object' && !Array.isArray(latest.after)) reviews.push({kind,reason:typeof latest.after.reason==='string'?latest.after.reason:'Anexo não aprovado.',createdAt:latest.createdAt})
    }
    return { version: link.mediaVersion, assets: link.media.map(row => ({ ...row, url: `/api/v1/links/${id}/media/private/${row.id}` })), reviews }
  }))
  app.get('/:id/media/private/:assetId', { onRequest: [verifyJWT] }, (request, reply) => safe(reply, async () => {
    const a=await actor(request), p=request.params as { id: string; assetId: string }
    const asset=await database().linkMediaAsset.findFirst({where:{id:p.assetId,linkId:p.id,tenantId:a.tenantId,link:{ownerId:a.ownerId}}})
    if (!asset) throw new LinkMediaError(404,'Anexo não encontrado.')
    return binary(reply,asset.bytes)
  }))
  for (const method of ['PUT','DELETE'] as const) app.route({ method, url: '/:id/media/:kind', bodyLimit: 2097152, onRequest: [verifyJWT], handler: (request,reply)=>safe(reply,async()=>{
    const a=await actor(request), p=params.parse(request.params), body=z.object({expectedVersion:version,...(method==='PUT'?{base64:z.string(),alt:z.string().optional()}: {})}).strict().parse(request.body)
    const kind=kindOf(p.kind)
    if (method === 'DELETE') return mutateLinkMedia(database(),a,p.id,body.expectedVersion,{type:'REMOVE',kind})
    const { expectedVersion, ...input }=body
    const media=await prepareLinkMedia(kind,input)
    return mutateLinkMedia(database(),a,p.id,expectedVersion,{type:'PUT',media})
  }) })
  app.get('/:id/media/:assetId', (request,reply)=>safe(reply,async()=>{
    const { width } = z.object({ width: linkMediaWidth.optional() }).parse(request.query)
    const tenant=await resolveTenant(normalizeTenantHost(request.headers.host??'')), p=request.params as {id:string;assetId:string}
    const asset=await database().linkMediaAsset.findFirst({where:{id:p.assetId,linkId:p.id,tenantId:tenant.id,status:'APPROVED',link:{status:'PUBLISHED',niche:{tenantId:tenant.id,...(request.cookies.age==='yes'?{}:{requiresAge:false})},network:{tenantId:tenant.id,...(request.cookies.age==='yes'?{}:{requiresAge:false})},OR:[{ownerId:null},{owner:{tenantId:tenant.id,status:'ACTIVE'}}]}}})
    if (!asset) throw new LinkMediaError(404,'Anexo não encontrado.')
    return binary(reply,width === undefined ? asset.bytes : await resizeLinkMedia(asset.bytes,width))
  }))
}

export async function registerAdminLinkMediaRoutes(app: FastifyInstance) {
  app.get('/admin/moderation/media', {onRequest:[verifyJWT]},(request,reply)=>safe(reply,async()=>{
    const a=await actor(request,true)
    const query=z.object({linkId:z.string().min(1).max(128).optional()}).strict().parse(request.query)
    const rows=await database().linkMediaAsset.findMany({where:{tenantId:a.tenantId,status:'PENDING',...(query.linkId?{linkId:query.linkId}:{})},orderBy:{createdAt:'asc'},take:100,select:{id:true,linkId:true,kind:true,alt:true,revision:true,link:{select:{name:true,status:true,mediaVersion:true,network:{select:{name:true,slug:true}},niche:{select:{name:true,slug:true}},owner:{select:{name:true,status:true}}}}}})
    return {assets:rows.map(({link,...row})=>({...row,name:link.name,network:link.network,niche:link.niche,ownerName:link.owner?.name??null,version:link.mediaVersion,canApprove:['PUBLISHED','PENDING_MODERATION'].includes(link.status)&&link.owner?.status!=='BANNED',url:`/api/v1/admin/moderation/media/${row.id}/bytes`}))}
  }))
  app.get('/admin/moderation/media/:assetId/bytes',{onRequest:[verifyJWT]},(request,reply)=>safe(reply,async()=>{
    const a=await actor(request,true), p=request.params as {assetId:string}
    const row=await database().linkMediaAsset.findFirst({where:{id:p.assetId,tenantId:a.tenantId,status:'PENDING'}})
    if(!row)throw new LinkMediaError(404,'Anexo não encontrado.')
    return binary(reply,row.bytes)
  }))
  app.post('/admin/moderation/media/:assetId',{onRequest:[verifyJWT]},(request,reply)=>safe(reply,async()=>{
    const a=await actor(request,true), p=request.params as {assetId:string},body=z.object({expectedVersion:version,decision:z.enum(['APPROVE','REJECT']),reason:z.string().trim().max(500).optional()}).strict().parse(request.body)
    const row=await database().linkMediaAsset.findFirst({where:{id:p.assetId,tenantId:a.tenantId,status:'PENDING'},select:{linkId:true}})
    if(!row)throw new LinkMediaError(409,'Este anexo já foi substituído ou analisado.')
    return mutateLinkMedia(database(),a,row.linkId,body.expectedVersion,{type:'DECIDE',assetId:p.assetId,decision:body.decision,reason:body.reason})
  }))
}
