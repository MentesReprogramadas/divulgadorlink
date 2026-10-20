import * as mediaKits from '@/repositories/media-kits'
import {readProfileBackup} from '@/domain/profiles/profile-backup'
import {mediaKitContent} from '@/domain/profiles/media-kit'
import * as team from '@/repositories/profile-team'
import {profilePermission,type ProfileActor} from '@/domain/access/profile-access'
import * as campaigns from '@/repositories/campaign-pages'
import {campaignCreateInput,campaignUpdateInput} from '@/domain/profiles/campaign-page'
import { avatarContentType } from '@/domain/profiles/avatar-webp'
import {profileMeasurementDescriptor} from '@/repositories/profile-interactions'
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
import {channelGroupInput} from '@/domain/profiles/channel-input'
import { listProfileTemplates } from '@/domain/profiles/profile-templates'
import {searchPublicProfileItems,searchPreviewProfileItems} from '@/use-cases/@Profiles/search-profile-items'
import { logDomainEvent } from '@/observability/logger'
import * as profiles from '@/repositories/profiles-repository'
import { profileValidationPorts, type ProfileValidationPorts } from '@/use-cases/@Profiles/validate-profile'
let testDb: PrismaClient | null = null, testPorts: ProfileValidationPorts | null = null
export function setProfilesForTest(db: PrismaClient | null, ports: ProfileValidationPorts | null = null) { if (process.env.NODE_ENV === 'test') { testDb = db; testPorts = ports } }
type Context = ProfileActor
async function run(q: FastifyRequest, r: FastifyReply, privateRoute: boolean, work: (db: PrismaClient, actor: Context) => Promise<unknown>) {
  r.header('cache-control', 'private, no-store').header('x-content-type-options', 'nosniff')
  try {
    const user = await readAccessUser(q)
    if (privateRoute && (!user || user.typ !== 'access')) throw new ProfileError(401, 'Entre para editar seu perfil.')
    const tenant = await resolveTenant(normalizeTenantHost(q.headers.host ?? ''))
    if (privateRoute && user?.tenantId !== tenant.id) throw new ProfileError(403, 'Acesso negado.')
    const db=testDb??prisma, actor:Context={tenantId:tenant.id,ownerId:user?.sub??'',age:q.cookies.age==='yes'}
    const target=q.headers['x-profile-id']
    if(target&&!privateRoute)throw new ProfileError(400,'Contexto inválido.')
    const context=privateRoute&&target?await team.resolveProfileActor(db,actor,String(target),profilePermission(q.method,q.url.split('?')[0].replace(/^\/api\/v1/,''))):actor
    return await work(db,context)
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
const itemSearchQuery=z.object({q:z.string().trim().max(100).default(''),categoryId:z.string().uuid().optional(),cursor:z.string().max(2048).optional()}).strict()
export async function profilesRoutes(app: FastifyInstance) {
  app.post('/me/profile/backup/preview',(q,r)=>run(q,r,true,async(db,a)=>{const input=z.object({backup:z.unknown()}).strict().parse(q.body);const state=await profiles.readProfile(db,a);return {content:readProfileBackup(input.backup,state.draft?.slug),expectedVersion:state.draft?.version??0}}))
  app.post('/me/profile/backup/import',(q,r)=>run(q,r,true,async(db,a)=>{const input=z.object({backup:z.unknown(),expectedVersion:profileVersion}).strict().parse(q.body);const state=await profiles.readProfile(db,a);return profiles.saveProfile(db,a,readProfileBackup(input.backup,state.draft?.slug),input.expectedVersion)}))
  app.get('/me/profile/media-kit',(q,r)=>run(q,r,true,(db,a)=>mediaKits.readMediaKit(db,a)))
  app.patch('/me/profile/media-kit',(q,r)=>run(q,r,true,(db,a)=>{const input=z.object({content:mediaKitContent,expectedVersion:profileVersion}).strict().parse(q.body);return mediaKits.saveMediaKit(db,a,input.content,input.expectedVersion)}))
  app.post('/me/profile/media-kit/publish',(q,r)=>run(q,r,true,(db,a)=>mediaKits.publishMediaKit(db,a,expected.parse(q.body).expectedVersion)))
  app.post('/me/profile/media-kit/unpublish',(q,r)=>run(q,r,true,(db,a)=>mediaKits.unpublishMediaKit(db,a,expected.parse(q.body).expectedVersion)))
  app.get('/me/profile/media-kit/preview',(q,r)=>run(q,r,true,(db,a)=>mediaKits.previewMediaKit(db,a)))
  app.get('/profiles/:slug/media-kit',(q,r)=>run(q,r,false,(db,a)=>mediaKits.publicMediaKit(db,a.tenantId,slugParams.parse(q.params).slug,a.age)))
  app.get('/me/profile/team',(q,r)=>run(q,r,true,(db,a)=>team.listTeam(db,a)))
  app.post('/me/profile/invitations',(q,r)=>run(q,r,true,(db,a)=>team.createInvitation(db,a,team.inviteInput.parse(q.body))))
  app.post('/invitations/accept',(q,r)=>run(q,r,true,(db,a)=>team.acceptInvitation(db,a,team.acceptInput.parse(q.body).token)))
  app.delete('/me/profile/invitations/:id',(q,r)=>run(q,r,true,(db,a)=>team.revokeAccess(db,a,z.object({id:z.string().uuid()}).parse(q.params).id,'invitation')))
  app.delete('/me/profile/members/:id',(q,r)=>run(q,r,true,(db,a)=>team.revokeAccess(db,a,z.object({id:z.string().uuid()}).parse(q.params).id,'member',expected.parse(q.body).expectedVersion)))
  app.get('/me/profile/catalog',(q,r)=>run(q,r,true,async(db,a)=>db.$transaction(async tx=>{await profiles.assertProfileOwner(tx,a);return {links:await tx.link.findMany({where:{tenantId:a.tenantId,ownerId:a.ownerId,status:'PUBLISHED'},select:{id:true,name:true,status:true},orderBy:{id:'asc'}})}})))
  app.get('/profiles/:slug/items',(q,r)=>run(q,r,false,async(db,actor)=>{
    const slug=slugParams.parse(q.params).slug,result=await searchPublicProfileItems(db,actor.tenantId,slug,actor.age,itemSearchQuery.parse(q.query))
    return result.restricted?result:{...result,measurement:await profileMeasurementDescriptor(db,actor.tenantId,slug,result.publishedRevisionId)}
  }))
  app.get('/me/profile/preview/items',(q,r)=>run(q,r,true,(db,actor)=>searchPreviewProfileItems(db,actor,itemSearchQuery.extend({at:z.string().datetime().optional()}).strict().parse(q.query))))
  app.post('/me/profile/import/preview',(q,r)=>run(q,r,true,(db,actor)=>{
    const input=z.object({lines:z.array(z.string().max(2048)).min(1).max(500),expectedVersion:profileVersion}).strict().parse(q.body)
    return profiles.previewImportProfile(db,actor,input.lines,input.expectedVersion)
  }))
  app.post('/me/profile/import/confirm',(q,r)=>run(q,r,true,(db,actor)=>{
    const input=z.object({previewId:z.string().max(160000),expectedVersion:profileVersion,idempotencyKey:z.string().uuid(),selectedItems:z.array(z.object({line:z.number().int().min(1).max(500),label:z.string().trim().min(1).max(100),categoryId:z.string().uuid().nullable(),newCategoryName:z.string().trim().min(1).max(80).nullable()}).strict()).min(1).max(50)}).strict().parse(q.body)
    return profiles.confirmImportProfile(db,actor,input)
  }))
  app.get('/profile-templates',(q,r)=>run(q,r,false,async()=>({templates:listProfileTemplates()})))
  app.post('/me/profile/apply-template',(q,r)=>run(q,r,true,(db,actor)=>{
    const input=z.object({templateVersionId:z.string().max(80),preserveContent:z.boolean().default(true),expectedVersion:profileVersion,confirmedReplacement:z.boolean().default(false)}).strict().parse(q.body)
    return profiles.applyTemplateToProfile(db,actor,input)
  }))
  app.get('/me/profile/campaign-sources',(q,r)=>run(q,r,true,(db,a)=>profiles.listProfileRevisions(db,a)))
  app.get('/me/profile/campaign-sources/:id',(q,r)=>run(q,r,true,(db,a)=>profiles.readProfileRevision(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id)))
  app.get('/me/profile/campaigns',(q,r)=>run(q,r,true,(db,a)=>campaigns.listCampaigns(db,a,campaigns.campaignQuery.parse(q.query))))
  app.post('/me/profile/campaigns',(q,r)=>run(q,r,true,(db,a)=>campaigns.createCampaign(db,a,campaignCreateInput.parse(q.body))))
  app.get('/me/profile/campaigns/:id',(q,r)=>run(q,r,true,(db,a)=>campaigns.readCampaign(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id)))
  app.patch('/me/profile/campaigns/:id',(q,r)=>run(q,r,true,(db,a)=>campaigns.updateCampaign(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id,campaignUpdateInput.parse(q.body))))
  app.delete('/me/profile/campaigns/:id',(q,r)=>run(q,r,true,(db,a)=>campaigns.deleteCampaign(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id,expected.parse(q.body).expectedVersion)))
  app.post('/me/profile/campaigns/:id/publish',(q,r)=>run(q,r,true,(db,a)=>campaigns.publishCampaign(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id,expected.parse(q.body).expectedVersion,testPorts??profileValidationPorts(normalizeTenantHost(q.headers.host??'')))))
  app.post('/me/profile/campaigns/:id/archive',(q,r)=>run(q,r,true,(db,a)=>campaigns.archiveCampaign(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id,expected.parse(q.body).expectedVersion)))
  app.get('/me/profile/campaigns/:id/preview',(q,r)=>run(q,r,true,(db,a)=>campaigns.previewCampaign(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id)))
  app.get('/profiles/:slug/campaigns/:campaignSlug',(q,r)=>run(q,r,false,async(db,a)=>{
    const {slug,campaignSlug}=z.object({slug:z.string().regex(/^[a-z0-9-]{3,40}$/),campaignSlug:z.string().regex(/^[a-z0-9-]{3,40}$/)}).strict().parse(q.params)
    const view=await campaigns.publicCampaign(db,a.tenantId,slug,campaignSlug,a.age)
    if(view.restricted)return view
    return {...view,measurement:await profileMeasurementDescriptor(db,a.tenantId,slug,view.publishedRevisionId,view.campaign!.id)}
  }))
  app.get('/me/profile/export',async(q,r)=>run(q,r,true,async(db,a)=>{
    const {revision}=z.object({revision:z.enum(['draft','published'])}).strict().parse(q.query)
    const value=await profiles.exportProfile(db,a,revision)
    r.header('content-disposition',`attachment; filename="minha-pagina-${revision}.json"`)
    return value
  }))
  app.get('/me/profile', (q, r) => run(q, r, true, (db, actor) => profiles.readProfile(db, actor)))
  app.get('/me/profile/channel-groups',(q,r)=>run(q,r,true,(db,actor)=>{z.object({}).strict().parse(q.query);return profiles.readProfileChannelGroups(db,actor)}))
  app.get('/me/profile/channel-destinations',(q,r)=>run(q,r,true,(db,actor)=>profiles.profileChannelDestinations(db,actor,z.object({cursor:z.string().uuid().optional()}).strict().parse(q.query).cursor)))
  app.get('/me/profile/channel-destinations/:id',(q,r)=>run(q,r,true,(db,actor)=>profiles.profileChannelDestination(db,actor,z.object({id:z.string().uuid()}).strict().parse(q.params).id)))
  app.put('/me/profile/channel-groups/:id',(q,r)=>run(q,r,true,(db,actor)=>profiles.saveProfileChannelGroup(db,actor,z.object({id:z.string().uuid()}).strict().parse(q.params).id,channelGroupInput.parse(q.body))))
  app.delete('/me/profile/channel-groups/:id',(q,r)=>run(q,r,true,(db,actor)=>profiles.removeProfileChannelGroup(db,actor,z.object({id:z.string().uuid()}).strict().parse(q.params).id,expected.parse(q.body).expectedVersion)))
  app.get('/profiles/:slug/channels/:id/resolve',(q,r)=>run(q,r,false,async(db,actor)=>{
    const input=slugParams.extend({id:z.string().uuid()}).strict().parse(q.params),query=z.object({token:z.string().min(1).max(2048)}).strict().parse(q.query)
    const result=await profiles.resolveProfileChannel(db,actor.tenantId,input.slug,input.id,query.token,actor.age,testPorts??profileValidationPorts(normalizeTenantHost(q.headers.host??'')),actor.ownerId||null)
    if('available' in result&&result.available){r.code(302).header('location',result.destinationUrl);return null}
    return result
  }))
  app.get('/me/profile/checklist',(q,r)=>run(q,r,true,(db,actor)=>{z.object({}).strict().parse(q.query);return profiles.readProfileChecklist(db,actor)}))
  app.post('/me/profile/checklist/actions',(q,r)=>run(q,r,true,(db,actor)=>profiles.recordProfileChecklistAction(db,actor,z.object({action:z.enum(['PREVIEW_REQUESTED','LINK_COPIED']),expectedVersion:profileVersion}).strict().parse(q.body))))
  app.patch('/me/profile', (q, r) => run(q, r, true, (db, actor) => {
    const input = z.object({ expectedVersion: profileVersion, content: profileInput }).strict().parse(q.body)
    return profiles.saveProfile(db, actor, input.content, input.expectedVersion)
  }))
  app.get('/me/profile/preview', (q, r) => run(q, r, true, (db, actor) => profiles.previewProfile(db, actor, (() => { const input = z.object({ at: z.string().datetime().optional() }).strict().parse(q.query); return input.at ? new Date(input.at) : undefined })())))
  app.get('/me/profile/revisions', (q, r) => run(q, r, true, (db, actor) => profiles.listProfileRevisions(db, actor)))
  app.get('/me/profile/revisions/:id', (q, r) => run(q, r, true, (db, actor) => profiles.readProfileRevision(db, actor, z.object({ id: z.string().uuid() }).parse(q.params).id)))
  app.post('/me/profile/revisions/:id/restore', (q, r) => run(q, r, true, (db, actor) => profiles.restoreProfileRevision(db, actor, z.object({ id: z.string().uuid() }).parse(q.params).id, expected.parse(q.body).expectedVersion, testPorts ?? profileValidationPorts(normalizeTenantHost(q.headers.host ?? '')))))
  app.post('/me/profile/publish', (q, r) => run(q, r, true, (db, actor) => profiles.publishProfile(db, actor, expected.parse(q.body).expectedVersion, testPorts ?? profileValidationPorts(normalizeTenantHost(q.headers.host ?? '')))))
  app.post('/me/profile/unpublish', (q, r) => run(q, r, true, (db, actor) => profiles.unpublishProfile(db, actor, expected.parse(q.body).expectedVersion)))
  app.post('/me/profile/discard', (q, r) => run(q, r, true, (db, actor) => profiles.discardProfile(db, actor, expected.parse(q.body).expectedVersion)))
  app.post('/me/profile/avatar', (q, r) => run(q, r, true, (db, actor) => profiles.uploadProfileAvatar(db, actor, z.object({ base64: z.string().max(349528) }).strict().parse(q.body).base64)))
  app.get('/me/profile/avatar/:id', (q, r) => run(q, r, true, async (db, actor) => { const bytes = await profiles.profileAvatar(db, actor, z.object({ id: asset }).parse(q.params).id); return r.type(avatarContentType(bytes)).send(bytes) }))
  app.get('/profiles/:slug/events/:eventId/calendar.ics',(q,r)=>run(q,r,false,async(db,a)=>{const p=z.object({slug:z.string().max(80),eventId:z.string().uuid()}).parse(q.params);const calendar=await profiles.publicEventCalendar(db,a.tenantId,p.slug,p.eventId,a.age);r.header('content-type','text/calendar; charset=utf-8').header('content-disposition','attachment; filename=evento.ics');return r.send(calendar)}))
  app.get('/profiles/:slug', (q, r) => run(q, r, false, async(db, actor) => {
    const slug=slugParams.parse(q.params).slug,result=await profiles.publicProfile(db,actor.tenantId,slug,actor.age)
    return result.restricted?result:{...result,measurement:await profileMeasurementDescriptor(db,actor.tenantId,slug,result.publishedRevisionId)}
  }))
  app.get('/profiles/:slug/avatar/:id', (q, r) => run(q, r, false, async (db, actor) => { const p = slugParams.extend({ id: asset }).parse(q.params); const bytes = await profiles.profileAvatar(db, actor, p.id, p.slug); return r.type(avatarContentType(bytes)).send(bytes) }))
}
